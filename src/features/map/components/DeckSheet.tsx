import { memo, useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { CONTENT } from '@/data';
import type { CardInstance, FossilRecord } from '@/engine/types';
import { AppText, BottomSheet, CardDetailSheet, GAME_CARD_WIDTH, GameCard, spacing } from '@/ui';

export interface DeckSheetProps {
  visible: boolean;
  deck: readonly CardInstance[];
  fossils: Readonly<Record<string, FossilRecord>>;
  onClose: () => void;
  reducedMotion: boolean;
}

const DeckCard = memo(function DeckCard({
  card,
  onOpen,
}: {
  card: CardInstance;
  onOpen: (card: CardInstance) => void;
}) {
  const onPress = useCallback(() => onOpen(card), [card, onOpen]);
  const def = CONTENT.cards[card.defId];
  if (!def) return null;
  return (
    <GameCard
      def={def}
      upgraded={card.upgraded}
      size="mini"
      width={GAME_CARD_WIDTH.mini}
      onPress={onPress}
      accessibilityHint="Öffnet die Kartendetails."
    />
  );
});

/**
 * The run deck as mini cards. Tapping a card stacks the CardDetailSheet on
 * top (the deck sheet stays open underneath, so closing returns to the deck).
 */
export const DeckSheet = memo(function DeckSheet({ visible, deck, fossils, onClose, reducedMotion }: DeckSheetProps) {
  const [detail, setDetail] = useState<CardInstance | null>(null);
  const closeDetail = useCallback(() => setDetail(null), []);
  const handleClose = useCallback(() => {
    setDetail(null);
    onClose();
  }, [onClose]);
  const upgradedCount = useMemo(() => deck.filter((card) => card.upgraded).length, [deck]);
  const def = detail ? (CONTENT.cards[detail.defId] ?? null) : null;

  return (
    <>
      <BottomSheet
        visible={visible}
        onClose={handleClose}
        title={`Dein Deck (${deck.length} Karten)`}
        reducedMotion={reducedMotion}
        testID="map-deck-sheet"
      >
        <AppText variant="caption" tone="secondary">
          {upgradedCount > 0 ? `${upgradedCount} verbessert · ` : ''}Tippe auf eine Karte für Details.
        </AppText>
        <View style={styles.grid}>
          {deck.map((card) => (
            <DeckCard key={card.uid} card={card} onOpen={setDetail} />
          ))}
        </View>
      </BottomSheet>
      <CardDetailSheet
        def={visible ? def : null}
        upgraded={detail?.upgraded ?? false}
        fossil={def ? CONTENT.fossils[def.fossilId] : undefined}
        fossilDiscovered={def ? fossils[def.fossilId] !== undefined : false}
        visible={visible && detail !== null}
        onClose={closeDetail}
        reducedMotion={reducedMotion}
      />
    </>
  );
});

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'center' },
});
