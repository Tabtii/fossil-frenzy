import { router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, type ListRenderItem, StyleSheet, View } from 'react-native';

import { CONTENT } from '@/data';
import type { FossilEntry } from '@/engine/types';
import { fossilRoute, ROUTES } from '@/features/navigation';
import { usePressGuard } from '@/features/shell/hooks';
import * as haptics from '@/lib/haptics';
import { useHydrated, useMeta } from '@/state/selectors';
import { AppText, colors, EmptyState, eraColors, FOSSIL_KIND_LABELS, Header, Screen, SearchField, spacing, Surface, useLayout } from '@/ui';

import { FilterChips, type FilterChipOption } from './components/FilterChips';
import { FossilTile } from './components/FossilTile';
import { ProgressBar } from './components/ProgressBar';
import { WikiTile } from './components/WikiTile';
import { useBackTo, useMountTime } from './hooks';
import {
  emptyBookMessage,
  ERA_FILTERS,
  type EraFilter,
  eraFilterLabel,
  type FossilTile as FossilTileModel,
  fossilCounts,
  fossilGridColumns,
  fossilTiles,
  gridItemWidth,
  progressLabel,
} from './model';
import { wikiEntries, WIKI_KIND_FILTERS, type WikiKindFilter } from './wiki';

const GAP = spacing.sm;

function keyExtractor(tile: { id: string }): string {
  return tile.id;
}

const MODES = [{ value: 'wiki', label: 'Dino-Wiki' }, { value: 'finds', label: 'Meine Funde' }] as const;
const KIND_OPTIONS = WIKI_KIND_FILTERS.map((value) => ({ value, label: value === 'all' ? 'Alle Lebewesen' : FOSSIL_KIND_LABELS[value] }));

