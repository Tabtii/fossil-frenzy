import type { ContentDB, MapNode, RestChoice, RunState } from './types';

// CONTRACT STUB — run/map progression. Signatures are fixed.

export const ACT_COUNT = 4;
export const STARTING_HP = 60;

export function createRun(db: ContentDB, seed: number): RunState {
  throw new Error('not implemented');
}

/** Nodes the player may enter from the current position. */
export function availableNodes(run: RunState): MapNode[] {
  throw new Error('not implemented');
}

/** Moves onto a node and opens its screen (combat, rest, dig). */
export function enterNode(db: ContentDB, run: RunState, nodeId: string): RunState {
  throw new Error('not implemented');
}

/** Play a card in the active combat (no-op outside combat). */
export function runPlayCard(db: ContentDB, run: RunState, uid: string): RunState {
  throw new Error('not implemented');
}

/** End the turn in the active combat (no-op outside combat). */
export function runEndTurn(db: ContentDB, run: RunState): RunState {
  throw new Error('not implemented');
}

/**
 * Called once the combat phase is 'won' or 'lost': syncs HP and stats and
 * moves to the reward / defeat / victory screen.
 */
export function resolveCombat(db: ContentDB, run: RunState): RunState {
  throw new Error('not implemented');
}

/** Pick a reward card (or null to skip) and return to the map / act end. */
export function chooseCardReward(db: ContentDB, run: RunState, defId: string | null): RunState {
  throw new Error('not implemented');
}

export function chooseDig(db: ContentDB, run: RunState, defId: string | null): RunState {
  throw new Error('not implemented');
}

export function chooseRest(db: ContentDB, run: RunState, choice: RestChoice): RunState {
  throw new Error('not implemented');
}

/** From 'actComplete': generate the next act's map. */
export function startNextAct(db: ContentDB, run: RunState): RunState {
  throw new Error('not implemented');
}

/** Fossil ids discovered by everything currently in the deck (for meta sync). */
export function deckFossils(db: ContentDB, run: RunState): string[] {
  throw new Error('not implemented');
}
