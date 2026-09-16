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
 *   3  every collection's `codeSource` points at a file that exists
 *   4  a variable whose collection is unmapped must have `code: null` (drift, not a lie)
 *   5  a component entry's contract is that component: `contract.component` equals the map key
 *   6  a component entry's `axes` equal its contract's `axes`, in both directions
 *   7  a component entry's `designAxes` correspond to no contract axis, and every value is a state
 *      the contract declares, one of a state's enumerated values, or `default`
 *
 * An empty map passes all seven. That is the point — the template ships empty, and an unchecked
 * empty state is not the same as a checked one.
 */

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join, basename } from 'node:path';
import Ajv from 'ajv';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const FIGMA = join(REPO_ROOT, '.figma');

const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'));
const problems = [];

const normalizeValue = (value) => value.trim().toLowerCase().replace(/\s+/g, '-');
const sameValues = (a, b) => [...a].sort().join('\0') === [...b].sort().join('\0');

export function contractEntryProblems(map, group, key, entry, contract) {
  const found = [];
  const where = `${group}.${key}`;
  if (contract.component !== key) {
    found.push(
      `${map}: ${where} codePath resolves to the contract for "${contract.component}", not "${key}".`,
    );
    return found;
  }
  const contractAxes = contract.axes ?? {};
  const figmaAxes = entry.axes ?? {};

  for (const [property, values] of Object.entries(figmaAxes)) {
    const key = property.charAt(0).toLowerCase() + property.slice(1);
    const axis = contractAxes[key];
    if (!axis) {
      found.push(
        `${map}: ${where} axes.${property} has no axis "${key}" in the contract. Only a visual-state property may move to designAxes; any other non-contract axis is a divergence.`,
      );
    } else if (!sameValues(values, axis.values)) {
      found.push(
        `${map}: ${where} axes.${property} [${values.join(', ')}] does not equal contract axis "${key}" [${axis.values.join(', ')}].`,
      );
    }
  }

  if (entry.assetType === 'component' && Object.keys(contractAxes).length > 0) {
    found.push(
      `${map}: ${where} is a component, but its contract declares axes (${Object.keys(contractAxes).join(', ')}). Use a component_set that can represent them.`,
    );
  } else if (entry.assetType === 'component_set') {
    for (const key of Object.keys(contractAxes)) {
      const property = key.charAt(0).toUpperCase() + key.slice(1);
      if (!(property in figmaAxes)) {
        found.push(`${map}: ${where} contract axis "${key}" is missing from axes.`);
      }
    }
  }

  const allowed = new Set(['default']);
  for (const [state, spec] of Object.entries(contract.states ?? {})) {
    allowed.add(normalizeValue(state));
    for (const value of spec.values ?? []) allowed.add(normalizeValue(value));
  }

  for (const [property, values] of Object.entries(entry.designAxes ?? {})) {
    const axisKey = property.charAt(0).toLowerCase() + property.slice(1);
    if (axisKey in contractAxes) {
      found.push(
        `${map}: ${where} designAxes.${property} corresponds to contract axis "${axisKey}" and belongs in axes.`,
      );
    }
    for (const value of values) {
      if (!allowed.has(normalizeValue(value))) {
        found.push(
          `${map}: ${where} designAxes.${property} value "${value}" is neither a state the contract declares nor one of a state's values.`,
        );
      }
    }
  }

  return found;
}

function checkAgainstContract(map, group, key, entry) {
  if (!entry.codePath) return;
  const where = `${group}.${key}`;
  const file = basename(entry.codePath);
  const contractPath = join(REPO_ROOT, entry.codePath, `${file}.contract.json`);
  if (!existsSync(contractPath)) {
    problems.push(`${map}: ${where} codePath "${entry.codePath}" has no ${file}.contract.json.`);
    return;
  }

  problems.push(...contractEntryProblems(map, group, key, entry, readJson(contractPath)));
}

function main() {
  if (!existsSync(FIGMA)) {
    console.log('verify:figma — no .figma/ directory. Nothing to check.');
    return;
  }

  const manifest = readJson(join(FIGMA, 'manifest.json'));
  const sources = Object.keys(manifest.sources ?? {});
  const ajv = new Ajv({ allErrors: true, strict: false });

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

    for (const [name, col] of Object.entries(data.collections ?? {})) {
      if (col.codeSource && !existsSync(join(REPO_ROOT, col.codeSource))) {
        problems.push(
          `${map}: collection "${name}" -> codeSource "${col.codeSource}" does not exist.`,
        );
      }
    }

    for (const [name, v] of Object.entries(data.variables ?? {})) {
      const mapped = data.collections?.[v.collection]?.codeSource;
      if (!mapped && v.code !== null) {
        problems.push(
          `${map}: variable "${name}" claims code "${v.code}" but its collection "${v.collection}" has no codeSource. An unmapped collection must report drift (code: null), not a path.`,
        );
      }
    }

    for (const group of ['components', 'icons']) {
      for (const [name, entry] of Object.entries(data[group] ?? {})) {
        checkAgainstContract(map, group, name, entry);
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

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
