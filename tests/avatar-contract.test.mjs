import { describe, it, expect } from 'vitest';
import Ajv from 'ajv/dist/2020.js';
import { join } from 'node:path';
import { readJson, contractPaths, REPO_ROOT } from '../scripts/contract-lib.mjs';
import { visibilityCondition } from '../packages/emit-web/contract.mjs';
import { emitTsx } from '../packages/react/src/emit/emit.mjs';
import { emitSfc } from '../packages/vue/src/emit/emit.mjs';
import { emitComponent as emitAngular } from '../packages/angular/src/emit/emit.mjs';
import { emitComponent as emitWebComponent } from '../packages/wc/src/emit/emit.mjs';

const validate = new Ajv({ strict: false }).compile(
  readJson(join(REPO_ROOT, 'packages/contracts/schema/component.schema.json')),
);
const avatar = () => readJson(contractPaths('Avatar').contract);

describe('visibleWhen', () => {
  it('parses a bare state, state=value and state!=value', () => {
    expect(visibilityCondition('open')).toEqual({ state: 'open', op: null, value: null });
    expect(visibilityCondition('checked=mixed')).toEqual({
      state: 'checked',
      op: '===',
      value: 'mixed',
    });
    expect(visibilityCondition('image-status!=loaded')).toEqual({
      state: 'image-status',
      op: '!==',
      value: 'loaded',
    });
  });

  it('rejects anything else', () => {
    expect(() => visibilityCondition('a==b')).toThrow();
    expect(() => visibilityCondition('Open')).toThrow();
  });
});

describe('derivedFrom', () => {
  it('accepts the Avatar contract', () => {
    expect(validate(avatar())).toBe(true);
  });

  it('pins a derived state to internal, authored and absent | loaded | failed', () => {
    for (const change of [
      (s) => (s.control = 'shared'),
      (s) => (s.values = ['absent', 'loaded']),
      (s) => (s.default = 'loaded'),
      (s) => delete s.values,
    ]) {
      const contract = avatar();
      change(contract.states['image-status']);
      expect(validate(contract)).toBe(false);
    }
  });

  it('refuses to emit a state derived from a slot that does not take an image', () => {
    const contract = avatar();
    contract.states['image-status'].derivedFrom.slot = 'fallback';
    const binding = readJson(contractPaths('Avatar').binding);
    expect(() => emitTsx('Avatar', contract, binding, 'juro')).toThrow(/not an image slot/);
  });

  it.each([
    ['Vue', emitSfc],
    ['Angular', emitAngular],
    ['Web Components', emitWebComponent],
  ])('honours a contract that requires resource-observation rejection', (backend, emit) => {
    const contract = avatar();
    contract.component = 'UserCard';
    expect(() => emit('UserCard', contract, {}, 'juro')).toThrow(
      new RegExp(`UserCard: ${backend} cannot observe image slot`),
    );
  });

  it.each([
    ['Vue', emitSfc],
    ['Angular', emitAngular],
    ['Web Components', emitWebComponent],
  ])(
    'honours rejection for a derived resource state even without an image slot',
    (backend, emit) => {
      const contract = avatar();
      delete contract.composition.slots.image;
      expect(() => emit('Avatar', contract, {}, 'juro')).toThrow(
        new RegExp(`${backend} cannot observe state \`image-status\` derived from a slot`),
      );
    },
  );

  it.each([
    ['Vue', emitSfc, /const imageStatus = ref<'absent' \| 'loaded' \| 'failed'>\('absent'\);/],
    [
      'Angular',
      emitAngular,
      /protected readonly imageStatus = signal<'absent' \| 'loaded' \| 'failed'>\('absent'\);/,
    ],
    [
      'Web Components',
      emitWebComponent,
      /protected readonly imageStatus: 'absent' \| 'loaded' \| 'failed' = 'absent';/,
    ],
  ])('%s emits a diagnostic fallback when the contract permits it', (_, emit, expected) => {
    for (const policy of [undefined, 'diagnose']) {
      const contract = avatar();
      if (policy === undefined) delete contract.emission;
      else contract.emission.resourceObservation = policy;
      expect(emit('Avatar', contract, { element: 'div' }, 'juro')).toMatch(expected);
    }
  });

  it('validates the resource-observation policy', () => {
    const contract = avatar();
    contract.emission.resourceObservation = 'ignore';
    expect(validate(contract)).toBe(false);
  });
});

describe('Avatar in React', () => {
  const tsx = emitTsx('Avatar', avatar(), readJson(contractPaths('Avatar').binding), 'juro');

  it('renders the image slot as a decorative <img> fed by a string prop', () => {
    expect(tsx).toMatch(/image\?: string;/);
    expect(tsx).toMatch(/<img src=\{image\} alt=""/);
  });

  it('derives image-status from load and error, per source, and exposes no prop for it', () => {
    expect(tsx).not.toMatch(/imageStatus\?:/);
    expect(tsx).toMatch(/key=\{image\}/);
    expect(tsx).toMatch(
      /onLoad=\{\(\) => setImageStatusOutcome\(\{ source: image as string, status: 'loaded' \}\)\}/,
    );
    expect(tsx).toMatch(
      /onError=\{\(\) => setImageStatusOutcome\(\{ source: image as string, status: 'failed' \}\)\}/,
    );
    expect(tsx).toMatch(
      /imageStatusOutcome\?\.source === image \? imageStatusOutcome\.status : 'absent'/,
    );
  });

  it('discards the previous outcome whenever the source changes', () => {
    expect(tsx).toMatch(/useState\(image\);/);
    expect(tsx).toMatch(
      /if \(imageStatusOutcomeFor !== image\) \{\s*setImageStatusOutcomeFor\(image\);\s*setImageStatusOutcome\(null\);/,
    );
  });

  it('refuses an image slot whose part the anatomy does not declare', () => {
    const contract = avatar();
    delete contract.anatomy.root.parts.image;
    expect(() =>
      emitTsx('Avatar', contract, readJson(contractPaths('Avatar').binding), 'juro'),
    ).toThrow(/image slot `image` names part `image`, which the anatomy does not declare/);
  });

  it('refuses two states derived from the same slot', () => {
    const contract = avatar();
    contract.states['image-status-copy'] = structuredClone(contract.states['image-status']);
    expect(() =>
      emitTsx('Avatar', contract, readJson(contractPaths('Avatar').binding), 'juro'),
    ).toThrow(/both derive from slot `image`/);
  });

  it('shows exactly one of the picture and the initial', () => {
    expect(tsx).toMatch(/hidden=\{!\(imageStatus === 'loaded'\)\}/);
    expect(tsx).toMatch(/hidden=\{!\(imageStatus !== 'loaded'\)\}/);
  });

  it.each([
    [
      'nested anatomy',
      (contract) => (contract.anatomy.root.parts.image.parts = { caption: { part: 'caption' } }),
    ],
    ['component children', (contract) => (contract.composition.children = { part: 'image' })],
  ])('rejects an image part with %s that a void image would discard', (_, change) => {
    const contract = avatar();
    change(contract);
    expect(() =>
      emitTsx('Avatar', contract, readJson(contractPaths('Avatar').binding), 'juro'),
    ).toThrow(/renders as a void <img> and cannot contain/);
  });
});
