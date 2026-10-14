import { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { CONTENT } from '@/data';
import { ACT_COUNT, ACT_HEAL_PERCENT } from '@/engine/run';
import type { RunState } from '@/engine/types';
import { EraTransitionCard } from '@/features/shell/EraTransitionCard';
import { usePressGuard, useSticky } from '@/features/shell/hooks';
import {
  actHealAmount,
  actLabel,
  currentEnemy,
  ERA_DESTINATIONS,
  ERA_INTROS,
  ERA_LOCATIVES,
  eraTransition,
} from '@/features/shell/model';
import * as haptics from '@/lib/haptics';
import { useGameActions, useRun, useSettings } from '@/state/selectors';
import {
  AppText,
  Button,
  durations,
  ERA_ICONS,
  eraColors,
  Pill,
  ProgressDots,
  Screen,
  spacing,
  StatBar,
  Surface,
  useReduceMotion,
} from '@/ui';

function isActComplete(run: RunState): boolean {
  return run.screen.type === 'actComplete';
}

/** "Akt n geschafft!": era transition, heal preview and the way into the next act. */
export default function ActCompleteScreen() {
  // Keep showing the finished act while the store already moved on to the next map.
  const run = useSticky(useRun(), isActComplete);
  const settings = useSettings();
  const { startNextAct } = useGameActions();
  const reduceMotion = useReduceMotion(settings.reducedMotion);
  const guard = usePressGuard();

  const onContinue = useCallback(() => {
    guard(() => {
      haptics.selection();
      startNextAct();
    });
  }, [guard, startNextAct]);

  if (run === null) return <Screen />;

  const act = run.screen.type === 'actComplete' ? run.screen.act : run.act;
  const transition = eraTransition(act);
  const boss = currentEnemy(CONTENT, run);
  const heal = actHealAmount(run.hp, run.maxHp);
  const continueLabel = transition ? `Weiter ${ERA_DESTINATIONS[transition.to]}` : 'Weiter';

  return (
    <Screen
      scroll
      contentStyle={styles.body}
      footer={
        <Button
          label={continueLabel}
          icon={transition ? ERA_ICONS[transition.to] : '🧭'}
          size="lg"
          fullWidth
          onPress={onContinue}
          accessibilityHint={transition ? `Startet ${actLabel(transition.nextAct)}.` : undefined}
          testID="act-complete-continue"
        />
      }
    >
      <Animated.View
        style={styles.hero}
        entering={reduceMotion ? undefined : FadeInDown.duration(durations.slow)}
      >
        <ProgressDots
          count={ACT_COUNT}
          current={Math.min(act + 1, ACT_COUNT - 1)}
          activeColor={transition ? eraColors[transition.to].main : undefined}
          accessibilityLabel={`${actLabel(act)} von ${ACT_COUNT} geschafft`}
        />
        <AppText variant="title" align="center" accessibilityRole="header">
          {actLabel(act)} geschafft!
        </AppText>
        <AppText variant="body" tone="secondary" align="center">
          {boss ? `${boss.emoji} ${boss.name} ist besiegt. ` : 'Der Boss ist besiegt. '}
          Die Reise durch die Erdgeschichte geht weiter.
        </AppText>
      </Animated.View>

      {transition ? (
        <>
          <EraTransitionCard
            from={transition.from}
            to={transition.to}
            gapMya={transition.gapMya}
            reducedMotion={reduceMotion}
          />
          <Surface style={[styles.card, { borderColor: eraColors[transition.to].main }]}>
            <AppText variant="subheading" color={eraColors[transition.to].main}>
              {ERA_ICONS[transition.to]} Willkommen {ERA_LOCATIVES[transition.to]}
            </AppText>
            <AppText variant="body" tone="secondary">
              {ERA_INTROS[transition.to]}
            </AppText>
          </Surface>
        </>
      ) : null}

      <Surface style={styles.card}>
        <View style={styles.healHeader}>
          <AppText variant="subheading" style={styles.flex}>
            ❤️ Rast vor dem Aufbruch
          </AppText>
          {heal > 0 ? <Pill label={`+${heal} LP`} tone="success" /> : null}
        </View>
        <StatBar value={run.hp} max={run.maxHp} size="md" reducedMotion={reduceMotion} />
        <AppText variant="body" tone="secondary">
          {heal > 0
            ? `Beim Aufbruch heilst du ${heal} LP (${ACT_HEAL_PERCENT} % der fehlenden LP) und startest mit ${run.hp + heal}/${run.maxHp} LP.`
            : 'Du bist bei voller Gesundheit und brichst ausgeruht auf.'}
        </AppText>
      </Surface>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { gap: spacing.lg, paddingTop: spacing.xl },
  hero: { alignItems: 'center', gap: spacing.sm },
  card: { gap: spacing.sm },
  healHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  flex: { flex: 1, minWidth: 0 },
});
