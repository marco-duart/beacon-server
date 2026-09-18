import { describe, expect, it } from 'vitest';
import { resolveRetentionCutoff } from './retention-policy';

describe('resolveRetentionCutoff', () => {
  it('returns null for unlimited retention', () => {
    expect(resolveRetentionCutoff('unlimited')).toBeNull();
  });

  it.each([
    ['24h', 24 * 60 * 60 * 1000],
    ['72h', 72 * 60 * 60 * 1000],
    ['7d', 7 * 24 * 60 * 60 * 1000],
    ['30d', 30 * 24 * 60 * 60 * 1000],
    ['90d', 90 * 24 * 60 * 60 * 1000],
  ] as const)('subtracts the right window for %s', (policy, windowMs) => {
    const now = Date.parse('2026-01-10T00:00:00.000Z');
    expect(resolveRetentionCutoff(policy, now)).toBe(now - windowMs);
  });
});
