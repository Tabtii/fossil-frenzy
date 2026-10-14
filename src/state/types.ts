import type { MetaState, RestChoice, RunState, Settings } from '@/engine/types';

// CONTRACT — public shape of the zustand store in ./store.ts.

export interface GameStore {
  /** False until persisted state has been loaded from AsyncStorage. */
  hydrated: boolean;
  run: RunState | null;
  meta: MetaState;

  /** Starts a fresh run (replacing any current one) and counts it in meta. */
  newRun: (seed?: number) => void;
  /** Drops the current run without counting it as won. */
  abandonRun: () => void;

  enterNode: (nodeId: string) => void;
  playCard: (uid: string) => void;
  endTurn: () => void;
  /** Call when the combat phase is 'won' or 'lost'. */
  resolveCombat: () => void;
  chooseCardReward: (defId: string | null) => void;
  chooseDig: (defId: string | null) => void;
  chooseRest: (choice: RestChoice) => void;
  startNextAct: () => void;
  /** From 'victory' or 'defeat': records the result in meta and clears the run. */
  finishRun: () => void;

  updateSettings: (patch: Partial<Settings>) => void;
  /** Wipes meta progress and the current run. */
  resetProgress: () => void;
}
