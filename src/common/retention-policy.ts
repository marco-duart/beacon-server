export const RETENTION_POLICIES = [
  'unlimited',
  '90d',
  '30d',
  '7d',
  '72h',
  '24h',
] as const;

export type RetentionPolicy = (typeof RETENTION_POLICIES)[number];

const RETENTION_POLICY_MS: Record<
  Exclude<RetentionPolicy, 'unlimited'>,
  number
> = {
  '90d': 90 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
  '72h': 72 * 60 * 60 * 1000,
  '24h': 24 * 60 * 60 * 1000,
};

export function resolveRetentionCutoff(
  policy: RetentionPolicy,
  now = Date.now(),
): number | null {
  if (policy === 'unlimited') {
    return null;
  }
  return now - RETENTION_POLICY_MS[policy];
}
