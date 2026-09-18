import { describe, expect, it } from 'vitest';
import { parseDurationToSeconds } from './duration.util';

describe('parseDurationToSeconds', () => {
  it.each([
    ['30', 30],
    ['45s', 45],
    ['12m', 12 * 60],
    ['12h', 12 * 60 * 60],
    ['7d', 7 * 24 * 60 * 60],
    ['2w', 2 * 7 * 24 * 60 * 60],
  ])('parses "%s" as %d seconds', (input, expected) => {
    expect(parseDurationToSeconds(input)).toBe(expected);
  });

  it('throws on an invalid duration', () => {
    expect(() => parseDurationToSeconds('not-a-duration')).toThrow();
  });
});
