import { memo, useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppText, colors, EraBadge, eraColors, fontScale, opacity, radii, spacing } from '@/ui';

import { type FossilTile as FossilTileModel, fossilTileAccessibilityLabel } from '../model';

export interface FossilTileProps {
  tile: FossilTileModel;
  width: number;
  onOpen: (id: string) => void;
}

const NEW_DOT = 10;

/** One cell of the fossil book grid: emoji + name, or a "❓" silhouette. */
export const FossilTile = memo(function FossilTile({ tile, width, onOpen }: FossilTileProps) {
  const onPress = useCallback(() => onOpen(tile.id), [onOpen, tile.id]);
  const tone = eraColors[tile.era];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={fossilTileAccessibilityLabel(tile)}
      accessibilityHint={
        tile.discovered ? 'Öffnet den Eintrag im Fossilienbuch.' : 'Zeigt, wo du dieses Fossil findest.'
      }
      onPress={onPress}
      testID={`fossil-tile-${tile.id}`}
      style={({ pressed }) => [
        styles.tile,
        { width, borderColor: tile.discovered ? tone.main : colors.border },
        !tile.discovered && styles.locked,
        pressed && styles.pressed,
      ]}
    >
      <View style={[styles.art, { backgroundColor: tone.soft }]}>
        <Text style={[styles.emoji, !tile.discovered && styles.silhouette]} allowFontScaling={false} accessible={false}>
          {tile.discovered ? tile.emoji : '❓'}
        </Text>
        {tile.discovered && tile.isNew ? <View style={styles.newDot} /> : null}
      </View>
      <AppText
        variant="label"
        tone={tile.discovered ? 'primary' : 'muted'}
        align="center"
        numberOfLines={2}
        maxFontSizeMultiplier={fontScale.cardCompact}
        style={styles.name}
      >
        {tile.discovered ? tile.name : 'Unentdeckt'}
      </AppText>
      <EraBadge era={tile.era} size="sm" style={styles.badge} />
    </Pressable>
  );
});

const styles = StyleSheet.create({
  tile: {
    minHeight: 132,
    padding: spacing.sm,
    gap: spacing.xs,
    borderRadius: radii.md,
    borderWidth: 1,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  locked: { backgroundColor: colors.backgroundDeep, borderStyle: 'dashed' },
  pressed: { opacity: opacity.pressed, transform: [{ scale: 0.97 }] },
  art: {
    alignSelf: 'stretch',
    aspectRatio: 1.4,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 34, lineHeight: 42 },
  silhouette: { opacity: opacity.disabled },
  newDot: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    width: NEW_DOT,
    height: NEW_DOT,
    borderRadius: NEW_DOT / 2,
    backgroundColor: colors.success,
    borderWidth: 1,
    borderColor: colors.surface,
  },
  name: { flexGrow: 1 },
  badge: { alignSelf: 'center' },
});
