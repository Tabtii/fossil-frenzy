import { memo, useCallback, useEffect, useMemo } from 'react';
import { type LayoutChangeEvent, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import type { EnemyDef, EnemyState, IntentView, StatusId } from '@/engine/types';
import {
  AppText,
  colors,
  FloatingNumbers,
  FossilArtwork,
  hasFossilArtwork,
  type FloatingNumberItem,
  IntentBadge,
  Pill,
  radii,
  spacing,
  StatBar,
  StatusChips,
  UI_STRINGS,
  useReduceMotion,
} from '@/ui';

import type { FxToken } from '../hooks/useBattleController';
import { BATTLE_TEXT, enemyTargetHint } from '../strings';

export interface EnemyZoneProps {
  enemy: EnemyState;
  def: EnemyDef | undefined;
  /** Next move; null hides the badge (enemy turn, combat over). */
  intent: IntentView | null;
  numbers: readonly FloatingNumberItem[];
  onNumberDone: (id: FloatingNumberItem['id']) => void;
  hit: FxToken;
  /** Increments when the enemy attacks the player. */
  lungeId: number;
  defeated: boolean;
  /** Name of the selected card: tapping the enemy plays it. */
  targetCardName: string | null;
  /** Highlight the enemy as a target (selected card is affordable). */
  targeting: boolean;
  emojiSize: number;
  /** Short arena (small phones): tighter spacing, smaller HP bar. */
  compact: boolean;
  /** App setting; the OS setting is respected automatically. */
  reducedMotion: boolean;
  onPress: () => void;
  onIntentPress: () => void;
  onPressStatus: (status: StatusId) => void;
  /** Bottom edge of the tap target inside the zone (for the card preview). */
  onTargetLayout: (bottom: number) => void;
}

const NEVER = ReduceMotion.Never;

/**
 * Enemy, intent and stats at the top of the arena. The creature idles,
 * shakes when hit, lunges when it attacks and topples when defeated (only
 * fades/flashes with reduced motion). Tap: info sheet, or play the selected card.
 */
export const EnemyZone = memo(function EnemyZone({
  enemy,
  def,
  intent,
  numbers,
  onNumberDone,
  hit,
  lungeId,
  defeated,
  targetCardName,
  targeting,
  emojiSize,
  compact,
  reducedMotion,
  onPress,
  onIntentPress,
  onPressStatus,
  onTargetLayout,
}: EnemyZoneProps) {
  const reduce = useReduceMotion(reducedMotion);
  const idle = useSharedValue(0);
  const shakeX = useSharedValue(0);
  const lunge = useSharedValue(0);
  const flash = useSharedValue(0);
  const death = useSharedValue(defeated ? 1 : 0);

  useEffect(() => {
    if (reduce || defeated) {
      cancelAnimation(idle);
      idle.set(0);
      return;
    }
    idle.set(withRepeat(withTiming(1, { duration: 1700, easing: Easing.inOut(Easing.sin) }), -1, true));
    return () => cancelAnimation(idle);
  }, [reduce, defeated, idle]);

  useEffect(() => {
    if (hit.id === 0) return;
    flash.set(
      withDelay(
        hit.delay,
        withSequence(withTiming(1, { duration: 60, reduceMotion: NEVER }), withTiming(0, { duration: 320, reduceMotion: NEVER })),
        NEVER,
      ),
    );
    if (reduce) return;
    shakeX.set(
      withDelay(
        hit.delay,
        withSequence(
          withTiming(-10, { duration: 45 }),
          withTiming(9, { duration: 55 }),
          withTiming(-6, { duration: 55 }),
          withTiming(4, { duration: 55 }),
          withTiming(0, { duration: 45 }),
        ),
      ),
    );
  }, [hit, reduce, flash, shakeX]);

  useEffect(() => {
    if (lungeId === 0 || reduce) return;
    lunge.set(
      withSequence(
        withTiming(-8, { duration: 110, easing: Easing.out(Easing.quad) }),
        withTiming(28, { duration: 110, easing: Easing.in(Easing.quad) }),
        withTiming(0, { duration: 240, easing: Easing.out(Easing.cubic) }),
      ),
    );
  }, [lungeId, reduce, lunge]);

  useEffect(() => {
    death.set(defeated ? withTiming(1, { duration: reduce ? 300 : 700, easing: Easing.in(Easing.quad), reduceMotion: NEVER }) : 0);
  }, [defeated, reduce, death]);

  const emojiStyle = useAnimatedStyle(() => {
    const d = death.get();
    const i = idle.get();
    const move = reduce ? 0 : 1;
    return {
      opacity: 1 - 0.8 * d,
      transform: [
        { translateX: shakeX.get() },
        { translateY: lunge.get() - 4 * i + 28 * d * move },
        { rotate: `${-24 * d * move}deg` },
        { scale: (1 + 0.035 * i) * (1 - 0.35 * d * move) },
      ],
    };
  });
  const glowStyle = useAnimatedStyle(() => ({ opacity: flash.get() }));

  const handleLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const { y, height } = event.nativeEvent.layout;
      onTargetLayout(y + height);
    },
    [onTargetLayout],
  );

  const name = def?.name ?? BATTLE_TEXT.unknownEnemy;
  const tierLabel = def?.tier === 'boss' ? BATTLE_TEXT.boss : def?.tier === 'elite' ? BATTLE_TEXT.elite : null;
  const sized = useMemo(() => {
    const box = Math.round(emojiSize * (compact ? 1.65 : 2.1));
    return {
      box: { width: box, height: box },
      glow: { width: box, height: box, borderRadius: box / 2 },
      emoji: { fontSize: emojiSize, lineHeight: Math.round(emojiSize * 1.2) },
    };
  }, [emojiSize, compact]);

  return (
    <View style={[styles.root, compact && styles.rootCompact]} pointerEvents="box-none">
      <View style={styles.intentSlot}>
        {intent !== null && !defeated ? (
          <IntentBadge intent={intent} onPress={onIntentPress} reducedMotion={reducedMotion} testID="enemy-intent" />
        ) : null}
      </View>
      <Pressable
        onLayout={handleLayout}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={tierLabel ? `${name}, ${tierLabel}` : name}
        accessibilityHint={targetCardName ? enemyTargetHint(targetCardName) : BATTLE_TEXT.enemyHintInfo}
        style={({ pressed }) => [styles.target, targeting && styles.targeting, pressed && styles.pressed]}
        testID="enemy-target"
      >
        {tierLabel ? <View style={styles.tierMark}><Pill label={tierLabel} size="sm" tone={def?.tier === 'boss' ? 'danger' : 'accent'} /></View> : null}
        <View style={[styles.emojiBox, sized.box]}>
          <Animated.View style={[styles.glow, sized.glow, glowStyle]} pointerEvents="none" />
          <Animated.View style={[emojiStyle, hasFossilArtwork(def?.fossilId) && [sized.box, styles.artwork]]}>
            <FossilArtwork fossilId={def?.fossilId} emoji={def?.emoji ?? '❓'} emojiStyle={[styles.emoji, sized.emoji]} frame={sized.box} />
          </Animated.View>
          <FloatingNumbers items={numbers} onDone={onNumberDone} reducedMotion={reducedMotion} />
        </View>
        <View style={styles.nameRow}>
          <AppText variant="subheading" numberOfLines={1} style={styles.name}>
            {name}
          </AppText>
        </View>
      </Pressable>
      <StatBar
        value={enemy.hp}
        max={enemy.maxHp}
        block={enemy.block}
        size={compact ? 'md' : 'lg'}
        label={`${name}: ${UI_STRINGS.hp}`}
        reducedMotion={reducedMotion}
        style={styles.bar}
        testID="enemy-hp"
      />
      <View style={[styles.chips, compact && styles.chipsCompact]}>
        <StatusChips statuses={enemy.statuses} onPressStatus={onPressStatus} size={compact ? 'sm' : 'md'} />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.xs, paddingTop: spacing.xs },
  rootCompact: { gap: spacing.xxs, paddingTop: 0 },
  intentSlot: { minHeight: 56, justifyContent: 'center' },
  target: {
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xs,
    borderRadius: radii.xl,
    borderWidth: 2,
    borderColor: colors.arenaRim,
    backgroundColor: colors.arenaHud,
    maxWidth: '100%',
  },
  targeting: { borderColor: colors.focus, borderStyle: 'solid', backgroundColor: colors.cardTitle },
  pressed: { backgroundColor: colors.surfaceRaised },
  emojiBox: { alignItems: 'center', justifyContent: 'center' },
  artwork: { borderTopLeftRadius: radii.md, borderTopRightRadius: radii.md, overflow: 'hidden', borderWidth: 1, borderColor: colors.cardFrameDeep },
  tierMark: { position: 'absolute', top: -spacing.sm, right: spacing.sm, zIndex: 1 },
  glow: { position: 'absolute', backgroundColor: colors.dangerSoft, borderWidth: 2, borderColor: colors.danger },
  emoji: { textAlign: 'center', color: colors.text },
  nameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, maxWidth: '100%', paddingVertical: spacing.xs },
  name: { flexShrink: 1 },
  bar: { width: '82%', maxWidth: 360 },
  // Reserved height, so the layout does not jump when the first status appears.
  chips: { minHeight: 30, justifyContent: 'center', alignItems: 'center' },
  chipsCompact: { minHeight: 24 },
});
