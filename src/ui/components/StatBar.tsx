import { memo, useEffect } from 'react';
import { type DimensionValue, type StyleProp, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming, ZoomIn } from 'react-native-reanimated';

import { statAccessibilityLabel } from '../format';
import { reduceMotionOption, useReduceMotion } from '../hooks';
import { UI_STRINGS } from '../labels';
import { colors, durations, fill, fontScale, radii, spacing } from '../theme';

export type StatBarSize = 'sm' | 'md' | 'lg';

export interface StatBarProps {
  value: number;
  max: number;
  /** Current block; shows a shield badge and a steel frame when > 0. */
  block?: number;
  /** Spoken name of the stat (default "LP"). */
  label?: string;
  size?: StatBarSize;
  /** Show "45/60" (inside the bar for md/lg, to the right for sm). Default true. */
  showValue?: boolean;
  /** Fill colour token value (default colors.hpFill). */
  fillColor?: string;
  /** App setting; the OS setting is respected automatically. */
  reducedMotion?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

const HEIGHTS: Record<StatBarSize, number> = { sm: 8, md: 18, lg: 24 };
const LABEL_SIZES: Record<StatBarSize, number> = { sm: 12, md: 12, lg: 14 };

function toPercent(ratio: number): DimensionValue {
  'worklet';
  return `${ratio * 100}%` as DimensionValue;
}

/**
 * HP bar with animated fill, a lagging "damage trail" and a block overlay.
 * Exposed to screen readers as a progress bar.
 */
export const StatBar = memo(function StatBar({
  value,
  max,
  block = 0,
  label = UI_STRINGS.hp,
  size = 'md',
  showValue = true,
  fillColor = colors.hpFill,
  reducedMotion = false,
  accessibilityLabel,
  style,
  testID,
}: StatBarProps) {
  const reduce = useReduceMotion(reducedMotion);
  const ratio = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
  const progress = useSharedValue(ratio);
  const trail = useSharedValue(ratio);

  useEffect(() => {
    const reduceMotion = reduceMotionOption(reduce);
    progress.set(withTiming(ratio, { duration: durations.bar, easing: Easing.out(Easing.cubic), reduceMotion }));
    if (ratio < trail.get()) {
      trail.set(withDelay(durations.slow, withTiming(ratio, { duration: durations.bar * 1.5, reduceMotion }), reduceMotion));
    } else {
      trail.set(ratio);
    }
  }, [ratio, reduce, progress, trail]);

  const fillStyle = useAnimatedStyle(() => ({ width: toPercent(progress.get()) }));
  const trailStyle = useAnimatedStyle(() => ({ width: toPercent(trail.get()) }));

  const height = HEIGHTS[size];
  const hasBlock = block > 0;
  const valueText = `${Math.max(0, value)}/${max}`;
  const inside = showValue && size !== 'sm';

  return (
    <View
      style={[styles.root, style]}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel ?? statAccessibilityLabel(label, Math.max(0, value), max, block)}
      accessibilityValue={{ min: 0, max, now: Math.max(0, value) }}
      testID={testID}
    >
      {hasBlock ? (
        <Animated.View entering={reduce ? undefined : ZoomIn.duration(durations.fast)} style={styles.shield}>
          <Text style={styles.shieldText} maxFontSizeMultiplier={fontScale.badge} numberOfLines={1}>
            🛡️ {block}
          </Text>
        </Animated.View>
      ) : null}
      <View
        style={[
          styles.track,
          { height, borderRadius: height / 2 },
          hasBlock && styles.trackBlocked,
        ]}
      >
        <Animated.View style={[styles.layer, styles.trail, trailStyle]} />
        <Animated.View style={[styles.layer, { backgroundColor: fillColor }, fillStyle]}>
          {hasBlock ? <View style={styles.blockTint} /> : null}
        </Animated.View>
        {inside ? (
          <View style={styles.labelWrap} pointerEvents="none">
            <Text
              style={[styles.valueInside, { fontSize: LABEL_SIZES[size], lineHeight: height }]}
              maxFontSizeMultiplier={fontScale.badge}
              numberOfLines={1}
            >
              {valueText}
            </Text>
          </View>
        ) : null}
      </View>
      {showValue && !inside ? (
        <Text style={styles.valueOutside} maxFontSizeMultiplier={fontScale.badge} numberOfLines={1}>
          {valueText}
        </Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  root: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  track: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: colors.hpTrack,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
  },
  trackBlocked: { borderColor: colors.block, borderWidth: 2 },
  layer: { position: 'absolute', left: 0, top: 0, bottom: 0 },
  trail: { backgroundColor: colors.hpTrail },
  blockTint: { ...fill, backgroundColor: colors.blockSoft },
  labelWrap: { ...fill, alignItems: 'center', justifyContent: 'center' },
  valueInside: {
    color: colors.onHpFill,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    textShadowColor: colors.textShadow,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    includeFontPadding: false,
  },
  valueOutside: {
    color: colors.text,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    minWidth: 40,
    textAlign: 'right',
  },
  shield: {
    backgroundColor: colors.block,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    minHeight: 22,
    justifyContent: 'center',
  },
  shieldText: {
    color: colors.onBlock,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
});
