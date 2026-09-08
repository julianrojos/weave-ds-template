#!/usr/bin/env node
/**
 * `pnpm init-ds <name> [--dry]` — brand this template once.
 *
 * Renames, in one pass:
 *   @ds/…          -> @<name>/…        package scope
 *   --ds-…         -> --<name>-…       CSS custom properties
 *   data-ds-…      -> data-<name>-…    component anatomy attributes
 *   ds.config.json                     the identity itself
 *   .figma/manifest.json               the above three rules, plus identity.prefix — bare
 *                                       strings the rules above can't reach on their own
 *
 * WHY A CODEMOD RATHER THAN FIND-AND-REPLACE
 * The three prefixes above are the same decision expressed in three syntaxes, and they must move
 * together. Renaming the scope but not the token prefix leaves a repo that builds, tests green,
 * and is wrong — the CSS variables no longer match the package that documents them, and nothing
 * anywhere reports it. That is exactly the class of breach this repo gates elsewhere; here it is
 * cheaper to make the operation atomic than to check it afterwards.
 *
 * ATOMICITY. Everything below is split into a VALIDATE phase (reads only, computes every file's
 * new content, fails loudly on anything unexpected) and a WRITE phase (touches disk only once
 * every check has passed). A failure partway through validation must never leave the repo
 * half-renamed — that is the whole reason this is a codemod and not a shell one-liner.
 *
 * Run it ONCE, before writing any components. It is not a migration tool.
 */

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join, relative } from 'node:path';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  '.vite',
  '.turbo',
  'storybook-static',
  'coverage',
]);

/**
 * Three files must not be rewritten by the generic walker:
 *   init-ds.mjs   — it contains the rename rules themselves, and rewriting them mid-run would
 *                   both corrupt the tool and make the operation non-repeatable.
 *   pnpm-lock.yaml— a lockfile is generated, and regexing it risks a subtly invalid graph.
 *                   `pnpm install` regenerates it correctly from the renamed manifests.
 *   .figma/manifest.json
 *                 — it needs the generic substitutions plus a structurally checked identity
 *                   update, so it is handled below as one validated transformation.
 */
const SKIP_FILES = new Set(['scripts/init-ds.mjs', 'pnpm-lock.yaml', '.figma/manifest.json']);
const EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.json',
  '.css',
  '.md',
  '.html',
  '.yaml',
  '.yml',
]);

const args = process.argv.slice(2);
const dry = args.includes('--dry');
const name = args.find((a) => !a.startsWith('-'));

function fatal(msg) {
  console.error(msg);
  process.exit(1);
}

/** Count non-overlapping occurrences of a literal substring — never a regex, never partial. */
function countOccurrences(haystack, needle) {
  return haystack.split(needle).length - 1;
}

if (!name) {
  fatal(
    'Usage: pnpm init-ds <name> [--dry]\n\n  <name>  lowercase letters and digits, e.g. `weave`',
  );
}
if (!/^[a-z][a-z0-9]*$/.test(name)) {
  fatal(
    `"${name}" is not usable as a prefix.\n\n` +
      'It becomes an npm scope, a CSS custom-property namespace and a data-attribute prefix, so it\n' +
      'must be lowercase letters and digits, starting with a letter. No dashes: a dash would make\n' +
      '--<name>-color-fill- ambiguous about where the prefix ends.',
  );
}

const current = JSON.parse(readFileSync(join(REPO_ROOT, 'ds.config.json'), 'utf8'));
const from = current.name;

if (from === name) {
  fatal(`This repo is already branded "${name}". init-ds runs once; it is not a migration tool.`);
}
if (from !== 'ds') {
  fatal(
    `This repo has already been branded "${from}". init-ds runs once, before any components exist.\n` +
      'Re-branding an established system is a different and much larger operation — every published\n' +
      'package name and every consumer stylesheet reference would move with it.',
  );
}

// ============================================================================================
// VALIDATE — reads and computation only. Nothing below this block writes to disk.
// ============================================================================================

// Order matters: `data-ds-` must be rewritten before the bare `--ds-`/`@ds/` rules, or a partial
// match leaves a half-renamed attribute.
const RULES = [
  [new RegExp(`data-${from}-`, 'g'), `data-${name}-`],
  [new RegExp(`@${from}/`, 'g'), `@${name}/`],
  [new RegExp(`--${from}-`, 'g'), `--${name}-`],
];

function* walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) =>
    a.name < b.name ? -1 : 1,
  )) {
    // Skip by DENYLIST, never by an allowlist of dot-directories.
    //
    // This was an allowlist once (.figma, .ai, .claude, .github) and it silently missed
    // apps/storybook/.storybook — so a renamed repo shipped Storybook config importing a package
    // scope that no longer existed, and nothing failed until someone switched Storybook on weeks
    // later. A denylist fails the safe way: a new dot-directory gets renamed by default rather
    // than skipped by default.
    if (SKIP_DIRS.has(entry.name)) continue;

    const full = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (EXTENSIONS.has(entry.name.slice(entry.name.lastIndexOf('.')))) yield full;
  }
}

// Every regex-eligible file: compute its new content now, write nothing yet.
const changed = [];

for (const file of walk(REPO_ROOT)) {
  const rel = relative(REPO_ROOT, file).split('\\').join('/');
  if (SKIP_FILES.has(rel)) continue;

  const before = readFileSync(file, 'utf8');
  let after = before;
  for (const [re, to] of RULES) after = after.replace(re, to);
  if (after !== before) {
    const hits = RULES.reduce((n, [re]) => n + (before.match(re)?.length ?? 0), 0);
    changed.push({ file: rel, after, hits });
  }
}

