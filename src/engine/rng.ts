// CONTRACT STUB — deterministic RNG (mulberry32). State is a uint32 stored in game state.

export interface RngResult<T> {
  value: T;
  state: number;
}

/** Float in [0, 1). */
export function nextFloat(state: number): RngResult<number> {
  throw new Error('not implemented');
}

/** Integer in [min, max] inclusive. */
export function nextInt(state: number, min: number, max: number): RngResult<number> {
  throw new Error('not implemented');
}

export function shuffle<T>(state: number, items: readonly T[]): RngResult<T[]> {
  throw new Error('not implemented');
}

export function pick<T>(state: number, items: readonly T[]): RngResult<T> {
  throw new Error('not implemented');
}

/** Derives an independent seed (e.g. per combat) from a state. */
export function deriveSeed(state: number, salt: number): number {
  throw new Error('not implemented');
}
