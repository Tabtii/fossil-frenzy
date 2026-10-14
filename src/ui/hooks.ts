import { useCallback, useMemo, useRef, useState } from 'react';
import { ReduceMotion, useReducedMotion } from 'react-native-reanimated';

import type { FloatingNumberItem, FloatingNumberKind } from './format';

// Small UI hooks shared by components and screens. No store access: app
// settings (e.g. reduced motion) are passed in by the caller.

/**
 * True when animations should be skipped: either the OS "reduce motion"
 * accessibility setting (read at app start) or the in-app setting is on.
 */
export function useReduceMotion(appSetting: boolean = false): boolean {
  const system = useReducedMotion();
  return appSetting || system;
}

/**
 * Reanimated `reduceMotion` option for withTiming/withSpring/layout animations.
 * With `Always` animations jump to their end value (callbacks still fire).
 */
export function reduceMotionOption(reduced: boolean): ReduceMotion {
  return reduced ? ReduceMotion.Always : ReduceMotion.System;
}

export interface FloatingNumberQueue {
  items: FloatingNumberItem[];
  /** Adds a number; returns its id. */
  push: (kind: FloatingNumberKind, value: number) => number;
  /** Adds several numbers at once (e.g. all hits of one action). */
  pushMany: (entries: readonly Omit<FloatingNumberItem, 'id'>[]) => void;
  /** Removes one number; pass as `onDone` to <FloatingNumbers>. */
  remove: (id: number | string) => void;
  clear: () => void;
}

/**
 * Local queue for <FloatingNumbers>. Keeps at most `limit` entries so rapid
 * actions never pile up unbounded.
 */
export function useFloatingNumberQueue(limit: number = 8): FloatingNumberQueue {
  const [items, setItems] = useState<FloatingNumberItem[]>([]);
  const nextId = useRef(1);

  const pushMany = useCallback(
    (entries: readonly Omit<FloatingNumberItem, 'id'>[]) => {
      if (entries.length === 0) return;
      const added = entries.map((entry) => {
        const id = nextId.current;
        nextId.current += 1;
        return { ...entry, id };
      });
      setItems((current) => [...current, ...added].slice(-limit));
    },
    [limit],
  );

  const push = useCallback(
    (kind: FloatingNumberKind, value: number) => {
      const id = nextId.current;
      nextId.current += 1;
      setItems((current) => [...current, { id, kind, value }].slice(-limit));
      return id;
    },
    [limit],
  );

  const remove = useCallback((id: number | string) => {
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  return useMemo(() => ({ items, push, pushMany, remove, clear }), [items, push, pushMany, remove, clear]);
}
