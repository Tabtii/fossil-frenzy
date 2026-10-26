import { memo, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import type { Combatant, StatusId } from '@/engine/types';
import {
  AppText,
  colors,
  EnergyOrb,
  fill,
  FloatingNumbers,
  type FloatingNumberItem,
  opacity,
  radii,
  spacing,
  StatBar,
  StatusChips,
  useReduceMotion,
} from '@/ui';

import type { FxToken } from '../hooks/useBattleController';
import { BATTLE_TEXT } from '../strings';

export interface PlayerZoneProps {
  player: Combatant;
  energy: number;
  maxEnergy: number;
  numbers: readonly FloatingNumberItem[];
  onNumberDone: (id: FloatingNumberItem['id']) => void;
  hit: FxToken;
  defeated: boolean;
  /** Short arena (small phones): smaller orb and padding. */
  compact: boolean;
  /** App setting; the OS setting is respected automatically. */
  reducedMotion: boolean;
  onPressStatus: (status: StatusId) => void;
}

const NEVER = ReduceMotion.Never;

/** Player status in the middle of the screen: energy, HP with block, statuses. */
export const PlayerZone = memo(function PlayerZone({
  player,
  energy,
  maxEnergy,
  numbers,
  onNumberDone,
  hit,
  defeated,
  compact,
  reducedMotion,
  onPressStatus,
}: PlayerZoneProps) {
  const reduce = useReduceMotion(reducedMotion);
  const flash = useSharedValue(0);
  const shakeX = useSharedValue(0);

  useEffect(() => {
    if (hit.id === 0) return;
    flash.set(
      withDelay(
        hit.delay,
        withSequence(withTiming(1, { duration: 70, reduceMotion: NEVER }), withTiming(0, { duration: 420, reduceMotion: NEVER })),
        NEVER,
      ),
    );
    if (reduce) return;
    shakeX.set(
      withDelay(
        hit.delay,
        withSequence(
          withTiming(-6, { duration: 45 }),
          withTiming(6, { duration: 55 }),
          withTiming(-3, { duration: 55 }),
          withTiming(0, { duration: 45 }),
        ),
      ),
    );
  }, [hit, reduce, flash, shakeX]);

  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shakeX.get() }] }));
  const flashStyle = useAnimatedStyle(() => ({ opacity: flash.get() * 0.9 }));

  return (
    <Animated.View
      style={[styles.root, compact && styles.rootCompact, defeated && styles.defeated, shakeStyle]}
      testID="player-zone"
    >
      <Animated.View style={[styles.flash, flashStyle]} pointerEvents="none" />
      <EnergyOrb current={energy} max={maxEnergy} size={compact ? 48 : 56} reducedMotion={reducedMotion} testID="energy" />
      <View style={styles.stats}>
        <AppText variant="overline" tone="secondary" accessible={false}>
          {BATTLE_TEXT.you}
        </AppText>
        <StatBar
          value={player.hp}
          max={player.maxHp}
          block={player.block}
          size="md"
          label={BATTLE_TEXT.yourHp}
          reducedMotion={reducedMotion}
          testID="player-hp"
        />
        <View style={styles.chips}>
          <StatusChips statuses={player.statuses} onPressStatus={onPressStatus} size="sm" />
        </View>
        <FloatingNumbers items={numbers} onDone={onNumberDone} size="md" rise={44} reducedMotion={reducedMotion} />
      </View>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.xs,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.arenaRim,
    backgroundColor: colors.arenaHud,
  },
  rootCompact: { paddingVertical: spacing.xs, gap: spacing.sm },
  defeated: { opacity: opacity.disabled },
  flash: {
    ...fill,
    borderRadius: radii.lg,
    borderWidth: 2,
    borderColor: colors.danger,
    backgroundColor: colors.dangerSoft,
  },
  stats: { flex: 1, minWidth: 0, gap: spacing.xxs },
  chips: { minHeight: 24, justifyContent: 'center' },
});
