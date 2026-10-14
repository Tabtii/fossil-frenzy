import { memo, useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { eraForAct } from '@/engine/run';
import type { NodeType } from '@/engine/types';
import { AppText, colors, ERA_ICONS, ERA_LABELS, fontScale, radii, sizes, spacing } from '@/ui';

import { PILE_INFO, PILE_ORDER, type PileCounts, type PileId, pileAccessibilityLabel } from '../piles';
import { actLabel, BATTLE_TEXT, floorLabel } from '../strings';

export interface BattleTopBarProps {
  /** 0-based act. */
  act: number;
  /** 0-based floor of the current node. */
  floor: number | null;
  nodeType: NodeType | null;
  counts: PileCounts;
  /** Narrow phones: piles show icon and count only. */
  compact: boolean;
  onOpenPile: (pile: PileId) => void;
}

interface PileButtonProps {
  pile: PileId;
  count: number;
  compact: boolean;
  onPress: (pile: PileId) => void;
}

const PileButton = memo(function PileButton({ pile, count, compact, onPress }: PileButtonProps) {
  const info = PILE_INFO[pile];
  const handlePress = useCallback(() => onPress(pile), [onPress, pile]);
  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={pileAccessibilityLabel(pile, count)}
      accessibilityHint={BATTLE_TEXT.pileHint}
      style={({ pressed }) => [styles.pile, pressed && styles.pilePressed]}
      testID={`pile-${pile}`}
    >
      <Text style={styles.pileCount} maxFontSizeMultiplier={fontScale.badge} numberOfLines={1}>
        {info.icon} {count}
      </Text>
      {compact ? null : (
        <Text style={styles.pileLabel} maxFontSizeMultiplier={fontScale.badge} numberOfLines={1}>
          {info.short}
        </Text>
      )}
    </Pressable>
  );
});

/** Act/floor on the left, tappable pile counters (deck, draw, discard, exhausted) on the right. */
export const BattleTopBar = memo(function BattleTopBar({ act, floor, nodeType, counts, compact, onOpenPile }: BattleTopBarProps) {
  const era = eraForAct(act);
  const place = nodeType === 'boss' ? BATTLE_TEXT.boss : floor !== null ? floorLabel(floor) : '';
  const elite = nodeType === 'elite' ? ` · ${BATTLE_TEXT.elite}` : '';
  const label = [actLabel(act), ERA_LABELS[era], place, nodeType === 'elite' ? BATTLE_TEXT.elite : '']
    .filter((part) => part.length > 0)
    .join(', ');

  return (
    <View style={styles.root}>
      <View style={styles.info} accessible accessibilityRole="header" accessibilityLabel={label}>
        <AppText variant="label" numberOfLines={1} maxFontSizeMultiplier={fontScale.badge}>
          {ERA_ICONS[era]} {actLabel(act)}
        </AppText>
        <AppText variant="caption" tone="secondary" numberOfLines={1} maxFontSizeMultiplier={fontScale.badge}>
          {place}
          {elite}
        </AppText>
      </View>
      <View style={styles.piles}>
        {PILE_ORDER.map((pile) =>
          pile === 'exhaust' && counts.exhaust === 0 ? null : (
            <PileButton key={pile} pile={pile} count={counts[pile]} compact={compact} onPress={onOpenPile} />
          ),
        )}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
    minHeight: sizes.touchTarget + spacing.sm,
  },
  info: { flex: 1, minWidth: 0 },
  piles: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  pile: {
    minWidth: 48,
    minHeight: sizes.touchTarget,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pilePressed: { backgroundColor: colors.surfacePressed },
  pileCount: { color: colors.text, fontSize: 14, lineHeight: 18, fontWeight: '800', fontVariant: ['tabular-nums'] },
  pileLabel: { color: colors.textMuted, fontSize: 10, lineHeight: 13, fontWeight: '700' },
});
