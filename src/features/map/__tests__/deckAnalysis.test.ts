import { describe, expect, it } from '@jest/globals';

import { CONTENT } from '@/data';
import type { CardInstance, ContentDB } from '@/engine/types';
import { analyzeDeck } from '../deckAnalysis';

const base = Object.values(CONTENT.cards)[0]!;
const db: ContentDB = { ...CONTENT, cards: {
  attack: { ...base, id: 'attack', type: 'attack', cost: 5, tags: ['carnivore', 'pack'], upgrade: { cost: 1 } },
  defense: { ...base, id: 'defense', type: 'defense', cost: 2, tags: ['herbivore'] },
  free: { ...base, id: 'free', type: 'support', cost: 0, tags: ['plant'] },
} };
const card = (uid: string, defId: string, upgraded = false): CardInstance => ({ uid, defId, upgraded });

describe('deck analysis', () => {
  it('counts duplicate physical cards, actual upgraded costs and the 4+ bucket', () => {
    const deck = [card('a', 'attack'), card('b', 'attack', true), card('c', 'defense'), card('d', 'defense'), card('e', 'free')];
    expect(analyzeDeck(db, deck)).toEqual({
      curve: [1, 1, 2, 0, 1], types: { attack: 2, defense: 2, support: 1 }, size: 5, upgraded: 1, averageCost: 2,
      tags: { carnivore: 2, pack: 2, herbivore: 2, plant: 1 },
    });
    expect(deck[0]!.defId).toBe('attack');
  });
  it('handles empty decks and unknown content without dividing by zero', () => {
    const result = analyzeDeck(db, [card('x', 'missing')]);
    expect(result.averageCost).toBe(0);
    expect(result.size).toBe(0);
    expect(result.curve).toEqual([0, 0, 0, 0, 0]);
    expect(result.tags).toEqual({});
  });
});
