import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInLeft, FadeInRight } from 'react-native-reanimated';

import { ERA_MYA, ERA_NAMES } from '@/data/fossils';
import type { Era } from '@/engine/types';
import { AppText, colors, durations, eraColors, fontScale, formatMya, radii, spacing } from '@/ui';

import { ERA_MASCOTS } from './EraParade';
import { timeJumpText } from './model';

// "From era → to era" panel for the act transition screen.

function EraPanel({ era, caption, highlighted }: { era: Era; caption: string; highlighted: boolean }) {
  const tone = eraColors[era];
  return (
    <View
      style={[
        styles.panel,
        { borderColor: tone.main, backgroundColor: tone.soft },
        highlighted ? styles.highlighted : styles.dimmed,
      ]}
    >
      <AppText variant="overline" tone="muted" numberOfLines={1}>
        {caption}
      </AppText>
      <Text style={styles.mascot} allowFontScaling={false}>
        {ERA_MASCOTS[era]}
      </Text>
      <AppText variant="heading" color={tone.main} align="center" numberOfLines={1} adjustsFontSizeToFit>
        {ERA_NAMES[era]}
      </AppText>
      <AppText variant="caption" tone="secondary" align="center">
        {formatMya(ERA_MYA[era])}
      </AppText>
    </View>
  );
}

export interface EraTransitionCardProps {
  from: Era;
  to: Era;
  /** Millions of years between the two eras (0 if they touch). */
  gapMya: number;
  reducedMotion: boolean;
}

export const EraTransitionCard = memo(function EraTransitionCard({
  from,
  to,
  gapMya,
  reducedMotion,
}: EraTransitionCardProps) {
  const jump = timeJumpText(gapMya);
  const label = [
    `Von ${ERA_NAMES[from]} (${formatMya(ERA_MYA[from])})`,
    `nach ${ERA_NAMES[to]} (${formatMya(ERA_MYA[to])})`,
    jump,
  ]
    .filter((part): part is string => part !== null)
    .join(', ');

  return (
    <View style={styles.root} accessible accessibilityLabel={label}>
      <View style={styles.row}>
        <Animated.View
          style={styles.cell}
          entering={reducedMotion ? undefined : FadeInLeft.duration(durations.slow)}
        >
          <EraPanel era={from} caption="Hinter dir" highlighted={false} />
        </Animated.View>
        <Text style={[styles.arrow, { color: eraColors[to].main }]} maxFontSizeMultiplier={fontScale.badge}>
          →
        </Text>
        <Animated.View
          style={styles.cell}
          entering={reducedMotion ? undefined : FadeInRight.delay(durations.normal).duration(durations.slow)}
        >
          <EraPanel era={to} caption="Vor dir" highlighted />
        </Animated.View>
      </View>
      {jump !== null ? (
        <AppText variant="label" tone="muted" align="center">
          ⏳ {jump}
        </AppText>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  root: { gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'stretch', gap: spacing.xs },
  cell: { flex: 1, minWidth: 0 },
  panel: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
  },
  highlighted: { borderWidth: 2 },
  dimmed: { opacity: 0.8 },
  mascot: { fontSize: 40, lineHeight: 50, color: colors.text },
  arrow: { alignSelf: 'center', fontSize: 24, lineHeight: 30, fontWeight: '800' },
});
