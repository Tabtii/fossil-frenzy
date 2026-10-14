import { memo, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { AppText, colors, durations, elevation, radii, spacing, springs } from '@/ui';

import type { TurnBannerState } from '../hooks/useBattleController';

export interface TurnBannerProps {
  banner: TurnBannerState | null;
  /** How long a non-persistent banner stays (ms). */
  hold: number;
  /** Effective reduced motion: fade only, no pop. */
  reduce: boolean;
}

const FADE = { reduceMotion: ReduceMotion.Never } as const;

/**
 * Short banner in the middle of the arena: "Gegnerzug…" while the enemy acts,
 * "Zug n" when the next turn starts. Decorative (the screen announces turns
 * to screen readers itself) and never blocks touches.
 */
export const TurnBanner = memo(function TurnBanner({ banner, hold, reduce }: TurnBannerProps) {
  // Keep the last text while fading out.
  const [shown, setShown] = useState(banner);
  if (banner !== null && banner !== shown) setShown(banner);

  const opacity = useSharedValue(0);
  const scale = useSharedValue(1);

  useEffect(() => {
    if (banner === null) {
      opacity.set(withTiming(0, { duration: durations.normal, ...FADE }));
      return;
    }
    const fadeIn = withTiming(1, { duration: durations.fast, ...FADE });
    opacity.set(
      banner.persistent
        ? fadeIn
        : withSequence(fadeIn, withDelay(hold, withTiming(0, { duration: durations.slow, ...FADE }), ReduceMotion.Never)),
    );
    if (!reduce) scale.set(withSequence(withTiming(0.86, { duration: 0 }), withSpring(1, springs.snappy)));
  }, [banner, hold, reduce, opacity, scale]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.get(), transform: [{ scale: scale.get() }] }));

  if (shown === null) return null;
  const enemy = shown.tone === 'enemy';
  return (
    <View style={styles.root} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Animated.View style={[styles.pill, enemy ? styles.enemy : styles.player, animatedStyle]}>
        <AppText variant="title" color={enemy ? colors.danger : colors.accent} align="center" numberOfLines={1}>
          {shown.text}
        </AppText>
      </Animated.View>
    </View>
  );
});

const styles = StyleSheet.create({
  root: { position: 'absolute', left: 0, right: 0, top: '36%', alignItems: 'center' },
  pill: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: 2,
    backgroundColor: colors.surfaceHigh,
    ...elevation(3),
  },
  enemy: { borderColor: colors.danger },
  player: { borderColor: colors.accentBorder },
});