// ds.config.json is rewritten from the parsed object rather than by regex, so the identity fields
// move even though they hold bare `ds` with none of the three syntaxes around it.
const cfgPath = join(REPO_ROOT, 'ds.config.json');
const cfg = JSON.parse(readFileSync(cfgPath, 'utf8'));
cfg.name = name;
cfg.scope = `@${name}`;
cfg.tokenPrefix = name;
cfg.dataPrefix = name;
const cfgAfter = JSON.stringify(cfg, null, 2) + '\n';

// .figma/manifest.json's identity.prefix block holds the same bare `ds` / `@ds` / `--ds` /
// `data-ds` strings — no trailing separator for any RULES regex to match, so it needs its own
// rule too. Unlike ds.config.json this file carries hand-placed blank lines and short inline
// arrays that a parse-and-restringify round-trip would flatten, so it is patched as text instead
// — four targeted replacements, byte-identical everywhere else.
const manifestPath = join(REPO_ROOT, '.figma', 'manifest.json');
const manifestBefore = readFileSync(manifestPath, 'utf8');
let manifestRuleHits = 0;
let manifestAfter = manifestBefore;
for (const [re, to] of RULES) {
  manifestRuleHits += manifestAfter.match(re)?.length ?? 0;
  manifestAfter = manifestAfter.replace(re, to);
}
const manifestRules = [
  [`"name": "${from}"`, `"name": "${name}"`],
  [`"scope": "@${from}"`, `"scope": "@${name}"`],
  [`"token": "--${from}"`, `"token": "--${name}"`],
  [`"data": "data-${from}"`, `"data": "data-${name}"`],
];
for (const [target, to] of manifestRules) {
  // Two failure modes matter equally here: the target is missing (0 matches — `.replace()` would
  // silently no-op) and the target is ambiguous (2+ matches — `.replace()` only touches the
  // first, leaving the rest un-renamed). Both must abort before anything is written, or the
  // script can report success while identity.prefix is only partly updated.
  const hits = countOccurrences(manifestAfter, target);
  if (hits !== 1) {
    fatal(
      `.figma/manifest.json: expected exactly one occurrence of ${JSON.stringify(target)} in ` +
        `identity.prefix, found ${hits}.\n` +
        'The block may have been hand-edited into a different shape. Fix it — and the matching ' +
        'rule in scripts/init-ds.mjs if the shape is meant to change — before re-running.',
    );
  }
  manifestAfter = manifestAfter.replace(target, to);
}

// Belt and braces: parse the patched text back as JSON and check the four fields landed in
// identity.prefix specifically, not in some other part of the file that happened to match the
// same literal text. This also catches a replacement that broke JSON syntax.
let manifestParsed;
try {
  manifestParsed = JSON.parse(manifestAfter);
} catch (err) {
  fatal(`.figma/manifest.json: patched content is not valid JSON — ${err.message}`);
}
const expectedPrefix = { name, scope: `@${name}`, token: `--${name}`, data: `data-${name}` };
for (const [key, expected] of Object.entries(expectedPrefix)) {
  const actual = manifestParsed?.identity?.prefix?.[key];
  if (actual !== expected) {
    fatal(
      `.figma/manifest.json: after patching, identity.prefix.${key} is ${JSON.stringify(actual)}, ` +
        `expected ${JSON.stringify(expected)}. Aborting before any file is written.`,
    );
  }
}

// ============================================================================================
// WRITE — every check above passed. Nothing from here on can discover a new problem.
// ============================================================================================

if (!dry) {
  for (const c of changed) writeFileSync(join(REPO_ROOT, c.file), c.after);
  writeFileSync(cfgPath, cfgAfter);
  writeFileSync(manifestPath, manifestAfter);
}

// A longer or shorter name changes string widths inside markdown tables, so Prettier's column
// alignment goes stale and `pnpm verify` fails on format:check. Reformatting here is not a
// nicety: the first command a new user runs must leave the repo green, or the first thing they
// see is a red gate they did not cause.
if (!dry && changed.length) {
  try {
    execFileSync(
      'npx',
      ['prettier', '--write', '--log-level', 'warn', ...changed.map((c) => c.file)],
      {
        cwd: REPO_ROOT,
        stdio: 'pipe',
        shell: process.platform === 'win32',
      },
    );
  } catch {
    console.warn(
      '\nNote: could not run Prettier automatically. Run `pnpm format` before `pnpm verify`.',
    );
  }
}

const total = changed.reduce((n, c) => n + c.hits, 0);
console.log(
  `${dry ? '[dry run] would rename' : 'renamed'} "${from}" -> "${name}" — ` +
    `${total} occurrence(s) across ${changed.length} file(s).\n`,
);
for (const c of changed) console.log(`  ${String(c.hits).padStart(4)}  ${c.file}`);
console.log(
  `\n${dry ? '[dry run] would update' : 'updated'} ds.config.json (the identity fields) and ` +
    `.figma/manifest.json (${manifestRuleHits} prefix reference(s) and identity.prefix).`,
);

if (dry) {
  console.log('\nNothing was written. Re-run without --dry to apply.');
} else {
  console.log('\nDone. Next:');
  console.log('  pnpm install        # the workspace links move with the scope');
  console.log('  pnpm verify         # should be green on an empty repo');
}
