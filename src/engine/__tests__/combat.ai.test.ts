import { describe, expect, it } from '@jest/globals';
import { endTurn, startCombat } from '@/engine/combat';
import { HISTORY_LIMIT, chooseNextMove, chooseOpeningMove, pushHistory } from '@/engine/combat/ai';
import { inst, TEST_DB } from '@/engine/combat/__fixtures__/content';
import type { CombatState, EnemyDef } from '@/engine/types';

const db = TEST_DB;

function enemyDef(id: string): EnemyDef {
  const def = db.enemies[id];
  if (!def) throw new Error(id);
  return def;
}

/** Runs the move chooser like the engine does and returns the executed sequence. */
function simulateMoves(def: EnemyDef, seed: number, steps: number): string[] {
  const opening = chooseOpeningMove(def, seed);
  let rng = opening.rngState;
  let next = opening.moveId;
  let history: string[] = [];
  const sequence: string[] = [];
  for (let i = 0; i < steps; i++) {
    sequence.push(next);
    history = pushHistory(history, next);
    const choice = chooseNextMove(def, history, rng);
    next = choice.moveId;
    rng = choice.rngState;
  }
  return sequence;
}

function longestRun(sequence: readonly string[]): number {
  let longest = 0;
  let current = 0;
  sequence.forEach((id, i) => {
    current = i > 0 && sequence[i - 1] === id ? current + 1 : 1;
    longest = Math.max(longest, current);
  });
  return longest;
}

describe('cycle pattern', () => {
  it('loops through the moves in order', () => {
    expect(simulateMoves(enemyDef('dummy'), 1, 7)).toEqual(['bite', 'guard', 'roar', 'bite', 'guard', 'roar', 'bite']);
  });

  it('continues after the opening move', () => {
    expect(simulateMoves(enemyDef('opener'), 1, 4)).toEqual(['big', 'small', 'big', 'small']);
  });

  it('does not consume randomness', () => {
    expect(chooseNextMove(enemyDef('dummy'), ['bite'], 42)).toEqual({ moveId: 'guard', rngState: 42 });
  });
});

describe('weighted pattern', () => {
  it('never uses the same move more than twice in a row', () => {
    const rex = enemyDef('rex');
    for (let seed = 0; seed < 50; seed++) {
      const sequence = simulateMoves(rex, seed * 977, 200);
      expect(longestRun(sequence)).toBeLessThanOrEqual(2);
    }
  });

  it('still follows the weights and allows two in a row', () => {
    const sequence = simulateMoves(enemyDef('rex'), 5, 5000);
    const chomps = sequence.filter((id) => id === 'chomp').length;
    const stomps = sequence.length - chomps;
    // 3:1 weights with the max-two-in-a-row rule give a stationary ratio of 1.4 : 1.
    expect(chomps).toBeGreaterThan(stomps * 1.25);
    expect(chomps).toBeLessThan(stomps * 1.6);
    expect(stomps).toBeGreaterThan(500);
    expect(longestRun(sequence)).toBe(2);
  });

  it('falls back to zero-weight moves instead of a third repeat', () => {
    const sequence = simulateMoves(enemyDef('lopsided'), 3, 30);
    expect(sequence.join('')).toBe('aab'.repeat(10));
  });

  it('repeats when an enemy has a single move', () => {
    expect(simulateMoves(enemyDef('loner'), 3, 5)).toEqual(['only', 'only', 'only', 'only', 'only']);
  });

  it('is deterministic per rng state', () => {
    const rex = enemyDef('rex');
    expect(simulateMoves(rex, 11, 50)).toEqual(simulateMoves(rex, 11, 50));
    expect(chooseNextMove(rex, ['chomp', 'chomp'], 9)).toEqual(chooseNextMove(rex, ['chomp', 'chomp'], 9));
    expect(chooseNextMove(rex, ['chomp', 'chomp'], 9).moveId).toBe('stomp');
  });

  it('keeps the history bounded', () => {
    let history: string[] = [];
    for (let i = 0; i < 50; i++) history = pushHistory(history, `m${i}`);
    expect(history).toHaveLength(HISTORY_LIMIT);
    expect(history[history.length - 1]).toBe('m49');
  });

  it('holds during real combats (enemyMove events)', () => {
    for (let seed = 0; seed < 20; seed++) {
      let state: CombatState = startCombat(db, {
        deck: Array.from({ length: 10 }, () => inst('defend')),
        playerHp: 9999,
        playerMaxHp: 9999,
        enemyId: 'rex',
        seed,
      });
      const moves: string[] = [];
      for (let turn = 0; turn < 40; turn++) {
        state = endTurn(db, state);
        for (const event of state.events) if (event.type === 'enemyMove') moves.push(event.moveId);
      }
      expect(moves).toHaveLength(40);
      expect(longestRun(moves)).toBeLessThanOrEqual(2);
      expect(state.enemy.history).toEqual(moves.slice(-HISTORY_LIMIT));
    }
  });
});
