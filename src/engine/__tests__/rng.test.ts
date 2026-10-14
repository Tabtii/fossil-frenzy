import { describe, expect, it } from '@jest/globals';
import { chance, deriveSeed, nextFloat, nextInt, pick, shuffle, toUint32 } from '@/engine/rng';

/** Reference closure-style mulberry32 (the well-known public-domain version). */
function referenceMulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('nextFloat', () => {
  it('matches the reference mulberry32 sequence', () => {
    for (const seed of [0, 1, 42, 123456789, 0xffffffff]) {
      const reference = referenceMulberry32(seed);
      let state = seed;
      for (let i = 0; i < 200; i++) {
        const roll = nextFloat(state);
        expect(roll.value).toBe(reference());
        state = roll.state;
      }
    }
  });

  it('is deterministic and pure', () => {
    expect(nextFloat(99)).toEqual(nextFloat(99));
    expect(nextFloat(99).value).not.toBe(nextFloat(100).value);
  });

  it('returns floats in [0, 1) and uint32 states', () => {
    let state = 7;
    let bad = 0;
    for (let i = 0; i < 20000; i++) {
      const roll = nextFloat(state);
      const valueOk = roll.value >= 0 && roll.value < 1;
      const stateOk = Number.isInteger(roll.state) && roll.state >= 0 && roll.state <= 0xffffffff;
      if (!valueOk || !stateOk) bad += 1;
      state = roll.state;
    }
    expect(bad).toBe(0);
  });

  it('normalises negative and fractional states to uint32', () => {
    expect(toUint32(-1)).toBe(0xffffffff);
    expect(toUint32(3.9)).toBe(3);
    expect(toUint32(Number.NaN)).toBe(0);
    expect(nextFloat(-1)).toEqual(nextFloat(0xffffffff));
  });
});

describe('nextInt', () => {
  it('stays within inclusive bounds and hits every value', () => {
    const seen = new Set<number>();
    let state = 1;
    for (let i = 0; i < 2000; i++) {
      const roll = nextInt(state, 3, 8);
      expect(roll.value).toBeGreaterThanOrEqual(3);
      expect(roll.value).toBeLessThanOrEqual(8);
      expect(Number.isInteger(roll.value)).toBe(true);
      seen.add(roll.value);
      state = roll.state;
    }
    expect([...seen].sort((a, b) => a - b)).toEqual([3, 4, 5, 6, 7, 8]);
  });

  it('handles single-value and reversed ranges', () => {
    expect(nextInt(5, 4, 4).value).toBe(4);
    const reversed = nextInt(5, 10, 2).value;
    expect(reversed).toBeGreaterThanOrEqual(2);
    expect(reversed).toBeLessThanOrEqual(10);
  });

  it('is roughly uniform', () => {
    const counts = [0, 0, 0, 0];
    let state = 2024;
    const n = 40000;
    for (let i = 0; i < n; i++) {
      const roll = nextInt(state, 0, 3);
      counts[roll.value] = (counts[roll.value] ?? 0) + 1;
      state = roll.state;
    }
    for (const count of counts) {
      expect(count / n).toBeGreaterThan(0.23);
      expect(count / n).toBeLessThan(0.27);
    }
  });
});

describe('shuffle', () => {
  const items = Object.freeze(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']);

  it('returns a permutation without touching the input', () => {
    const result = shuffle(17, items);
    expect([...result.value].sort()).toEqual([...items].sort());
    expect(result.value).not.toBe(items);
    expect(items).toEqual(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']);
  });

  it('is deterministic per state and varies across states', () => {
    expect(shuffle(17, items)).toEqual(shuffle(17, items));
    const orders = new Set<string>();
    for (let seed = 0; seed < 50; seed++) orders.add(shuffle(seed, items).value.join(''));
    expect(orders.size).toBeGreaterThan(40);
  });

  it('advances the state once per swap step', () => {
    let expected = 17;
    for (let i = items.length - 1; i > 0; i--) expected = nextInt(expected, 0, i).state;
    expect(shuffle(17, items).state).toBe(expected);
    expect(shuffle(17, []).value).toEqual([]);
    expect(shuffle(17, ['x'])).toEqual({ value: ['x'], state: 17 });
  });

  it('puts every item in every position over many seeds (no bias towards identity)', () => {
    const positions = new Map<string, Set<number>>();
    for (let seed = 0; seed < 400; seed++) {
      shuffle(seed * 7919, items).value.forEach((item, index) => {
        const set = positions.get(item) ?? new Set<number>();
        set.add(index);
        positions.set(item, set);
      });
    }
    for (const item of items) expect(positions.get(item)?.size).toBe(items.length);
  });
});

describe('pick', () => {
  it('picks an element deterministically', () => {
    const items = ['x', 'y', 'z'];
    const a = pick(5, items);
    expect(items).toContain(a.value);
    expect(pick(5, items)).toEqual(a);
    expect(a.state).toBe(nextFloat(5).state);
  });

  it('throws on an empty array', () => {
    expect(() => pick(1, [])).toThrow(RangeError);
  });
});

describe('chance', () => {
  it('respects 0 % and 100 %', () => {
    let state = 3;
    for (let i = 0; i < 500; i++) {
      expect(chance(state, 0).value).toBe(false);
      expect(chance(state, 100).value).toBe(true);
      state = nextFloat(state).state;
    }
  });

  it('agrees with nextFloat', () => {
    const roll = nextFloat(77);
    expect(chance(77, 50)).toEqual({ value: roll.value < 0.5, state: roll.state });
  });
});

describe('deriveSeed', () => {
  it('is deterministic and returns uint32 values', () => {
    expect(deriveSeed(123, 4)).toBe(deriveSeed(123, 4));
    for (let i = 0; i < 100; i++) {
      const seed = deriveSeed(i * 31, i);
      expect(Number.isInteger(seed)).toBe(true);
      expect(seed).toBeGreaterThanOrEqual(0);
      expect(seed).toBeLessThanOrEqual(0xffffffff);
    }
  });

  it('produces distinct seeds for different salts and states', () => {
    const seeds = new Set<number>();
    for (let salt = 0; salt < 200; salt++) seeds.add(deriveSeed(42, salt));
    for (let state = 0; state < 200; state++) seeds.add(deriveSeed(state, 1000));
    expect(seeds.size).toBe(400);
  });

  it('decorrelates neighbouring inputs', () => {
    const a = nextFloat(deriveSeed(1, 1)).value;
    const b = nextFloat(deriveSeed(1, 2)).value;
    const c = nextFloat(deriveSeed(2, 1)).value;
    expect(new Set([a, b, c]).size).toBe(3);
  });
});
