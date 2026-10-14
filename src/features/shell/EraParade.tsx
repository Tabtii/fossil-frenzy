import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { type Era, ERAS } from '@/engine/types';
import { eraColors, spacing } from '@/ui';

import { useBob } from './motion';

// Emoji art for the home hero: one animal per era in its era colour,
// floating gently one after another (Trias → Jura → Kreide → Eiszeit).

export const ERA_MASCOTS: Record<Era, string> = {
  trias: '🦎',
  jura: '🦕',
  kreide: '🦖',
  eiszeit: '🦣',
};

const MascotTile = memo(function MascotTile({
  era,
  index,
  size,
  active,
}: {
  era: Era;
  index: number;
  size: number;
  active: boolean;
}) {
  const style = useBob(active, { amplitude: size * 0.08, duration: 1400, delay: index * 220 });
  const tone = eraColors[era];
  const emojiSize = Math.round(size * 0.5);
  return (
    <Animated.View
      style={[
        styles.tile,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: tone.soft, borderColor: tone.main },
        style,
      ]}
    >
      <Text style={{ fontSize: emojiSize, lineHeight: Math.round(emojiSize * 1.25) }} allowFontScaling={false}>
        {ERA_MASCOTS[era]}
      </Text>
    </Animated.View>
  );
});

export interface EraParadeProps {
  /** Width available for the row in dp. */
  width: number;
  /** Animate (pass `focused && !reducedMotion`). */
  active: boolean;
}

const MAX_TILE = 76;
const MIN_TILE = 52;

/** Decorative row of four era mascots (hidden from screen readers). */
export const EraParade = memo(function EraParade({ width, active }: EraParadeProps) {
  const gap = spacing.md;
  const size = Math.max(MIN_TILE, Math.min(MAX_TILE, Math.floor((width - gap * (ERAS.length - 1)) / ERAS.length)));
  return (
    <View
      style={[styles.row, { gap }]}
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {ERAS.map((era, index) => (
        <MascotTile key={era} era={era} index={index} size={size} active={active} />
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end', paddingTop: spacing.sm },
  tile: { alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
});
