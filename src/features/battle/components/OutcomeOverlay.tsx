import { memo, useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { AppText, colors, fill, spacing, zIndex } from '@/ui';

import type { CombatOutcome } from '../feedback';
import { BATTLE_TEXT, victorySubtitle } from '../strings';

export interface OutcomeOverlayProps {
  outcome: CombatOutcome;
  enemyName: string;
  /** Delay before the overlay appears, so the final hit stays visible. */
  delay: number;
  /** Effective reduced motion: fade only, no burst. */
  reduce: boolean;
}

const NEVER = ReduceMotion.Never;

// Fossil burst of the victory flourish (fixed, deterministic directions).
const PARTICLES = Array.from({ length: 10 }, (_, index) => {
  const angle = (index / 10) * Math.PI * 2 + 0.35;
  const distance = 96 + (index % 3) * 28;
  return {
    key: index,
    dx: Math.round(Math.cos(angle) * distance),
    dy: Math.round(Math.sin(angle) * distance),
    emoji: index % 2 === 0 ? '🦴' : '✨',
  };
});

const Particle = memo(function Particle({ dx, dy, emoji, delay }: { dx: number; dy: number; emoji: string; delay: number }) {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.set(withDelay(delay, withTiming(1, { duration: 950, easing: Easing.out(Easing.cubic) })));
  }, [delay, progress]);
  const animatedStyle = useAnimatedStyle(() => {
    const p = progress.get();
    return {
      opacity: p < 0.15 ? p / 0.15 : 1 - (p - 0.15) / 0.85,
      transform: [{ translateX: dx * p }, { translateY: dy * p }, { scale: 0.6 + 0.6 * p }],
    };
  });
  return (
    <Animated.View style={[styles.particle, animatedStyle]}>
      <Text style={styles.particleText} allowFontScaling={false}>
        {emoji}
      </Text>
    </Animated.View>
  );
});

/**
 * Victory flourish / defeat effect over the whole screen. Blocks touches
 * while it is shown; the screen resolves the combat afterwards.
 */
export const OutcomeOverlay = memo(function OutcomeOverlay({ outcome, enemyName, delay, reduce }: OutcomeOverlayProps) {
  const victory = outcome === 'victory';
  const title = victory ? BATTLE_TEXT.victory : BATTLE_TEXT.defeat;
  const subtitle = victory ? victorySubtitle(enemyName) : BATTLE_TEXT.defeatSubtitle;
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.set(withDelay(delay, withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic), reduceMotion: NEVER }), NEVER));
  }, [delay, progress]);

  const backdropStyle = useAnimatedStyle(() => ({ opacity: progress.get() }));
  const contentStyle = useAnimatedStyle(() => {
    const p = progress.get();
    if (reduce) return { opacity: p };
    return { opacity: p, transform: [{ translateY: 18 * (1 - p) }, { scale: 0.75 + 0.25 * p }] };
  });

  return (
    <View style={styles.root} testID="combat-outcome">
      <Animated.View style={[styles.backdrop, victory ? styles.victoryBackdrop : styles.defeatBackdrop, backdropStyle]} />
      {victory && !reduce ? (
        <View style={styles.burst} pointerEvents="none">
          {PARTICLES.map((particle) => (
            <Particle key={particle.key} dx={particle.dx} dy={particle.dy} emoji={particle.emoji} delay={delay} />
          ))}
        </View>
      ) : null}
      <Animated.View
        style={[styles.content, contentStyle]}
        accessible
        accessibilityRole="alert"
        accessibilityLabel={`${title} ${subtitle}`}
      >
        <Text style={styles.emoji} allowFontScaling={false}>
          {victory ? '🏆' : '💀'}
        </Text>
        <AppText variant="display" color={victory ? colors.accent : colors.danger} align="center">
          {title}
        </AppText>
        <AppText variant="body" tone="secondary" align="center">
          {subtitle}
        </AppText>
      </Animated.View>
    </View>
  );
});

const styles = StyleSheet.create({
  root: { ...fill, zIndex: zIndex.overlay, alignItems: 'center', justifyContent: 'center' },
  backdrop: { ...fill },
  victoryBackdrop: { backgroundColor: colors.scrim },
  defeatBackdrop: { backgroundColor: colors.backdrop },
  burst: { ...fill, alignItems: 'center', justifyContent: 'center' },
  particle: { position: 'absolute' },
  particleText: { fontSize: 28, lineHeight: 34 },
  content: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.xl,
    maxWidth: 360,
  },
  emoji: { fontSize: 64, lineHeight: 76 },
});
