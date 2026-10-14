import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { FossilEntry } from '@/engine/types';
import {
  AppText,
  colors,
  DIET_LABELS,
  EraBadge,
  FOSSIL_KIND_LABELS,
  formatLength,
  formatMya,
  Pill,
  radii,
  spacing,
  UI_STRINGS,
} from '@/ui';

import { BATTLE_TEXT } from '../strings';

export interface FossilFactsProps {
  fossil: FossilEntry;
  /** Already in the fossil book; otherwise a "Neu!" note is shown. */
  discovered: boolean;
}

/** Fossil card for the enemy info sheet: names, age, find site and facts. */
export const FossilFacts = memo(function FossilFacts({ fossil, discovered }: FossilFactsProps) {
  const details = [
    formatMya(fossil.mya),
    fossil.lengthM !== undefined ? formatLength(fossil.lengthM) : null,
    `Fundort: ${fossil.foundIn}`,
  ]
    .filter((part): part is string => part !== null)
    .join(' · ');

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.emoji} allowFontScaling={false} accessible={false}>
          {fossil.emoji}
        </Text>
        <View style={styles.titles}>
          <AppText variant="overline" tone="accent">
            {UI_STRINGS.fossil}
          </AppText>
          <AppText variant="subheading">{fossil.name}</AppText>
          <AppText variant="caption" tone="secondary" italic>
            {fossil.scientificName}
          </AppText>
        </View>
      </View>
      <View style={styles.pills}>
        <EraBadge era={fossil.era} size="sm" />
        <Pill size="sm" label={FOSSIL_KIND_LABELS[fossil.kind]} />
        <Pill size="sm" label={DIET_LABELS[fossil.diet]} />
        {discovered ? null : <Pill size="sm" label="Neu" tone="success" />}
      </View>
      <AppText variant="caption" tone="secondary">
        {details}
      </AppText>
      <View style={styles.facts}>
        <AppText variant="overline" tone="accent">
          {UI_STRINGS.facts}
        </AppText>
        {fossil.facts.map((fact) => (
          <View key={fact} style={styles.factRow}>
            <AppText variant="body" tone="accent" accessible={false}>
              •
            </AppText>
            <AppText variant="body" style={styles.factText}>
              {fact}
            </AppText>
          </View>
        ))}
      </View>
      {discovered ? null : (
        <AppText variant="caption" tone="muted">
          {BATTLE_TEXT.fossilNew}
        </AppText>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  root: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceRaised,
    borderLeftWidth: 3,
    borderLeftColor: colors.accent,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  emoji: { fontSize: 36, lineHeight: 44 },
  titles: { flex: 1, minWidth: 0 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  facts: { gap: spacing.xs, marginTop: spacing.xs },
  factRow: { flexDirection: 'row', gap: spacing.sm },
  factText: { flex: 1 },
});
