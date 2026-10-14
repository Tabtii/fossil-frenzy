import { BattleScreen } from '@/features/battle/BattleScreen';

/**
 * /run/battle — the combat screen. The run layout shows this route while
 * `run.screen.type === 'combat'`; all logic lives in src/features/battle.
 */
export default function BattleRoute() {
  return <BattleScreen />;
}
