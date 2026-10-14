import { memo } from 'react';
import { type ColorValue, StyleSheet, Text, type TextProps } from 'react-native';

import { colors, type TextVariant, typography, variantFontScale } from '../theme';

export type TextTone =
  | 'primary'
  | 'secondary'
  | 'muted'
  | 'disabled'
  | 'accent'
  | 'success'
  | 'danger'
  | 'inverse'
  | 'onAccent';

const TONE_COLORS: Record<TextTone, string> = {
  primary: colors.text,
  secondary: colors.textSecondary,
  muted: colors.textMuted,
  disabled: colors.textDisabled,
  accent: colors.accent,
  success: colors.success,
  danger: colors.danger,
  inverse: colors.textInverse,
  onAccent: colors.onAccent,
};

export interface AppTextProps extends TextProps {
  /** Typography token (default 'body'). */
  variant?: TextVariant;
  /** Colour token (default 'primary'). */
  tone?: TextTone;
  /** Explicit colour; pass a theme token value. Overrides `tone`. */
  color?: ColorValue;
  align?: 'left' | 'center' | 'right';
  italic?: boolean;
  /** Tabular numbers so counters do not jitter. */
  tabular?: boolean;
}

/**
 * Themed text. Applies the typography scale and a sensible default
 * `maxFontSizeMultiplier` per variant (override via the prop).
 */
export const AppText = memo(function AppText({
  variant = 'body',
  tone = 'primary',
  color,
  align,
  italic,
  tabular,
  style,
  maxFontSizeMultiplier,
  ...rest
}: AppTextProps) {
  return (
    <Text
      maxFontSizeMultiplier={maxFontSizeMultiplier ?? variantFontScale[variant]}
      style={[
        styles[variant],
        toneStyles[tone],
        color !== undefined && { color },
        align !== undefined && alignStyles[align],
        italic && styles.italic,
        tabular && styles.tabular,
        style,
      ]}
      {...rest}
    />
  );
});

const styles = StyleSheet.create({
  ...typography,
  italic: { fontStyle: 'italic' },
  tabular: { fontVariant: ['tabular-nums'] },
});

const toneStyles = StyleSheet.create(
  Object.fromEntries(Object.entries(TONE_COLORS).map(([tone, color]) => [tone, { color }])) as Record<
    TextTone,
    { color: string }
  >,
);

const alignStyles = StyleSheet.create({
  left: { textAlign: 'left' },
  center: { textAlign: 'center' },
  right: { textAlign: 'right' },
});
