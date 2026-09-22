#!/usr/bin/env node
/**
 * Keep the committed sandbox components byte-identical to their emitters.
 *
 * Typechecking generated code proves only that the checked-in snapshot compiles. It says nothing
 * about whether the emitter would still produce that snapshot, so stale markup can stay green
 * indefinitely. `--write` refreshes emitter-owned files; `--check` is the non-mutating CI gate.
 * Theme files are consumer-owned and are never read or written here.
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { format, resolveConfig } from 'prettier';
import { elementFor } from '../packages/platform-web/resolve.mjs';
import { BACKENDS, REPO_ROOT, byCodePoint, contractPaths, readJson } from './contract-lib.mjs';

const mode = process.argv[2];
if (!['--check', '--write'].includes(mode) || process.argv.length !== 3) {
  console.error('usage: node scripts/sync-sandboxes.mjs --check|--write');
  process.exit(1);
}

const prefix = readJson(join(REPO_ROOT, 'ds.config.json')).dataPrefix;
const prettierConfig = (await resolveConfig(join(REPO_ROOT, 'package.json'))) ?? {};
const drift = [];

for (const backend of BACKENDS) {
  const root = join(REPO_ROOT, `apps/${backend.framework}-sandbox/src/components`);
  const emitter = await import(`../packages/${backend.framework}/src/emit/emit.mjs`);
  if (typeof emitter.emitOwnedFiles !== 'function') {
    throw new Error(`${backend.framework} emitter does not export emitOwnedFiles().`);
  }

  const components = readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort(byCodePoint);

  for (const name of components) {
    const paths = contractPaths(name, backend.framework);
    if (!existsSync(paths.contract) || !existsSync(paths.binding)) {
      drift.push(`${backend.framework}/${name}: missing contract or binding`);
      continue;
    }

    const contract = readJson(paths.contract);
    const binding = { ...readJson(paths.binding), element: elementFor(name) };
    const files = emitter.emitOwnedFiles(name, contract, binding, prefix);

    for (const [file, emitted] of Object.entries(files)) {
      const path = join(root, name, file);
      const expected = await format(emitted, { ...prettierConfig, filepath: path });
      const actual = existsSync(path) ? readFileSync(path, 'utf8') : null;
      if (actual === expected) continue;
      drift.push(relative(REPO_ROOT, path));
      if (mode === '--write') writeFileSync(path, expected, 'utf8');
    }
  }
}

if (mode === '--check' && drift.length) {
  console.error(`sandbox generated-file drift — ${drift.length} file(s):\n`);
  for (const file of drift) console.error(`  ${file}`);
  console.error('\nRun `pnpm sandboxes:sync` and commit the emitter-owned results.');
  process.exit(1);
}

if (mode === '--write') {
  console.log(
    drift.length
      ? `sandboxes:sync updated ${drift.length} emitter-owned file(s).`
      : 'sandboxes:sync: already current.',
  );
} else {
  console.log('sandboxes:check OK — committed emitter-owned files are current.');
}
