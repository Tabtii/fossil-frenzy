import { memo } from 'react';
import { type StyleProp, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import type { Era } from '@/engine/types';

import { ERA_ICONS, ERA_LABELS } from '../labels';
import { eraColors, fontScale, radii, spacing } from '../theme';

export interface EraBadgeProps {
  era: Era;
  size?: 'sm' | 'md';
  /** 'soft' = tinted background + coloured text, 'solid' = filled. */
  variant?: 'soft' | 'solid';
  /** Show the era icon (default true). */
  showIcon?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** Era label, e.g. "🌿 Jura", in the era's colour. */
export const EraBadge = memo(function EraBadge({
  era,
  size = 'md',
  variant = 'soft',
  showIcon = true,
  style,
}: EraBadgeProps) {
  const tone = eraColors[era];
  const solid = variant === 'solid';
  return (
    <View
      accessible
      accessibilityLabel={`Ära: ${ERA_LABELS[era]}`}
      style={[
        styles.base,
        size === 'sm' ? styles.sm : styles.md,
        { backgroundColor: solid ? tone.main : tone.soft, borderColor: tone.main },
        style,
      ]}
    >
      <Text
        style={[size === 'sm' ? styles.textSm : styles.textMd, { color: solid ? tone.onMain : tone.main }]}
        maxFontSizeMultiplier={fontScale.badge}
        numberOfLines={1}
      >
        {showIcon ? `${ERA_ICONS[era]} ${ERA_LABELS[era]}` : ERA_LABELS[era]}
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  base: { alignSelf: 'flex-start', borderRadius: radii.pill, borderWidth: 1, justifyContent: 'center' },
  sm: { paddingHorizontal: spacing.sm, minHeight: 20 },
  md: { paddingHorizontal: spacing.md, minHeight: 28 },
  textSm: { fontSize: 11, lineHeight: 14, fontWeight: '700' },
  textMd: { fontSize: 13, lineHeight: 18, fontWeight: '700' },
});
