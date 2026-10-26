import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppText, colors, ERA_LABELS, eraColors, Pill, radii, spacing } from '@/ui';

import type { FossilFind } from '../rewardModel';

/** A fossil found in this fight, with a "new in the fossil book" badge. */
export const FossilFindCard = memo(function FossilFindCard({ find }: { find: FossilFind }) {
  const { fossil, isNew } = find;
  const spoken = `Fossilfund: ${fossil.name}, ${fossil.scientificName}, ${ERA_LABELS[fossil.era]}. ${
    isNew ? 'Neu im Fossilienbuch!' : 'Schon im Fossilienbuch.'
  }`;
  return (
    <View
      style={[styles.root, isNew && styles.rootNew, { borderLeftColor: eraColors[fossil.era].main }]}
      accessible
      accessibilityLabel={spoken}
      testID={`fossil-find-${fossil.id}`}
    >
      <Text style={styles.emoji} allowFontScaling={false}>
        {fossil.emoji}
      </Text>
      <View style={styles.text}>
        <AppText variant="overline" tone="secondary">
          🦴 Fossilfund
        </AppText>
        <AppText variant="subheading" numberOfLines={2}>
          {fossil.name}
        </AppText>
        <AppText variant="caption" tone="secondary" italic numberOfLines={1}>
          {fossil.scientificName}
        </AppText>
        {isNew ? (
          <Pill label="Neu im Fossilienbuch!" icon="✨" tone="accent" size="sm" style={styles.pill} />
        ) : (
          <AppText variant="caption" tone="muted">
            Schon im Fossilienbuch
          </AppText>
        )}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderLeftWidth: 4,
  },
  rootNew: { backgroundColor: colors.surfaceRaised, borderColor: colors.accentBorder },
  emoji: { fontSize: 40, lineHeight: 48, color: colors.text },
  text: { flex: 1, minWidth: 0, gap: spacing.xxs },
  pill: { marginTop: spacing.xxs },
});
