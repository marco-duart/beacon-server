import { createHash, randomBytes } from 'node:crypto';

const KEY_PREFIX = 'bcn_live_';

export interface GeneratedApiKey {
  plainKey: string;
  hash: string;
  displayPrefix: string;
}

export function generateApiKey(): GeneratedApiKey {
  const plainKey = `${KEY_PREFIX}${randomBytes(24).toString('hex')}`;
  return {
    plainKey,
    hash: hashApiKey(plainKey),
    displayPrefix: plainKey.slice(0, KEY_PREFIX.length + 8),
  };
}

export function hashApiKey(plainKey: string): string {
  return createHash('sha256').update(plainKey).digest('hex');
}
