const UNIT_TO_MS: Record<string, number> = {
  s: 1000,
  m: 60 * 1000,
  h: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000,
};

export function parseDurationToMs(value: string, fallbackMs: number): number {
  const match = value.trim().match(/^(\d+)\s*([smhd])$/i);

  if (!match) {
    return fallbackMs;
  }

  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();

  const multiplier = UNIT_TO_MS[unit];
  if (!multiplier || !Number.isFinite(amount) || amount <= 0) {
    return fallbackMs;
  }

  return amount * multiplier;
}

