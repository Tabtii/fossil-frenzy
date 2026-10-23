import { memo, useMemo } from 'react';
import { Pressable, type StyleProp, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import type { IntentView } from '@/engine/types';

import { formatIntent } from '../format';
import { useReduceMotion } from '../hooks';
import { UI_STRINGS } from '../labels';
import { colors, durations, fontScale, intentColors, radii, selfHitColor, spacing } from '../theme';

export interface IntentBadgeProps {
  /** null renders nothing (e.g. combat over). */
  intent: IntentView | null;
  /** Show the move name under the icons (default true). */
  showMoveName?: boolean;
  /** Optional tap, e.g. to explain the move. */
  onPress?: () => void;
  /** App setting; the OS setting is respected automatically. */
  reducedMotion?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * Enemy intent: icons with numbers ("⚔️ 12×2", "🛡️ 5", "💪"), coloured by the
 * main intent. A confused enemy's attack shows "💫" and "Trifft sich selbst!".
 */
export const IntentBadge = memo(function IntentBadge({
  intent,
  showMoveName = true,
  onPress,
  reducedMotion = false,
  style,
  testID,
}: IntentBadgeProps) {
  const reduce = useReduceMotion(reducedMotion);
  const display = useMemo(() => (intent ? formatIntent(intent) : null), [intent]);
  if (!intent || !display) return null;

  const accent = display.selfHit ? selfHitColor : intentColors[display.primary];
  // Re-run the entering animation whenever the shown intent changes.
  const key = `${intent.moveName}|${display.text}`;

  const body = (
    <>
      <View style={styles.segments}>
        {display.segments.map((segment) => (
          <View key={segment.kind} style={styles.segment}>
            <Text style={[styles.icon, { color: segment.selfHit ? selfHitColor : intentColors[segment.kind] }]} maxFontSizeMultiplier={fontScale.badge}>
              {segment.icon}
            </Text>
            {segment.value ? (
              <Text
                style={[styles.value, { color: segment.selfHit ? selfHitColor : intentColors[segment.kind] }]}
                maxFontSizeMultiplier={fontScale.badge}
                numberOfLines={1}
              >
                {segment.value}
              </Text>
            ) : null}
          </View>
        ))}
      </View>
      {display.selfHit ? (
        <Text style={styles.selfHit} maxFontSizeMultiplier={fontScale.badge} numberOfLines={1}>
          {UI_STRINGS.selfHit}
        </Text>
      ) : null}
      {showMoveName && intent.moveName ? (
        <Text style={styles.moveName} maxFontSizeMultiplier={fontScale.badge} numberOfLines={1}>
          {intent.moveName}
        </Text>
      ) : null}
    </>
  );

  return (
    <Animated.View
      key={key}
      entering={reduce ? undefined : FadeIn.duration(durations.normal)}
      style={[styles.root, { borderColor: accent }, display.selfHit && styles.selfHitRoot, style]}
      testID={testID}
    >
      {onPress ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={display.accessibilityLabel}
          onPress={onPress}
          style={styles.inner}
        >
          {body}
        </Pressable>
      ) : (
        <View accessible accessibilityLabel={display.accessibilityLabel} style={styles.inner}>
          {body}
        </View>
      )}
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  root: {
    alignSelf: 'center',
    borderRadius: radii.md,
    borderWidth: 2,
    backgroundColor: colors.surfaceRaised,
  },
  selfHitRoot: { backgroundColor: colors.surfaceHigh },
  inner: {
    minHeight: 48,
    minWidth: 64,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segments: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  segment: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs },
  icon: { fontSize: 18, lineHeight: 24 },
  value: { fontSize: 18, lineHeight: 24, fontWeight: '900', fontVariant: ['tabular-nums'] },
  selfHit: { color: selfHitColor, fontSize: 11, lineHeight: 14, fontWeight: '800' },
  moveName: { color: colors.textSecondary, fontSize: 12, lineHeight: 16, fontWeight: '600' },
});
