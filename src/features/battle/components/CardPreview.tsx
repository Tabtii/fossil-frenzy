import { memo, useCallback, useEffect, useRef } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming, ZoomIn } from 'react-native-reanimated';

import { AppText, durations, GameCard, spacing } from '@/ui';

import type { HandEntry } from '../hand';
import { BATTLE_TEXT } from '../strings';

export interface CardPreviewProps {
  entry: HandEntry;
  width: number;
  /** Changes when a play of this card was rejected. */
  shakeId: number;
  reduce: boolean;
  onPlay: (uid: string) => void;
  onDetails: (uid: string) => void;
}

/**
 * Enlarged, readable view of the selected hand card with the damage preview.
 * Tapping it plays the card. Hidden from screen readers: the hand card and
 * the "Ausspielen" button already expose the same actions.
 */
export const CardPreview = memo(function CardPreview({ entry, width, shakeId, reduce, onPlay, onDetails }: CardPreviewProps) {
  const shake = useSharedValue(0);
  const lastShake = useRef(shakeId);

  useEffect(() => {
    if (lastShake.current === shakeId) return;
    lastShake.current = shakeId;
    if (reduce) return;
    shake.set(
      withSequence(
        withTiming(-10, { duration: 45 }),
        withTiming(10, { duration: 60 }),
        withTiming(-7, { duration: 60 }),
        withTiming(5, { duration: 60 }),
        withTiming(0, { duration: 45 }),
      ),
    );
  }, [shakeId, reduce, shake]);

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shake.get() }] }));
  const { uid } = entry;
  const handlePress = useCallback(() => onPlay(uid), [onPlay, uid]);
  const handleLongPress = useCallback(() => onDetails(uid), [onDetails, uid]);

  return (
    <Animated.View
      entering={reduce ? undefined : ZoomIn.duration(durations.fast)}
      style={[styles.root, animatedStyle]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      testID="card-preview"
    >
      <GameCard
        def={entry.def}
        upgraded={entry.upgraded}
        size="full"
        width={width}
        previewDamage={entry.previewDamage}
        unaffordable={!entry.affordable}
        selected
        onPress={handlePress}
        onLongPress={handleLongPress}
      />
      <AppText variant="caption" tone="secondary" align="center" numberOfLines={1} style={styles.caption}>
        {entry.affordable ? BATTLE_TEXT.previewHint : BATTLE_TEXT.notEnoughEnergy}
      </AppText>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  root: { alignItems: 'center', gap: spacing.xs },
  caption: { maxWidth: 280 },
});
