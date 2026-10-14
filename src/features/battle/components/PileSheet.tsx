import { memo, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { CONTENT } from '@/data';
import type { CardInstance } from '@/engine/types';
import {
  AppText,
  BottomSheet,
  colors,
  EmptyState,
  getCardView,
  ListRow,
  radii,
  spacing,
  UI_STRINGS,
} from '@/ui';

import { PILE_INFO, type PileEntry, type PileId, summarizePile } from '../piles';
import { BATTLE_TEXT } from '../strings';

export interface PileSheetProps {
  /** Open pile; null closes the sheet. */
  pile: PileId | null;
  cards: readonly CardInstance[];
  onClose: () => void;
  reducedMotion: boolean;
}

const PileRow = memo(function PileRow({ entry }: { entry: PileEntry }) {
  const view = getCardView(entry.def, entry.upgraded);
  const times = entry.count > 1 ? `${entry.count}× ` : '';
  const spokenTimes = entry.count > 1 ? `${entry.count}-mal ` : '';
  return (
    <ListRow
      left={entry.def.emoji}
      title={`${times}${view.name}`}
      subtitle={view.text}
      right={`${entry.cost} ⚡`}
      accessibilityLabel={`${spokenTimes}${view.name}, Kosten ${entry.cost} ${UI_STRINGS.energy}, ${view.typeLabel}. ${view.text}`}
      style={styles.row}
    />
  );
});

/** Grouped, sorted card list of one pile (never reveals the draw order). */
export const PileSheet = memo(function PileSheet({ pile, cards, onClose, reducedMotion }: PileSheetProps) {
  // Keep the last pile visible while the sheet slides closed.
  const [shown, setShown] = useState<{ pile: PileId; cards: readonly CardInstance[] } | null>(null);
  if (pile !== null && (shown === null || shown.pile !== pile || shown.cards !== cards)) {
    setShown({ pile, cards });
  }
  const entries = useMemo(() => (shown ? summarizePile(shown.cards, CONTENT) : []), [shown]);
  const title = shown ? `${PILE_INFO[shown.pile].title} (${shown.cards.length})` : '';

  return (
    <BottomSheet visible={pile !== null} onClose={onClose} title={title} reducedMotion={reducedMotion} testID="pile-sheet">
      {shown?.pile === 'draw' && entries.length > 0 ? (
        <AppText variant="caption" tone="muted">
          {BATTLE_TEXT.pileSorted}
        </AppText>
      ) : null}
      {entries.length === 0 ? (
        <EmptyState icon="🃏" title={BATTLE_TEXT.pileEmpty} />
      ) : (
        <View style={styles.list}>
          {entries.map((entry) => (
            <PileRow key={entry.key} entry={entry} />
          ))}
        </View>
      )}
    </BottomSheet>
  );
});

const styles = StyleSheet.create({
  list: {
    borderRadius: radii.md,
    overflow: 'hidden',
    gap: StyleSheet.hairlineWidth,
    backgroundColor: colors.divider,
  },
  row: { paddingHorizontal: spacing.md },
});
