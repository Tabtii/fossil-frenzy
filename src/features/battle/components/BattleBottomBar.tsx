import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText, Button, colors, glow, spacing } from '@/ui';

import type { HandEntry } from '../hand';
import { BATTLE_TEXT } from '../strings';

export interface BattleBottomBarProps {
  /** Selected hand card: shows the "Ausspielen" button instead of the log. */
  selected: HandEntry | null;
  logLine: string | null;
  locked: boolean;
  /** Nothing affordable left: highlight "Zug beenden". */
  nudgeEndTurn: boolean;
  /** Very large text on narrow phones: buttons stacked. */
  stacked: boolean;
  gutter: number;
  bottomInset: number;
  onPlaySelected: () => void;
  onEndTurn: () => void;
}

/** Thumb-zone actions: combat log or "Ausspielen" on the left, "Zug beenden" on the right. */
export const BattleBottomBar = memo(function BattleBottomBar({
  selected,
  logLine,
  locked,
  nudgeEndTurn,
  stacked,
  gutter,
  bottomInset,
  onPlaySelected,
  onEndTurn,
}: BattleBottomBarProps) {
  return (
    <View
      style={[
        styles.root,
        stacked && styles.stacked,
        { paddingHorizontal: gutter, paddingBottom: bottomInset + spacing.sm },
      ]}
    >
      <View style={[styles.left, stacked && styles.leftStacked]}>
        {selected ? (
          <Button
            label={selected.affordable ? BATTLE_TEXT.play : BATTLE_TEXT.notEnoughEnergy}
            onPress={onPlaySelected}
            disabled={!selected.affordable || locked}
            accessibilityHint={BATTLE_TEXT.playSelectedHint}
            fullWidth
            testID="play-selected"
          />
        ) : (
          <AppText variant="caption" tone="secondary" numberOfLines={2} testID="combat-log">
            {logLine ?? BATTLE_TEXT.intro}
          </AppText>
        )}
      </View>
      <Button
        label={BATTLE_TEXT.endTurn}
        onPress={onEndTurn}
        variant={selected ? 'secondary' : 'primary'}
        disabled={locked}
        accessibilityHint={BATTLE_TEXT.endTurnHint}
        fullWidth={stacked}
        style={nudgeEndTurn && !locked ? styles.nudge : undefined}
        testID="end-turn"
      />
    </View>
  );
});

const styles = StyleSheet.create({
  root: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingTop: spacing.sm, backgroundColor: colors.arenaHud, borderTopWidth: 1, borderTopColor: colors.arenaRim },
  stacked: { flexDirection: 'column', alignItems: 'stretch' },
  left: { flex: 1, minWidth: 0, minHeight: 48, justifyContent: 'center' },
  leftStacked: { flex: 0 },
  nudge: glow(colors.accent, 16),
});
