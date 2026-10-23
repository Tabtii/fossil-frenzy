import { describeCard } from '@/engine/describe';
import {
  type CardDef,
  type CardType,
  type ContentDB,
  type EnemyDef,
  type EnemyTier,
  type Era,
  ERAS,
  type FossilEntry,
  type FossilRecord,
  type Rarity,
} from '@/engine/types';
import { formatMya, formatNumberDe } from '@/ui/format';
import { ERA_LABELS, RARITY_LABELS } from '@/ui/labels';
import { matchesSearch } from './search';

// Pure view models for the fossil book and the card collection. No React, no
// store access: everything here is unit-tested.

// ---------------------------------------------------------------------------
// Filters and progress
// ---------------------------------------------------------------------------

export type EraFilter = Era | 'all';
export type TypeFilter = CardType | 'all';

export const ERA_FILTERS: readonly EraFilter[] = ['all', ...ERAS];
export const TYPE_FILTERS: readonly TypeFilter[] = ['all', 'attack', 'defense', 'support'];

export interface Progress {
  found: number;
  total: number;
}

/** "12 von 50 entdeckt" */
export function progressLabel(progress: Progress, noun: string = 'entdeckt'): string {
  return `${progress.found} von ${progress.total} ${noun}`;
}

/** Share of found items in 0…1 (0 for an empty set). */
export function progressRatio(progress: Progress): number {
  return progress.total > 0 ? Math.min(1, Math.max(0, progress.found / progress.total)) : 0;
}

export function matchesEra(era: Era, filter: EraFilter): boolean {
  return filter === 'all' || filter === era;
}

// ---------------------------------------------------------------------------
// Responsive grids
// ---------------------------------------------------------------------------

/** Content width from which grids get an extra column (tablets, landscape). */
export const WIDE_CONTENT_MIN = 520;
/** Window width below which the fossil grid uses two columns (small Android). */
export const COMPACT_WINDOW_MAX = 360;

/**
 * Columns of the fossil grid: 2 below 360 dp, 3 on phones, 4 when the content
 * column is wide (tablets, landscape).
 */
export function fossilGridColumns(windowWidth: number, contentWidth: number): number {
  if (windowWidth < COMPACT_WINDOW_MAX) return 2;
  return contentWidth >= WIDE_CONTENT_MIN ? 4 : 3;
}

/** Columns of the card collection grid (hand-size cards stay readable). */
export function cardGridColumns(contentWidth: number): number {
  return contentWidth >= WIDE_CONTENT_MIN ? 4 : 3;
}

/** Width of one grid cell so `columns` cells and their gaps fit `available`. */
export function gridItemWidth(available: number, columns: number, gap: number): number {
  const cols = Math.max(1, Math.floor(columns));
  return Math.max(1, Math.floor((Math.max(0, available) - gap * (cols - 1)) / cols));
}

/** Splits items into rows of `size` (the last row may be shorter). */
export function chunk<T>(items: readonly T[], size: number): T[][] {
  const step = Math.max(1, Math.floor(size));
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += step) rows.push(items.slice(i, i + step));
  return rows;
}

// ---------------------------------------------------------------------------
// Fossil book
// ---------------------------------------------------------------------------

function eraIndex(era: Era): number {
  return ERAS.indexOf(era);
}

/** Era order, then age (oldest first), then name; returns a new array. */
export function sortFossils<T extends Pick<FossilEntry, 'id' | 'era' | 'mya' | 'name'>>(entries: readonly T[]): T[] {
  return [...entries].sort(
    (a, b) =>
      eraIndex(a.era) - eraIndex(b.era) ||
      b.mya[0] - a.mya[0] ||
      b.mya[1] - a.mya[1] ||
      a.name.localeCompare(b.name) ||
      a.id.localeCompare(b.id),
  );
}

/** A fossil counts as "new" for this long after its first discovery. */
export const NEW_FOSSIL_WINDOW_MS = 24 * 60 * 60 * 1000;

/** True when the fossil was first found less than `windowMs` before `nowMs`. */
export function isRecentDiscovery(
  record: FossilRecord | undefined,
  nowMs: number,
  windowMs: number = NEW_FOSSIL_WINDOW_MS,
): boolean {
  if (!record) return false;
  const at = Date.parse(record.discoveredAt);
  if (Number.isNaN(at)) return false;
  return nowMs - at >= 0 && nowMs - at < windowMs;
}

/** Grid tile; undiscovered tiles carry no name or emoji (nothing to leak). */
export type FossilTile =
  | { id: string; era: Era; discovered: true; name: string; emoji: string; isNew: boolean }
  | { id: string; era: Era; discovered: false };

