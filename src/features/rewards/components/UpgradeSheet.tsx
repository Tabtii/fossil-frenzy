import { memo, useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import {
  AppText,
  BottomSheet,
  Button,
  colors,
  GAME_CARD_WIDTH,
  GameCard,
  getCardView,
  radii,
  sizes,
  spacing,
  useLayout,
} from '@/ui';

import { type UpgradeGroup, upgradePreview } from '../rewardModel';

export interface UpgradeSheetProps {
  visible: boolean;
  groups: readonly UpgradeGroup[];
  onClose: () => void;
  /** Upgrades the card with this uid. */
  onConfirm: (uid: string) => void;
  reducedMotion: boolean;
}

/** Sheet body padding (BottomSheet uses spacing.lg on both sides). */
const SHEET_PADDING = spacing.lg;
const ARROW_WIDTH = 24;
const COMPARE_MAX_WIDTH = 160;

const GridCard = memo(function GridCard({
  group,
  onPick,
}: {
  group: UpgradeGroup;
  onPick: (group: UpgradeGroup) => void;
}) {
  const onPress = useCallback(() => onPick(group), [group, onPick]);
  const count = group.uids.length;
  return (
    <View>
      <GameCard
        def={group.def}
        size="mini"
        width={GAME_CARD_WIDTH.mini}
        onPress={onPress}
        accessibilityHint={`${count}× im Deck. Zeigt den Vergleich vor und nach der Verbesserung.`}
        testID={`upgrade-pick-${group.def.id}`}
      />
      {count > 1 ? (
        <View style={styles.count} pointerEvents="none">
          <Text style={styles.countText} maxFontSizeMultiplier={1.2} accessible={false}>
            ×{count}
          </Text>
        </View>
      ) : null}
    </View>
  );
});

/**
 * Two steps in one sheet: pick a card from the grid, then compare it before /
 * after the upgrade and confirm with "Verbessern".
 */
export const UpgradeSheet = memo(function UpgradeSheet({
  visible,
  groups,
  onClose,
  onConfirm,
  reducedMotion,
}: UpgradeSheetProps) {
  const { contentWidth } = useLayout();
  const [picked, setPicked] = useState<UpgradeGroup | null>(null);

  const handleClose = useCallback(() => {
    setPicked(null);
    onClose();
  }, [onClose]);
  const back = useCallback(() => setPicked(null), []);
  const confirm = useCallback(() => {
    const uid = picked?.uids[0];
    if (uid !== undefined) onConfirm(uid);
  }, [onConfirm, picked]);

  const preview = useMemo(() => (picked ? upgradePreview(picked.def) : null), [picked]);
  const sheetInner = Math.min(contentWidth, sizes.maxContentWidth) - 2 * SHEET_PADDING;
  const compareWidth = Math.max(
    GAME_CARD_WIDTH.hand,
    Math.min(COMPARE_MAX_WIDTH, Math.floor((sheetInner - ARROW_WIDTH - 2 * spacing.sm) / 2)),
  );

  const footer = picked ? (
    <>
      <Button
        label="Verbessern"
        icon="⚒️"
        size="lg"
        fullWidth
        onPress={confirm}
        accessibilityHint={`Verbessert ${picked.def.name} dauerhaft.`}
        testID="upgrade-confirm"
      />
      <Button label="Andere Karte wählen" variant="ghost" fullWidth onPress={back} testID="upgrade-back" />
    </>
  ) : undefined;

  return (
    <BottomSheet
      visible={visible}
      onClose={handleClose}
      title={picked ? `${getCardView(picked.def, false).name} verbessern?` : 'Karte verbessern'}
      footer={footer}
      reducedMotion={reducedMotion}
      testID="upgrade-sheet"
    >
      {picked && preview ? (
        <>
          <View style={styles.compare}>
            <View style={styles.compareSide}>
              <AppText variant="overline" tone="secondary">
                Vorher
              </AppText>
              <GameCard def={picked.def} upgraded={false} size="hand" width={compareWidth} />
            </View>
            <AppText variant="heading" tone="accent" style={styles.arrow} accessible={false}>
              →
            </AppText>
            <View style={styles.compareSide}>
              <AppText variant="overline" tone="success">
                Nachher
              </AppText>
              <GameCard def={picked.def} upgraded size="hand" width={compareWidth} selected />
            </View>
          </View>
          <View style={styles.changes} accessible accessibilityLabel={`Änderungen: ${preview.changes.join('. ')}`}>
            <AppText variant="overline" tone="accent">
              Was ändert sich?
            </AppText>
            {preview.changes.map((line) => (
              <AppText key={line} variant="body">
                • {line}
              </AppText>
            ))}
          </View>
        </>
      ) : (
        <>
          <AppText variant="body" tone="secondary">
            Wähle eine Karte aus deinem Deck. Die Verbesserung gilt für den Rest der Expedition.
          </AppText>
          <View style={styles.grid}>
            {groups.map((group) => (
              <GridCard key={group.def.id} group={group} onPick={setPicked} />
            ))}
          </View>
        </>
      )}
    </BottomSheet>
  );
});

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'center' },
  count: {
    position: 'absolute',
    bottom: -spacing.xs,
    right: -spacing.xs,
    minWidth: 26,
    paddingHorizontal: spacing.xs,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceHigh,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: 'center',
  },
  countText: { color: colors.text, fontSize: 11, lineHeight: 16, fontWeight: '800' },
  compare: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  compareSide: { alignItems: 'center', gap: spacing.xs },
  arrow: { width: ARROW_WIDTH, textAlign: 'center' },
  changes: { gap: spacing.xs, padding: spacing.md, borderRadius: radii.md, backgroundColor: colors.surfaceRaised },
});
