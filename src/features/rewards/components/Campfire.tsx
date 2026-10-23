import { memo, useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { colors, glow, radii, spacing } from '@/ui';

const FLICKER_MS = 900;

/** Campfire scene with a gently flickering flame (static with reduced motion). */
export const Campfire = memo(function Campfire({ reduceMotion }: { reduceMotion: boolean }) {
  const flicker = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) {
      cancelAnimation(flicker);
      flicker.set(0);
      return;
    }
    flicker.set(withRepeat(withTiming(1, { duration: FLICKER_MS, easing: Easing.inOut(Easing.sin) }), -1, true));
    return () => cancelAnimation(flicker);
  }, [reduceMotion, flicker]);

  const flameStyle = useAnimatedStyle(() => {
    const f = flicker.get();
    return { transform: [{ scaleY: 1 + 0.08 * f }, { scaleX: 1 - 0.04 * f }], opacity: 0.88 + 0.12 * f };
  });
  const glowStyle = useAnimatedStyle(() => ({ opacity: 0.5 + 0.3 * flicker.get() }));

  return (
    <View
      style={styles.root}
      accessible
      accessibilityRole="image"
      accessibilityLabel="Ein Lagerfeuer unter dem Sternenhimmel"
    >
      <Text style={[styles.star, styles.starLeft]} allowFontScaling={false}>
        ✨
      </Text>
      <Text style={[styles.star, styles.starRight]} allowFontScaling={false}>
        🌙
      </Text>
      <Animated.View style={[styles.glow, glowStyle]} />
      <Animated.View style={flameStyle}>
        <Text style={styles.flame} allowFontScaling={false}>
          🔥
        </Text>
      </Animated.View>
      <Text style={styles.logs} allowFontScaling={false}>
        🪵🪵
      </Text>
    </View>
  );
});

const GLOW = 132;

const styles = StyleSheet.create({
  root: { alignItems: 'center', justifyContent: 'flex-end', height: 168, paddingBottom: spacing.sm },
  glow: {
    position: 'absolute',
    bottom: spacing.lg,
    width: GLOW,
    height: GLOW,
    borderRadius: radii.pill,
    backgroundColor: colors.accentSoft,
    ...glow(colors.warning, 40),
  },
  flame: { fontSize: 76, lineHeight: 92, textAlign: 'center', color: colors.warning },
  logs: { fontSize: 28, lineHeight: 32, marginTop: -spacing.md, color: colors.textSecondary },
  star: { position: 'absolute', top: spacing.sm, fontSize: 20, lineHeight: 26, color: colors.accent },
  starLeft: { left: '18%' },
  starRight: { right: '18%' },
});
