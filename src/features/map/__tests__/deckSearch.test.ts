import { describe, expect, it } from '@jest/globals';

import { CONTENT } from '@/data';
import type { ContentDB } from '@/engine/types';
import { summarizePile } from '@/features/battle/piles';
import { searchDeckGroups } from '../deckSearch';

const db: ContentDB = { ...CONTENT, cards: {
  eoraptor: { ...CONTENT.cards.eoraptor!, upgrade: { cost: 0, effects: [{ type: 'damage', amount: 9 }] } },
  tanystropheus: CONTENT.cards.tanystropheus!,
} };
const groups = summarizePile([
  { uid: 'a', defId: 'eoraptor', upgraded: false },
  { uid: 'b', defId: 'eoraptor', upgraded: false },
  { uid: 'c', defId: 'eoraptor', upgraded: true },
  { uid: 'd', defId: 'tanystropheus', upgraded: false },
], db);

describe('deck search', () => {
  it('keeps physical duplicates and the original ordering without changing the groups', () => {
    expect(searchDeckGroups(groups, '   ')).toBe(groups);
    expect(searchDeckGroups(groups, '6 Schaden').map((card) => [card.key, card.count])).toEqual([['eoraptor', 2]]);
    expect(groups.reduce((sum, card) => sum + card.count, 0)).toBe(4);
  });

  it('matches the actual upgraded effects and costs rather than the base card', () => {
    for (const query of ['9 Schaden', '0 Energie', 'verbessert']) {
      expect(searchDeckGroups(groups, query).map((card) => card.key)).toEqual(['eoraptor+']);
    }
    expect(searchDeckGroups(groups, 'normal EORAPTOR').map((card) => card.key)).toEqual(['eoraptor']);
  });

  it('combines thematic groups, era and type and only searches owned entries', () => {
    expect(searchDeckGroups(groups, 'Meeresbewohner Fleischfresser Trias Angriff').map((card) => card.key)).toEqual(['tanystropheus']);
    expect(searchDeckGroups(groups, 'Säugetier')).toEqual([]);
    expect(searchDeckGroups(groups, 'Blutung')).toEqual([]);
  });
});
