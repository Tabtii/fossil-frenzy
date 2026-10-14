import { useCallback, useRef, useState } from 'react';

// Small React helpers for the shell screens.

/**
 * Keeps the last value that passed `accept`. Screens that leave the run keep
 * showing their content while the store has already moved on (e.g. the
 * summary after `finishRun()` cleared the run, during the exit animation).
 */
export function useSticky<T>(value: T | null, accept: (value: T) => boolean): T | null {
  const [kept, setKept] = useState<T | null>(() => (value !== null && accept(value) ? value : null));
  if (value !== null && value !== kept && accept(value)) {
    // "Storing information from previous renders": React re-renders right away.
    setKept(value);
    return value;
  }
  return kept;
}

/** Default window in which a second navigation tap is ignored. */
export const PRESS_GUARD_MS = 700;

/**
 * Wraps navigation so a double tap cannot push the same screen twice. Only
 * guard the navigation itself (not a dialog in front of it).
 */
export function usePressGuard(windowMs: number = PRESS_GUARD_MS): (action: () => void) => void {
  const lastRef = useRef(0);
  return useCallback(
    (action: () => void) => {
      const now = Date.now();
      if (now - lastRef.current < windowMs) return;
      lastRef.current = now;
      action();
    },
    [windowMs],
  );
}
