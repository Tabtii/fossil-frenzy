import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { CONTENT } from '@/data';
import { getNode } from '@/engine/run';
import type { RunState } from '@/engine/types';
import { useSticky } from '@/features/shell/hooks';
import { useGameActions, useMeta, useRun } from '@/state/selectors';
import { AppText, colors, Pill, radii, Screen, spacing } from '@/ui';

import { CardChoiceView } from './components/CardChoiceView';
import { FossilFindCard } from './components/FossilFindCard';
import { fossilFinds } from './rewardModel';

function isReward(run: RunState): boolean {
  return run.screen.type === 'reward';
}

/** After a won fight: fossil finds, max-HP bonus and 1 of 3 reward cards. */
export function RewardScreen() {
  // Keep showing the reward while the store already moved on (route change pending).
  const run = useSticky(useRun(), isReward);
  const { fossils } = useMeta();
  const { chooseCardReward } = useGameActions();

  const screen = run?.screen.type === 'reward' ? run.screen : null;
  const finds = useMemo(
    () => (screen ? fossilFinds(CONTENT, screen.reward.fossilsFound, fossils) : []),
    [screen, fossils],
  );

  if (run === null || screen === null) return <Screen />;

  const node = getNode(run, screen.nodeId);
  const enemy = node?.enemyId !== undefined ? CONTENT.enemies[node.enemyId] : undefined;
  const isBoss = node?.type === 'boss';
  const { maxHpGain } = screen.reward;
  const subtitle = enemy
    ? `${enemy.emoji} ${enemy.name} ist besiegt. Wähle eine Karte für dein Deck.`
    : 'Wähle eine Karte für dein Deck.';

  const intro = (
    <View style={styles.intro}>
      {finds.map((find) => (
        <FossilFindCard key={find.fossil.id} find={find} />
      ))}
      {maxHpGain > 0 ? (
        <View
          style={styles.banner}
          accessible
          accessibilityLabel={`Plus ${maxHpGain} maximale Lebenspunkte. Deine Max-LP steigen auf ${run.maxHp}.`}
          testID="reward-max-hp"
        >
          <Pill label={`+${maxHpGain} Max-LP`} icon="❤️" tone="success" solid />
          <AppText variant="body" tone="secondary" style={styles.bannerText}>
            Deine Max-LP steigen auf {run.maxHp}.
          </AppText>
        </View>
      ) : null}
    </View>
  );

  return (
    <CardChoiceView
      icon={isBoss ? '👑' : '🏆'}
      title={isBoss ? 'Sieg über den Boss!' : 'Sieg!'}
      subtitle={subtitle}
      intro={intro}
      choices={screen.reward.choices}
      deck={run.deck}
      onChoose={chooseCardReward}
      titleColor={colors.accent}
      testID="reward-screen"
    />
  );
}

const styles = StyleSheet.create({
  intro: { gap: spacing.sm },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.successSoft,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.success,
  },
  bannerText: { flexShrink: 1 },
});
