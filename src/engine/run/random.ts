import { nextFloat, nextInt, type RngResult } from '../rng';

/**
 * Picks one entry proportionally to its weight. Entries with a weight <= 0 are
 * ignored. Returns `undefined` (without consuming randomness) when nothing is
 * pickable.
 */
export function weightedPick<T>(
  state: number,
  entries: readonly (readonly [T, number])[],
): RngResult<T | undefined> {
  const usable = entries.filter(([, weight]) => weight > 0);
  const total = usable.reduce((sum, [, weight]) => sum + weight, 0);
  if (usable.length === 0 || total <= 0) return { value: undefined, state };

  const roll = nextFloat(state);
  let threshold = roll.value * total;
  for (const [value, weight] of usable) {
    threshold -= weight;
    if (threshold < 0) return { value, state: roll.state };
  }
  // Floating point slack: fall back to the last usable entry.
  const last = usable[usable.length - 1];
  return { value: last?.[0], state: roll.state };
}

/** Uniform pick that is safe on empty arrays (returns `undefined`, state unchanged). */
export function pickOne<T>(state: number, items: readonly T[]): RngResult<T | undefined> {
  if (items.length === 0) return { value: undefined, state };
  const roll = nextInt(state, 0, items.length - 1);
  return { value: items[roll.value], state: roll.state };
}

export function byId<T extends { id: string }>(a: T, b: T): number {
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}
