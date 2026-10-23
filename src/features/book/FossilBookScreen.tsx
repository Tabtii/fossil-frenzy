import { router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, type ListRenderItem, StyleSheet, View } from 'react-native';

import { CONTENT } from '@/data';
import { fossilRoute, ROUTES } from '@/features/navigation';
import { usePressGuard } from '@/features/shell/hooks';
import * as haptics from '@/lib/haptics';
import { useHydrated, useMeta } from '@/state/selectors';
import { colors, EmptyState, ERA_ICONS, eraColors, Header, Screen, SearchField, spacing, useLayout } from '@/ui';

import { FilterChips, type FilterChipOption } from './components/FilterChips';
import { FossilTile } from './components/FossilTile';
import { ProgressBar } from './components/ProgressBar';
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

const GAP = spacing.sm;

function keyExtractor(tile: FossilTileModel): string {
  return tile.id;
}

/** Fossil book: progress, era filter and a grid of all entries. */
export function FossilBookScreen() {
  const hydrated = useHydrated();
  const { fossils: records } = useMeta();
  const { width, contentWidth, innerWidth, gutter, insets } = useLayout();
  const [filter, setFilter] = useState<EraFilter>('all');
  const [query, setQuery] = useState('');
  const now = useMountTime();
  const guard = usePressGuard();
  const onBack = useBackTo(ROUTES.home);

  const counts = useMemo(() => fossilCounts(CONTENT, records), [records]);
  const tiles = useMemo(() => fossilTiles(CONTENT, records, filter, now, query), [records, filter, now, query]);
  const columns = fossilGridColumns(width, contentWidth);
  const tileWidth = gridItemWidth(innerWidth, columns, GAP);
  const progress = counts[filter];

  const options = useMemo(
    (): FilterChipOption<EraFilter>[] =>
      ERA_FILTERS.map((value) => {
        const count = counts[value];
        const label = eraFilterLabel(value);
        const common = { value, accessibilityLabel: `${label}, ${count.found} von ${count.total} entdeckt` };
        if (value === 'all') return { ...common, label: `${label} ${count.found}/${count.total}` };
        return {
          ...common,
          label: `${ERA_ICONS[value]} ${label} ${count.found}/${count.total}`,
          color: eraColors[value].main,
          softColor: eraColors[value].soft,
        };
      }),
    [counts],
  );

  const onFilter = useCallback((value: EraFilter) => {
    haptics.selection();
    setFilter(value);
  }, []);

  const onOpen = useCallback(
    (id: string) => {
      guard(() => {
        haptics.tapLight();
        router.push(fossilRoute(id));
      });
    },
    [guard],
  );

  const renderItem: ListRenderItem<FossilTileModel> = useCallback(
    ({ item }) => <FossilTile tile={item} width={tileWidth} onOpen={onOpen} />,
    [tileWidth, onOpen],
  );

  const showAll = useCallback(() => onFilter('all'), [onFilter]);
  const searching = query.trim().length > 0;
  const empty = searching && tiles.length === 0
    ? { title: 'Keine Treffer', message: 'Suche nach Name, wissenschaftlichem Namen oder Fundort eines entdeckten Fossils.' }
    : progress.found === 0 ? emptyBookMessage(filter, progress) : null;

  const header = <Header title="Fossilienbuch" onBack={onBack} divider />;

  if (!hydrated) return <Screen header={header} />;

  return (
    <Screen header={header} padded={false} contentStyle={styles.body} testID="fossil-book">
      <View style={[styles.top, { paddingHorizontal: gutter }]}>
        <ProgressBar
          icon="🦴"
          progress={progress}
          label={filter === 'all' ? progressLabel(progress) : `${eraFilterLabel(filter)}: ${progressLabel(progress)}`}
          color={filter === 'all' ? colors.accent : eraColors[filter].main}
          testID="fossil-book-progress"
        />
        <FilterChips
          options={options}
          value={filter}
          onChange={onFilter}
          accessibilityLabel="Nach Erdzeitalter filtern"
          testID="fossil-book-filter"
        />
        <SearchField value={query} onChangeText={setQuery} placeholder="Entdeckte Fossilien suchen" testID="fossil-book-search" />
      </View>
      {empty ? (
        <View style={[styles.empty, { paddingHorizontal: gutter, paddingBottom: insets.bottom + spacing.lg }]}>
          <EmptyState
            icon="⛏️"
            title={empty.title}
            message={empty.message}
            actionLabel={searching ? 'Suche löschen' : filter === 'all' ? undefined : 'Alle Zeitalter zeigen'}
            onAction={searching ? () => setQuery('') : filter === 'all' ? undefined : showAll}
          />
        </View>
      ) : (
        <FlatList
          key={`cols-${columns}`}
          data={tiles}
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
  list: { gap: GAP, paddingTop: spacing.xs },
  columns: { gap: GAP },
  empty: { flex: 1, justifyContent: 'center' },
});
