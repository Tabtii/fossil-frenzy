import { memo, useCallback, useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import type { Era, MapNode } from '@/engine/types';
import { colors, eraColors, fontScale, glow, radii } from '@/ui';

import { NODE_INFO, nodeAccessibilityHint, nodeAccessibilityLabel, type NodeState } from '../mapModel';

export interface MapNodeButtonProps {
  node: MapNode;
  state: NodeState;
  /** Centre and diameter in dp (from the map layout). */
  x: number;
  y: number;
  size: number;
  era: Era;
  /** True when animations are off (OS or app setting). */
  reduceMotion: boolean;
  onPress: (node: MapNode) => void;
}

const PULSE_MS = 1400;
/** Opacity of nodes the player can no longer reach. */
const UNREACHABLE_OPACITY = 0.35;

/** Pulsing ring behind an available node (static with reduced motion). */
function PulseRing({ size, reduceMotion }: { size: number; reduceMotion: boolean }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) {
      cancelAnimation(progress);
      progress.set(0);
      return;
    }
    progress.set(withRepeat(withTiming(1, { duration: PULSE_MS, easing: Easing.out(Easing.quad) }), -1, false));
    return () => cancelAnimation(progress);
  }, [reduceMotion, progress]);

  const animated = useAnimatedStyle(() => {
    const p = progress.get();
    return { opacity: 0.8 * (1 - p), transform: [{ scale: 1 + 0.45 * p }] };
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.ring,
        { width: size, height: size, borderRadius: size / 2 },
        reduceMotion ? styles.ringStatic : animated,
      ]}
    />
  );
}

/** Round, tappable map node (≥ 56 dp) with type icon and state styling. */
export const MapNodeButton = memo(function MapNodeButton({
  node,
  state,
  x,
  y,
  size,
  era,
  reduceMotion,
  onPress,
}: MapNodeButtonProps) {
  const handlePress = useCallback(() => onPress(node), [node, onPress]);
  const info = NODE_INFO[node.type];
  const isBoss = node.type === 'boss';
  const iconSize = Math.round(size * (isBoss ? 0.46 : 0.42));
  const position = { left: x - size / 2, top: y - size / 2, width: size, height: size };

  return (
    <View style={[styles.anchor, position]} pointerEvents="box-none">
      {state === 'available' ? <PulseRing size={size} reduceMotion={reduceMotion} /> : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={nodeAccessibilityLabel(node, state)}
        accessibilityHint={nodeAccessibilityHint(state)}
        accessibilityState={{ selected: state === 'current' }}
        onPress={handlePress}
        testID={`map-node-${node.id}`}
        style={({ pressed }) => [
          styles.node,
          { width: size, height: size, borderRadius: size / 2 },
          stateStyles[state],
          isBoss && state !== 'current' && state !== 'available' && { borderColor: eraColors[era].main },
          isBoss && styles.boss,
          pressed && styles.pressed,
        ]}
      >
        <Text
          style={[styles.icon, { fontSize: iconSize, lineHeight: Math.round(iconSize * 1.25) }]}
          allowFontScaling={false}
          accessible={false}
        >
          {info.icon}
        </Text>
      </Pressable>
      {state === 'visited' || state === 'current' ? (
        <View
          style={[styles.badge, state === 'current' ? styles.badgeCurrent : styles.badgeVisited]}
          pointerEvents="none"
        >
          <Text style={styles.badgeText} maxFontSizeMultiplier={fontScale.badge} accessible={false}>
            {state === 'current' ? '📍' : '✓'}
          </Text>
        </View>
      ) : null}
    </View>
  );
});

const BADGE = 22;

const styles = StyleSheet.create({
  anchor: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  node: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceRaised,
  },
  boss: { borderWidth: 3 },
  pressed: { transform: [{ scale: 0.94 }] },
  icon: { textAlign: 'center' },
  ring: { position: 'absolute', borderWidth: 3, borderColor: colors.accent },
  ringStatic: { opacity: 0.7, transform: [{ scale: 1.18 }] },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: BADGE,
    height: BADGE,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.background,
  },
  badgeVisited: { backgroundColor: colors.success },
  badgeCurrent: { backgroundColor: colors.surfaceHigh },
  badgeText: { color: colors.onSuccess, fontSize: 12, lineHeight: 16, fontWeight: '900', textAlign: 'center' },
});

const stateStyles = StyleSheet.create({
  current: {
    borderColor: colors.accent,
    borderWidth: 3,
    backgroundColor: colors.surfaceHigh,
    ...glow(colors.accent, 12),
  },
  visited: { borderColor: colors.accentBorder, backgroundColor: colors.surfaceHigh },
  available: { borderColor: colors.accent, borderWidth: 3, backgroundColor: colors.accentSoft },
  reachable: {},
  unreachable: { opacity: UNREACHABLE_OPACITY },
});
