import { router, useFocusEffect, usePathname } from 'expo-router';
import {
  createContext,
  type ReactNode,
  type RefObject,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from 'react';
import { BackHandler } from 'react-native';

import { ROUTES } from '@/features/navigation';
import { selectScreenType, useGameActions, useHydrated } from '@/state/selectors';
import { useGameStore } from '@/state/store';

import { decideRunSync, hardwareBackAction, runSyncRequestKey, selectRunRoute } from './runSync';

// Run shell: keeps the visible run route in sync with `run.screen`, handles
// Android's back button and offers `useLeaveRun()` to screens inside the run.

export interface RunShellActions {
  /**
   * Leaves the run to the home screen. A finished run (victory/defeat) is
   * recorded and cleared via `finishRun()`; an active run stays saved so it
   * can be continued from home.
   */
  leaveRun: () => void;
  /**
   * From the summary: records the finished run and starts a new one. The run
   * layout then shows the new map (no detour via home).
   */
  startNewRun: () => void;
}

const RunShellContext = createContext<RunShellActions | null>(null);

function isFinished(): boolean {
  const type = selectScreenType(useGameStore.getState());
  return type === 'victory' || type === 'defeat';
}

function useRunShellActions(exitingRef: RefObject<boolean> | null): RunShellActions {
  const { finishRun, newRun } = useGameActions();

  const leaveRun = useCallback(() => {
    // Clearing the run must not trigger the layout's own "no run → home" step.
    if (exitingRef) exitingRef.current = true;
    if (isFinished()) finishRun();
    // Pops back to home if it is in the stack, otherwise replaces the run.
    router.dismissTo(ROUTES.home);
  }, [exitingRef, finishRun]);

  const startNewRun = useCallback(() => {
    // finishRun() briefly clears the run; suppress "no run → home" meanwhile.
    if (exitingRef) exitingRef.current = true;
    if (isFinished()) finishRun();
    newRun();
    if (exitingRef) exitingRef.current = false;
  }, [exitingRef, finishRun, newRun]);

  return useMemo(() => ({ leaveRun, startNewRun }), [leaveRun, startNewRun]);
}

/** For screens inside the run group (summary, error screens, map menu …). */
export function useRunShell(): RunShellActions {
  const fromShell = useContext(RunShellContext);
  const fallback = useRunShellActions(null);
  return fromShell ?? fallback;
}

/** Shortcut for `useRunShell().leaveRun`. */
export function useLeaveRun(): () => void {
  return useRunShell().leaveRun;
}

/** Replaces the visible run route whenever `run.screen` changes. */
function useRunScreenSync(exitingRef: RefObject<boolean>): void {
  const hydrated = useHydrated();
  const pathname = usePathname();
  const target = useGameStore(selectRunRoute);
  const pendingRef = useRef<{ pathname: string; key: string } | null>(null);

  useEffect(() => {
    // A request only counts as pending while its start route is still visible.
    if (pendingRef.current !== null && pendingRef.current.pathname !== pathname) {
      pendingRef.current = null;
    }
    const decision = decideRunSync({ hydrated, pathname, target, exiting: exitingRef.current });
    const key = runSyncRequestKey(pathname, decision);
    // The same request while the pathname has not changed yet is still pending
    // (e.g. a re-run effect); sending it twice would replace the screen twice.
    if (key === null || key === pendingRef.current?.key) return;
    pendingRef.current = { pathname, key };
    if (decision.type === 'home') {
      exitingRef.current = true;
      router.dismissTo(ROUTES.home);
    } else if (decision.type === 'replace') {
      router.replace(decision.href);
    }
  }, [hydrated, pathname, target, exitingRef]);
}

/** Android back: map → home (run stays saved), every other step → ignored. */
function useRunBackHandler(leaveRun: () => void): void {
  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        if (hardwareBackAction(selectScreenType(useGameStore.getState())) === 'home') {
          leaveRun();
        }
        return true;
      });
      return () => subscription.remove();
    }, [leaveRun]),
  );
}

export interface RunShellProps {
  children: ReactNode;
}

/** Wraps the run group's navigator (see src/app/run/_layout.tsx). */
export function RunShell({ children }: RunShellProps) {
  const exitingRef = useRef(false);
  const actions = useRunShellActions(exitingRef);
  useRunScreenSync(exitingRef);
  useRunBackHandler(actions.leaveRun);
  return <RunShellContext.Provider value={actions}>{children}</RunShellContext.Provider>;
}
