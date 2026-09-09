import { describe, expect, it } from 'vitest';
import { composeHexOpacity } from './paint.mjs';

describe('composeHexOpacity', () => {
  it.each([
    ['#1e1e1e', 0.9, 'rgb(30 30 30 / 0.9)'],
    ['#5146e6', 0.4, 'rgb(81 70 230 / 0.4)'],
    ['#FFFFFF', 0.2, 'rgb(255 255 255 / 0.2)'],
  ])('composes %s at %s opacity', (hex, opacity, expected) => {
    expect(composeHexOpacity(hex, opacity)).toBe(expected);
  });

  it('rejects values that cannot produce the declared paint shape', () => {
    expect(() => composeHexOpacity('#1234', 0.4)).toThrow('Expected a resolved #rrggbb color');
    expect(() => composeHexOpacity('#ffffff', 1.1)).toThrow('Expected opacity from 0 to 1');
  });
});
