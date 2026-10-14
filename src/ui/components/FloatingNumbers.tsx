import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { type StyleProp, StyleSheet, Text, type TextStyle, View, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { type FloatingNumberItem, type FloatingNumberKind, floatingNumberText } from '../format';
import { useReduceMotion } from '../hooks';
import { colors, durations, fill, fontScale, zIndex } from '../theme';

export type { FloatingNumberItem, FloatingNumberKind } from '../format';

export interface FloatingNumbersProps {
  items: readonly FloatingNumberItem[];
  /** Called when an item has finished; remove it from the queue here. */
  onDone: (id: FloatingNumberItem['id']) => void;
  /** Rise distance in dp (default 56). */
  rise?: number;
  size?: 'md' | 'lg';
  /** App setting; the OS setting is respected automatically. */
  reducedMotion?: boolean;
  /** Container style; defaults to filling the parent, numbers centred. */
  style?: StyleProp<ViewStyle>;
}

const KIND_COLORS: Record<FloatingNumberKind, string> = {
  damage: colors.hp,
  block: colors.block,
  heal: colors.heal,
};

/** Small deterministic horizontal offset so simultaneous numbers do not overlap exactly. */
function jitterFor(id: FloatingNumberItem['id']): number {
  const text = String(id);
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) hash = (hash * 31 + text.charCodeAt(i)) | 0;
  return ((Math.abs(hash) % 5) - 2) * 12;
}

interface FloatingNumberProps {
  item: FloatingNumberItem;
  order: number;
  rise: number;
  size: 'md' | 'lg';
  reduce: boolean;
  onDone: (id: FloatingNumberItem['id']) => void;
}

const FloatingNumber = memo(function FloatingNumber({ item, order, rise, size, reduce, onDone }: FloatingNumberProps) {
  const progress = useSharedValue(0);
  // Stagger numbers that appear together (e.g. multi-hit attacks); fixed at mount.
  const [delay] = useState(() => (order % 4) * 110);
  const [offsetX] = useState(() => jitterFor(item.id));

  useEffect(() => {
    const id = item.id;
    // The fade also runs with reduced motion (only movement is dropped), so
    // never let Reanimated skip it.
    progress.set(
      withDelay(
        delay,
        withTiming(
          1,
          { duration: durations.float, easing: Easing.out(Easing.quad), reduceMotion: ReduceMotion.Never },
          (finished) => {
            if (finished) scheduleOnRN(onDone, id);
          },
        ),
        ReduceMotion.Never,
      ),
    );
  }, [delay, item.id, onDone, progress]);

  const animatedStyle = useAnimatedStyle(() => {
    const p = progress.get();
    const fade = interpolate(p, [0, 0.05, 0.65, 1], [0, 1, 1, 0], 'clamp');
    if (reduce) return { opacity: fade, transform: [{ translateX: offsetX }] };
    return {
      opacity: fade,
      transform: [
        { translateX: offsetX },
        { translateY: -rise * p },
        { scale: interpolate(p, [0, 0.12, 0.25, 1], [0.6, 1.2, 1, 0.95], 'clamp') },
      ],
    };
  });

  return (
    <Animated.View style={[styles.item, animatedStyle]}>
      <Text
        style={[size === 'lg' ? styles.textLg : styles.textMd, { color: KIND_COLORS[item.kind] }]}
        maxFontSizeMultiplier={fontScale.badge}
        numberOfLines={1}
      >
        {floatingNumberText(item)}
      </Text>
    </Animated.View>
  );
});

/**
 * Damage/block/heal numbers that pop, rise and fade. With reduced motion they
 * only fade in place. Decorative: hidden from screen readers (announce
 * important changes from the screen instead).
 */
export const FloatingNumbers = memo(function FloatingNumbers({
  items,
  onDone,
  rise = 56,
  size = 'lg',
  reducedMotion = false,
  style,
}: FloatingNumbersProps) {
  const reduce = useReduceMotion(reducedMotion);
  // A stable callback, so a new `onDone` identity from the parent does not
  // restart the running animations.
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);
  const handleDone = useCallback((id: FloatingNumberItem['id']) => onDoneRef.current(id), []);
  return (
    <View
      style={[styles.container, style]}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {items.map((item, index) => (
        <FloatingNumber key={item.id} item={item} order={index} rise={rise} size={size} reduce={reduce} onDone={handleDone} />
      ))}
    </View>
  );
});

const textBase: TextStyle = {
  fontWeight: '900',
  fontVariant: ['tabular-nums'],
  textShadowColor: colors.textShadow,
  textShadowOffset: { width: 0, height: 2 },
  textShadowRadius: 4,
};

const styles = StyleSheet.create({
  container: {
    ...fill,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: zIndex.floatingNumbers,
  },
  item: { position: 'absolute' },
  textMd: { ...textBase, fontSize: 22, lineHeight: 28 },
  textLg: { ...textBase, fontSize: 30, lineHeight: 36 },
});
