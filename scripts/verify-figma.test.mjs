import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import Ajv from 'ajv';
import { describe, expect, it } from 'vitest';
import { contractEntryProblems } from './verify-figma.mjs';

const schema = JSON.parse(
  readFileSync(
    fileURLToPath(new URL('../.figma/schema/components.schema.json', import.meta.url)),
    'utf8',
  ),
);

const validateMap = (entry, group = 'components') => {
  const validate = new Ajv({ allErrors: true, strict: false }).compile(schema);
  return validate({
    _schema: '1.0',
    lastScanned: null,
    source: 'weave',
    components: group === 'components' ? { Button: entry } : {},
    ...(group === 'icons' ? { icons: { Icon: entry } } : {}),
  });
};

const entry = (assetType, extra = {}) => ({
  source: 'weave',
  assetType,
  codePath: 'packages/contracts/components/Button',
  axes: {},
  ...extra,
});

const contract = (extra = {}) => ({ component: 'Button', states: {}, axes: {}, ...extra });

describe('components map schema', () => {
  it.each(['component', 'component_set'])('requires codePath for a modelled %s', (assetType) => {
    expect(validateMap({ source: 'weave', assetType, codePath: null })).toBe(false);
    expect(validateMap({ source: 'weave', assetType })).toBe(false);
  });

  it('allows a not-modelled entry to have no code path', () => {
    expect(validateMap({ source: 'weave', assetType: 'not-modelled', codePath: null })).toBe(true);
  });

  it('does not require a component contract for an icon set', () => {
    expect(
      validateMap({ source: 'weave', assetType: 'component_set', codePath: null }, 'icons'),
    ).toBe(true);
  });
});

describe('component map contract checks', () => {
  it('rejects a plain component when its contract declares axes', () => {
    const problems = contractEntryProblems(
      'maps/components.json',
      'components',
      'Button',
      entry('component'),
      contract({ axes: { size: { values: ['s', 'm'] } } }),
    );

    expect(problems).toEqual([
      expect.stringContaining('is a component, but its contract declares axes (size)'),
    ]);
  });

  it('requires every contract axis on a component set', () => {
    const problems = contractEntryProblems(
      'maps/components.json',
      'components',
      'Button',
      entry('component_set'),
      contract({ axes: { size: { values: ['s', 'm'] } } }),
    );

    expect(problems).toEqual([expect.stringContaining('contract axis "size" is missing')]);
  });

  it('reports a non-contract axis as a divergence, not automatically as a design axis', () => {
    const problems = contractEntryProblems(
      'maps/components.json',
      'components',
      'Button',
      entry('component_set', { axes: { Content: ['Icon'] } }),
      contract(),
    );

    expect(problems).toEqual([
      expect.stringContaining('any other non-contract axis is a divergence'),
    ]);
  });

  it('accepts visual state axes with state names and enumerated values', () => {
    const problems = contractEntryProblems(
      'maps/components.json',
      'components',
      'Button',
      entry('component_set', {
        designAxes: { State: ['Default', 'Hover', 'Unchecked', 'Checked', 'Mixed'] },
      }),
      contract({
        states: {
          hover: { control: 'internal' },
          checked: { control: 'shared', values: ['unchecked', 'checked', 'mixed'] },
        },
      }),
    );

    expect(problems).toEqual([]);
  });

  it('rejects a contract that does not match the map key', () => {
    const problems = contractEntryProblems(
      'maps/components.json',
      'components',
      'Button',
      entry('component'),
      { component: 'TabItem' },
    );

    expect(problems).toEqual([expect.stringContaining('contract for "TabItem", not "Button"')]);
  });
});
