import type { ContentDB } from '@/engine/types';
import { CARDS, STARTER_DECK } from './cards';
import { ENEMIES } from './enemies';
import { FOSSILS } from './fossils';

function byId<T extends { id: string }>(items: readonly T[]): Record<string, T> {
  return Object.fromEntries(items.map((item) => [item.id, item]));
}

export const CONTENT: ContentDB = {
  cards: byId(CARDS),
  enemies: byId(ENEMIES),
  fossils: byId(FOSSILS),
  starterDeck: STARTER_DECK,
};
