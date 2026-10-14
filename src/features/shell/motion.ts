import { useEffect } from 'react';
import {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

// Small ambient animations for the shell screens. They only run while
// `active` is true: pass `isFocused && !reducedMotion` so nothing animates on
// a hidden screen or for players who asked for less motion.

export interface BobOptions {
  /** Max. vertical offset in dp (the motion goes from 0 to −amplitude). */
  amplitude: number;
  /** Duration of one half cycle in ms. */
  duration: number;
  /** Start delay in ms (stagger several items). */
  delay?: number;
}

/** Gentle endless up-and-down float. Returns an animated style. */
export function useBob(active: boolean, { amplitude, duration, delay = 0 }: BobOptions) {
  const progress = useSharedValue(0);

  useEffect(() => {
    if (!active) {
      cancelAnimation(progress);
      progress.set(0);
      return undefined;
    }
    progress.set(
      withDelay(delay, withRepeat(withTiming(1, { duration, easing: Easing.inOut(Easing.sin) }), -1, true)),
    );
    return () => cancelAnimation(progress);
  }, [active, delay, duration, progress]);

  return useAnimatedStyle(() => ({ transform: [{ translateY: -amplitude * progress.get() }] }));
}
