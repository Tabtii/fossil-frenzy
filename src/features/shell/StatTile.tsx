import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppText, colors, fontScale, radii, spacing } from '@/ui';

export interface StatTileProps {
  icon: string;
  label: string;
  value: string;
}

/** One statistic (emoji, big number, label); read as "Label: Wert". */
export const StatTile = memo(function StatTile({ icon, label, value }: StatTileProps) {
  return (
    <View style={styles.tile} accessible accessibilityLabel={`${label}: ${value}`}>
      <Text style={styles.icon} allowFontScaling={false}>
        {icon}
      </Text>
      <View style={styles.texts}>
        <AppText variant="heading" tabular numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={fontScale.badge}>
          {value}
        </AppText>
        <AppText variant="caption" tone="secondary" numberOfLines={2}>
          {label}
        </AppText>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  tile: {
    flexGrow: 1,
    flexBasis: '45%',
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceRaised,
  },
  icon: { fontSize: 22, lineHeight: 28 },
  texts: { flex: 1, minWidth: 0 },
});
