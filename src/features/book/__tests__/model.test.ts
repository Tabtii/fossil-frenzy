import { describe, expect, it } from '@jest/globals';

import { CONTENT } from '@/data';
import { type CardDef, type ContentDB, ERAS, type FossilEntry, type FossilRecord } from '@/engine/types';

import {
  cardCounterText,
  cardCounts,
  cardGridColumns,
  chunk,
  collectionRows,
  emptyBookMessage,
  enemySubtitle,
  fossilCounts,
  fossilGridColumns,
  fossilTileAccessibilityLabel,
  fossilTiles,
  formatDateDe,
  formatFossilAge,
  gridItemWidth,
  isRecentDiscovery,
  lockedCardAccessibilityLabel,
  lockedHint,
  NEW_FOSSIL_WINDOW_MS,
  progressLabel,
  progressRatio,
  relatedCards,
  relatedEnemies,
  sortCards,
  sortFossils,
  timesFoundText,
} from '../model';

const NOW = Date.parse('2026-10-14T12:00:00.000Z');

function record(discoveredAt: string, timesFound = 1): FossilRecord {
  return { discoveredAt, timesFound };
}

function fossil(id: string, era: FossilEntry['era'], mya: [number, number], name = id): FossilEntry {
  return {
    id,
    name,
    scientificName: name,
    emoji: '🦴',
    era,
    kind: 'dinosaur',
    mya,
    diet: 'carnivore',
    foundIn: 'Testland',
    facts: ['a', 'b'],
  };
}

function card(id: string, overrides: Partial<CardDef> = {}): CardDef {
  return {
    id,
    name: id,
    emoji: '🃏',
    era: 'trias',
    type: 'attack',
    rarity: 'common',
    cost: 1,
    tags: [],
    effects: [{ type: 'damage', amount: 6 }],
    upgrade: {},
    fossilId: id,
    ...overrides,
  };
}

const MINI_DB: ContentDB = {
  fossils: {
    late: fossil('late', 'trias', [210, 205], 'Spät'),
    early: fossil('early', 'trias', [231, 228], 'Früh'),
    jura: fossil('jura', 'jura', [150, 148]),
    ice: fossil('ice', 'eiszeit', [1, 0]),
    orphan: fossil('orphan', 'kreide', [70, 66]),
  },
  cards: {
    early: card('early', { rarity: 'rare', type: 'support' }),
    late: card('late', { rarity: 'common', type: 'defense' }),
    jura: card('jura', { era: 'jura', rarity: 'uncommon' }),
  },
  enemies: {
    jura: {
      id: 'jura',
      name: 'Jura-Boss',
      emoji: '🦖',
      era: 'jura',
      tier: 'boss',
      hp: [120, 130],
      moves: [{ id: 'bite', name: 'Biss', effects: [{ type: 'attack', amount: 5 }] }],
      pattern: { type: 'cycle' },
      fossilId: 'jura',
    },
    ice: {
      id: 'ice',
      name: 'Eis',
      emoji: '🦣',
      era: 'eiszeit',
      tier: 'normal',
      hp: [20, 20],
      moves: [{ id: 'bite', name: 'Biss', effects: [{ type: 'attack', amount: 5 }] }],
      pattern: { type: 'cycle' },
      fossilId: 'ice',
    },
  },
  starterDeck: [],
};

describe('grid helpers', () => {
  it('uses 2 fossil columns below 360 dp, 3 on phones and 4 on wide content', () => {
    expect(fossilGridColumns(320, 320)).toBe(2);
    expect(fossilGridColumns(359, 359)).toBe(2);
    expect(fossilGridColumns(360, 360)).toBe(3);
    expect(fossilGridColumns(430, 430)).toBe(3);
    expect(fossilGridColumns(768, 560)).toBe(4);
    expect(fossilGridColumns(844, 560)).toBe(4);
  });

  it('uses 3 card columns on phones and 4 on wide content', () => {
    expect(cardGridColumns(320)).toBe(3);
    expect(cardGridColumns(430)).toBe(3);
    expect(cardGridColumns(560)).toBe(4);
  });

  it('fits cells and gaps into the available width at all phone sizes', () => {
    for (const width of [320, 360, 390, 430]) {
      const inner = width - 2 * (width < 360 ? 12 : 16);
      for (const columns of [2, 3, 4]) {
        const cell = gridItemWidth(inner, columns, 8);
        expect(cell * columns + 8 * (columns - 1)).toBeLessThanOrEqual(inner);
        expect(cell).toBeGreaterThan(0);
      }
    }
    expect(gridItemWidth(0, 3, 8)).toBe(1);
    expect(gridItemWidth(100, 0, 8)).toBe(100);
  });

  it('chunks items into rows', () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(chunk([], 3)).toEqual([]);
    expect(chunk([1, 2], 0)).toEqual([[1], [2]]);
  });
});

describe('progress', () => {
  it('formats and clamps progress', () => {
    expect(progressLabel({ found: 12, total: 50 })).toBe('12 von 50 entdeckt');
    expect(progressRatio({ found: 5, total: 10 })).toBe(0.5);
    expect(progressRatio({ found: 0, total: 0 })).toBe(0);
    expect(progressRatio({ found: 12, total: 10 })).toBe(1);
  });
});

