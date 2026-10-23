import { deriveSeed } from '@/engine/rng';

/** Human-readable uint32 seed; never round or silently truncate pasted codes. */
export function expeditionCode(seed: number): string {
  return `FF-${(seed >>> 0).toString(16).toUpperCase().padStart(8, '0')}`;
}

export function parseExpeditionCode(input: string): number | null {
  const match = /^(?:FF-)?([0-9A-F]{8})$/i.exec(input.trim());
  return match ? Number.parseInt(match[1]!, 16) : null;
}

/** A UTC day is shared across devices, time zones and restarts. No server needed. */
export function dailyExpedition(date: Date): { seed: number; code: string; dateLabel: string; day: string } {
  if (!Number.isFinite(date.getTime())) throw new RangeError('Invalid expedition date');
  const day = date.toISOString().slice(0, 10);
  const seed = deriveSeed(Number(day.replaceAll('-', '')), 0x46465232);
  return {
    seed,
    code: expeditionCode(seed),
    day,
    dateLabel: date.toLocaleDateString('de-DE', { day: 'numeric', month: 'long', timeZone: 'UTC' }),
  };
}
