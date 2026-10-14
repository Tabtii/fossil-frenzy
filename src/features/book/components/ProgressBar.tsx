import { memo } from 'react';
import { type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';

import { AppText, colors, radii, spacing } from '@/ui';

import { type Progress, progressRatio } from '../model';

export interface ProgressBarProps {
  progress: Progress;
  /** Visible text next to the bar, e.g. "12 von 50 entdeckt". */
  label: string;
  /** Leading emoji. */
  icon?: string;
  color?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/** Collection progress: caption plus a thin bar (one accessibility element). */
export const ProgressBar = memo(function ProgressBar({
  progress,
  label,
  icon,
  color = colors.accent,
  style,
  testID,
}: ProgressBarProps) {
  const ratio = progressRatio(progress);
  return (
    <View
      style={[styles.root, style]}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: Math.max(1, progress.total), now: progress.found }}
      testID={testID}
    >
      <AppText variant="label" tone="secondary" numberOfLines={1}>
        {icon ? `${icon} ${label}` : label}
      </AppText>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${Math.round(ratio * 1000) / 10}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  root: { gap: spacing.xs },
  track: {
    height: 6,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceHigh,
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: radii.pill },
});
