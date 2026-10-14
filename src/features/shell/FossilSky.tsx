import { memo } from 'react';
import { type DimensionValue, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { fill } from '@/ui';

import { useBob } from './motion';

// Decorative background for the home screen: faint fossils and plants that
// drift slowly. Hidden from screen readers and never touchable.

interface SkyItem {
  emoji: string;
  left: DimensionValue;
  top: DimensionValue;
  size: number;
  duration: number;
  delay: number;
}

const ITEMS: readonly SkyItem[] = [
  { emoji: '🦴', left: '6%', top: '7%', size: 30, duration: 5200, delay: 0 },
  { emoji: '🐚', left: '80%', top: '5%', size: 24, duration: 6100, delay: 700 },
  { emoji: '🌿', left: '72%', top: '27%', size: 28, duration: 5600, delay: 300 },
  { emoji: '🥚', left: '9%', top: '34%', size: 22, duration: 6600, delay: 1200 },
  { emoji: '🌋', left: '84%', top: '48%', size: 26, duration: 7000, delay: 500 },
  { emoji: '❄️', left: '4%', top: '58%', size: 24, duration: 5900, delay: 1500 },
  { emoji: '🍂', left: '44%', top: '2%', size: 20, duration: 6300, delay: 900 },
  { emoji: '🦴', left: '62%', top: '64%', size: 22, duration: 5400, delay: 200 },
];

const SKY_OPACITY = 0.14;
const DRIFT = 10;

const SkyEmoji = memo(function SkyEmoji({ item, active }: { item: SkyItem; active: boolean }) {
  const style = useBob(active, { amplitude: DRIFT, duration: item.duration, delay: item.delay });
  return (
    <Animated.View style={[styles.item, { left: item.left, top: item.top }, style]}>
      <Text style={{ fontSize: item.size, lineHeight: Math.round(item.size * 1.25) }} allowFontScaling={false}>
        {item.emoji}
      </Text>
    </Animated.View>
  );
});

export interface FossilSkyProps {
  /** Animate (pass `focused && !reducedMotion`). */
  active: boolean;
}

export const FossilSky = memo(function FossilSky({ active }: FossilSkyProps) {
  return (
    <View
      style={styles.root}
      pointerEvents="none"
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {ITEMS.map((item, index) => (
        <SkyEmoji key={index} item={item} active={active} />
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  root: { ...fill, opacity: SKY_OPACITY, overflow: 'hidden' },
  item: { position: 'absolute' },
});
