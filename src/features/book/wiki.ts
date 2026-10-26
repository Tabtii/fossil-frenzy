import type { ContentDB, FossilEntry, FossilKind } from '@/engine/types';
import { DIET_LABELS, ERA_LABELS, FOSSIL_KIND_LABELS } from '@/ui/labels';

import { type EraFilter, matchesEra, sortFossils } from './model';
import { matchesSearch } from './search';

export type WikiKindFilter = FossilKind | 'all';
export const WIKI_KIND_FILTERS: readonly WikiKindFilter[] = [
  'all', 'dinosaur', 'pterosaur', 'marine-reptile', 'mammal', 'reptile', 'bird', 'fish', 'invertebrate', 'plant',
];

/** Reading never depends on, or changes, expedition discoveries. */
export function wikiEntries(
  db: ContentDB,
  { era, kind, query }: { era: EraFilter; kind: WikiKindFilter; query: string },
): FossilEntry[] {
  return sortFossils(Object.values(db.fossils).filter((entry) =>
    matchesEra(entry.era, era) && (kind === 'all' || entry.kind === kind) && matchesSearch(
      query, entry.name, entry.scientificName, entry.foundIn, ERA_LABELS[entry.era],
      FOSSIL_KIND_LABELS[entry.kind], DIET_LABELS[entry.diet], ...entry.facts,
    ),
  ));
}
