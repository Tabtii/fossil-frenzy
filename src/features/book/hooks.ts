import { router } from 'expo-router';
import { useCallback, useState } from 'react';

import type { CardDef } from '@/engine/types';
import { ROUTES } from '@/features/navigation';
import * as haptics from '@/lib/haptics';

// React helpers shared by the fossil book and the collection screens.

/** Back button handler: pops when possible, otherwise replaces with `fallback`. */
export function useBackTo(fallback: typeof ROUTES.home | typeof ROUTES.fossils): () => void {
  return useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace(fallback);
  }, [fallback]);
}

/** Time the screen was opened (stable for the screen's lifetime). */
export function useMountTime(): number {
  const [now] = useState(() => Date.now());
  return now;
}

export interface CardSheetState {
  def: CardDef | null;
  visible: boolean;
  upgraded: boolean;
  open: (def: CardDef) => void;
  close: () => void;
  toggleUpgraded: () => void;
}

/**
 * State of a CardDetailSheet with a "Verbessert ansehen" toggle. The last
 * card stays set while the sheet slides closed.
 */
export function useCardSheet(): CardSheetState {
  const [def, setDef] = useState<CardDef | null>(null);
  const [visible, setVisible] = useState(false);
  const [upgraded, setUpgraded] = useState(false);

  const open = useCallback((next: CardDef) => {
    haptics.tapLight();
    setDef(next);
    setUpgraded(false);
    setVisible(true);
  }, []);
  const close = useCallback(() => setVisible(false), []);
  const toggleUpgraded = useCallback(() => {
    haptics.selection();
    setUpgraded((value) => !value);
  }, []);

  return { def, visible, upgraded, open, close, toggleUpgraded };
}

/** Label of the upgrade toggle in the card sheet. */
export function upgradeToggleLabel(upgraded: boolean): string {
  return upgraded ? 'Original ansehen' : 'Verbessert ansehen';
}
