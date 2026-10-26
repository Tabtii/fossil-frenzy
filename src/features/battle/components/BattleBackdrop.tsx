import { memo } from 'react';
import { Image, StyleSheet, View } from 'react-native';

import type { Era } from '@/engine/types';
import { colors, radii, spacing } from '@/ui';

const BOARDS = {
  trias: require('../../../../assets/art/boards/battle-trias.webp'),
  jura: require('../../../../assets/art/boards/battle-jura.webp'),
  kreide: require('../../../../assets/art/boards/battle-kreide.webp'),
  eiszeit: require('../../../../assets/art/boards/battle-eiszeit.webp'),
} as const;

/** Decorative only: every control remains in the ordinary accessible UI. */
export const BattleBackdrop = memo(function BattleBackdrop({ era }: { era: Era }) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none" accessible={false} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
      <Image source={BOARDS[era]} resizeMode="cover" style={styles.image} accessible={false} />
      <View style={[StyleSheet.absoluteFill, styles.shade]} />
      <View style={styles.rim} />
      <View style={styles.innerRim} />
      <View style={styles.shelf} />
    </View>
  );
});

const styles = StyleSheet.create({
  image: { ...StyleSheet.absoluteFill, width: '100%', height: '100%' },
  shade: { backgroundColor: colors.arenaShade },
  rim: { ...StyleSheet.absoluteFill, margin: spacing.xs, borderWidth: 1, borderColor: colors.arenaRim, borderRadius: radii.lg },
  innerRim: { ...StyleSheet.absoluteFill, margin: spacing.sm, borderWidth: 1, borderColor: colors.cardEtching, borderRadius: radii.md },
  shelf: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '27%', backgroundColor: colors.arenaShade, borderTopWidth: 1, borderTopColor: colors.arenaRim },
});
