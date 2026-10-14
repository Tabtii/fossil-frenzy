import { nextFloat } from '../rng';
import type { EnemyDef, EnemyMove } from '../types';

// Enemy move selection. Pure: (def, history, rngState) → { moveId, rngState }.

/** How many executed move ids are kept in `EnemyState.history`. */
export const HISTORY_LIMIT = 8;

/** A weighted enemy never uses the same move more than this many times in a row. */
export const MAX_SAME_MOVE_IN_A_ROW = 2;

export interface MoveChoice {
  moveId: string;
  rngState: number;
}

export function findMove(def: EnemyDef, moveId: string): EnemyMove | undefined {
  return def.moves.find((move) => move.id === moveId);
}

/** The move id that would be used a third time in a row, if any. */
function blockedMoveId(history: readonly string[]): string | undefined {
  if (history.length < MAX_SAME_MOVE_IN_A_ROW) return undefined;
  const recent = history.slice(-MAX_SAME_MOVE_IN_A_ROW);
  const first = recent[0];
  return recent.every((id) => id === first) ? first : undefined;
}

function firstMove(def: EnemyDef): EnemyMove {
  const move = def.moves[0];
  if (!move) throw new Error(`Enemy "${def.id}" has no moves`);
  return move;
}

/**
 * Chooses the move after `history` (executed move ids, newest last).
 * - cycle: the move after the last executed one, looping.
 * - weighted: weighted random over moves with weight > 0; a move that was
 *   used in the last two turns is excluded. Falls back to equal weights over
 *   the remaining moves when no weighted move is left, and only repeats a
 *   third time when the enemy has a single move.
 */
export function chooseNextMove(def: EnemyDef, history: readonly string[], rngState: number): MoveChoice {
  const fallback = firstMove(def);
  const pattern = def.pattern;

  if (pattern.type === 'cycle') {
    const last = history[history.length - 1];
    const index = last === undefined ? -1 : def.moves.findIndex((move) => move.id === last);
    const next = def.moves[(index + 1) % def.moves.length] ?? fallback;
    return { moveId: next.id, rngState };
  }

  const blocked = blockedMoveId(history);
  const weightOf = (move: EnemyMove): number => {
    const weight = pattern.weights[move.id] ?? 0;
    return Number.isFinite(weight) && weight > 0 ? weight : 0;
  };

  let pool = def.moves
    .filter((move) => move.id !== blocked)
    .map((move) => ({ id: move.id, weight: weightOf(move) }))
    .filter((entry) => entry.weight > 0);
  if (pool.length === 0) {
    pool = def.moves.filter((move) => move.id !== blocked).map((move) => ({ id: move.id, weight: 1 }));
  }
  if (pool.length === 0) {
    pool = def.moves.map((move) => ({ id: move.id, weight: 1 }));
  }

  const total = pool.reduce((sum, entry) => sum + entry.weight, 0);
  const roll = nextFloat(rngState);
  let remaining = roll.value * total;
  for (const entry of pool) {
    remaining -= entry.weight;
    if (remaining < 0) return { moveId: entry.id, rngState: roll.state };
  }
  const last = pool[pool.length - 1];
  return { moveId: last ? last.id : fallback.id, rngState: roll.state };
}

/** Opening intent: `openingMoveId` when valid, otherwise chosen by the pattern. */
export function chooseOpeningMove(def: EnemyDef, rngState: number): MoveChoice {
  if (def.openingMoveId !== undefined && findMove(def, def.openingMoveId)) {
    return { moveId: def.openingMoveId, rngState };
  }
  return chooseNextMove(def, [], rngState);
}

/** Appends an executed move to the bounded history. */
export function pushHistory(history: readonly string[], moveId: string): string[] {
  return [...history, moveId].slice(-HISTORY_LIMIT);
}
