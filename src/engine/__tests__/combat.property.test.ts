import { describe, expect, it } from '@jest/globals';
import { HAND_LIMIT, canPlay, endTurn, getIntent, playCard, previewDamage, startCombat } from '@/engine/combat';
import { allCards, CARD_IDS, deepFreeze, TEST_DB } from '@/engine/combat/__fixtures__/content';
import { nextFloat, nextInt, pick } from '@/engine/rng';
import type { CardInstance, CombatState } from '@/engine/types';

// Property-style checks: random legal play over many seeds must keep the
// combat invariants (no card lost or duplicated, bounds respected, purity).

const db = TEST_DB;
const ENEMY_IDS = Object.keys(db.enemies);

interface Run {
  deckUids: string[];
  final: CombatState;
  actions: number;
  /** How often each event type (bleed damage counted as 'bleed') occurred. */
  seen: Record<string, number>;
}

function randomDeck(seed: number): CardInstance[] {
  let rng = seed;
  const size = nextInt(rng, 6, 18);
  rng = size.state;
  const deck: CardInstance[] = [];
  for (let i = 0; i < size.value; i++) {
    const defId = pick(rng, CARD_IDS);
    rng = defId.state;
    const upgraded = nextFloat(rng);
    rng = upgraded.state;
    deck.push({ uid: `s${seed}-c${i}`, defId: defId.value, upgraded: upgraded.value < 0.3 });
  }
  return deck;
}

/** Returns the violated invariants (empty when the state is consistent). */
function violations(state: CombatState, deckUids: readonly string[]): string[] {
  const problems: string[] = [];
  const uids = allCards(state).map((c) => c.uid).sort();
  if (uids.join() !== deckUids.join()) problems.push(`cards: ${uids.join()} vs ${deckUids.join()}`);
  if (state.hand.length > HAND_LIMIT) problems.push(`hand size ${state.hand.length}`);
  if (state.energy < 0) problems.push(`energy ${state.energy}`);
  for (const [name, side] of [['player', state.player], ['enemy', state.enemy]] as const) {
    if (!Number.isInteger(side.hp) || side.hp < 0 || side.hp > side.maxHp) problems.push(`${name} hp ${side.hp}/${side.maxHp}`);
    if (!Number.isInteger(side.block) || side.block < 0) problems.push(`${name} block ${side.block}`);
    for (const [status, value] of Object.entries(side.statuses)) {
      if (!Number.isInteger(value) || value === 0) problems.push(`${name} ${status} ${value}`);
    }
  }
  if (!Number.isInteger(state.rngState) || state.rngState < 0 || state.rngState > 0xffffffff) {
    problems.push(`rngState ${state.rngState}`);
  }
  if (state.phase === 'won' && state.enemy.hp !== 0) problems.push('won but enemy alive');
  if (state.phase === 'lost' && state.player.hp !== 0) problems.push('lost but player alive');
  if (state.phase === 'player' && (state.enemy.hp <= 0 || state.player.hp <= 0)) problems.push('dead combatant in player phase');
  return problems;
}

function checkInvariants(state: CombatState, deckUids: readonly string[]): void {
  expect(violations(state, deckUids)).toEqual([]);
}

function simulate(seed: number): Run {
  const deck = randomDeck(seed);
  const deckUids = deck.map((c) => c.uid).sort();
  const enemyId = ENEMY_IDS[seed % ENEMY_IDS.length] ?? 'dummy';
  let state = startCombat(db, deepFreeze({ deck, playerHp: 60, playerMaxHp: 60, enemyId, seed }));
  checkInvariants(state, deckUids);

  let choiceRng = seed ^ 0x5bd1e995;
  let actions = 0;
  const seen: Record<string, number> = {};
  while (state.phase === 'player' && actions < 250) {
    actions += 1;
    const frozen = deepFreeze(state);
    const snapshot = JSON.stringify(frozen);
    const playable = frozen.hand.filter((c) => canPlay(db, frozen, c.uid).ok);
    for (const card of frozen.hand) previewDamage(db, frozen, card.uid);
    getIntent(db, frozen);

    const roll = nextFloat(choiceRng);
    choiceRng = roll.state;
    let next: CombatState;
    if (playable.length > 0 && roll.value < 0.8) {
      const choice = pick(choiceRng, playable);
      choiceRng = choice.state;
      next = playCard(db, frozen, choice.value.uid);
      expect(next.events[0]).toEqual({ type: 'cardPlayed', uid: choice.value.uid, defId: choice.value.defId });
      expect(next.turn).toBe(frozen.turn);
      expect(next.cardsPlayedThisTurn).toBe(frozen.cardsPlayedThisTurn + 1);
    } else {
      next = endTurn(db, frozen);
      expect(next.events.some((e) => e.type === 'cardPlayed')).toBe(false);
      if (next.phase === 'player') {
        expect(next.turn).toBe(frozen.turn + 1);
        expect(next.energy).toBe(next.maxEnergy);
        expect(next.cardsPlayedThisTurn).toBe(0);
        expect(next.events.filter((e) => e.type === 'turnStart')).toEqual([{ type: 'turnStart', turn: next.turn }]);
      }
    }

    expect(JSON.stringify(frozen)).toBe(snapshot);
    expect(next).not.toBe(frozen);
    checkInvariants(next, deckUids);
    for (const event of next.events) {
      const key = event.type === 'damage' && event.source === 'bleed' ? 'bleed' : event.type;
      seen[key] = (seen[key] ?? 0) + 1;
    }
    if (next.phase === 'won') expect(next.events[next.events.length - 1]).toEqual({ type: 'victory' });
    if (next.phase === 'lost') expect(next.events[next.events.length - 1]).toEqual({ type: 'defeat' });
    if (next.phase !== 'player') {
      expect(endTurn(db, next)).toEqual({ ...next, events: [] });
      const anyCard = next.hand[0];
      if (anyCard) expect(playCard(db, next, anyCard.uid)).toEqual({ ...next, events: [] });
    }
    state = next;
  }
  return { deckUids, final: state, actions, seen };
}

describe('combat invariants over many random games', () => {
  it('never loses or duplicates cards and respects all bounds', () => {
    let finished = 0;
    let totalActions = 0;
    const seen: Record<string, number> = {};
    for (let seed = 1; seed <= 300; seed++) {
      const run = simulate(seed);
      totalActions += run.actions;
      if (run.final.phase !== 'player') finished += 1;
      for (const [key, count] of Object.entries(run.seen)) seen[key] = (seen[key] ?? 0) + count;
    }
    expect(totalActions).toBeGreaterThan(3000);
    expect(finished).toBeGreaterThan(200);
    // The random games really exercise the interesting paths.
    for (const key of ['shuffle', 'victory', 'defeat', 'execute', 'confusedHit', 'bleed', 'heal', 'energy', 'status']) {
      expect([key, seen[key] ?? 0]).not.toEqual([key, 0]);
    }
  });

  it('is fully deterministic per seed', () => {
    for (const seed of [3, 17, 256]) {
      expect(simulate(seed).final).toEqual(simulate(seed).final);
    }
  });
});
