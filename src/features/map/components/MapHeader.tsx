import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import type { Era } from '@/engine/types';
import { AppText, ERA_LABELS, EraBadge, eraColors, fontScale, IconButton, spacing, StatBar } from '@/ui';

export interface MapHeaderProps {
  /** 0-based act. */
  act: number;
  era: Era;
  floorText: string;
  hp: number;
  maxHp: number;
  deckSize: number;
  reducedMotion: boolean;
  onHome: () => void;
  onDeck: () => void;
}

/** Map header: home, "Akt n · Ära", floor progress, deck button and HP bar. */
export const MapHeader = memo(function MapHeader({
  act,
  era,
  floorText,
  hp,
  maxHp,
  deckSize,
  reducedMotion,
  onHome,
  onDeck,
}: MapHeaderProps) {
  const tone = eraColors[era];
  return (
    <View style={styles.root}>
      <View style={styles.row}>
        <IconButton
          icon="🏠"
          accessibilityLabel="Zur Startseite"
          accessibilityHint="Die Expedition wird gespeichert und kann später fortgesetzt werden."
          onPress={onHome}
          variant="filled"
          testID="map-home"
        />
        <View style={styles.titles}>
          <View style={styles.titleRow}>
            <AppText
              variant="heading"
              accessibilityRole="header"
              accessibilityLabel={`Akt ${act + 1}, ${ERA_LABELS[era]}`}
              numberOfLines={1}
              maxFontSizeMultiplier={fontScale.title}
              color={tone.main}
            >
              Akt {act + 1}
            </AppText>
            <EraBadge era={era} size="sm" />
          </View>
          <AppText variant="caption" tone="secondary" numberOfLines={1}>
            {floorText}
          </AppText>
        </View>
        <IconButton
          icon="🃏"
          accessibilityLabel={`Deck ansehen, ${deckSize} Karten`}
          onPress={onDeck}
          variant="filled"
          badge={deckSize}
          testID="map-deck"
        />
      </View>
      <View style={styles.hpRow}>
        <AppText variant="label" accessible={false} maxFontSizeMultiplier={fontScale.badge}>
          ❤️
        </AppText>
        <StatBar value={hp} max={maxHp} size="md" reducedMotion={reducedMotion} style={styles.bar} />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  root: { gap: spacing.sm, paddingBottom: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  titles: { flex: 1, minWidth: 0 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  hpRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  bar: { flex: 1 },
});
