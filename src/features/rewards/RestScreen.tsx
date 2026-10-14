import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { CONTENT } from '@/data';
import { REST_HEAL_PERCENT } from '@/engine/run';
import type { RunState } from '@/engine/types';
import { usePressGuard, useSticky } from '@/features/shell/hooks';
import * as haptics from '@/lib/haptics';
import { useGameActions, useRun, useSettings } from '@/state/selectors';
import { AppText, Pill, Screen, spacing, StatBar, Surface, useReduceMotion } from '@/ui';

import { Campfire } from './components/Campfire';
import { RestOption } from './components/RestOption';
import { UpgradeSheet } from './components/UpgradeSheet';
import { groupUpgradeOptions, restHealAmount, upgradableCards } from './rewardModel';

function isRest(run: RunState): boolean {
  return run.screen.type === 'rest';
}

/** Rest site: heal 30 % of max HP or upgrade one card. */
export function RestScreen() {
  // Keep showing the camp while the store already moved on (route change pending).
  const run = useSticky(useRun(), isRest);
  const settings = useSettings();
  const { chooseRest } = useGameActions();
  const reduceMotion = useReduceMotion(settings.reducedMotion);
  const guard = usePressGuard();
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  const deck = run?.deck;
  const groups = useMemo(() => (deck ? groupUpgradeOptions(upgradableCards(CONTENT, deck)) : []), [deck]);

  const onHeal = useCallback(() => {
    guard(() => {
      haptics.selection();
      chooseRest({ type: 'heal' });
    });
  }, [guard, chooseRest]);
  const openUpgrade = useCallback(() => {
    haptics.tapLight();
    setUpgradeOpen(true);
  }, []);
  const closeUpgrade = useCallback(() => setUpgradeOpen(false), []);
  const onUpgrade = useCallback(
    (uid: string) => {
      guard(() => {
        haptics.cardPlayed();
        setUpgradeOpen(false);
        chooseRest({ type: 'upgrade', uid });
      });
    },
    [guard, chooseRest],
  );

  if (run === null) return <Screen />;

  const heal = restHealAmount(run.hp, run.maxHp);
  const healText =
    heal > 0
      ? `+${heal} LP heilen (${REST_HEAL_PERCENT} % deiner Max-LP) · danach ${run.hp + heal}/${run.maxHp} LP`
      : 'Du hast bereits volle LP.';
  const upgradeText =
    groups.length > 0
      ? 'Eine Karte deines Decks dauerhaft verbessern.'
      : 'Alle Karten deines Decks sind schon verbessert.';

  return (
    <Screen
      scroll
      contentStyle={styles.body}
      testID="rest-screen"
      footer={
        <View style={styles.options}>
          <RestOption
            icon="😴"
            title="Ausruhen"
            description={healText}
            onPress={onHeal}
            accessibilityHint="Beendet die Rast und heilt dich."
            testID="rest-heal"
          />
          <RestOption
            icon="⚒️"
            title="Verbessern"
            description={upgradeText}
            onPress={openUpgrade}
            disabled={groups.length === 0}
            accessibilityHint="Öffnet die Auswahl der Karten."
            testID="rest-upgrade"
          />
        </View>
      }
    >
      <View style={styles.hero}>
        <AppText variant="title" align="center" accessibilityRole="header">
          Rast
        </AppText>
        <AppText variant="body" tone="secondary" align="center">
          Die Nacht ist ruhig, das Feuer knistert. Wie nutzt du die Pause?
        </AppText>
      </View>
      <Campfire reduceMotion={reduceMotion} />
      <Surface level="raised" style={styles.hp}>
        <View style={styles.hpHeader}>
          <AppText variant="label" style={styles.flex}>
            ❤️ Lebenspunkte
          </AppText>
          {heal > 0 ? <Pill label={`+${heal} LP möglich`} tone="success" size="sm" /> : null}
        </View>
        <StatBar value={run.hp} max={run.maxHp} size="md" reducedMotion={reduceMotion} />
      </Surface>

      <UpgradeSheet
        visible={upgradeOpen}
        groups={groups}
        onClose={closeUpgrade}
        onConfirm={onUpgrade}
        reducedMotion={settings.reducedMotion}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { gap: spacing.lg, paddingTop: spacing.lg },
  hero: { alignItems: 'center', gap: spacing.xs },
  hp: { gap: spacing.sm },
  hpHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  flex: { flex: 1, minWidth: 0 },
  options: { gap: spacing.sm },
});
