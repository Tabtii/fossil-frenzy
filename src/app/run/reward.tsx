import { RewardScreen } from '@/features/rewards/RewardScreen';

/**
 * /run/reward — shown by the run layout while `run.screen.type === 'reward'`; all
 * logic lives in src/features/rewards.
 */
export default function RewardRoute() {
  return <RewardScreen />;
}
