import { Stack } from 'expo-router';

import { RUN_STACK_OPTIONS } from '@/features/shell/navigationOptions';
import { RunShell } from '@/features/shell/RunShell';

export { RunErrorBoundary as ErrorBoundary } from '@/features/shell/ErrorScreen';

/**
 * Run group. The visible step always follows `run.screen` (RunShell replaces
 * the route); screens only call store actions. No swipe-back inside a run.
 */
export default function RunLayout() {
  return (
    <RunShell>
      <Stack screenOptions={RUN_STACK_OPTIONS} />
    </RunShell>
  );
}
