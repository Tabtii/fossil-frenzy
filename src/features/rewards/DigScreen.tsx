import type { RunState } from '@/engine/types';
import { useSticky } from '@/features/shell/hooks';
import { useGameActions, useRun } from '@/state/selectors';
import { colors, Screen } from '@/ui';

import { CardChoiceView } from './components/CardChoiceView';
import { DigSite } from './components/DigSite';

function isDig(run: RunState): boolean {
  return run.screen.type === 'dig';
}

/** Dig site: no fight, take 1 of 3 cards for free (or skip). */
export function DigScreen() {
  // Keep showing the dig while the store already moved on (route change pending).
  const run = useSticky(useRun(), isDig);
  const { chooseDig } = useGameActions();

  if (run === null || run.screen.type !== 'dig') return <Screen />;

  return (
    <CardChoiceView
      icon="⛏️"
      title="Ausgrabung"
      subtitle="Unter dem Sand schimmern drei Funde. Lege einen frei und nimm ihn als Karte mit."
      intro={<DigSite />}
      choices={run.screen.choices}
      deck={run.deck}
      onChoose={chooseDig}
      titleColor={colors.warning}
      testID="dig-screen"
    />
  );
}