export function fossilTiles(
  db: ContentDB,
  records: Readonly<Record<string, FossilRecord>>,
  filter: EraFilter,
  nowMs: number,
  query = '',
): FossilTile[] {
  const entries = sortFossils(Object.values(db.fossils).filter((entry) =>
    matchesEra(entry.era, filter) && (!query.trim() || (records[entry.id] !== undefined && matchesSearch(query, entry.name, entry.scientificName, entry.foundIn))),
  ));
  return entries.map((entry): FossilTile => {
    const record = records[entry.id];
    if (!record) return { id: entry.id, era: entry.era, discovered: false };
    return {
      id: entry.id,
      era: entry.era,
      discovered: true,
      name: entry.name,
      emoji: entry.emoji,
      isNew: isRecentDiscovery(record, nowMs),
    };
  });
}

/** Discovered/total fossils overall and per era (ignores records of removed content). */
export function fossilCounts(
  db: ContentDB,
  records: Readonly<Record<string, FossilRecord>>,
): Record<EraFilter, Progress> {
  const counts = Object.fromEntries(ERA_FILTERS.map((filter) => [filter, { found: 0, total: 0 }])) as Record<
    EraFilter,
    Progress
  >;
  for (const entry of Object.values(db.fossils)) {
    const found = records[entry.id] !== undefined ? 1 : 0;
    counts.all.total += 1;
    counts.all.found += found;
    counts[entry.era].total += 1;
    counts[entry.era].found += found;
  }
  return counts;
}

export function fossilTileAccessibilityLabel(tile: FossilTile): string {
  if (!tile.discovered) return `Unentdecktes Fossil aus der Ära ${ERA_LABELS[tile.era]}`;
  return `${tile.name}, ${ERA_LABELS[tile.era]}${tile.isNew ? ', neu entdeckt' : ''}`;
}

/** Label of an era filter chip, e.g. "Trias 3/12". */
export function eraFilterLabel(filter: EraFilter): string {
  return filter === 'all' ? 'Alle' : ERA_LABELS[filter];
}

/** Empty state text when a filter shows nothing discovered yet. */
export function emptyBookMessage(filter: EraFilter, progress: Progress): { title: string; message: string } {
  const where = filter === 'all' ? 'auf deinen Expeditionen' : ERA_LOCATIVE[filter];
  const waiting = progress.total === 1 ? 'Ein Fossil wartet darauf' : `${progress.total} Fossilien warten darauf`;
  return {
    title: 'Noch nichts entdeckt',
    message: `${waiting}, ${where} ausgegraben zu werden.`,
  };
}

// ---------------------------------------------------------------------------
// Fossil detail
// ---------------------------------------------------------------------------

/** "in der Trias (Akt 1)" style phrases for hints. */
export const ERA_LOCATIVE: Record<Era, string> = {
  trias: 'in der Trias',
  jura: 'im Jura',
  kreide: 'in der Kreidezeit',
  eiszeit: 'in der Eiszeit',
};

/** 1-based act in which the era is played. */
export function actForEra(era: Era): number {
  return eraIndex(era) + 1;
}

/** Fossil age text; kept as the book's name for `formatMya`. */
export const formatFossilAge = formatMya;

const MONTHS_DE = [
  'Januar',
  'Februar',
  'März',
  'April',
  'Mai',
  'Juni',
  'Juli',
  'August',
  'September',
  'Oktober',
  'November',
  'Dezember',
] as const;

/** "14. Oktober 2026" in the device's local time zone; null for invalid input. */
export function formatDateDe(iso: string): string | null {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return `${date.getDate()}. ${MONTHS_DE[date.getMonth()] ?? ''} ${date.getFullYear()}`;
}

/** "Gefunden: 3×" */
export function timesFoundText(times: number): string {
  return `Gefunden: ${formatNumberDe(Math.max(0, times), 0)}×`;
}

function bySortKey<T>(items: T[], key: (item: T) => (number | string)[]): T[] {
  return items.sort((a, b) => {
    const ka = key(a);
    const kb = key(b);
    for (let i = 0; i < ka.length; i += 1) {
      const x = ka[i];
      const y = kb[i];
      if (x === y || x === undefined || y === undefined) continue;
      return typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y));
    }
    return 0;
  });
}

const RARITY_ORDER: Record<Rarity, number> = { starter: 0, common: 1, uncommon: 2, rare: 3 };
const TYPE_ORDER: Record<CardType, number> = { attack: 0, defense: 1, support: 2 };
const TIER_ORDER: Record<EnemyTier, number> = { normal: 0, elite: 1, boss: 2 };

/** Era, rarity, type, cost, name: the order of the collection. */
export function sortCards(defs: readonly CardDef[]): CardDef[] {
  return bySortKey([...defs], (def) => [
    eraIndex(def.era),
    RARITY_ORDER[def.rarity],
    TYPE_ORDER[def.type],
    def.cost,
    def.name,
    def.id,
  ]);
}

/** Card defs that unlock this fossil. */
export function relatedCards(db: ContentDB, fossilId: string): CardDef[] {
  return sortCards(Object.values(db.cards).filter((def) => def.fossilId === fossilId));
}

