import { memo, useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { ReduceMotion, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { AppText, computeHandLayout, durations, zIndex } from '@/ui';

import { HAND_TOP_SPACE, handAreaHeight, handCardWidthFor, swipeThreshold } from '../battleLayout';
import type { HandEntry } from '../hand';
import type { ShakeState } from '../hooks/useBattleController';
import { BATTLE_TEXT } from '../strings';
import { HandCard } from './HandCard';

export interface HandProps {
  entries: readonly HandEntry[];
  /** Width of the hand row (dp). */
  width: number;
  windowHeight: number;
  selectedUid: string | null;
  locked: boolean;
  /** Cards slide out (end of turn, combat over). */
  leaving: boolean;
  /** No cards are rendered (enemy turn); the next ones are dealt in. */
  hidden: boolean;
  shake: ShakeState;
  /** Effective reduced motion. */
  reduce: boolean;
  onSelect: (uid: string) => void;
  onPlay: (uid: string, offsetX?: number) => void;
  onDetails: (uid: string) => void;
}

/**
 * The fanned hand in the thumb zone. The area overlaps the arena above by
 * HAND_TOP_SPACE (room for the lifted card) and lets touches pass through its
 * empty parts. Cards only re-render when their own props change.
 */
export const Hand = memo(function Hand({
  entries,
  width,
  windowHeight,
  selectedUid,
  locked,
  leaving,
  hidden,
  shake,
  reduce,
  onSelect,
  onPlay,
  onDetails,
}: HandProps) {
  const count = entries.length;
  const layout = useMemo(() => {
    const cardWidth = handCardWidthFor(count, width, windowHeight);
    return computeHandLayout(count, width, { cardWidth });
  }, [count, width, windowHeight]);
  const areaHeight = handAreaHeight(width, windowHeight);
  const threshold = swipeThreshold(layout.cardHeight);

  const out = useSharedValue(leaving ? 1 : 0);
  useEffect(() => {
    out.set(leaving ? withTiming(1, { duration: durations.normal, reduceMotion: ReduceMotion.Never }) : 0);
  }, [leaving, out]);
  const animatedStyle = useAnimatedStyle(() => {
    const value = out.get();
    return { opacity: 1 - value, transform: [{ translateY: reduce ? 0 : 48 * value }] };
  });

  return (
    <Animated.View
      style={[styles.root, { width, height: areaHeight }, animatedStyle]}
      pointerEvents="box-none"
      testID="hand"
    >
      {!hidden && count === 0 ? (
        <View style={[styles.empty, { top: HAND_TOP_SPACE }]} pointerEvents="none">
          <AppText variant="caption" tone="muted" align="center">
            {BATTLE_TEXT.handEmpty}
          </AppText>
        </View>
      ) : null}
      {hidden
        ? null
        : entries.map((entry, index) => {
            const position = layout.positions[index];
            if (!position) return null;
            return (
              <HandCard
                key={entry.uid}
                uid={entry.uid}
                def={entry.def}
                upgraded={entry.upgraded}
                x={position.x}
                y={position.y}
                rotate={position.rotate}
                order={index}
                width={layout.cardWidth}
                height={layout.cardHeight}
                centerOffset={position.x + layout.cardWidth / 2 - width / 2}
                selected={entry.uid === selectedUid}
                affordable={entry.affordable}
                previewDamage={entry.previewDamage}
                locked={locked}
                shakeId={shake.uid === entry.uid ? shake.id : 0}
                reduce={reduce}
                swipeThreshold={threshold}
                onSelect={onSelect}
                onPlay={onPlay}
                onDetails={onDetails}
              />
            );
          })}
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  root: { alignSelf: 'center', marginTop: -HAND_TOP_SPACE, zIndex: zIndex.hand },
  empty: { position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
});
