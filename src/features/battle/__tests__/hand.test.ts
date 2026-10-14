import { describe, expect, it } from '@jest/globals';

import { inst, makeState, TEST_DB } from '@/engine/combat/__fixtures__/content';

import { buildHandEntries, findHandEntry, hasAffordableCard, shouldPlayOnRelease } from '../hand';

describe('buildHandEntries', () => {
  it('maps the hand to entries with cost, affordability and damage preview', () => {
    const strike = inst('strike');
    const boulder = inst('boulder');
    const defend = inst('defend', true);
    const combat = makeState({ hand: [strike, boulder, defend], energy: 2, enemy: { statuses: { vulnerable: 1 } } });
    const entries = buildHandEntries(TEST_DB, combat);
    expect(entries.map((entry) => entry.uid)).toEqual([strike.uid, boulder.uid, defend.uid]);
    expect(entries[0]).toMatchObject({ cost: 1, affordable: true, previewDamage: 9, upgraded: false });
    expect(entries[1]).toMatchObject({ cost: 3, affordable: false, previewDamage: 30 });
    expect(entries[2]).toMatchObject({ cost: 1, affordable: true, previewDamage: null, upgraded: true });
    expect(entries[0]?.def).toBe(TEST_DB.cards.strike);
  });

  it('skips unknown cards', () => {
    const entries = buildHandEntries(TEST_DB, makeState({ hand: [inst('nope'), inst('strike')] }));
    expect(entries.map((entry) => entry.def.id)).toEqual(['strike']);
  });

  it('finds entries and detects whether anything is affordable', () => {
    const strike = inst('strike');
    const entries = buildHandEntries(TEST_DB, makeState({ hand: [strike], energy: 0 }));
    expect(findHandEntry(entries, strike.uid)?.uid).toBe(strike.uid);
    expect(findHandEntry(entries, 'missing')).toBeNull();
    expect(findHandEntry(entries, null)).toBeNull();
    expect(hasAffordableCard(entries)).toBe(false);
    expect(hasAffordableCard(buildHandEntries(TEST_DB, makeState({ hand: [strike] })))).toBe(true);
    expect(hasAffordableCard([])).toBe(false);
  });
});

describe('shouldPlayOnRelease', () => {
  it('plays after dragging past the threshold', () => {
    expect(shouldPlayOnRelease(-60, 0, 60)).toBe(true);
    expect(shouldPlayOnRelease(-59, 0, 60)).toBe(false);
  });

  it('plays a quick upward flick after a third of the distance', () => {
    expect(shouldPlayOnRelease(-25, -1200, 60)).toBe(true);
    expect(shouldPlayOnRelease(-15, -1200, 60)).toBe(false);
    expect(shouldPlayOnRelease(-25, -400, 60)).toBe(false);
  });

  it('never plays on downward movement', () => {
    expect(shouldPlayOnRelease(40, -2000, 60)).toBe(false);
    expect(shouldPlayOnRelease(0, 0, 60)).toBe(false);
  });
});
