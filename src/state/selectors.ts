import { useShallow } from 'zustand/react/shallow';

import { availableNodes, currentNode } from '@/engine/run';
import type {
  CombatState,
  FossilRecord,
  MapNode,
  MetaState,
  RunScreen,
  RunState,
  Settings,
} from '@/engine/types';
import { useGameStore } from './store';
import type { GameStore } from './types';

// Selectors and hooks for UI code. Plain `select*` functions work with
// `useGameStore.getState()`; the `use*` hooks subscribe minimally (each one
// returns a value that keeps its identity until it really changes).

export type GameActions = Pick<
  GameStore,
  | 'newRun'
  | 'abandonRun'
  | 'enterNode'
  | 'playCard'
  | 'endTurn'
  | 'resolveCombat'
  | 'chooseCardReward'
  | 'chooseDig'
  | 'chooseRest'
  | 'startNextAct'
  | 'finishRun'
  | 'updateSettings'
  | 'resetProgress'
>;

export type ScreenType = RunScreen['type'];

// ---------------------------------------------------------------------------
// Plain selectors
// ---------------------------------------------------------------------------

export const selectHydrated = (state: GameStore): boolean => state.hydrated;
export const selectRun = (state: GameStore): RunState | null => state.run;
export const selectScreen = (state: GameStore): RunScreen | null => state.run?.screen ?? null;
export const selectScreenType = (state: GameStore): ScreenType | null => state.run?.screen.type ?? null;
export const selectMeta = (state: GameStore): MetaState => state.meta;
export const selectSettings = (state: GameStore): Settings => state.meta.settings;

export function selectCombat(state: GameStore): CombatState | null {
  const screen = state.run?.screen;
  return screen?.type === 'combat' ? screen.combat : null;
}

export function selectActions(state: GameStore): GameActions {
  return {
    newRun: state.newRun,
    abandonRun: state.abandonRun,
    enterNode: state.enterNode,
    playCard: state.playCard,
    endTurn: state.endTurn,
    resolveCombat: state.resolveCombat,
    chooseCardReward: state.chooseCardReward,
    chooseDig: state.chooseDig,
    chooseRest: state.chooseRest,
    startNextAct: state.startNextAct,
    finishRun: state.finishRun,
    updateSettings: state.updateSettings,
    resetProgress: state.resetProgress,
  };
}

const NO_NODES: MapNode[] = [];

/**
 * Nodes the player may enter right now (empty outside the map screen).
 * Returns a new array on the map: wrap in useShallow when used as a hook selector.
 */
export function selectAvailableNodes(state: GameStore): MapNode[] {
  if (!state.run) return NO_NODES;
  const nodes = availableNodes(state.run);
  return nodes.length === 0 ? NO_NODES : nodes;
}

export function selectCurrentNode(state: GameStore): MapNode | null {
  return state.run ? (currentNode(state.run) ?? null) : null;
}

export function selectFossilRecord(state: GameStore, fossilId: string): FossilRecord | null {
  return state.meta.fossils[fossilId] ?? null;
}

export function selectDiscoveredFossilCount(state: GameStore): number {
  return Object.keys(state.meta.fossils).length;
}

/** True when there is a run the player can continue (not yet finished). */
export function selectHasActiveRun(state: GameStore): boolean {
  const type = state.run?.screen.type;
  return type !== undefined && type !== 'victory' && type !== 'defeat';
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/** False until the saved game has been loaded; render a splash until then. */
export function useHydrated(): boolean {
  return useGameStore(selectHydrated);
}

export function useRun(): RunState | null {
  return useGameStore(selectRun);
}

export function useScreen(): RunScreen | null {
  return useGameStore(selectScreen);
}

/** Only the screen type: ideal for navigation decisions. */
export function useScreenType(): ScreenType | null {
  return useGameStore(selectScreenType);
}

/** The active combat, or null when the run is not in a combat screen. */
export function useCombat(): CombatState | null {
  return useGameStore(selectCombat);
}

export function useMeta(): MetaState {
  return useGameStore(selectMeta);
}

export function useSettings(): Settings {
  return useGameStore(selectSettings);
}

/** All store actions (stable functions; never causes a re-render). */
export function useGameActions(): GameActions {
  return useGameStore(useShallow(selectActions));
}

export function useAvailableNodes(): MapNode[] {
  return useGameStore(useShallow(selectAvailableNodes));
}

export function useCurrentNode(): MapNode | null {
  return useGameStore(selectCurrentNode);
}

export function useFossilRecord(fossilId: string): FossilRecord | null {
  return useGameStore((state) => selectFossilRecord(state, fossilId));
}

export function useDiscoveredFossilCount(): number {
  return useGameStore(selectDiscoveredFossilCount);
}

export function useHasActiveRun(): boolean {
  return useGameStore(selectHasActiveRun);
}
