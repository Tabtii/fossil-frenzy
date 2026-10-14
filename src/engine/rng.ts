// Deterministic RNG (mulberry32). The generator state is a plain uint32 that
// lives in the game state, so every random decision is reproducible from a
// seed and all functions here are pure: (state, …) → { value, state }.

export interface RngResult<T> {
  value: T;
  state: number;
}

/** mulberry32 increment (golden-ratio based Weyl sequence). */
const MULBERRY_INCREMENT = 0x6d2b79f5;
const UINT32_RANGE = 4294967296; // 2^32

/** Coerces any number (negative, fractional, NaN) into a uint32 state. */
export function toUint32(value: number): number {
  return value >>> 0;
}

/** Float in [0, 1). */
export function nextFloat(state: number): RngResult<number> {
  const next = (toUint32(state) + MULBERRY_INCREMENT) >>> 0;
  let t = next;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  const value = ((t ^ (t >>> 14)) >>> 0) / UINT32_RANGE;
  return { value, state: next };
}

/**
 * Integer in [min, max] inclusive. Bounds are rounded inwards (ceil/floor);
 * reversed bounds are swapped instead of throwing so bad content cannot crash
 * a running game.
 */
export function nextInt(state: number, min: number, max: number): RngResult<number> {
  const lo = Math.ceil(Math.min(min, max));
  const hi = Math.floor(Math.max(min, max));
  const roll = nextFloat(state);
  if (hi <= lo) return { value: lo, state: roll.state };
  return { value: lo + Math.floor(roll.value * (hi - lo + 1)), state: roll.state };
}

/** Returns a shuffled copy (Fisher–Yates); the input array is not modified. */
export function shuffle<T>(state: number, items: readonly T[]): RngResult<T[]> {
  const result = items.slice();
  let current = toUint32(state);
  for (let i = result.length - 1; i > 0; i--) {
    const roll = nextInt(current, 0, i);
    current = roll.state;
    const j = roll.value;
    const tmp = result[i] as T;
    result[i] = result[j] as T;
    result[j] = tmp;
  }
  return { value: result, state: current };
}

/** Picks one element uniformly. Throws on an empty array (programming error). */
export function pick<T>(state: number, items: readonly T[]): RngResult<T> {
  if (items.length === 0) {
    throw new RangeError('pick() called with an empty array');
  }
  const roll = nextInt(state, 0, items.length - 1);
  return { value: items[roll.value] as T, state: roll.state };
}

/** True with the given probability in percent (0–100). Always consumes one roll. */
export function chance(state: number, percent: number): RngResult<boolean> {
  const roll = nextFloat(state);
  return { value: roll.value * 100 < percent, state: roll.state };
}

/** murmur3 32-bit finalizer: good avalanche for seed derivation. */
function fmix32(input: number): number {
  let h = input >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return (h ^ (h >>> 16)) >>> 0;
}

/** Derives an independent seed (e.g. per combat) from a state. */
export function deriveSeed(state: number, salt: number): number {
  const mixedState = fmix32(toUint32(state));
  const mixedSalt = Math.imul((toUint32(salt) + 1) >>> 0, 0x9e3779b9);
  return fmix32((mixedState ^ mixedSalt) >>> 0);
}
