import { memo, useEffect, useRef } from 'react';
import { type StyleProp, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';

import { reduceMotionOption, useReduceMotion } from '../hooks';
import { UI_STRINGS } from '../labels';
import { colors, durations, fontScale, glow } from '../theme';

export interface EnergyOrbProps {
  current: number;
  max: number;
  /** Diameter in dp (default 56). */
  size?: number;
  /** App setting; the OS setting is respected automatically. */
  reducedMotion?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/** Energy counter "2/3". Pulses when the value changes, dims at 0. */
export const EnergyOrb = memo(function EnergyOrb({
  current,
  max,
  size = 56,
  reducedMotion = false,
  style,
  testID,
}: EnergyOrbProps) {
  const reduce = useReduceMotion(reducedMotion);
  const scale = useSharedValue(1);
  const previous = useRef(current);

  useEffect(() => {
    if (previous.current === current) return;
    previous.current = current;
    if (reduce) return;
    const reduceMotion = reduceMotionOption(reduce);
    scale.set(
      withSequence(
        withTiming(1.14, { duration: durations.fast, reduceMotion }),
        withTiming(1, { duration: durations.normal, reduceMotion }),
      ),
    );
  }, [current, reduce, scale]);

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));

  const empty = current <= 0;
  const fontSize = Math.round(size * 0.34);
  const inner = Math.round(size * 0.78);

  return (
    <Animated.View
      style={[
        styles.outer,
        { width: size, height: size, borderRadius: size / 2 },
        empty ? styles.outerEmpty : styles.glow,
        animatedStyle,
        style,
      ]}
      accessible
      accessibilityRole="text"
      accessibilityLabel={`${UI_STRINGS.energy} ${current} von ${max}`}
      testID={testID}
    >
      <View
        style={[styles.inner, { width: inner, height: inner, borderRadius: inner / 2 }, empty ? styles.innerEmpty : null]}
      >
        <Text
          style={[styles.value, { fontSize, lineHeight: Math.round(fontSize * 1.15) }, empty ? styles.valueEmpty : null]}
          maxFontSizeMultiplier={fontScale.badge}
          adjustsFontSizeToFit
          numberOfLines={1}
        >
          {current}/{max}
        </Text>
      </View>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  outer: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.energyDeep,
  },
  glow: glow(colors.energy, 14),
  outerEmpty: { backgroundColor: colors.surfaceHigh },
  inner: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.energy },
  innerEmpty: { backgroundColor: colors.energyEmpty },
  value: { color: colors.onEnergy, fontWeight: '900', fontVariant: ['tabular-nums'], paddingHorizontal: 2 },
  valueEmpty: { color: colors.text },
});
