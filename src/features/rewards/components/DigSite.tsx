import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, eraColors, radii, spacing } from '@/ui';

// Decorative cross-section of rock layers with buried finds (sand tones from
// the amber accent and the Trias "desert" era colour).

const LAYERS = [
  { color: colors.accentSoft, items: ['🪨', '🐚'] },
  { color: eraColors.trias.soft, items: ['🦴', '🪨', '🦷'] },
  { color: colors.accentSoft, items: ['🐚', '🦴'] },
] as const;

export const DigSite = memo(function DigSite() {
  return (
    <View
      style={styles.root}
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
    >
      {LAYERS.map((layer, index) => (
        <View
          key={index}
          style={[styles.layer, { backgroundColor: layer.color }, index % 2 === 1 && styles.layerOffset]}
        >
          {layer.items.map((item, itemIndex) => (
            <Text key={itemIndex} style={styles.item} allowFontScaling={false}>
              {item}
            </Text>
          ))}
        </View>
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  root: {
    borderRadius: radii.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.accentBorder,
    backgroundColor: colors.surface,
  },
  layer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.accentBorder,
  },
  layerOffset: { paddingHorizontal: spacing.xxl },
  item: { fontSize: 18, lineHeight: 24, opacity: 0.85 },
});
