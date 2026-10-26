import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';

import { CONTENT } from '@/data';
import { eraForAct } from '@/engine/run';
import type { CardInstance, RunState } from '@/engine/types';
import { DeckGrid } from '@/features/shell/DeckGrid';
import { expeditionCode } from '@/features/shell/expedition';
import { usePressGuard, useSticky } from '@/features/shell/hooks';
import {
  actLabel,
  fossilProgress,
  progressText,
  runFossilFinds,
  summaryHeadline,
  summaryStats,
} from '@/features/shell/model';
import { useRunShell } from '@/features/shell/RunShell';
import { SectionTitle } from '@/features/shell/SectionTitle';
import { StatTile } from '@/features/shell/StatTile';
import * as haptics from '@/lib/haptics';
import { useMeta, useRun } from '@/state/selectors';
import {
  AppText,
  Button,
  CardDetailSheet,
  colors,
  durations,
  EraBadge,
  Pill,
  Screen,
  spacing,
  useReduceMotion,
} from '@/ui';

function isFinishedRun(run: RunState): boolean {
  return run.screen.type === 'victory' || run.screen.type === 'defeat';
}

/** Victory / defeat summary at the end of an expedition. */
export default function SummaryScreen() {
  // `finishRun()` clears the run; keep showing it during the exit animation.
  const run = useSticky(useRun(), isFinishedRun);
  const meta = useMeta();
  const { leaveRun, startNewRun } = useRunShell();
  const reduceMotion = useReduceMotion(meta.settings.reducedMotion);
  const guard = usePressGuard();
  const [detail, setDetail] = useState<CardInstance | null>(null);

  const victory = run?.screen.type === 'victory';
  useEffect(() => {
    if (victory) haptics.victory();
  }, [victory]);

  const onHome = useCallback(() => {
    guard(() => {
      haptics.selection();
      leaveRun();
    });
  }, [guard, leaveRun]);

  const onNewRun = useCallback(() => {
    guard(() => {
      haptics.selection();
      startNewRun();
    });
  }, [guard, startNewRun]);

  const onReplay = useCallback(() => {
    if (!run) return;
    guard(() => {
      haptics.selection();
      startNewRun(run.seed);
    });
  }, [guard, run, startNewRun]);

  const onCloseDetail = useCallback(() => setDetail(null), []);

  if (run === null) return <Screen />;

  const headline = summaryHeadline(CONTENT, run);
  const stats = summaryStats(run.stats);
  const newFinds = runFossilFinds(CONTENT, run, meta.fossils).filter((find) => find.isNew);
  const book = fossilProgress(meta.fossils, CONTENT);
  const detailDef = detail ? (CONTENT.cards[detail.defId] ?? null) : null;

  return (
    <Screen
      scroll
      contentStyle={styles.body}
      footer={
        <>
          <Button
            label="Zurück zum Lager"
            icon="🏕️"
            size="lg"
            fullWidth
            onPress={onHome}
            accessibilityHint="Beendet die Expedition und öffnet den Startbildschirm."
            testID="summary-home"
          />
          <Button
            label="Neue Expedition"
            icon="🧭"
            variant="secondary"
            fullWidth
            onPress={onNewRun}
            testID="summary-new-run"
          />
        </>
      }
    >
      <View>
        <AppText variant="overline" tone="muted" align="center">DEIN EXPEDITIONSCODE</AppText>
        <AppText variant="number" tone="accent" align="center" selectable>{expeditionCode(run.seed)}</AppText>
        <Button label="Diese Expedition wiederholen" variant="ghost" fullWidth onPress={onReplay} testID="summary-replay" />
      </View>
      {headline ? (
        <View style={styles.hero}>
          <Animated.View entering={reduceMotion ? undefined : ZoomIn.duration(durations.slow)}>
            <Text style={styles.heroIcon} allowFontScaling={false} accessible={false}>
              {headline.icon}
            </Text>
          </Animated.View>
          <Animated.View
            style={styles.heroTexts}
            entering={reduceMotion ? undefined : FadeInDown.delay(durations.fast).duration(durations.slow)}
          >
            <AppText variant="title" align="center" tone={victory ? 'accent' : 'primary'} accessibilityRole="header">
              {headline.title}
            </AppText>
            <AppText variant="body" tone="secondary" align="center">
              {headline.message}
            </AppText>
            <EraBadge era={eraForAct(run.act)} style={styles.badge} />
            <AppText variant="label" tone="muted" align="center">
              {`Erreicht: ${actLabel(run.act)}`}
            </AppText>
          </Animated.View>
        </View>
      ) : null}

      <View>
        <SectionTitle>Statistik</SectionTitle>
        <View style={styles.stats}>
          {stats.map((stat) => (
            <StatTile key={stat.key} icon={stat.icon} label={stat.label} value={stat.value} />
          ))}
        </View>
      </View>

      <View>
        <SectionTitle>Fossilienbuch</SectionTitle>
        {newFinds.length > 0 ? (
          <>
            <AppText variant="body" tone="secondary" style={styles.paragraph}>
              {newFinds.length === 1 ? 'Neu entdeckt:' : `${newFinds.length} neue Fossilien entdeckt:`}
            </AppText>
            <View style={styles.finds}>
              {newFinds.map(({ entry }) => (
                <Pill
                  key={entry.id}
                  icon={entry.emoji}
                  label={entry.name}
                  tone="accent"
                  accessibilityLabel={`Neu entdeckt: ${entry.name}`}
                />
              ))}
            </View>
          </>
        ) : null}
        <AppText variant="label" tone="muted" style={styles.paragraph}>
          {`📖 ${progressText(book, 'Fossilien entdeckt')}`}
        </AppText>
      </View>

      <View>
        <SectionTitle>{`Dein Deck (${run.deck.length} Karten)`}</SectionTitle>
        <DeckGrid cards={run.deck} db={CONTENT} onOpen={setDetail} />
      </View>

      <CardDetailSheet
        def={detailDef}
        upgraded={detail?.upgraded ?? false}
        fossil={detailDef ? CONTENT.fossils[detailDef.fossilId] : undefined}
        fossilDiscovered={detailDef ? meta.fossils[detailDef.fossilId] !== undefined : false}
        visible={detail !== null}
        onClose={onCloseDetail}
        reducedMotion={reduceMotion}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { gap: spacing.md, paddingTop: spacing.xl },
  hero: { alignItems: 'center', gap: spacing.sm },
  heroIcon: { fontSize: 64, lineHeight: 78, textAlign: 'center', color: colors.accent },
  heroTexts: { alignItems: 'center', gap: spacing.sm },
  badge: { alignSelf: 'center' },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  finds: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.sm },
  paragraph: { marginTop: spacing.xs },
});
