#!/usr/bin/env node
/**
 * `pnpm verify:tokens` — enforce the authoring decisions for source DTCG tokens.
 *
 * Style Dictionary proves that it can transform the files. It does not prove that aliases point
 * at a real token, that public path segments follow the naming contract, or that an alpha-bearing
 * palette color did not bypass the separate opacity model. Those are repository contracts, so they
 * need a repository gate.
 */

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TOKENS_DIR = join(REPO_ROOT, 'packages', 'tokens', 'tokens');
const SEGMENT = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ALIAS = /^\{([^{}]+)\}$/;
const problems = [];
const tokens = new Map();

function visit(value, path, file) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    problems.push(`${file}: ${path.join('.') || '<root>'} must be an object.`);
    return;
  }

  if (Object.hasOwn(value, '$value')) {
    const name = path.join('.');
    if (!name) problems.push(`${file}: a token cannot live at the document root.`);
    if (!Object.hasOwn(value, '$type')) problems.push(`${file}: ${name} has no $type.`);
    const childKeys = Object.keys(value).filter((key) => !key.startsWith('$'));
    if (childKeys.length) {
      problems.push(`${file}: ${name} is both a token and a group (${childKeys.join(', ')}).`);
    }
    if (tokens.has(name)) {
      problems.push(
        `${file}: duplicate token path ${name}; first declared in ${tokens.get(name).file}.`,
      );
    } else {
      tokens.set(name, { ...value, file });
    }
    return;
  }

  for (const [key, child] of Object.entries(value)) {
    if (key.startsWith('$')) continue;
    if (!SEGMENT.test(key)) {
      problems.push(`${file}: ${[...path, key].join('.')} has a non-kebab-case path segment.`);
    }
    visit(child, [...path, key], file);
  }
}

function isAlias(value) {
  return typeof value === 'string' ? value.match(ALIAS) : null;
}

function validateValue(name, token) {
  const value = token.$value;
  const alias = isAlias(value);
  if (alias) {
    const target = tokens.get(alias[1]);
    if (!target) {
      problems.push(`${token.file}: ${name} aliases missing token ${alias[1]}.`);
    } else if (target.$type !== token.$type) {
      problems.push(
        `${token.file}: ${name} (${token.$type}) aliases ${alias[1]} (${target.$type}).`,
      );
    }
    return;
  }

  const valid =
    (token.$type === 'color' &&
      typeof value === 'string' &&
      /^#[0-9a-f]{6}(?:[0-9a-f]{2})?$/i.test(value)) ||
    (token.$type === 'dimension' &&
      typeof value === 'string' &&
      /^-?(?:\d+|\d*\.\d+)(?:px|rem)$/.test(value)) ||
    (token.$type === 'number' && typeof value === 'number' && Number.isFinite(value)) ||
    (token.$type === 'fontFamily' && typeof value === 'string') ||
    (token.$type === 'fontWeight' && typeof value === 'number' && Number.isFinite(value));

  if (!valid) {
    problems.push(
      `${token.file}: ${name} has unsupported value ${JSON.stringify(value)} for $type ${JSON.stringify(token.$type)}.`,
    );
  }
}

if (!existsSync(TOKENS_DIR)) {
  console.log('verify:tokens — no token source directory. Nothing to check.');
  process.exit(0);
}

const files = readdirSync(TOKENS_DIR)
  .filter((file) => file.endsWith('.json'))
  .sort();

for (const filename of files) {
  const file = relative(REPO_ROOT, join(TOKENS_DIR, filename));
  let data;
  try {
    data = JSON.parse(readFileSync(join(TOKENS_DIR, filename), 'utf8'));
  } catch (error) {
    problems.push(`${file}: invalid JSON (${error.message}).`);
    continue;
  }
  visit(data, [], file);
}

for (const [name, token] of tokens) {
  validateValue(name, token);

  if (token.file.endsWith('color.palette.json') && isAlias(token.$value)) {
    problems.push(`${token.file}: palette token ${name} must be a literal.`);
  }
  if (token.file.endsWith('color.semantic.json')) {
    const alias = isAlias(token.$value);
    const target = alias ? tokens.get(alias[1]) : null;
    if (!alias || !target?.file.endsWith('color.palette.json')) {
      problems.push(`${token.file}: semantic token ${name} must alias a palette primitive.`);
    }
  }
  if (
    token.$type === 'color' &&
    typeof token.$value === 'string' &&
    /^#[0-9a-f]{8}$/i.test(token.$value) &&
    name !== 'color.base.transparent'
  ) {
    problems.push(`${token.file}: ${name} bakes alpha into color; use an opacity token.`);
  }
  if (/^space\.\d+$/.test(name) && typeof token.$description !== 'string') {
    problems.push(`${token.file}: ${name} must explain that its numeric suffix is a scale index.`);
  }
  if (name.startsWith('color.control.')) {
    problems.push(
      `${token.file}: ${name} is component-specific and cannot be a global color role.`,
    );
  }
  if (name.startsWith('paint.')) {
    problems.push(`${token.file}: ${name} uses the reserved namespace for derived web paints.`);
  }
  if (
    /^opacity\.\d+$/.test(name) &&
    (typeof token.$value !== 'number' || token.$value < 0 || token.$value > 1)
  ) {
    problems.push(`${token.file}: primitive opacity ${name} must be a number from 0 to 1.`);
  }
}

const semanticOpacities = [...tokens.entries()].filter(
  ([name]) => name.startsWith('opacity.') && !/^opacity\.\d+$/.test(name),
);
for (const [name, token] of semanticOpacities) {
  const suffix = name.slice('opacity.'.length);
  const colorName = `color.${suffix}`;
  const color = tokens.get(colorName);
  if (!color || color.$type !== 'color' || !color.file.endsWith('color.semantic.json')) {
    problems.push(`${token.file}: ${name} has no homonymous semantic color ${colorName}.`);
  }

  const alias = isAlias(token.$value);
  if (!alias || !/^opacity\.\d+$/.test(alias[1])) {
    problems.push(`${token.file}: semantic opacity ${name} must alias a primitive opacity step.`);
  }
}

if (problems.length) {
  console.error(`verify:tokens failed — ${problems.length} problem(s):\n`);
  for (const problem of problems.sort()) console.error(`  ${problem}`);
  process.exit(1);
}

console.log(
  `verify:tokens OK — ${tokens.size} token(s), ${semanticOpacities.length} color/opacity pair(s), ${files.length} source file(s).`,
);
