import { DigScreen } from '@/features/rewards/DigScreen';

/**
 * /run/dig — shown by the run layout while `run.screen.type === 'dig'`; all
 * logic lives in src/features/rewards.
 */
export default function DigRoute() {
  return <DigScreen />;
}
