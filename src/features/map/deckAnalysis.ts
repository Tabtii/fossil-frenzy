import { resolveCard } from '@/engine/describe';
import type { CardInstance, CardType, ContentDB } from '@/engine/types';

/** Counts physical cards, including duplicates; upgraded costs are the actual costs. */
export function analyzeDeck(db: ContentDB, deck: readonly CardInstance[]) {
  const curve = [0, 0, 0, 0, 0];
  const types: Record<CardType, number> = { attack: 0, defense: 0, support: 0 };
  let totalCost = 0;
  let size = 0;
  let upgraded = 0;
  for (const card of deck) {
    const def = db.cards[card.defId];
    if (!def) continue;
    const cost = resolveCard(def, card.upgraded).cost;
    curve[Math.min(4, Math.max(0, cost))]! += 1;
    types[def.type] += 1;
    totalCost += cost;
    size += 1;
    if (card.upgraded) upgraded += 1;
  }
  return { curve, types, size, upgraded, averageCost: size === 0 ? 0 : totalCost / size };
}
