import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppText, colors, elevation, fontScale, opacity, radii, sizes, spacing } from '@/ui';

// Large two-line primary action ("Weiterspielen" + run status) for the thumb
// zone of the home screen.

export interface ContinueButtonProps {
  title: string;
  caption: string;
  icon: string;
  onPress: () => void;
  disabled?: boolean;
  accessibilityLabel: string;
  accessibilityHint?: string;
  testID?: string;
}

export const ContinueButton = memo(function ContinueButton({
  title,
  caption,
  icon,
  onPress,
  disabled = false,
  accessibilityLabel,
  accessibilityHint,
  testID,
}: ContinueButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [styles.root, pressed && styles.pressed, disabled && styles.disabled]}
    >
      <Text style={styles.icon} allowFontScaling={false}>
        {icon}
      </Text>
      <View style={styles.texts}>
        <AppText variant="subheading" tone="onAccent" style={styles.title} numberOfLines={1}>
          {title}
        </AppText>
        <AppText variant="label" tone="onAccent" numberOfLines={2} maxFontSizeMultiplier={fontScale.title}>
          {caption}
        </AppText>
      </View>
      <Text style={styles.chevron} maxFontSizeMultiplier={fontScale.badge}>
        ›
      </Text>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  root: {
    minHeight: sizes.buttonHeight.lg + spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.lg,
    backgroundColor: colors.accent,
    ...elevation(2),
  },
  pressed: { backgroundColor: colors.accentPressed, transform: [{ scale: 0.98 }] },
  disabled: { opacity: opacity.disabled },
  icon: { fontSize: 30, lineHeight: 36 },
  texts: { flex: 1, minWidth: 0, gap: spacing.xxs },
  title: { fontWeight: '800' },
  chevron: { color: colors.onAccent, fontSize: 28, lineHeight: 32, fontWeight: '700' },
});
