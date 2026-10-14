import { useCallback, useEffect, useMemo, useRef } from 'react';

export interface Timers {
  /** Runs `fn` after `ms`; cancelled automatically when the component unmounts. */
  schedule: (ms: number, fn: () => void) => void;
  clearAll: () => void;
}

/** setTimeout bound to the component lifetime (no callbacks after unmount). */
export function useTimers(): Timers {
  const ids = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  useEffect(() => {
    const pending = ids.current;
    return () => {
      pending.forEach(clearTimeout);
      pending.clear();
    };
  }, []);

  const schedule = useCallback((ms: number, fn: () => void) => {
    const pending = ids.current;
    const id = setTimeout(() => {
      pending.delete(id);
      fn();
    }, Math.max(0, ms));
    pending.add(id);
  }, []);

  const clearAll = useCallback(() => {
    ids.current.forEach(clearTimeout);
    ids.current.clear();
  }, []);

  return useMemo(() => ({ schedule, clearAll }), [schedule, clearAll]);
}
