import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export type MessageTone = 'info' | 'danger';

export interface TransientMessage {
  id: number;
  text: string;
  tone: MessageTone;
}

export interface TransientMessageApi {
  message: TransientMessage | null;
  show: (text: string, tone: MessageTone, durationMs: number) => void;
  hide: () => void;
}

/** A single short-lived message (toast); a new one replaces the current one. */
export function useTransientMessage(): TransientMessageApi {
  const [message, setMessage] = useState<TransientMessage | null>(null);
  const nextId = useRef(1);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current !== null) clearTimeout(timer.current);
    },
    [],
  );

  const show = useCallback((text: string, tone: MessageTone, durationMs: number) => {
    const id = nextId.current;
    nextId.current += 1;
    setMessage({ id, text, tone });
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      timer.current = null;
      setMessage((current) => (current?.id === id ? null : current));
    }, durationMs);
  }, []);

  const hide = useCallback(() => {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
    setMessage(null);
  }, []);

  return useMemo(() => ({ message, show, hide }), [message, show, hide]);
}
