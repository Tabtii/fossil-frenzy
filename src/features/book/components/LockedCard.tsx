import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { Era, Rarity } from '@/engine/types';
import {
  colors,
  ERA_ICONS,
  ERA_LABELS,
  eraColors,
  fontScale,
  gameCardHeight,
  RARITY_LABELS,
  rarityColors,
  spacing,
} from '@/ui';

import { lockedCardAccessibilityLabel } from '../model';

export interface LockedCardProps {
  era: Era;
  rarity: Rarity;
  width: number;
  testID?: string;
}

/** Placeholder with the size of a GameCard that only reveals era and rarity. */
export const LockedCard = memo(function LockedCard({ era, rarity, width, testID }: LockedCardProps) {
  const height = gameCardHeight(width);
  const k = width / 88;
  const tone = eraColors[era];
  return (
    <View
      accessible
      accessibilityLabel={lockedCardAccessibilityLabel({ era, rarity })}
      testID={testID}
      style={[
        styles.root,
        {
          width,
          height,
          borderRadius: Math.round(10 * k),
          borderColor: rarityColors[rarity],
          padding: Math.round(4 * k),
        },
      ]}
    >
      <View style={[styles.art, { backgroundColor: tone.soft, borderRadius: Math.round(6 * k) }]}>
        <Text
          style={[styles.icon, { fontSize: Math.round(26 * k), lineHeight: Math.round(32 * k) }]}
          allowFontScaling={false}
        >
          ❓
        </Text>
      </View>
      <Text
        style={[styles.era, { color: tone.main, fontSize: Math.max(10, Math.round(11 * k)) }]}
        maxFontSizeMultiplier={fontScale.cardCompact}
        numberOfLines={1}
      >
        {`${ERA_ICONS[era]} ${ERA_LABELS[era]}`}
      </Text>
      <Text
        style={[styles.rarity, { color: rarityColors[rarity], fontSize: Math.max(10, Math.round(10 * k)) }]}
        maxFontSizeMultiplier={fontScale.cardCompact}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.8}
      >
        {RARITY_LABELS[rarity]}
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  root: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    backgroundColor: colors.backgroundDeep,
    alignItems: 'center',
    gap: spacing.xs,
  },
  art: { alignSelf: 'stretch', flex: 1, alignItems: 'center', justifyContent: 'center' },
  icon: { opacity: 0.5, textAlign: 'center' },
  era: { fontWeight: '700', textAlign: 'center' },
  rarity: { fontWeight: '700', textAlign: 'center', marginBottom: spacing.xxs },
});
