import { memo, useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { GameCard } from '@/ui';

import type { FlightState } from '../hooks/useBattleController';

export interface CardFlightProps {
  flight: FlightState;
  /** Card width at the start of the flight. */
  width: number;
  /** Upward travel to the enemy (dp). */
  distance: number;
  duration: number;
  onDone: (id: number) => void;
}

/**
 * A played card flying to its target and fading out: towards the enemy for
 * attacks and enemy effects, a short hop for self effects. Decorative only;
 * never rendered with reduced motion.
 */
export const CardFlight = memo(function CardFlight({ flight, width, distance, duration, onDone }: CardFlightProps) {
  const progress = useSharedValue(0);
  const { id, offsetX, towardEnemy } = flight;

  useEffect(() => {
    progress.set(
      withTiming(1, { duration, easing: Easing.in(Easing.quad) }, (finished) => {
        if (finished) scheduleOnRN(onDone, id);
      }),
    );
  }, [id, duration, onDone, progress]);

  const rise = towardEnemy ? distance : distance * 0.3;
  const tilt = towardEnemy ? 10 : -4;
  const animatedStyle = useAnimatedStyle(() => {
    const p = progress.get();
    return {
      opacity: 1 - p * p,
      transform: [
        { translateX: offsetX * (1 - p) },
        { translateY: -rise * p },
        { rotate: `${tilt * p}deg` },
        { scale: 1 - 0.45 * p },
      ],
    };
  });

  return (
    <Animated.View
      style={[styles.root, animatedStyle]}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <GameCard def={flight.def} upgraded={flight.upgraded} size="hand" width={width} accessible={false} />
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  root: { alignSelf: 'center' },
});
