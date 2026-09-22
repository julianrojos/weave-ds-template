// Writing emitted files to disk, formatted.
//
// WHY THIS EXISTS. Every generated component carries a header saying how to regenerate it, and
// running that command used to produce output that `pnpm format:check` and `pnpm sandboxes:check`
// both rejected: the CLIs wrote the emitter's raw string, while `sync-sandboxes.mjs` compared
// against a Prettier-formatted one. Following the documented instruction left CI red until you
// also happened to know about `pnpm sandboxes:sync`. A regeneration command that cannot produce a
// committable file is a broken command, not a formatting preference.
//
// Prettier is a DEV dependency and a consumer emitting into their own repository may not have it.
// So it is loaded dynamically and its absence is reported, never fatal: unformatted output still
// compiles, and a hard import here would turn a cosmetic gap into an emitter that cannot run.

import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Format `content` the way this repository formats that file type.
 *
 * Returns the input unchanged when Prettier is not installed, or when it cannot parse the file —
 * the second case matters because a parse failure means the EMITTER produced something invalid,
 * and swallowing the original text loses the evidence.
 */
export async function formatIfPossible(content, filepath) {
  let prettier;
  try {
    prettier = await import('prettier');
  } catch {
    return { text: content, formatted: false, reason: 'prettier is not installed' };
  }
  try {
    const config = (await prettier.resolveConfig(filepath)) ?? {};
    return { text: await prettier.format(content, { ...config, filepath }), formatted: true };
  } catch (error) {
    return { text: content, formatted: false, reason: error.message };
  }
}

/**
 * Write every emitted file into `outDir`, formatted where possible.
 *
 * Returns the paths that could not be formatted, so a CLI can say so rather than leaving the
 * caller to discover it from a red gate.
 */
export async function writeEmittedFiles(outDir, files) {
  const unformatted = [];
  for (const [file, content] of Object.entries(files)) {
    const path = join(outDir, file);
    const { text, formatted, reason } = await formatIfPossible(content, path);
    if (!formatted) unformatted.push({ file, reason });
    writeFileSync(path, text, 'utf8');
  }
  return unformatted;
}
