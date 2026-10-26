import { memo, type ReactNode } from 'react';
import { Pressable, type StyleProp, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { colors, fontScale, opacity, sizes, spacing } from '../theme';
import { AppText } from './AppText';

export interface ListRowProps {
  title: string;
  subtitle?: string;
  /** Leading emoji or element. */
  left?: ReactNode;
  /** Trailing value text or element (before the chevron). */
  right?: ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  /** Show "›" (default: when pressable). */
  chevron?: boolean;
  disabled?: boolean;
  selected?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/** Tappable list row (≥ 56 dp) with leading icon, texts, trailing value and chevron. */
export const ListRow = memo(function ListRow({
  title,
  subtitle,
  left,
  right,
  onPress,
  onLongPress,
  chevron,
  disabled = false,
  selected,
  accessibilityLabel,
  accessibilityHint,
  style,
  testID,
}: ListRowProps) {
  const pressable = onPress !== undefined || onLongPress !== undefined;
  const showChevron = chevron ?? pressable;
  const label =
    accessibilityLabel ??
    [title, subtitle, typeof right === 'string' || typeof right === 'number' ? String(right) : undefined]
      .filter(Boolean)
      .join(', ');

  const content = (
    <>
      {left !== undefined ? (
        <View style={styles.left}>
          {typeof left === 'string' ? (
            <Text style={styles.leftEmoji} allowFontScaling={false}>
              {left}
            </Text>
          ) : (
            left
          )}
        </View>
      ) : null}
      <View style={styles.texts}>
        <AppText variant="bodyStrong" numberOfLines={2}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="caption" tone="secondary" numberOfLines={2}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {right !== undefined ? (
        typeof right === 'string' || typeof right === 'number' ? (
          <AppText variant="label" tone="secondary" numberOfLines={1} maxFontSizeMultiplier={fontScale.badge}>
            {right}
          </AppText>
        ) : (
          right
        )
      ) : null}
      {showChevron ? (
        <Text style={styles.chevron} maxFontSizeMultiplier={fontScale.badge}>
          ›
        </Text>
      ) : null}
    </>
  );

  if (!pressable) {
    return (
      <View style={[styles.row, style]} accessible accessibilityLabel={label} testID={testID}>
        {content}
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled, selected }}
      disabled={disabled}
      onPress={onPress}
      onLongPress={onLongPress}
      testID={testID}
      style={({ pressed }) => [
        styles.row,
        selected && styles.selected,
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      {content}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  row: {
    minHeight: sizes.listRowMinHeight,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
  },
  selected: { backgroundColor: colors.accentSoft },
  pressed: { backgroundColor: colors.surfacePressed },
  disabled: { opacity: opacity.disabled },
  left: { width: 36, alignItems: 'center', justifyContent: 'center' },
  leftEmoji: { fontSize: 26, lineHeight: 32, color: colors.text },
  texts: { flex: 1, minWidth: 0, gap: spacing.xxs },
  chevron: { color: colors.textMuted, fontSize: 24, lineHeight: 28, fontWeight: '600' },
});
