import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, fontScale, radii, spacing } from '@/ui';

import { NODE_INFO, NODE_TYPES } from '../mapModel';

/** One-line legend of the node icons (wraps on narrow screens). */
export const MapLegend = memo(function MapLegend() {
  const spoken = `Legende: ${NODE_TYPES.map((type) => `${NODE_INFO[type].icon} ${NODE_INFO[type].label}`).join(', ')}`;
  return (
    <View style={styles.root} accessible accessibilityLabel={spoken}>
      {NODE_TYPES.map((type) => (
        <View key={type} style={styles.item}>
          <Text style={styles.text} maxFontSizeMultiplier={fontScale.badge} numberOfLines={1}>
            {NODE_INFO[type].icon} {NODE_INFO[type].label}
          </Text>
        </View>
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  root: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.xs },
  item: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceRaised,
  },
  text: { color: colors.textSecondary, fontSize: 12, lineHeight: 16, fontWeight: '600' },
});