/** Enemies that drop this fossil when defeated. */
export function relatedEnemies(db: ContentDB, fossilId: string): EnemyDef[] {
  return bySortKey(
    Object.values(db.enemies).filter((def) => def.fossilId === fossilId),
    (def) => [eraIndex(def.era), TIER_ORDER[def.tier], def.name, def.id],
  );
}

export const ENEMY_TIER_LABELS: Record<EnemyTier, string> = {
  normal: 'Gegner',
  elite: 'Elite-Gegner',
  boss: 'Boss',
};

/** "Elite-Gegner · 40–46 LP" */
export function enemySubtitle(def: Pick<EnemyDef, 'tier' | 'hp'>): string {
  const [min, max] = def.hp;
  const hp = min === max ? `${min}` : `${min}–${max}`;
  return `${ENEMY_TIER_LABELS[def.tier]} · ${hp} LP`;
}

/**
 * How to find an undiscovered fossil, without naming it: era/act plus whether
 * it comes from a card choice or a defeated enemy.
 */
export function lockedHint(db: ContentDB, entry: Pick<FossilEntry, 'id' | 'era'>): string {
  const where = `Dieses Fossil wartet ${ERA_LOCATIVE[entry.era]} (Akt ${actForEra(entry.era)}) auf dich.`;
  const ways: string[] = [];
  if (Object.values(db.cards).some((def) => def.fossilId === entry.id)) {
    ways.push('Wähle die passende Karte als Belohnung oder bei einer Ausgrabung');
  }
  const tiers = new Set(relatedEnemies(db, entry.id).map((def) => def.tier));
  if (tiers.has('boss')) ways.push('besiege den Boss dieser Ära');
  else if (tiers.has('elite')) ways.push('besiege einen Elite-Gegner');
  else if (tiers.has('normal')) ways.push('besiege den passenden Gegner');
  if (ways.length === 0) return `${where} Halte auf deinen Expeditionen die Augen offen!`;
  const how = ways.join(' – oder ');
  return `${where} ${how.charAt(0).toUpperCase()}${how.slice(1)}.`;
}

// ---------------------------------------------------------------------------
// Card collection
// ---------------------------------------------------------------------------

export type CollectionItem =
  | { id: string; seen: true; def: CardDef }
  /** Unseen cards only reveal era and rarity. */
  | { id: string; seen: false; era: Era; rarity: Rarity };

export type CollectionRow =
  | { kind: 'header'; key: string; era: Era; progress: Progress }
  | { kind: 'row'; key: string; items: CollectionItem[] };

export interface CollectionFilter {
  era: EraFilter;
  type: TypeFilter;
  query?: string;
}

export function cardCounts(db: ContentDB, cardsSeen: readonly string[]): Progress {
  const seen = new Set(cardsSeen);
  const ids = Object.keys(db.cards);
  return { found: ids.filter((id) => seen.has(id)).length, total: ids.length };
}

/** "12/43 Karten entdeckt" */
export function cardCounterText(progress: Progress): string {
  return `${progress.found}/${progress.total} Karten entdeckt`;
}

/**
 * Collection grid rows: one header per era (with its filtered progress), then
 * rows of `columns` items. Eras without matching cards are left out.
 */
export function collectionRows(
  db: ContentDB,
  cardsSeen: readonly string[],
  filter: CollectionFilter,
  columns: number,
): CollectionRow[] {
  const seen = new Set(cardsSeen);
  const defs = sortCards(
    Object.values(db.cards).filter(
      (def) => matchesEra(def.era, filter.era) && (filter.type === 'all' || def.type === filter.type) &&
        (!filter.query?.trim() || (seen.has(def.id) && matchesSearch(filter.query, def.name, describeCard(def, false)))),
    ),
  );
  const rows: CollectionRow[] = [];
  for (const era of ERAS) {
    const items = defs
      .filter((def) => def.era === era)
      .map(
        (def): CollectionItem =>
          seen.has(def.id)
            ? { id: def.id, seen: true, def }
            : { id: def.id, seen: false, era: def.era, rarity: def.rarity },
      );
    if (items.length === 0) continue;
    rows.push({
      kind: 'header',
      key: `h-${era}`,
      era,
      progress: { found: items.filter((item) => item.seen).length, total: items.length },
    });
    chunk(items, columns).forEach((rowItems, index) => {
      rows.push({ kind: 'row', key: `r-${era}-${index}`, items: rowItems });
    });
  }
  return rows;
}

export function lockedCardAccessibilityLabel(item: { era: Era; rarity: Rarity }): string {
  return `Noch nicht entdeckte Karte, ${RARITY_LABELS[item.rarity]}, ${ERA_LABELS[item.era]}`;
}

/** "Trias · 4/13" */
export function eraSectionText(era: Era, progress: Progress): string {
  return `${ERA_LABELS[era]} · ${progress.found}/${progress.total}`;
}
