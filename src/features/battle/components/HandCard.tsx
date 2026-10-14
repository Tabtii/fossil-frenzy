import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { type AccessibilityActionEvent, StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  FadeInDown,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import type { CardDef } from '@/engine/types';
import {
  cardAccessibilityLabel,
  colors,
  durations,
  fill,
  GameCard,
  radii,
  reduceMotionOption,
  springs,
  zIndex,
} from '@/ui';

import { CARD_LIFT, HAND_TOP_SPACE, SELECTED_CARD_SCALE } from '../battleLayout';
import { shouldPlayOnRelease } from '../hand';
import { BATTLE_TEXT } from '../strings';

export interface HandCardProps {
  uid: string;
  def: CardDef;
  upgraded: boolean;
  /** Fan position from computeHandLayout. */
  x: number;
  y: number;
  rotate: number;
  order: number;
  width: number;
  height: number;
  /** Horizontal offset of the card centre from the hand centre (flight start). */
  centerOffset: number;
  selected: boolean;
  affordable: boolean;
  previewDamage: number | null;
  /** Card plays are blocked (enemy turn, combat over). */
  locked: boolean;
  /** Changes when this card should shake (rejected play). */
  shakeId: number;
  /** Effective reduced motion (OS or app setting). */
  reduce: boolean;
  swipeThreshold: number;
  onSelect: (uid: string) => void;
  onPlay: (uid: string, offsetX?: number) => void;
  onDetails: (uid: string) => void;
}

const A11Y_ACTIONS = [
  { name: 'activate', label: BATTLE_TEXT.actionSelect },
  { name: 'play', label: BATTLE_TEXT.actionPlay },
  { name: 'longpress', label: BATTLE_TEXT.actionDetails },
] as const;

const claimResponder = () => true;

/**
 * One card of the hand. Tap selects (a second tap plays), an upward swipe
 * plays, a long press opens the details. The gestures run on the UI thread;
 * screen readers use the accessibility actions instead.
 */
export const HandCard = memo(function HandCard({
  uid,
  def,
  upgraded,
  x,
  y,
  rotate,
  order,
  width,
  height,
  centerOffset,
  selected,
  affordable,
  previewDamage,
  locked,
  shakeId,
  reduce,
  swipeThreshold,
  onSelect,
  onPlay,
  onDetails,
}: HandCardProps) {
  const posX = useSharedValue(x);
  const lift = useSharedValue(selected ? 1 : 0);
  const drag = useSharedValue(0);
  const shake = useSharedValue(0);
  const flash = useSharedValue(0);
  const pressed = useSharedValue(0);

  // Deal-in animation, fixed at mount (staggered by hand position).
  const [entering] = useState(() =>
    reduce ? undefined : FadeInDown.delay(Math.min(order, 6) * 45).duration(durations.normal),
  );

  useEffect(() => {
    posX.set(reduce ? x : withTiming(x, { duration: durations.normal }));
  }, [x, reduce, posX]);

  useEffect(() => {
    lift.set(withSpring(selected ? 1 : 0, { ...springs.snappy, reduceMotion: reduceMotionOption(reduce) }));
  }, [selected, reduce, lift]);

  // Shake only when the id changes while mounted (a card drawn again later
  // must not replay an old rejection).
  const lastShake = useRef(shakeId);
  useEffect(() => {
    if (lastShake.current === shakeId) return;
    lastShake.current = shakeId;
    if (shakeId === 0) return;
    // The flash is the reduced-motion friendly part of the rejection: always shown.
    flash.set(
      withSequence(
        withTiming(1, { duration: 70, reduceMotion: ReduceMotion.Never }),
        withTiming(0, { duration: 380, reduceMotion: ReduceMotion.Never }),
      ),
    );
    if (reduce) return;
    shake.set(
      withSequence(
        withTiming(-8, { duration: 45 }),
        withTiming(8, { duration: 60 }),
        withTiming(-6, { duration: 60 }),
        withTiming(5, { duration: 60 }),
        withTiming(0, { duration: 45 }),
      ),
    );
  }, [shakeId, reduce, flash, shake]);

  const handleTap = useCallback(() => {
    if (selected) onPlay(uid, centerOffset);
    else onSelect(uid);
  }, [selected, uid, centerOffset, onPlay, onSelect]);
  const handleSwipe = useCallback(() => onPlay(uid, centerOffset), [uid, centerOffset, onPlay]);
  const handleDragStart = useCallback(() => onSelect(uid), [uid, onSelect]);
  const handleDetails = useCallback(() => onDetails(uid), [uid, onDetails]);

  const gesture = useMemo(() => {
    const springBack = { ...springs.snappy, reduceMotion: reduceMotionOption(reduce) };
    const pan = Gesture.Pan()
      .enabled(!locked)
      .activeOffsetY(-10)
      .failOffsetX([-28, 28])
      .onStart(() => {
        scheduleOnRN(handleDragStart);
      })
      .onUpdate((event) => {
        drag.set(Math.min(0, event.translationY));
      })
      .onEnd((event) => {
        const play = shouldPlayOnRelease(event.translationY, event.velocityY, swipeThreshold);
        drag.set(withSpring(0, springBack));
        if (play) scheduleOnRN(handleSwipe);
      });
    const longPress = Gesture.LongPress()
      .minDuration(380)
      .maxDistance(14)
      .onStart(() => {
        scheduleOnRN(handleDetails);
      });
    const tap = Gesture.Tap()
      .enabled(!locked)
      .maxDuration(450)
      .maxDistance(12)
      .onBegin(() => {
        pressed.set(withTiming(1, { duration: 80 }));
      })
      .onFinalize(() => {
        pressed.set(withTiming(0, { duration: 140 }));
      })
      .onEnd((_event, success) => {
        if (success) scheduleOnRN(handleTap);
      });
    return Gesture.Race(pan, longPress, tap);
  }, [locked, reduce, swipeThreshold, handleDragStart, handleSwipe, handleDetails, handleTap, drag, pressed]);

  const animatedStyle = useAnimatedStyle(() => {
    const l = lift.get();
    return {
      transform: [
        { translateX: posX.get() + shake.get() },
        { translateY: y * (1 - l) - CARD_LIFT * l + drag.get() },
        { rotate: `${rotate * (1 - l)}deg` },
        { scale: (1 + (SELECTED_CARD_SCALE - 1) * l) * (1 - 0.03 * pressed.get()) },
      ],
    };
  });
  const flashStyle = useAnimatedStyle(() => ({ opacity: flash.get() }));
  const slotStyle = useMemo(
    () => [styles.slot, { width, height, zIndex: selected ? zIndex.handSelected : zIndex.hand + order }],
    [width, height, selected, order],
  );
  // Matches the GameCard frame radius (10 dp at the 88 dp design width).
  const flashFrameStyle = useMemo(() => [styles.flash, { borderRadius: Math.round(width * 0.11) }], [width]);

  const unaffordable = !affordable;
  const label = useMemo(
    () => cardAccessibilityLabel(def, upgraded, { previewDamage, unaffordable }),
    [def, upgraded, previewDamage, unaffordable],
  );
  const onAccessibilityAction = useCallback(
    (event: AccessibilityActionEvent) => {
      switch (event.nativeEvent.actionName) {
        case 'activate':
          handleTap();
          break;
        case 'play':
          onPlay(uid, centerOffset);
          break;
        case 'longpress':
          handleDetails();
          break;
        default:
          break;
      }
    },
    [handleTap, handleDetails, onPlay, uid, centerOffset],
  );

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        style={[slotStyle, animatedStyle]}
        accessible
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint={selected ? BATTLE_TEXT.cardHintPlay : BATTLE_TEXT.cardHintSelect}
        accessibilityState={{ selected, disabled: locked }}
        accessibilityActions={A11Y_ACTIONS}
        onAccessibilityAction={onAccessibilityAction}
        // Keeps the arena's "tap outside deselects" responder from firing on cards.
        onStartShouldSetResponder={claimResponder}
        testID={`hand-card-${uid}`}
      >
        <Animated.View entering={entering}>
          <GameCard
            def={def}
            upgraded={upgraded}
            size="hand"
            width={width}
            previewDamage={previewDamage}
            selected={selected}
            unaffordable={unaffordable}
            accessible={false}
          />
          <Animated.View style={[flashFrameStyle, flashStyle]} pointerEvents="none" />
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
});

const styles = StyleSheet.create({
  slot: { position: 'absolute', left: 0, top: HAND_TOP_SPACE },
  flash: {
    ...fill,
    borderWidth: 2,
    borderColor: colors.danger,
    backgroundColor: colors.dangerSoft,
    borderRadius: radii.md,
  },
});
