import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import type { FossilEntry } from '@/engine/types';
import { AppText, colors, eraColors, FOSSIL_KIND_LABELS, FossilArtwork, opacity, radii, spacing } from '@/ui';

/** A readable article; the find marker reports earned progress separately. */
export const WikiTile = memo(function WikiTile({ entry, found, width, onOpen }: {
  entry: FossilEntry;
  found: boolean;
  width: number;
  onOpen: (id: string) => void;
}) {
  const tone = eraColors[entry.era];
  const artWidth = Math.max(1, width - spacing.sm * 2 - 2);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${entry.name}, ${FOSSIL_KIND_LABELS[entry.kind]}, ${found ? 'bereits gefunden' : 'noch nicht gefunden'}`}
      accessibilityHint="Öffnet den Steckbrief im Dino-Wiki."
      onPress={() => onOpen(entry.id)}
      testID={`wiki-tile-${entry.id}`}
      style={({ pressed }) => [styles.tile, { width }, pressed && styles.pressed]}
    >
      <View style={[styles.art, { backgroundColor: tone.soft }]}>
        <FossilArtwork fossilId={entry.id} emoji={entry.emoji} emojiStyle={styles.emoji} frame={{ width: artWidth, height: artWidth / 1.4 }} />
      </View>
      <AppText variant="label" align="center" numberOfLines={2} style={styles.name}>{entry.name}</AppText>
      <AppText variant="caption" tone="muted" align="center" numberOfLines={2}>{FOSSIL_KIND_LABELS[entry.kind]}</AppText>
      <AppText variant="overline" tone={found ? 'accent' : 'muted'} align="center">{found ? '✓ Gefunden' : 'Steckbrief'}</AppText>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  tile: { minHeight: 170, padding: spacing.sm, gap: spacing.xs, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  pressed: { opacity: opacity.pressed },
  art: { overflow: 'hidden', aspectRatio: 1.4, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: 34, lineHeight: 42, color: colors.text },
  name: { flexGrow: 1 },
});