/** Public knowledge and earned finds share entries, but never progress. */
export function FossilBookScreen() {
  const hydrated = useHydrated();
  const { fossils: records } = useMeta();
  const { width, contentWidth, innerWidth, gutter, insets } = useLayout();
  const [filter, setFilter] = useState<EraFilter>('all');
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<'wiki' | 'finds'>('wiki');
  const [kind, setKind] = useState<WikiKindFilter>('all');
  const now = useMountTime();
  const guard = usePressGuard();
  const onBack = useBackTo(ROUTES.home);

  const counts = useMemo(() => fossilCounts(CONTENT, records), [records]);
  const tiles = useMemo(() => fossilTiles(CONTENT, records, filter, now, query), [records, filter, now, query]);
  const articles = useMemo(() => wikiEntries(CONTENT, { era: filter, kind, query }), [filter, kind, query]);
  const isWiki = mode === 'wiki';
  const columns = fossilGridColumns(width, contentWidth);
  const tileWidth = gridItemWidth(innerWidth, columns, GAP);
  const progress = counts[filter];

  const options = useMemo(
    (): FilterChipOption<EraFilter>[] =>
      ERA_FILTERS.map((value) => {
        const count = counts[value];
        const label = eraFilterLabel(value);
        const countLabel = isWiki ? `${count.total} Einträge` : `${count.found} von ${count.total} entdeckt`;
        const suffix = isWiki ? `${count.total}` : `${count.found}/${count.total}`;
        const common = { value, accessibilityLabel: `${label}, ${countLabel}` };
        if (value === 'all') return { ...common, label: `${label} ${suffix}` };
        return {
          ...common,
          label: `${label} ${suffix}`,
          color: eraColors[value].main,
          softColor: eraColors[value].soft,
        };
      }),
    [counts, isWiki],
  );

  const onFilter = useCallback((value: EraFilter) => {
    haptics.selection();
    setFilter(value);
  }, []);

  const onOpen = useCallback(
    (id: string) => {
      guard(() => {
        haptics.tapLight();
        router.push(fossilRoute(id, isWiki));
      });
    },
    [guard, isWiki],
  );

  const renderItem: ListRenderItem<FossilTileModel | FossilEntry> = useCallback(
    ({ item }) => 'scientificName' in item
      ? <WikiTile entry={item} found={records[item.id] !== undefined} width={tileWidth} onOpen={onOpen} />
      : <FossilTile tile={item} width={tileWidth} onOpen={onOpen} />,
    [tileWidth, onOpen, records],
  );

  const showAll = useCallback(() => onFilter('all'), [onFilter]);
  const resetFilters = useCallback(() => { setFilter('all'); setKind('all'); setQuery(''); }, []);
  const changeMode = useCallback((value: 'wiki' | 'finds') => { haptics.selection(); setMode(value); resetFilters(); }, [resetFilters]);
  const searching = query.trim().length > 0;
  const empty = isWiki
    ? articles.length === 0
      ? { title: 'Keine passenden Steckbriefe', message: 'Versuche einen anderen Namen, Fundort, eine Ernährung oder eine andere Gruppe.' }
      : null
    : searching && tiles.length === 0
      ? { title: 'Keine Treffer', message: 'Suche nach Name, wissenschaftlichem Namen oder Fundort eines entdeckten Fossils.' }
      : progress.found === 0 ? emptyBookMessage(filter, progress) : null;

  const header = <Header title="Dino-Wiki" onBack={onBack} divider />;

  if (!hydrated) return <Screen header={header} />;

  return (
    <Screen header={header} padded={false} contentStyle={styles.body} testID="fossil-book">
      <View style={[styles.top, { paddingHorizontal: gutter }]}>
        <FilterChips options={MODES} value={mode} onChange={changeMode} accessibilityLabel="Wiki oder eigene Funde anzeigen" testID="fossil-book-mode" />
        {isWiki ? <Surface style={styles.intro}>
          <AppText variant="subheading">Die Urzeit zum Nachschlagen</AppText>
          <AppText variant="caption" tone="secondary">{counts.all.total} Steckbriefe · Dinosaurier und ihre Zeitgenossen. Lesen ist jederzeit möglich; Funde sammelst du auf Expeditionen.</AppText>
        </Surface> : <ProgressBar
          icon="🦴"
          progress={progress}
          label={filter === 'all' ? progressLabel(progress) : `${eraFilterLabel(filter)}: ${progressLabel(progress)}`}
          color={filter === 'all' ? colors.accent : eraColors[filter].main}
          testID="fossil-book-progress"
        />}
        <FilterChips
          options={options}
          value={filter}
          onChange={onFilter}
          accessibilityLabel="Nach Erdzeitalter filtern"
          testID="fossil-book-filter"
        />
        {isWiki ? <FilterChips options={KIND_OPTIONS} value={kind} onChange={setKind} accessibilityLabel="Nach Lebewesen filtern" testID="wiki-kind-filter" /> : null}
        <SearchField value={query} onChangeText={setQuery} placeholder={isWiki ? 'Name, Fundort, Ernährung, Wissen …' : 'Entdeckte Fossilien suchen'} testID="fossil-book-search" />
        {isWiki ? <AppText variant="caption" tone="muted" testID="wiki-result-count">{articles.length} von {counts.all.total} Steckbriefen</AppText> : null}
      </View>
      {empty ? (
        <View style={[styles.empty, { paddingHorizontal: gutter, paddingBottom: insets.bottom + spacing.lg }]}>
          <EmptyState
            icon="⛏️"
            title={empty.title}
            message={empty.message}
            actionLabel={isWiki ? 'Filter zurücksetzen' : searching ? 'Suche löschen' : filter === 'all' ? undefined : 'Alle Zeitalter zeigen'}
            onAction={isWiki ? resetFilters : searching ? () => setQuery('') : filter === 'all' ? undefined : showAll}
          />
        </View>
      ) : (
        <FlatList<FossilTileModel | FossilEntry>
          key={`${mode}-cols-${columns}`}
          data={isWiki ? articles : tiles}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          numColumns={columns}
          columnWrapperStyle={columns > 1 ? styles.columns : undefined}
          contentContainerStyle={[
            styles.list,
            { paddingHorizontal: gutter, paddingBottom: insets.bottom + spacing.lg },
          ]}
          initialNumToRender={12}
          maxToRenderPerBatch={12}
          windowSize={7}
          removeClippedSubviews
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          testID="fossil-book-grid"
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { paddingBottom: 0 },
  top: { gap: spacing.sm, paddingTop: spacing.md, paddingBottom: spacing.sm },
  intro: { gap: spacing.xs },
  list: { gap: GAP, paddingTop: spacing.xs },
  columns: { gap: GAP },
  empty: { flex: 1, justifyContent: 'center' },
});
