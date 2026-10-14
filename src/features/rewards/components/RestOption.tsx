import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppText, colors, opacity, radii, spacing } from '@/ui';

export interface RestOptionProps {
  icon: string;
  title: string;
  description: string;
  onPress: () => void;
  disabled?: boolean;
  accessibilityHint?: string;
  testID?: string;
}

/** Big tappable choice tile at the rest site (≥ 80 dp tall). */
export const RestOption = memo(function RestOption({
  icon,
  title,
  description,
  onPress,
  disabled = false,
  accessibilityHint,
  testID,
}: RestOptionProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${description}`}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [styles.root, pressed && !disabled && styles.pressed, disabled && styles.disabled]}
    >
      <View style={styles.iconWrap}>
        <Text style={styles.icon} allowFontScaling={false} accessible={false}>
          {icon}
        </Text>
      </View>
      <View style={styles.text}>
        <AppText variant="subheading" tone={disabled ? 'disabled' : 'primary'}>
          {title}
        </AppText>
        <AppText variant="caption" tone={disabled ? 'disabled' : 'secondary'}>
          {description}
        </AppText>
      </View>
      <AppText variant="heading" tone={disabled ? 'disabled' : 'accent'} accessible={false}>
        ›
      </AppText>
    </Pressable>
  );
});

const ICON = 52;

const styles = StyleSheet.create({
  root: {
    minHeight: 80,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceRaised,
  },
  pressed: { backgroundColor: colors.surfacePressed, transform: [{ scale: 0.98 }] },
  disabled: { opacity: opacity.disabled },
  iconWrap: {
    width: ICON,
    height: ICON,
    borderRadius: ICON / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accentSoft,
  },
  icon: { fontSize: 28, lineHeight: 34 },
  text: { flex: 1, minWidth: 0, gap: spacing.xxs },
});
