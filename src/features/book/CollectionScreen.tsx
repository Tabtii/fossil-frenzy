import { memo, useCallback, useMemo, useState } from 'react';
import { FlatList, type ListRenderItem, StyleSheet, View } from 'react-native';

import { CONTENT } from '@/data';
import type { CardDef } from '@/engine/types';
import { ROUTES } from '@/features/navigation';
import * as haptics from '@/lib/haptics';
import { useHydrated, useMeta, useSettings } from '@/state/selectors';
import {
  AppText,
  CARD_TYPE_ICONS,
  CARD_TYPE_LABELS,
  CardDetailSheet,
  EmptyState,
  ERA_ICONS,
  ERA_LABELS,
  eraColors,
  GameCard,
  Header,
  Screen,
  SearchField,
  spacing,
  useLayout,
} from '@/ui';

import { FilterChips, type FilterChipOption } from './components/FilterChips';
import { LockedCard } from './components/LockedCard';
import { ProgressBar } from './components/ProgressBar';
import { upgradeToggleLabel, useBackTo, useCardSheet } from './hooks';
import {
  cardCounterText,
  cardCounts,
  cardGridColumns,
  type CollectionItem,
  type CollectionRow,
  collectionRows,
  ERA_FILTERS,
  type EraFilter,
  eraFilterLabel,
  eraSectionText,
  gridItemWidth,
  TYPE_FILTERS,
  type TypeFilter,
} from './model';

const GAP = spacing.sm;

const ERA_OPTIONS: FilterChipOption<EraFilter>[] = ERA_FILTERS.map((value) =>
  value === 'all'
    ? { value, label: eraFilterLabel(value), accessibilityLabel: 'Alle Erdzeitalter' }
    : {
        value,
        label: `${ERA_ICONS[value]} ${ERA_LABELS[value]}`,
        accessibilityLabel: ERA_LABELS[value],
        color: eraColors[value].main,
        softColor: eraColors[value].soft,
      },
);

const TYPE_OPTIONS: FilterChipOption<TypeFilter>[] = TYPE_FILTERS.map((value) =>
  value === 'all'
    ? { value, label: 'Alle Typen' }
    : {
        value,
        label: `${CARD_TYPE_ICONS[value]} ${CARD_TYPE_LABELS[value]}`,
        accessibilityLabel: CARD_TYPE_LABELS[value],
      },
);

function keyExtractor(row: CollectionRow): string {
  return row.key;
}

const CollectionCell = memo(function CollectionCell({
  item,
  width,
  onOpen,
}: {
  item: CollectionItem;
  width: number;
  onOpen: (def: CardDef) => void;
}) {
  const def = item.seen ? item.def : null;
  const onPress = useCallback(() => {
    if (def) onOpen(def);
  }, [def, onOpen]);
  if (!item.seen)
    return <LockedCard era={item.era} rarity={item.rarity} width={width} testID={`collection-locked-${item.id}`} />;
  return (
    <GameCard
      def={item.def}
      size="hand"
      width={width}
      onPress={onPress}
      accessibilityHint="Öffnet die Kartendetails mit Fossil-Fakten."
      testID={`collection-card-${item.id}`}
    />
  );
});

