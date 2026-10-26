import type { PileEntry } from '@/features/battle/piles';
import { matchesSearch } from '@/features/book/search';
import { getCardView } from '@/ui/format';
import { CARD_TAG_LABELS } from '@/ui/labels';

/** Search owned card groups using their actual upgrade, cost and effects. */
export function searchDeckGroups(groups: readonly PileEntry[], query: string): readonly PileEntry[] {
  if (!query.trim()) return groups;
  return groups.filter((card) => {
    const view = getCardView(card.def, card.upgraded);
    return matchesSearch(
      query, view.name, view.text, view.typeLabel, view.rarityLabel, view.eraLabel,
      `${card.cost} Energie`, card.upgraded ? 'verbessert' : 'normal',
      ...card.def.tags.map((tag) => CARD_TAG_LABELS[tag]),
    );
  });
}
