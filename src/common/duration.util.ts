const UNIT_SECONDS: Record<string, number> = {
  s: 1,
  m: 60,
  h: 60 * 60,
  d: 24 * 60 * 60,
  w: 7 * 24 * 60 * 60,
};

export function parseDurationToSeconds(value: string): number {
  const match = /^(\d+)\s*([smhdw])?$/i.exec(value.trim());
  if (!match) {
    throw new Error(
      `Invalid duration "${value}", expected e.g. "12h", "30m" or a number of seconds`,
    );
  }
  const [, amount, unit] = match;
  const multiplier = unit ? UNIT_SECONDS[unit.toLowerCase()] : 1;
  return Number(amount) * multiplier;
}
