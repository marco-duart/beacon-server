import { createHash } from 'node:crypto';

const TOP_FRAMES = 5;

export function computeFingerprint(
  type: string,
  message: string,
  stacktrace?: string | Record<string, unknown>[],
): string {
  const normalizedMessage = message.replace(/\d+/g, '#').trim().toLowerCase();
  const frameSignature = extractFrameSignature(stacktrace);

  return createHash('sha256')
    .update(`${type}\n${normalizedMessage}\n${frameSignature}`)
    .digest('hex');
}

function extractFrameSignature(
  stacktrace?: string | Record<string, unknown>[],
): string {
  if (!stacktrace) {
    return '';
  }

  if (typeof stacktrace === 'string') {
    return stacktrace
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, TOP_FRAMES)
      .join('\n');
  }

  return stacktrace
    .slice(0, TOP_FRAMES)
    .map((frame) => JSON.stringify(frame))
    .join('\n');
}
