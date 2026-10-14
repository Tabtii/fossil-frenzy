import { describe, expect, it } from '@jest/globals';

import { CONTENT } from '@/data';
import { inst, makeState, TEST_DB } from '@/engine/combat/__fixtures__/content';

import { PILE_INFO, PILE_ORDER, pileAccessibilityLabel, pileCards, pileCounts, summarizePile } from '../piles';

describe('summarizePile', () => {
  it('groups identical cards and counts them', () => {
    const cards = [inst('strike'), inst('defend'), inst('strike'), inst('strike', true), inst('strike')];
    const entries = summarizePile(cards, TEST_DB);
    const strike = entries.find((entry) => entry.key === 'strike');
    const strikePlus = entries.find((entry) => entry.key === 'strike+');
    expect(strike?.count).toBe(3);
    expect(strikePlus?.count).toBe(1);
    expect(strikePlus?.upgraded).toBe(true);
    expect(entries.reduce((sum, entry) => sum + entry.count, 0)).toBe(cards.length);
  });

  it('sorts by type, cost and name (never by pile order)', () => {
    const cards = [
      inst('study'), // support, 1
      inst('defend'), // defense, 1
      inst('boulder'), // attack, 3
      inst('jab'), // attack, 0
      inst('bash'), // attack, 2
      inst('flex'), // support, 0
    ];
    const keys = summarizePile(cards, TEST_DB).map((entry) => entry.key);
    expect(keys).toEqual(['jab', 'bash', 'boulder', 'defend', 'flex', 'study']);
    // The same cards in another order give the same list.
    expect(summarizePile([...cards].reverse(), TEST_DB).map((entry) => entry.key)).toEqual(keys);
  });

  it('uses the upgraded cost for sorting', () => {
    const entries = summarizePile([inst('mend'), inst('mend', true)], TEST_DB);
    expect(entries.map((entry) => [entry.key, entry.cost])).toEqual([
      ['mend+', 0],
      ['mend', 1],
    ]);
  });

  it('lists the base version before the upgraded one at equal cost', () => {
    const entries = summarizePile([inst('twin', true), inst('twin')], TEST_DB);
    expect(entries.map((entry) => entry.key)).toEqual(['twin', 'twin+']);
  });

  it('skips unknown cards and handles empty piles', () => {
    expect(summarizePile([inst('does-not-exist')], TEST_DB)).toEqual([]);
    expect(summarizePile([], TEST_DB)).toEqual([]);
  });

  it('works with the real starter deck', () => {
    const deck = CONTENT.starterDeck.map((id) => inst(id));
    const entries = summarizePile(deck, CONTENT);
    expect(entries.reduce((sum, entry) => sum + entry.count, 0)).toBe(CONTENT.starterDeck.length);
    expect(entries.length).toBe(new Set(CONTENT.starterDeck).size);
  });
});

describe('piles', () => {
  const combat = makeState({
    drawPile: [inst('strike'), inst('defend')],
    discardPile: [inst('bash')],
    exhaustPile: [],
  });
  const deck = [inst('strike'), inst('strike'), inst('defend')];

  it('returns the cards and counts of each pile', () => {
    expect(pileCards('draw', combat, deck)).toBe(combat.drawPile);
    expect(pileCards('discard', combat, deck)).toBe(combat.discardPile);
    expect(pileCards('exhaust', combat, deck)).toBe(combat.exhaustPile);
    expect(pileCards('deck', combat, deck)).toBe(deck);
    expect(pileCounts(combat, deck.length)).toEqual({ deck: 3, draw: 2, discard: 1, exhaust: 0 });
  });

  it('has German labels for every pile', () => {
    for (const pile of PILE_ORDER) {
      expect(PILE_INFO[pile].title.length).toBeGreaterThan(0);
      expect(PILE_INFO[pile].short.length).toBeLessThanOrEqual(8);
    }
    expect(pileAccessibilityLabel('draw', 7)).toBe('Nachziehstapel: 7 Karten');
    expect(pileAccessibilityLabel('discard', 1)).toBe('Ablagestapel: 1 Karte');
  });
});
