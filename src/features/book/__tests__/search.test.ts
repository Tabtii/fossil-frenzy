import { describe, expect, it } from '@jest/globals';

import { CONTENT } from '@/data';
import { describeCard } from '@/engine/describe';
import { collectionRows, fossilTiles } from '../model';
import { matchesSearch } from '../search';

describe('archive search', () => {
  it('ignores case, accents and extra whitespace, and matches every query word', () => {
    expect(matchesSearch('  SABEL   KATZE ', 'Säbel', 'Katze')).toBe(true);
    expect(matchesSearch('gross', 'groß')).toBe(true);
    expect(matchesSearch('sabel eiszeit', 'Säbelkatze', 'Jura')).toBe(false);
    expect(matchesSearch('   ', 'anything')).toBe(true);
  });

  it('finds a discovered fossil by its scientific name and location', () => {
    const entry = CONTENT.fossils.eoraptor!;
    const records = { eoraptor: { discoveredAt: '2026-10-23T10:00:00Z', timesFound: 1 } };
    expect(fossilTiles(CONTENT, records, 'all', Date.now(), entry.scientificName).map((x) => x.id)).toContain('eoraptor');
    expect(fossilTiles(CONTENT, records, 'all', Date.now(), entry.foundIn).map((x) => x.id)).toContain('eoraptor');
    expect(fossilTiles(CONTENT, records, 'eiszeit', Date.now(), entry.scientificName)).toHaveLength(0);
  });

  it('never reveals an undiscovered fossil or card through searching', () => {
    const entry = CONTENT.fossils.eoraptor!;
    expect(fossilTiles(CONTENT, {}, 'all', Date.now(), entry.name)).toHaveLength(0);
    expect(collectionRows(CONTENT, [], { era: 'all', type: 'all', query: CONTENT.cards.eoraptor!.name }, 2)).toHaveLength(0);
  });

  it('searches discovered card effects while preserving era and type filters', () => {
    const def = CONTENT.cards.eoraptor!;
    const query = describeCard(def, false);
    const rows = collectionRows(CONTENT, [def.id], { era: 'all', type: 'all', query }, 2);
    expect(rows.flatMap((row) => row.kind === 'row' ? row.items.map((item) => item.id) : [])).toEqual([def.id]);
    expect(collectionRows(CONTENT, [def.id], { era: 'eiszeit', type: 'all', query }, 2)).toHaveLength(0);
  });
});
