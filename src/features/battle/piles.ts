import { resolveCard } from '@/engine/describe';
import type { CardDef, CardInstance, CardType, CombatState, ContentDB } from '@/engine/types';

import { cardCountLabel } from './strings';

// Card piles shown in the combat top bar. The draw pile is always listed
// sorted and grouped, so the sheet never reveals the draw order.

export type PileId = 'deck' | 'draw' | 'discard' | 'exhaust';

export const PILE_ORDER: readonly PileId[] = ['deck', 'draw', 'discard', 'exhaust'];

export interface PileInfo {
  /** Sheet title. */
  title: string;
  /** Short label under the count in the top bar. */
  short: string;
  icon: string;
}

export const PILE_INFO: Record<PileId, PileInfo> = {
  deck: { title: 'Dein Deck', short: 'Deck', icon: '🗂️' },
  draw: { title: 'Nachziehstapel', short: 'Ziehen', icon: '🎴' },
  discard: { title: 'Ablagestapel', short: 'Ablage', icon: '♻️' },
  exhaust: { title: 'Verbannte Karten', short: 'Verbannt', icon: '🔥' },
};

export type PileCounts = Record<PileId, number>;

/** The cards of one pile; `deck` is the run deck (all cards of the expedition). */
export function pileCards(pile: PileId, combat: CombatState, deck: readonly CardInstance[]): readonly CardInstance[] {
  switch (pile) {
    case 'deck':
      return deck;
    case 'draw':
      return combat.drawPile;
    case 'discard':
      return combat.discardPile;
    case 'exhaust':
      return combat.exhaustPile;
  }
}

export function pileCounts(combat: CombatState, deckSize: number): PileCounts {
  return {
    deck: deckSize,
    draw: combat.drawPile.length,
    discard: combat.discardPile.length,
    exhaust: combat.exhaustPile.length,
  };
}

/** Spoken label of a pile button, e.g. "Nachziehstapel: 7 Karten". */
export function pileAccessibilityLabel(pile: PileId, count: number): string {
  return `${PILE_INFO[pile].title}: ${cardCountLabel(count)}`;
}

export interface PileEntry {
  /** Stable key: def id plus upgrade flag. */
  key: string;
  def: CardDef;
  upgraded: boolean;
  cost: number;
  count: number;
}

const TYPE_ORDER: Record<CardType, number> = { attack: 0, defense: 1, support: 2 };

export function comparePileEntries(a: PileEntry, b: PileEntry): number {
  return (
    TYPE_ORDER[a.def.type] - TYPE_ORDER[b.def.type] ||
    a.cost - b.cost ||
    a.def.name.localeCompare(b.def.name, 'de') ||
    Number(a.upgraded) - Number(b.upgraded) ||
    a.def.id.localeCompare(b.def.id)
  );
}

/**
 * Groups identical cards (same def and upgrade) and sorts them by type
 * (Angriff, Verteidigung, Unterstützung), cost and name. Unknown card ids are
 * skipped.
 */
export function summarizePile(cards: readonly CardInstance[], db: ContentDB): PileEntry[] {
  const groups = new Map<string, PileEntry>();
  for (const card of cards) {
    const def = db.cards[card.defId];
    if (!def) continue;
    const key = `${card.defId}${card.upgraded ? '+' : ''}`;
    const existing = groups.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      groups.set(key, { key, def, upgraded: card.upgraded, cost: resolveCard(def, card.upgraded).cost, count: 1 });
    }
  }
  return [...groups.values()].sort(comparePileEntries);
}
