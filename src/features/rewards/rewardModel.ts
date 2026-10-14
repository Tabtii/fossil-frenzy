import { REST_HEAL_PERCENT } from '@/engine/run';
import type { CardDef, CardInstance, ContentDB, FossilEntry, FossilRecord } from '@/engine/types';
import { cardHeightFor } from '@/ui/layout';
import { getCardView } from '@/ui/format';

// Pure helpers for the reward, dig and rest screens. No React, no store.

// ---------------------------------------------------------------------------
// Fossil finds
// ---------------------------------------------------------------------------

export interface FossilFind {
  fossil: FossilEntry;
  /**
   * First find ever. Meta is already updated when the reward screen shows, so
   * a first find is a record with `timesFound === 1`.
   */
  isNew: boolean;
}

/** Fossil entries of a reward (unknown ids and duplicates are skipped). */
export function fossilFinds(
  db: ContentDB,
  fossilIds: readonly string[],
  records: Readonly<Record<string, FossilRecord>>,
): FossilFind[] {
  const seen = new Set<string>();
  const finds: FossilFind[] = [];
  for (const id of fossilIds) {
    const fossil = db.fossils[id];
    if (!fossil || seen.has(id)) continue;
    seen.add(id);
    finds.push({ fossil, isNew: records[id]?.timesFound === 1 });
  }
  return finds;
}

// ---------------------------------------------------------------------------
// Card choices
// ---------------------------------------------------------------------------

/** Card defs for a list of choice ids (unknown ids are skipped). */
export function choiceDefs(db: ContentDB, ids: readonly string[]): CardDef[] {
  return ids.map((id) => db.cards[id]).filter((def): def is CardDef => def !== undefined);
}

export const CHOICE_CARD_MAX_WIDTH = 240;
export const CHOICE_CARD_MIN_WIDTH = 168;
export const CHOICE_CARD_GAP = 12;
/** Share of the inner width a carousel card takes (the next card peeks in). */
const CHOICE_WIDTH_RATIO = 0.7;
/** Max. share of the window height a carousel card may take. */
const CHOICE_HEIGHT_RATIO = 0.44;

export interface CarouselMetrics {
  cardWidth: number;
  cardHeight: number;
  gap: number;
  /** Horizontal padding so the first and last card can be centred. */
  sidePadding: number;
  /** Distance between two snap points. */
  snapInterval: number;
  /** Total width of the scroll content. */
  contentWidth: number;
}

/**
 * Snap carousel for 1-of-n card choices: full-size cards that fit 320 dp
 * phones (the neighbour peeks in) and short screens (height cap).
 */
export function choiceCarouselMetrics(viewportWidth: number, windowHeight: number, count: number): CarouselMetrics {
  const byWidth = Math.floor(viewportWidth * CHOICE_WIDTH_RATIO);
  const byHeight = Math.floor((windowHeight * CHOICE_HEIGHT_RATIO) / 1.4);
  const cardWidth = Math.max(
    Math.min(CHOICE_CARD_MIN_WIDTH, Math.max(0, viewportWidth - 2 * CHOICE_CARD_GAP)),
    Math.min(CHOICE_CARD_MAX_WIDTH, byWidth, byHeight),
  );
  const sidePadding = Math.max(0, Math.round((viewportWidth - cardWidth) / 2));
  const snapInterval = cardWidth + CHOICE_CARD_GAP;
  const n = Math.max(0, count);
  return {
    cardWidth,
    cardHeight: cardHeightFor(cardWidth),
    gap: CHOICE_CARD_GAP,
    sidePadding,
    snapInterval,
    contentWidth: sidePadding * 2 + n * cardWidth + Math.max(0, n - 1) * CHOICE_CARD_GAP,
  };
}

/** Scroll offset that centres card `index`. */
export function carouselOffset(metrics: CarouselMetrics, index: number): number {
  return Math.max(0, index) * metrics.snapInterval;
}

/** Index of the centred card for a scroll offset (clamped to 0..count-1). */
export function carouselIndex(metrics: CarouselMetrics, offset: number, count: number): number {
  if (count <= 0 || metrics.snapInterval <= 0) return 0;
  return Math.min(count - 1, Math.max(0, Math.round(offset / metrics.snapInterval)));
}

// ---------------------------------------------------------------------------
// Rest site
// ---------------------------------------------------------------------------

/** HP actually healed by resting (30 % of max HP, rounded up, capped at max HP). */
export function restHealAmount(hp: number, maxHp: number): number {
  const heal = Math.ceil((maxHp * REST_HEAL_PERCENT) / 100);
  return Math.max(0, Math.min(heal, maxHp - Math.max(0, hp)));
}

export interface UpgradeOption {
  card: CardInstance;
  def: CardDef;
}

/** Deck cards that can still be upgraded, in deck order. */
export function upgradableCards(db: ContentDB, deck: readonly CardInstance[]): UpgradeOption[] {
  const options: UpgradeOption[] = [];
  for (const card of deck) {
    if (card.upgraded) continue;
    const def = db.cards[card.defId];
    if (def) options.push({ card, def });
  }
  return options;
}

export interface UpgradeGroup {
  def: CardDef;
  /** Uids of the not yet upgraded copies, in deck order. */
  uids: string[];
}

/** Upgrade options grouped by card (copies of one card upgrade the same way). */
export function groupUpgradeOptions(options: readonly UpgradeOption[]): UpgradeGroup[] {
  const groups = new Map<string, UpgradeGroup>();
  for (const { card, def } of options) {
    const group = groups.get(def.id);
    if (group) group.uids.push(card.uid);
    else groups.set(def.id, { def, uids: [card.uid] });
  }
  return [...groups.values()];
}

export interface UpgradePreview {
  costBefore: number;
  costAfter: number;
  textBefore: string;
  textAfter: string;
  /** German summary lines, e.g. "Kosten 2 → 1". */
  changes: string[];
}

/** What an upgrade changes (cost and/or rules text). */
export function upgradePreview(def: CardDef): UpgradePreview {
  const before = getCardView(def, false);
  const after = getCardView(def, true);
  const changes: string[] = [];
  if (before.cost !== after.cost) changes.push(`Kosten ${before.cost} → ${after.cost} Energie`);
  if (before.text !== after.text) changes.push(`Neu: ${after.text}`);
  if (before.exhaust && !after.exhaust) changes.push('Wird nicht mehr verbannt');
  if (changes.length === 0) changes.push('Keine sichtbare Änderung');
  return {
    costBefore: before.cost,
    costAfter: after.cost,
    textBefore: before.text,
    textAfter: after.text,
    changes,
  };
}

/** Columns of the upgrade grid for mini cards of `cardWidth` dp. */
export function gridColumns(availableWidth: number, cardWidth: number, gap: number): number {
  if (cardWidth <= 0) return 1;
  return Math.max(1, Math.floor((availableWidth + gap) / (cardWidth + gap)));
}
