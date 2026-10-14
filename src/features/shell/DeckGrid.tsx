import { memo, useCallback } from 'react';
import { StyleSheet, View } from 'react-native';

import type { CardInstance, ContentDB } from '@/engine/types';
import { GAME_CARD_WIDTH, GameCard, spacing } from '@/ui';

// Wrapping grid of mini cards (final deck on the summary screen).

const DeckCard = memo(function DeckCard({
  card,
  db,
  onOpen,
}: {
  card: CardInstance;
  db: ContentDB;
  onOpen: (card: CardInstance) => void;
}) {
  const onPress = useCallback(() => onOpen(card), [card, onOpen]);
  const def = db.cards[card.defId];
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

export interface DeckGridProps {
  cards: readonly CardInstance[];
  db: ContentDB;
  onOpen: (card: CardInstance) => void;
}

export const DeckGrid = memo(function DeckGrid({ cards, db, onOpen }: DeckGridProps) {
  return (
    <View style={styles.grid}>
      {cards.map((card) => (
        <DeckCard key={card.uid} card={card} db={db} onOpen={onOpen} />
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
