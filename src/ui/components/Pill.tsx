import { memo } from 'react';
import { type StyleProp, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { colors, fontScale, radii, spacing } from '../theme';

export type PillTone = 'neutral' | 'accent' | 'success' | 'danger' | 'info' | 'block' | 'energy';

export interface PillProps {
  label: string;
  /** Leading emoji/glyph. */
  icon?: string;
  tone?: PillTone;
  /** Custom accent colour (theme token value); overrides `tone`. */
  color?: string;
  size?: 'sm' | 'md';
  /** Filled background instead of a tinted outline. */
  solid?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

const TONES: Record<PillTone, { main: string; soft: string; onMain: string }> = {
  neutral: { main: colors.textSecondary, soft: colors.surfaceRaised, onMain: colors.textInverse },
  accent: { main: colors.accent, soft: colors.accentSoft, onMain: colors.onAccent },
  success: { main: colors.success, soft: colors.successSoft, onMain: colors.onSuccess },
  danger: { main: colors.danger, soft: colors.dangerSoft, onMain: colors.textInverse },
  info: { main: colors.info, soft: colors.blockSoft, onMain: colors.textInverse },
  block: { main: colors.block, soft: colors.blockSoft, onMain: colors.onBlock },
  energy: { main: colors.energy, soft: colors.accentSoft, onMain: colors.onEnergy },
};

/** Small rounded label (tag), e.g. "Neu", "Elite", "+4 Max-LP". */
export const Pill = memo(function Pill({
  label,
  icon,
  tone = 'neutral',
  color,
  size = 'md',
  solid = false,
  accessibilityLabel,
  style,
  testID,
}: PillProps) {
  const palette = TONES[tone];
  const main = color ?? palette.main;
  return (
    <View
      accessible
      accessibilityLabel={accessibilityLabel ?? label}
      testID={testID}
      style={[
        styles.base,
        size === 'sm' ? styles.sm : styles.md,
        { borderColor: main, backgroundColor: solid ? main : color ? colors.surfaceRaised : palette.soft },
        style,
      ]}
    >
      <Text
        style={[size === 'sm' ? styles.textSm : styles.textMd, { color: solid ? palette.onMain : main }]}
        maxFontSizeMultiplier={fontScale.badge}
        numberOfLines={1}
      >
        {icon ? `${icon} ${label}` : label}
      </Text>
    </View>
  );
});

/** Alias for semantic use as a tag. */
export const Tag = Pill;
export type TagProps = PillProps;

const styles = StyleSheet.create({
  base: { alignSelf: 'flex-start', borderRadius: radii.pill, borderWidth: 1, justifyContent: 'center' },
  sm: { paddingHorizontal: spacing.sm, minHeight: 20 },
  md: { paddingHorizontal: spacing.md, minHeight: 28 },
  textSm: { fontSize: 11, lineHeight: 14, fontWeight: '700' },
  textMd: { fontSize: 13, lineHeight: 18, fontWeight: '700' },
});
