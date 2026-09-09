#!/usr/bin/env node
/**
 * `pnpm verify:figma` — validate the Figma integration files against their schemas.
 *
 * These files are hand-and-agent-maintained JSON that no build step reads, so a malformed entry
 * produces no error anywhere else in the repo. That is precisely the class of contract that has
 * to be gated in CI rather than trusted: its breach is invisible.
 *
 * Checks:
 *   1  maps/*.json validate against schema/*.schema.json
 *   2  every map's `source` names a real key in manifest.json -> sources
 *   3  every collection's `codeSources` point at files that exist
 *   4  a variable whose collection is unmapped must have `code: null` (drift, not a lie)
 *   5  every variable's `collection` names a real key in that map's `collections`
 *   6  a collection's `variableCount` matches how many variables actually declare it
 *   7  every claimed token path exists in one of its collection's DTCG source files
 *   8  manifest identity matches ds.config.json, and its collection map matches maps/tokens.json
 *
 * An empty map passes all eight. That remains a valid starting state; an unchecked empty state is
 * not the same as a checked one.
 */

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';
import Ajv from 'ajv';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const FIGMA = join(REPO_ROOT, '.figma');

const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'));
const problems = [];

function tokenPaths(value, path = [], found = new Set()) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return found;
  if (Object.hasOwn(value, '$value')) {
    found.add(path.join('.'));
    return found;
  }
  for (const [key, child] of Object.entries(value)) {
    if (!key.startsWith('$')) tokenPaths(child, [...path, key], found);
  }
  return found;
}

function sameStrings(left, right) {
  const sortedLeft = [...left].sort();
  const sortedRight = [...right].sort();
  return (
    sortedLeft.length === sortedRight.length &&
    sortedLeft.every((value, index) => value === sortedRight[index])
  );
}

function main() {
  if (!existsSync(FIGMA)) {
    console.log('verify:figma — no .figma/ directory. Nothing to check.');
    return;
  }

  const manifest = readJson(join(FIGMA, 'manifest.json'));
  const dsConfig = readJson(join(REPO_ROOT, 'ds.config.json'));
  const sources = Object.keys(manifest.sources ?? {});
  const ajv = new Ajv({ allErrors: true, strict: false });

  const manifestPrefix = manifest.identity?.prefix ?? {};
  const expectedPrefix = {
    name: dsConfig.name,
    scope: dsConfig.scope,
    token: `--${dsConfig.tokenPrefix}`,
    data: `data-${dsConfig.dataPrefix}`,
  };
  for (const [field, expected] of Object.entries(expectedPrefix)) {
    if (manifestPrefix[field] !== expected) {
      problems.push(
        `manifest.json: identity.prefix.${field} is ${JSON.stringify(manifestPrefix[field])}, expected ${JSON.stringify(expected)} from ds.config.json.`,
      );
    }
  }

  for (const [map, schema] of [
    ['maps/tokens.json', 'schema/tokens.schema.json'],
    ['maps/components.json', 'schema/components.schema.json'],
  ]) {
    const mapPath = join(FIGMA, map);
    const schemaPath = join(FIGMA, schema);
    if (!existsSync(mapPath) || !existsSync(schemaPath)) {
      problems.push(`${map}: missing map or schema.`);
      continue;
    }

    const data = readJson(mapPath);
    const validate = ajv.compile(readJson(schemaPath));

    if (!validate(data)) {
      for (const e of validate.errors ?? []) {
        problems.push(`${map}: ${e.instancePath || '/'} ${e.message}`);
      }
      continue;
    }

    if (!sources.includes(data.source)) {
      problems.push(
        `${map}: source "${data.source}" is not a key in manifest.json -> sources (${sources.join(', ') || 'none'}).`,
      );
    }

    const sourceTokenPaths = new Map();
    for (const [name, col] of Object.entries(data.collections ?? {})) {
      for (const source of col.codeSources ?? []) {
        const sourcePath = join(REPO_ROOT, source);
        if (!existsSync(sourcePath)) {
          problems.push(`${map}: collection "${name}" -> codeSources "${source}" does not exist.`);
          continue;
        }
        if (map === 'maps/tokens.json' && source.endsWith('.json')) {
          sourceTokenPaths.set(source, tokenPaths(readJson(sourcePath)));
        }
      }
    }

    const collectionsMap = data.collections ?? {};
    const declaredCounts = new Map();
    for (const [name, v] of Object.entries(data.variables ?? {})) {
      const collectionSources = collectionsMap[v.collection]?.codeSources ?? [];
      if (collectionSources.length === 0 && v.code !== null) {
        problems.push(
          `${map}: variable "${name}" claims code "${v.code}" but its collection "${v.collection}" has no codeSources. An unmapped collection must report drift (code: null), not a path.`,
        );
      }

      if (
        map === 'maps/tokens.json' &&
        v.code !== null &&
        !collectionSources.some((source) => sourceTokenPaths.get(source)?.has(v.code))
      ) {
        problems.push(
          `${map}: variable "${name}" claims code "${v.code}", but that token does not exist in ${collectionSources.join(', ') || 'the collection sources'}.`,
        );
      }

      if (!Object.hasOwn(collectionsMap, v.collection)) {
        problems.push(
          `${map}: variable "${name}" names collection "${v.collection}", which is not a key in this map's collections.`,
        );
        continue;
      }
      declaredCounts.set(v.collection, (declaredCounts.get(v.collection) ?? 0) + 1);
    }

    for (const [name, col] of Object.entries(collectionsMap)) {
      const actual = declaredCounts.get(name) ?? 0;
      if (col.variableCount !== actual) {
        problems.push(
          `${map}: collection "${name}" declares variableCount ${col.variableCount}, but ${actual} variable(s) actually name it.`,
        );
      }
    }

    if (map === 'maps/tokens.json') {
      const manifestCollections = manifest.identity?.variableCollections ?? {};
      for (const [name, col] of Object.entries(collectionsMap)) {
        const manifestSources = manifestCollections[name];
        if (!Array.isArray(manifestSources) || !sameStrings(manifestSources, col.codeSources)) {
          problems.push(
            `${map}: collection "${name}" has codeSources ${JSON.stringify(col.codeSources)}, but manifest.json records ${JSON.stringify(manifestSources)}.`,
          );
        }
      }
      for (const name of Object.keys(manifestCollections).filter((key) => key !== '_doc')) {
        if (!Object.hasOwn(collectionsMap, name)) {
          problems.push(
            `manifest.json: identity.variableCollections names "${name}", which is absent from ${map}.`,
          );
        }
      }
    }
  }

  if (problems.length) {
    console.error(`verify:figma failed — ${problems.length} problem(s):\n`);
    for (const p of problems.sort()) console.error(`  ${p}`);
    process.exit(1);
  }

  console.log('verify:figma OK.');
}

main();
