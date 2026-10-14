import { memo } from 'react';
import { Pressable, type StyleProp, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { AppText, colors, opacity, radii, spacing, TOUCH_TARGET } from '@/ui';

// Compact menu tile (emoji, title, caption), two per row on the home screen.

export interface MenuTileProps {
  icon: string;
  title: string;
  caption?: string;
  onPress: () => void;
  disabled?: boolean;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export const MenuTile = memo(function MenuTile({
  icon,
  title,
  caption,
  onPress,
  disabled = false,
  accessibilityHint,
  style,
  testID,
}: MenuTileProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={caption ? `${title}, ${caption}` : title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [styles.tile, pressed && styles.pressed, disabled && styles.disabled, style]}
    >
      <Text style={styles.icon} allowFontScaling={false}>
        {icon}
      </Text>
      <View style={styles.texts}>
        <AppText variant="bodyStrong" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
          {title}
        </AppText>
        {caption ? (
          <AppText variant="caption" tone="secondary" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
            {caption}
          </AppText>
        ) : null}
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    minWidth: 0,
    minHeight: TOUCH_TARGET + spacing.xxl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceRaised,
  },
  pressed: { backgroundColor: colors.surfacePressed, transform: [{ scale: 0.98 }] },
  disabled: { opacity: opacity.disabled },
  icon: { fontSize: 26, lineHeight: 32 },
  texts: { flex: 1, minWidth: 0, gap: spacing.xxs },
});
