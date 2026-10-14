import { memo, useCallback, useMemo, useRef, useState } from 'react';
import { type NativeScrollEvent, type NativeSyntheticEvent, ScrollView, StyleSheet, View } from 'react-native';

import type { CardDef } from '@/engine/types';
import { AppText, colors, GameCard, radii, spacing } from '@/ui';

import { carouselIndex, carouselOffset, choiceCarouselMetrics } from '../rewardModel';

export interface CardChoiceCarouselProps {
  defs: readonly CardDef[];
  selectedId: string | null;
  onSelect: (def: CardDef) => void;
  onDetails: (def: CardDef) => void;
  /** Width of the scroll viewport (usually the full content column). */
  viewportWidth: number;
  windowHeight: number;
  reduceMotion: boolean;
}

const ChoiceCard = memo(function ChoiceCard({
  def,
  index,
  count,
  width,
  selected,
  onSelect,
  onDetails,
}: {
  def: CardDef;
  index: number;
  count: number;
  width: number;
  selected: boolean;
  onSelect: (def: CardDef, index: number) => void;
  onDetails: (def: CardDef) => void;
}) {
  const onPress = useCallback(() => onSelect(def, index), [def, index, onSelect]);
  const onLongPress = useCallback(() => onDetails(def), [def, onDetails]);
  return (
    <View style={styles.slot}>
      <GameCard
        def={def}
        size="full"
        width={width}
        selected={selected}
        onPress={onPress}
        onLongPress={onLongPress}
        accessibilityHint={`Karte ${index + 1} von ${count}. Tippen wählt sie aus, langes Drücken zeigt Details.`}
        testID={`choice-card-${def.id}`}
      />
      <View
        style={[styles.mark, selected && styles.markSelected]}
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden
      >
        <AppText variant="label" tone={selected ? 'onAccent' : 'muted'} numberOfLines={1}>
          {selected ? '✓ Ausgewählt' : 'Antippen'}
        </AppText>
      </View>
    </View>
  );
});

/** Horizontal snap carousel of full-size cards for 1-of-n choices. */
export const CardChoiceCarousel = memo(function CardChoiceCarousel({
  defs,
  selectedId,
  onSelect,
  onDetails,
  viewportWidth,
  windowHeight,
  reduceMotion,
}: CardChoiceCarouselProps) {
  const metrics = useMemo(
    () => choiceCarouselMetrics(viewportWidth, windowHeight, defs.length),
    [viewportWidth, windowHeight, defs.length],
  );
  const scrollRef = useRef<ScrollView>(null);
  const [centered, setCentered] = useState(0);

  const onScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      setCentered(carouselIndex(metrics, event.nativeEvent.contentOffset.x, defs.length));
    },
    [metrics, defs.length],
  );

  const select = useCallback(
    (def: CardDef, index: number) => {
      onSelect(def);
      setCentered(index);
      scrollRef.current?.scrollTo({ x: carouselOffset(metrics, index), animated: !reduceMotion });
    },
    [metrics, onSelect, reduceMotion],
  );

  return (
    <View style={styles.root}>
      <ScrollView
        ref={scrollRef}
        horizontal
        style={{ width: viewportWidth }}
        contentContainerStyle={{ paddingHorizontal: metrics.sidePadding, gap: metrics.gap }}
        snapToInterval={metrics.snapInterval}
        snapToAlignment="start"
        decelerationRate="fast"
        disableIntervalMomentum
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScrollEnd}
        onScrollEndDrag={onScrollEnd}
        testID="card-choice-carousel"
      >
        {defs.map((def, index) => (
          <ChoiceCard
            key={def.id}
            def={def}
            index={index}
            count={defs.length}
            width={metrics.cardWidth}
            selected={def.id === selectedId}
            onSelect={select}
            onDetails={onDetails}
          />
        ))}
      </ScrollView>
      {defs.length > 1 ? (
        <View style={styles.dots} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
          {defs.map((def, index) => (
            <View
              key={def.id}
              style={[
                styles.dot,
                index === centered && styles.dotCentered,
                def.id === selectedId && styles.dotSelected,
              ]}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
});

const DOT = 8;

const styles = StyleSheet.create({
  root: { alignItems: 'center', gap: spacing.sm },
  slot: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
  mark: {
    minHeight: 28,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    justifyContent: 'center',
    backgroundColor: colors.surfaceRaised,
  },
  markSelected: { backgroundColor: colors.accent },
  dots: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  dot: { width: DOT, height: DOT, borderRadius: DOT / 2, backgroundColor: colors.border },
  dotCentered: { width: DOT * 2.5, backgroundColor: colors.textMuted },
  dotSelected: { backgroundColor: colors.accent },
});