describe('fossil book', () => {
  it('sorts by era, then oldest first', () => {
    const ids = sortFossils(Object.values(MINI_DB.fossils)).map((entry) => entry.id);
    expect(ids).toEqual(['early', 'late', 'jura', 'orphan', 'ice']);
  });

  it('sorts the real content by era and age', () => {
    const sorted = sortFossils(Object.values(CONTENT.fossils));
    for (let i = 1; i < sorted.length; i += 1) {
      const prev = sorted[i - 1]!;
      const next = sorted[i]!;
      const eraDiff = ERAS.indexOf(prev.era) - ERAS.indexOf(next.era);
      expect(eraDiff).toBeLessThanOrEqual(0);
      if (eraDiff === 0) expect(prev.mya[0]).toBeGreaterThanOrEqual(next.mya[0]);
    }
  });

  it('builds tiles without leaking undiscovered names', () => {
    const records = { early: record('2026-10-14T08:00:00.000Z'), jura: record('2026-01-01T08:00:00.000Z', 3) };
    const tiles = fossilTiles(MINI_DB, records, 'all', NOW);
    expect(tiles.map((tile) => tile.id)).toEqual(['early', 'late', 'jura', 'orphan', 'ice']);
    expect(tiles[0]).toEqual({ id: 'early', era: 'trias', discovered: true, name: 'Früh', emoji: '🦴', isNew: true });
    expect(tiles[1]).toEqual({ id: 'late', era: 'trias', discovered: false });
    expect(tiles[2]).toMatchObject({ discovered: true, isNew: false });
    expect(fossilTileAccessibilityLabel(tiles[1]!)).toBe('Unentdecktes Fossil aus der Ära Trias');
    expect(fossilTileAccessibilityLabel(tiles[0]!)).toBe('Früh, Trias, neu entdeckt');
    expect(fossilTileAccessibilityLabel(tiles[1]!)).not.toContain('Spät');
  });

  it('filters tiles by era', () => {
    expect(fossilTiles(MINI_DB, {}, 'trias', NOW).map((tile) => tile.id)).toEqual(['early', 'late']);
    expect(fossilTiles(MINI_DB, {}, 'kreide', NOW).map((tile) => tile.id)).toEqual(['orphan']);
  });

  it('counts per era and ignores records of removed content', () => {
    const counts = fossilCounts(MINI_DB, { early: record('x'), ice: record('x'), removed: record('x') });
    expect(counts.all).toEqual({ found: 2, total: 5 });
    expect(counts.trias).toEqual({ found: 1, total: 2 });
    expect(counts.jura).toEqual({ found: 0, total: 1 });
    expect(counts.eiszeit).toEqual({ found: 1, total: 1 });
  });

  it('marks only recent discoveries as new', () => {
    expect(isRecentDiscovery(undefined, NOW)).toBe(false);
    expect(isRecentDiscovery(record('kaputt'), NOW)).toBe(false);
    expect(isRecentDiscovery(record(new Date(NOW - 1000).toISOString()), NOW)).toBe(true);
    expect(isRecentDiscovery(record(new Date(NOW - NEW_FOSSIL_WINDOW_MS).toISOString()), NOW)).toBe(false);
    expect(isRecentDiscovery(record(new Date(NOW + 60_000).toISOString()), NOW)).toBe(false);
  });

  it('writes an empty state message per filter', () => {
    expect(emptyBookMessage('trias', { found: 0, total: 12 }).message).toBe(
      '12 Fossilien warten darauf, in der Trias ausgegraben zu werden.',
    );
    expect(emptyBookMessage('all', { found: 0, total: 1 }).message).toBe(
      'Ein Fossil wartet darauf, auf deinen Expeditionen ausgegraben zu werden.',
    );
  });
});

