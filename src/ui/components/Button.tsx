import { memo, type ReactNode } from 'react';
import {
  ActivityIndicator,
  type GestureResponderEvent,
  Pressable,
  type StyleProp,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from 'react-native';

import { colors, fontScale, hitSlopFor, radii, sizes, spacing, TOUCH_TARGET, typography } from '../theme';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps {
  label: string;
  /** Trigger haptics from here (the design system never imports the store). */
  onPress?: (event: GestureResponderEvent) => void;
  onPressIn?: (event: GestureResponderEvent) => void;
  onLongPress?: (event: GestureResponderEvent) => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  /** Shows a spinner and blocks presses. */
  loading?: boolean;
  /** Leading emoji/glyph or element. */
  icon?: ReactNode;
  /** Trailing content, e.g. an energy cost or a counter. */
  trailing?: ReactNode;
  /** Stretch to the container width (default false). */
  fullWidth?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

interface VariantColors {
  background: string;
  pressed: string;
  border: string;
  text: string;
}

const VARIANTS: Record<ButtonVariant, VariantColors> = {
  primary: { background: colors.accent, pressed: colors.accentPressed, border: colors.accent, text: colors.onAccent },
  secondary: {
    background: colors.surfaceHigh,
    pressed: colors.surfacePressed,
    border: colors.borderStrong,
    text: colors.text,
  },
  ghost: { background: colors.transparent, pressed: colors.surfaceRaised, border: colors.transparent, text: colors.accent },
  danger: { background: colors.dangerFill, pressed: colors.dangerPressed, border: colors.dangerFill, text: colors.onDangerFill },
};

const DISABLED: VariantColors = {
  background: colors.surfaceRaised,
  pressed: colors.surfaceRaised,
  border: colors.border,
  text: colors.textDisabled,
};

/**
 * Text button with pressed feedback. All sizes keep a ≥ 48 dp touch target
 * (`sm` is 40 dp tall visually and gets hit slop).
 */
export const Button = memo(function Button({
  label,
  onPress,
  onPressIn,
  onLongPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon,
  trailing,
  fullWidth = false,
  accessibilityLabel,
  accessibilityHint,
  style,
  testID,
}: ButtonProps) {
  const inactive = disabled || loading;
  const palette = disabled ? DISABLED : VARIANTS[variant];
  const height = sizes.buttonHeight[size];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={onPress}
      onPressIn={onPressIn}
      onLongPress={onLongPress}
      hitSlop={size === 'sm' ? hitSlopFor(TOUCH_TARGET, height) : undefined}
      testID={testID}
      style={({ pressed }) => [
        styles.base,
        sizeStyles[size],
        {
          backgroundColor: pressed && !inactive ? palette.pressed : palette.background,
          borderColor: palette.border,
        },
        variant === 'ghost' && styles.ghost,
        fullWidth && styles.fullWidth,
        pressed && !inactive && styles.pressed,
        style,
      ]}
    >
      {loading ? <ActivityIndicator size="small" color={palette.text} style={styles.spinner} /> : null}
      {!loading && icon !== undefined ? (
        typeof icon === 'string' ? (
          <Text style={[textSizes[size], { color: palette.text }]} maxFontSizeMultiplier={fontScale.badge}>
            {icon}
          </Text>
        ) : (
          <View>{icon}</View>
        )
      ) : null}
      <Text
        style={[styles.label, textSizes[size], { color: palette.text }, loading && styles.loadingLabel]}
        numberOfLines={2}
        maxFontSizeMultiplier={fontScale.title}
      >
        {label}
      </Text>
      {trailing !== undefined ? <View style={styles.trailing}>{trailing}</View> : null}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  ghost: { borderWidth: 0 },
  fullWidth: { alignSelf: 'stretch' },
  pressed: { transform: [{ scale: 0.98 }] },
  label: { ...typography.bodyStrong, flexShrink: 1, textAlign: 'center' },
  loadingLabel: { opacity: 0.8 },
  spinner: { marginRight: spacing.xxs },
  trailing: { marginLeft: spacing.xs },
});

const sizeStyles = StyleSheet.create({
  sm: { minHeight: sizes.buttonHeight.sm, paddingHorizontal: spacing.md },
  md: { minHeight: sizes.buttonHeight.md, paddingHorizontal: spacing.lg },
  lg: { minHeight: sizes.buttonHeight.lg, paddingHorizontal: spacing.xl, borderRadius: radii.lg },
});

const textSizes = StyleSheet.create({
  sm: { fontSize: 14, lineHeight: 18 },
  md: { fontSize: 16, lineHeight: 20 },
  lg: { fontSize: 18, lineHeight: 22 },
});
