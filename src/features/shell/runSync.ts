import { routeForScreen } from '@/features/navigation';
import type { ScreenType } from '@/state/selectors';
import type { GameStore } from '@/state/types';

// Pure decisions for the run layout: which route matches `run.screen`, when to
// replace the visible route and what Android's back button does. The hooks in
// RunShell.tsx only wire these to expo-router.

export type RunRoute = ReturnType<typeof routeForScreen>;

const RUN_PREFIX = '/run';

/** Route of the current run step, or null without a run. */
export function selectRunRoute(state: Pick<GameStore, 'run'>): RunRoute | null {
  return state.run ? routeForScreen(state.run.screen) : null;
}

/** True for every pathname inside the run group ("/run", "/run/map", …). */
export function isRunPath(pathname: string): boolean {
  return pathname === RUN_PREFIX || pathname.startsWith(`${RUN_PREFIX}/`);
}

export interface RunSyncInput {
  /** Store loaded from storage (before that `run` is not meaningful). */
  hydrated: boolean;
  /** Current global pathname (`usePathname()`). */
  pathname: string;
  /** Route for `run.screen`, null when there is no run. */
  target: RunRoute | null;
  /** A screen already started leaving the run (e.g. "Zurück zum Lager"). */
  exiting: boolean;
}

export type RunSyncDecision = { type: 'none' } | { type: 'home' } | { type: 'replace'; href: RunRoute };

const NONE: RunSyncDecision = { type: 'none' };
const HOME: RunSyncDecision = { type: 'home' };

/**
 * What the run layout should do to keep the visible route in sync with the
 * store. Only acts while a run route is visible, so a pushed screen on top
 * (e.g. settings) or the pop animation back home never triggers navigation.
 */
export function decideRunSync({ hydrated, pathname, target, exiting }: RunSyncInput): RunSyncDecision {
  if (!hydrated || !isRunPath(pathname)) return NONE;
  if (target === null) return exiting ? NONE : HOME;
  if (pathname === target) return NONE;
  return { type: 'replace', href: target };
}

/** Key that identifies one navigation request (used to skip duplicates while it is pending). */
export function runSyncRequestKey(pathname: string, decision: RunSyncDecision): string | null {
  switch (decision.type) {
    case 'none':
      return null;
    case 'home':
      return `${pathname}->/`;
    case 'replace':
      return `${pathname}->${decision.href}`;
  }
}

/**
 * Android hardware back inside a run: on the map (or without a run) it leaves
 * to the home screen and keeps the run saved; during every other step it is
 * ignored so a fight or a reward choice cannot be skipped by accident.
 */
export function hardwareBackAction(screenType: ScreenType | null): 'home' | 'block' {
  return screenType === null || screenType === 'map' ? 'home' : 'block';
}