describe('fossil detail', () => {
  it('formats ages including living species', () => {
    expect(formatFossilAge([231, 228])).toBe('vor 231–228 Mio. Jahren');
    expect(formatFossilAge([1, 0])).toBe('vor 1 Mio. Jahren bis heute');
    expect(formatFossilAge([0.004, 0])).toBe('vor 4.000 Jahren bis heute');
    expect(formatFossilAge([0, 0])).toBe('heute');
    expect(formatFossilAge([0.4, 0.004])).toBe('vor 400.000–4.000 Jahren');
    for (const entry of Object.values(CONTENT.fossils)) {
      const text = formatFossilAge(entry.mya);
      expect(text).not.toMatch(/ 0 Jahren/);
      expect(text.length).toBeGreaterThan(0);
    }
  });

  it('formats dates in German', () => {
    expect(formatDateDe('2026-10-14T12:00:00')).toBe('14. Oktober 2026');
    expect(formatDateDe('2025-03-01T12:00:00')).toBe('1. März 2025');
    expect(formatDateDe('kein Datum')).toBeNull();
    expect(timesFoundText(3)).toBe('Gefunden: 3×');
  });

  it('finds related cards and enemies', () => {
    expect(relatedCards(MINI_DB, 'jura').map((def) => def.id)).toEqual(['jura']);
    expect(relatedEnemies(MINI_DB, 'jura').map((def) => def.id)).toEqual(['jura']);
    expect(relatedCards(MINI_DB, 'orphan')).toEqual([]);
    expect(enemySubtitle(MINI_DB.enemies.jura!)).toBe('Boss · 120–130 LP');
    expect(enemySubtitle(MINI_DB.enemies.ice!)).toBe('Gegner · 20 LP');
  });

  it('links every real fossil to at least one card or enemy (ids are shared)', () => {
    for (const id of Object.keys(CONTENT.cards)) {
      expect(relatedCards(CONTENT, CONTENT.cards[id]!.fossilId).length).toBeGreaterThan(0);
    }
    for (const enemy of Object.values(CONTENT.enemies)) {
      expect(relatedEnemies(CONTENT, enemy.fossilId).map((def) => def.id)).toContain(enemy.id);
    }
  });

  it('gives a locked hint with era and source but without the name', () => {
    const early = lockedHint(MINI_DB, MINI_DB.fossils.early!);
    expect(early).toBe(
      'Dieses Fossil wartet in der Trias (Akt 1) auf dich. Wähle die passende Karte als Belohnung oder bei einer Ausgrabung.',
    );
    expect(lockedHint(MINI_DB, MINI_DB.fossils.jura!)).toBe(
      'Dieses Fossil wartet im Jura (Akt 2) auf dich. Wähle die passende Karte als Belohnung oder bei einer Ausgrabung – oder besiege den Boss dieser Ära.',
    );
    expect(lockedHint(MINI_DB, MINI_DB.fossils.ice!)).toBe(
      'Dieses Fossil wartet in der Eiszeit (Akt 4) auf dich. Besiege den passenden Gegner.',
    );
    expect(lockedHint(MINI_DB, MINI_DB.fossils.orphan!)).toContain('Augen offen');
    for (const entry of Object.values(CONTENT.fossils)) {
      expect(lockedHint(CONTENT, entry)).not.toContain(entry.name);
    }
  });
});

describe('collection', () => {
  it('sorts cards by era, rarity, type and cost', () => {
    const defs = [
      card('b', { era: 'jura' }),
      card('c', { rarity: 'rare' }),
      card('a', { rarity: 'starter' }),
      card('d', { type: 'support' }),
      card('e', { cost: 0 }),
    ];
    expect(sortCards(defs).map((def) => def.id)).toEqual(['a', 'e', 'd', 'c', 'b']);
  });

  it('counts seen cards and ignores unknown ids', () => {
    const progress = cardCounts(MINI_DB, ['early', 'removed']);
    expect(progress).toEqual({ found: 1, total: 3 });
    expect(cardCounterText(progress)).toBe('1/3 Karten entdeckt');
  });

  it('groups rows by era with headers and hides unseen details', () => {
    const rows = collectionRows(MINI_DB, ['late'], { era: 'all', type: 'all' }, 3);
    expect(rows.map((row) => row.key)).toEqual(['h-trias', 'r-trias-0', 'h-jura', 'r-jura-0']);
    const trias = rows[1];
    if (trias?.kind !== 'row') throw new Error('expected row');
    expect(trias.items).toEqual([
      { id: 'late', seen: true, def: MINI_DB.cards.late },
      { id: 'early', seen: false, era: 'trias', rarity: 'rare' },
    ]);
    expect(rows[0]).toEqual({ kind: 'header', key: 'h-trias', era: 'trias', progress: { found: 1, total: 2 } });
    expect(lockedCardAccessibilityLabel({ era: 'trias', rarity: 'rare' })).toBe(
      'Noch nicht entdeckte Karte, Selten, Trias',
    );
  });

  it('filters by era and type and splits rows by column count', () => {
    expect(collectionRows(MINI_DB, [], { era: 'jura', type: 'all' }, 3).map((row) => row.key)).toEqual([
      'h-jura',
      'r-jura-0',
    ]);
    expect(collectionRows(MINI_DB, [], { era: 'all', type: 'defense' }, 3).map((row) => row.key)).toEqual([
      'h-trias',
      'r-trias-0',
    ]);
    expect(collectionRows(MINI_DB, [], { era: 'kreide', type: 'all' }, 3)).toEqual([]);
    expect(collectionRows(MINI_DB, [], { era: 'trias', type: 'all' }, 1).map((row) => row.key)).toEqual([
      'h-trias',
      'r-trias-0',
      'r-trias-1',
    ]);
  });

  it('covers every real card exactly once', () => {
    const rows = collectionRows(CONTENT, [], { era: 'all', type: 'all' }, 3);
    const ids = rows.flatMap((row) => (row.kind === 'row' ? row.items.map((item) => item.id) : []));
    expect(ids.length).toBe(Object.keys(CONTENT.cards).length);
    expect(new Set(ids).size).toBe(ids.length);
    for (const row of rows) if (row.kind === 'row') expect(row.items.length).toBeLessThanOrEqual(3);
  });
});
