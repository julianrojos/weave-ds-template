// The documented regeneration command must produce a committable file.
//
// Every generated component carries a header saying how to regenerate it. For a while running
// that command produced output that `format:check` and `sandboxes:check` both rejected, because
// the CLIs wrote the emitter's raw string while `sync-sandboxes.mjs` compared against a
// Prettier-formatted one. Nothing failed — following the instruction in the file just left CI red
// until you also happened to know about `pnpm sandboxes:sync`.
//
// These cases pin the two halves of the fix: the writer formats, and what it formats to is what
// the gate expects.

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { formatIfPossible } from '../packages/emit-web/write.mjs';
import { elementFor } from '../packages/platform-web/resolve.mjs';
import { BACKENDS, REPO_ROOT, contractPaths, readJson } from '../scripts/contract-lib.mjs';

const prefix = readJson(join(REPO_ROOT, 'ds.config.json')).dataPrefix;

describe('what a CLI writes is what the sandbox gate expects', () => {
  for (const backend of BACKENDS) {
    it(`${backend.framework}: Button lands byte-identical to the committed file`, async () => {
      const { emitOwnedFiles } = await import(`../packages/${backend.framework}/src/emit/emit.mjs`);
      const paths = contractPaths('Button', backend.framework);
      const binding = { ...readJson(paths.binding), element: elementFor('Button') };
      const files = emitOwnedFiles('Button', readJson(paths.contract), binding, prefix);

      const root = join(REPO_ROOT, `apps/${backend.framework}-sandbox/src/components/Button`);
      let compared = 0;
      for (const [file, content] of Object.entries(files)) {
        const path = join(root, file);
        if (!existsSync(path)) continue;
        const { text, formatted } = await formatIfPossible(content, path);
        expect(formatted).toBe(true);
        expect(text).toBe(readFileSync(path, 'utf8'));
        compared += 1;
      }
      // Guards against the assertions above passing vacuously if the layout ever moves.
      expect(compared).toBeGreaterThan(0);
    });
  }
});

describe('formatting never becomes the reason an emit fails', () => {
  it('returns the original text, and why, when the content cannot be parsed', async () => {
    // A parse failure means the EMITTER produced something invalid. Swallowing the text would
    // lose the evidence, and throwing would turn a cosmetic step into a broken emitter.
    const result = await formatIfPossible('const = = ;', join(REPO_ROOT, 'broken.tsx'));
    expect(result.formatted).toBe(false);
    expect(result.text).toBe('const = = ;');
    expect(result.reason).toBeTypeOf('string');
  });

  it('resolves the style from the OUTPUT location, not from this repository', async () => {
    // A consumer emitting into their own repo gets their own Prettier config. Resolving from
    // REPO_ROOT instead would silently impose this repository's style on their files.
    // `singleQuote: true` is this repository's choice and not Prettier's default, so the quote
    // that comes back says which config was consulted.
    const source = 'export const x = "hi";\n';
    const here = await formatIfPossible(source, join(REPO_ROOT, 'probe.ts'));
    const elsewhere = await formatIfPossible(source, '/probe.ts');
    expect(here.formatted && elsewhere.formatted).toBe(true);
    expect(here.text).toBe("export const x = 'hi';\n");
    expect(elsewhere.text).toBe('export const x = "hi";\n');
  });
});
