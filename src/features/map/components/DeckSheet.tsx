import { memo, useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { CONTENT } from '@/data';
import type { CardInstance, FossilRecord } from '@/engine/types';
import { summarizePile, type PileEntry } from '@/features/battle/piles';
import { expeditionCode } from '@/features/shell/expedition';
import { AppText, BottomSheet, CardDetailSheet, colors, GAME_CARD_WIDTH, GameCard, radii, spacing } from '@/ui';

import { analyzeDeck } from '../deckAnalysis';

export interface DeckSheetProps {
  visible: boolean;
  deck: readonly CardInstance[];
  fossils: Readonly<Record<string, FossilRecord>>;
  onClose: () => void;
  reducedMotion: boolean;
  seed?: number;
}

const DeckCard = memo(function DeckCard({
  card,
  onOpen,
}: {
  card: PileEntry;
  onOpen: (card: PileEntry) => void;
}) {
  const onPress = useCallback(() => onOpen(card), [card, onOpen]);
  return (
    <View style={styles.cardGroup}>
      <GameCard
        def={card.def}
        upgraded={card.upgraded}
        size="mini"
        width={GAME_CARD_WIDTH.mini}
        onPress={onPress}
        accessibilityHint="Öffnet die Kartendetails."
      />
      <AppText variant="caption" tone="secondary" align="center">{card.count}× im Deck</AppText>
    </View>
  );
});

/**
 * The run deck as mini cards. Tapping a card stacks the CardDetailSheet on
 * top (the deck sheet stays open underneath, so closing returns to the deck).
 */
export const DeckSheet = memo(function DeckSheet({ visible, deck, fossils, onClose, reducedMotion, seed }: DeckSheetProps) {
  const [detail, setDetail] = useState<PileEntry | null>(null);
  const closeDetail = useCallback(() => setDetail(null), []);
  const handleClose = useCallback(() => {
    setDetail(null);
    onClose();
  }, [onClose]);
  const analysis = useMemo(() => analyzeDeck(CONTENT, deck), [deck]);
  const groups = useMemo(() => summarizePile(deck, CONTENT), [deck]);
  const def = detail?.def ?? null;

  return (
    <>
      <BottomSheet
        visible={visible}
        onClose={handleClose}
        title={`Dein Deck (${deck.length} Karten)`}
        reducedMotion={reducedMotion}
        testID="map-deck-sheet"
      >
        {seed !== undefined ? (
          <View style={styles.code}>
            <AppText variant="overline" tone="muted">EXPEDITIONSCODE</AppText>
            <AppText variant="number" selectable>{expeditionCode(seed)}</AppText>
            <AppText variant="caption" tone="secondary">Im Lager eingeben, um diese Ausgangslage erneut zu spielen.</AppText>
          </View>
        ) : null}
        <View style={styles.analysis} testID="deck-analysis">
          <View style={styles.summary}>
            <View style={styles.stat}>
              <AppText variant="heading" tone="accent">{analysis.averageCost.toLocaleString('de-DE', { maximumFractionDigits: 1 })}</AppText>
              <AppText variant="caption" tone="secondary">Ø Energie</AppText>
            </View>
            <View style={styles.stat}>
              <AppText variant="heading">{analysis.upgraded}</AppText>
              <AppText variant="caption" tone="secondary">verbessert</AppText>
            </View>
          </View>
          <AppText variant="overline" tone="muted">ENERGIEKURVE</AppText>
          <View style={styles.curve} accessible accessibilityLabel={analysis.curve.map((count, i) => `${i === 4 ? '4 oder mehr' : i} Energie: ${count} Karten`).join(', ')}>
            {analysis.curve.map((count, cost) => (
              <View key={cost} style={styles.column}>
                <AppText variant="caption" tone="secondary">{count}</AppText>
                <View style={styles.barTrack}><View style={[styles.bar, { height: Math.max(3, count / Math.max(1, ...analysis.curve) * 52) }]} /></View>
                <AppText variant="label">{cost === 4 ? '4+' : cost}</AppText>
              </View>
            ))}
          </View>
          <AppText variant="caption" tone="secondary" align="center">⚔️ {analysis.types.attack} Angriff · 🛡️ {analysis.types.defense} Verteidigung · 🌿 {analysis.types.support} Unterstützung</AppText>
          {analysis.curve[4]! > 0 ? <AppText variant="caption" tone="muted">Karten für 4+ Energie brauchen zusätzliche Energieeffekte. Jeder Zug beginnt mit 3 Energie.</AppText> : null}
        </View>
        <AppText variant="caption" tone="secondary">
          Gleiche Karten sind zusammengefasst. Tippe auf eine Karte für Details.
        </AppText>
        <View style={styles.grid}>
          {groups.map((card) => (
            <DeckCard key={card.key} card={card} onOpen={setDetail} />
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
  cardGroup: { gap: spacing.xs },
  analysis: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.backgroundDeep, borderRadius: radii.lg, padding: spacing.lg, gap: spacing.md },
  summary: { flexDirection: 'row', justifyContent: 'space-around' },
  stat: { alignItems: 'center', gap: spacing.xs },
  curve: { flexDirection: 'row', gap: spacing.sm },
  column: { flex: 1, alignItems: 'center', gap: spacing.xs },
  barTrack: { height: 52, justifyContent: 'flex-end', width: '75%' },
  bar: { backgroundColor: colors.accent, borderRadius: radii.xs },
  code: { gap: spacing.xs },
});
