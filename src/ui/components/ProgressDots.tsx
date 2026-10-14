import { memo } from 'react';
import { type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';

import { colors, radii, spacing } from '../theme';

export interface ProgressDotsProps {
  count: number;
  /** 0-based index of the current step; earlier steps count as done. */
  current: number;
  /** Dot size in dp (default 8). */
  size?: number;
  activeColor?: string;
  /** Spoken label; default "Schritt X von Y". */
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

/** Row of dots for multi-step progress (e.g. floors of an act). */
export const ProgressDots = memo(function ProgressDots({
  count,
  current,
  size = 8,
  activeColor = colors.accent,
  accessibilityLabel,
  style,
}: ProgressDotsProps) {
  const total = Math.max(0, Math.floor(count));
  const index = Math.min(Math.max(0, current), Math.max(0, total - 1));
  const dots = [];
  for (let i = 0; i < total; i += 1) {
    const active = i === index;
    const done = i < index;
    dots.push(
      <View
        key={i}
        style={[
          styles.dot,
          { width: active ? size * 2.5 : size, height: size, borderRadius: size / 2 },
          active ? { backgroundColor: activeColor } : done ? styles.done : styles.todo,
        ]}
      />,
    );
  }
  return (
    <View
      style={[styles.row, style]}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel ?? `Schritt ${index + 1} von ${total}`}
      accessibilityValue={{ min: 1, max: Math.max(1, total), now: index + 1 }}
    >
      {dots}
    </View>
  );
});

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  dot: { borderRadius: radii.pill },
  done: { backgroundColor: colors.textMuted },
  todo: { backgroundColor: colors.surfaceHigh, borderWidth: 1, borderColor: colors.borderStrong },
});