/** Card collection: every card, seen ones playable-looking, unseen ones locked. */
export function CollectionScreen() {
  const hydrated = useHydrated();
  const meta = useMeta();
  const { reducedMotion } = useSettings();
  const { contentWidth, innerWidth, gutter, insets } = useLayout();
  const [eraFilter, setEraFilter] = useState<EraFilter>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [query, setQuery] = useState('');
  const sheet = useCardSheet();
  const onBack = useBackTo(ROUTES.home);

  const columns = cardGridColumns(contentWidth);
  const cardWidth = gridItemWidth(innerWidth, columns, GAP);
  const total = useMemo(() => cardCounts(CONTENT, meta.cardsSeen), [meta.cardsSeen]);
  const rows = useMemo(
    () => collectionRows(CONTENT, meta.cardsSeen, { era: eraFilter, type: typeFilter, query }, columns),
    [meta.cardsSeen, eraFilter, typeFilter, query, columns],
  );

  const onEra = useCallback((value: EraFilter) => {
    haptics.selection();
    setEraFilter(value);
  }, []);
  const onType = useCallback((value: TypeFilter) => {
    haptics.selection();
    setTypeFilter(value);
  }, []);
  const resetFilters = useCallback(() => {
    haptics.selection();
    setEraFilter('all');
    setTypeFilter('all');
    setQuery('');
  }, []);

  const renderItem: ListRenderItem<CollectionRow> = useCallback(
    ({ item: row }) => {
      if (row.kind === 'header') {
        return (
          <AppText
            variant="overline"
            color={eraColors[row.era].main}
            accessibilityRole="header"
            accessibilityLabel={`${ERA_LABELS[row.era]}: ${row.progress.found} von ${row.progress.total} Karten entdeckt`}
            style={styles.sectionHeader}
          >
            {`${ERA_ICONS[row.era]} ${eraSectionText(row.era, row.progress)}`}
          </AppText>
        );
      }
      return (
        <View style={styles.row}>
          {row.items.map((item) => (
            <CollectionCell key={item.id} item={item} width={cardWidth} onOpen={sheet.open} />
          ))}
        </View>
      );
    },
    [cardWidth, sheet.open],
  );

  const fossil = sheet.def ? CONTENT.fossils[sheet.def.fossilId] : undefined;
  const fossilDiscovered = sheet.def ? meta.fossils[sheet.def.fossilId] !== undefined : false;

  const header = <Header title="Sammlung" onBack={onBack} divider />;

  if (!hydrated) return <Screen header={header} />;

  return (
    <Screen header={header} padded={false} contentStyle={styles.body} testID="collection">
      <View style={[styles.top, { paddingHorizontal: gutter }]}>
        <ProgressBar icon="🃏" progress={total} label={cardCounterText(total)} testID="collection-progress" />
        <SearchField value={query} onChangeText={setQuery} placeholder="Name, Effekt oder Kartengruppe suchen" testID="collection-search" />
        <FilterChips
          options={ERA_OPTIONS}
          value={eraFilter}
          onChange={onEra}
          accessibilityLabel="Nach Erdzeitalter filtern"
          testID="collection-era-filter"
        />
        <FilterChips
          options={TYPE_OPTIONS}
          value={typeFilter}
          onChange={onType}
          accessibilityLabel="Nach Kartentyp filtern"
          testID="collection-type-filter"
        />
      </View>
      <FlatList
        data={rows}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        contentContainerStyle={[styles.list, { paddingHorizontal: gutter, paddingBottom: insets.bottom + spacing.lg }]}
        ListEmptyComponent={
          <EmptyState
            icon="🃏"
            title={query.trim() ? 'Keine Treffer' : 'Keine Karten'}
            message={query.trim() ? 'Suche nach Namen, Effekt oder Kartengruppe einer bereits entdeckten Karte. Auch Verbesserungen werden durchsucht.' : 'Für diese Auswahl gibt es keine Karten.'}
            actionLabel="Filter zurücksetzen"
            onAction={resetFilters}
          />
        }
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={7}
        removeClippedSubviews
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        testID="collection-grid"
      />
      <CardDetailSheet
        def={sheet.def}
        upgraded={sheet.upgraded}
        fossil={fossil}
        fossilDiscovered={fossilDiscovered}
        visible={sheet.visible}
        onClose={sheet.close}
        reducedMotion={reducedMotion}
        primaryAction={{
          label: upgradeToggleLabel(sheet.upgraded),
          onPress: sheet.toggleUpgraded,
          variant: 'secondary',
          accessibilityHint: 'Wechselt zwischen normaler und verbesserter Karte.',
        }}
        testID="collection-card-sheet"
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { paddingBottom: 0 },
  top: { gap: spacing.xs, paddingTop: spacing.md, paddingBottom: spacing.sm },
  list: { gap: GAP },
  sectionHeader: { marginTop: spacing.md, marginBottom: spacing.xxs, marginHorizontal: spacing.xs },
  row: { flexDirection: 'row', gap: GAP },
});
