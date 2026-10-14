import { memo, type ReactNode } from 'react';
import { type GestureResponderEvent, Pressable, type StyleProp, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { colors, fontScale, hitSlopFor, opacity, radii, TOUCH_TARGET } from '../theme';

export type IconButtonVariant = 'plain' | 'filled' | 'outline';

export interface IconButtonProps {
  /** Emoji/glyph or a custom element. */
  icon: ReactNode;
  /** Required: icon-only buttons need a spoken label. */
  accessibilityLabel: string;
  accessibilityHint?: string;
  onPress?: (event: GestureResponderEvent) => void;
  onLongPress?: (event: GestureResponderEvent) => void;
  variant?: IconButtonVariant;
  /** Visual size in dp (default 48). Smaller sizes get hit slop up to 48 dp. */
  size?: number;
  disabled?: boolean;
  /** Marks a toggle-like icon button as active. */
  selected?: boolean;
  /** Small counter badge in the top-right corner. */
  badge?: string | number;
  iconColor?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/** Round icon-only button with a ≥ 48 dp touch target. */
export const IconButton = memo(function IconButton({
  icon,
  accessibilityLabel,
  accessibilityHint,
  onPress,
  onLongPress,
  variant = 'plain',
  size = TOUCH_TARGET,
  disabled = false,
  selected,
  badge,
  iconColor = colors.text,
  style,
  testID,
}: IconButtonProps) {
  const glyphSize = Math.round(size * 0.46);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled, selected }}
      disabled={disabled}
      onPress={onPress}
      onLongPress={onLongPress}
      hitSlop={size < TOUCH_TARGET ? hitSlopFor(size) : undefined}
      testID={testID}
      style={({ pressed }) => [
        styles.base,
        { width: size, height: size, borderRadius: size / 2 },
        variantStyles[variant],
        selected && styles.selected,
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      {typeof icon === 'string' ? (
        <Text
          style={[styles.glyph, { fontSize: glyphSize, lineHeight: Math.round(glyphSize * 1.2), color: iconColor }]}
          maxFontSizeMultiplier={1}
          allowFontScaling={false}
        >
          {icon}
        </Text>
      ) : (
        icon
      )}
      {badge !== undefined ? (
        <View style={styles.badge} pointerEvents="none">
          <Text style={styles.badgeText} maxFontSizeMultiplier={fontScale.badge} numberOfLines={1}>
            {badge}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center' },
  glyph: { textAlign: 'center', fontWeight: '700' },
  pressed: { backgroundColor: colors.surfacePressed },
  selected: { borderColor: colors.accent, borderWidth: 2, backgroundColor: colors.accentSoft },
  disabled: { opacity: opacity.disabled },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: radii.pill,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: colors.onAccent, fontSize: 11, lineHeight: 14, fontWeight: '800' },
});

const variantStyles = StyleSheet.create({
  plain: { backgroundColor: colors.transparent },
  filled: { backgroundColor: colors.surfaceHigh },
  outline: { backgroundColor: colors.transparent, borderWidth: 1, borderColor: colors.borderStrong },
});
