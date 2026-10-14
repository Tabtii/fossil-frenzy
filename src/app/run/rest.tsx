import { RestScreen } from '@/features/rewards/RestScreen';

/**
 * /run/rest — shown by the run layout while `run.screen.type === 'rest'`; all
 * logic lives in src/features/rewards.
 */
export default function RestRoute() {
  return <RestScreen />;
}
