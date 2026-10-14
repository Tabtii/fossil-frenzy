import { describe, expect, it } from '@jest/globals';
import {
  BASE_ENERGY,
  CARDS_PER_TURN,
  HAND_LIMIT,
  canPlay,
  cardCost,
  endTurn,
  getIntent,
  playCard,
  previewDamage,
  startCombat,
} from '@/engine/combat';
import { allCards, deepFreeze, inst, makeState, TEST_DB, type StateOverrides } from '@/engine/combat/__fixtures__/content';
import { computeHitDamage } from '@/engine/combat/damage';
import { chance, nextFloat } from '@/engine/rng';
import type { CardInstance, CombatEvent, CombatState } from '@/engine/types';

const db = TEST_DB;

/** Plays a card on a deep-frozen state: any mutation of the input throws. */
function play(state: CombatState, uid: string): CombatState {
  const snapshot = JSON.stringify(state);
  const next = playCard(db, deepFreeze(state), uid);
  expect(JSON.stringify(state)).toBe(snapshot);
  expect(next).not.toBe(state);
  return next;
}

function end(state: CombatState): CombatState {
  const snapshot = JSON.stringify(state);
  const next = endTurn(db, deepFreeze(state));
  expect(JSON.stringify(state)).toBe(snapshot);
  expect(next).not.toBe(state);
  return next;
}

/** A state whose hand holds the given cards; returns the state and the instances. */
function withHand(defIds: string[], overrides: StateOverrides = {}): { state: CombatState; cards: CardInstance[] } {
  const cards = defIds.map((id) => inst(id));
  return { state: makeState({ hand: cards, ...overrides }), cards };
}

function first(cards: CardInstance[]): CardInstance {
  const card = cards[0];
  if (!card) throw new Error('no card');
  return card;
}

function at(cards: CardInstance[], index: number): CardInstance {
  const card = cards[index];
  if (!card) throw new Error(`no card at ${index}`);
  return card;
}

function ofType<T extends CombatEvent['type']>(state: CombatState, type: T): Extract<CombatEvent, { type: T }>[] {
  return state.events.filter((e): e is Extract<CombatEvent, { type: T }> => e.type === type);
}

function types(state: CombatState): string[] {
  return state.events.map((e) => e.type);
}

/** Finds an rng state for which a `percent` chance roll comes out as `wanted`. */
function rngStateWhere(percent: number, wanted: boolean): number {
  for (let s = 1; s < 10000; s++) if (chance(s, percent).value === wanted) return s;
  throw new Error('no state found');
}

// ---------------------------------------------------------------------------

describe('startCombat', () => {
  const deck = db.starterDeck.map((id) => inst(id));

  it('shuffles, rolls enemy HP, picks an intent and draws the opening hand', () => {
    const input = deepFreeze({ deck, playerHp: 55, playerMaxHp: 60, enemyId: 'rex', seed: 99 });
    const state = startCombat(db, input);
    expect(state.hand).toHaveLength(CARDS_PER_TURN);
    expect(state.drawPile).toHaveLength(deck.length - CARDS_PER_TURN);
    expect(state.discardPile).toEqual([]);
    expect(state.exhaustPile).toEqual([]);
    expect(allCards(state).map((c) => c.uid).sort()).toEqual(deck.map((c) => c.uid).sort());
    expect(state.player).toEqual({ hp: 55, maxHp: 60, block: 0, statuses: {} });
    expect(state.enemy.hp).toBeGreaterThanOrEqual(30);
    expect(state.enemy.hp).toBeLessThanOrEqual(40);
    expect(state.enemy.maxHp).toBe(state.enemy.hp);
    expect(['chomp', 'stomp']).toContain(state.enemy.nextMoveId);
    expect(state.enemy.history).toEqual([]);
    expect(state.energy).toBe(BASE_ENERGY);
    expect(state.maxEnergy).toBe(3);
    expect(state.turn).toBe(1);
    expect(state.phase).toBe('player');
    expect(state.cardsPlayedThisTurn).toBe(0);
    expect(state.attacksPlayedThisTurn).toBe(0);
    expect(state.events).toEqual([
      { type: 'turnStart', turn: 1 },
      { type: 'draw', count: 5 },
    ]);
  });

  it('is deterministic per seed and does not touch the input deck', () => {
    const input = { deck, playerHp: 60, playerMaxHp: 60, enemyId: 'rex', seed: 7 };
    const snapshot = JSON.stringify(input);
    expect(startCombat(db, input)).toEqual(startCombat(db, input));
    expect(JSON.stringify(input)).toBe(snapshot);
    const orders = new Set<string>();
    for (let seed = 0; seed < 30; seed++) {
      orders.add(startCombat(db, { ...input, seed }).hand.map((c) => c.uid).join());
    }
    expect(orders.size).toBeGreaterThan(10);
  });

  it('rolls enemy HP across the whole inclusive range', () => {
    const seen = new Set<number>();
    for (let seed = 0; seed < 400; seed++) {
      seen.add(startCombat(db, { deck, playerHp: 60, playerMaxHp: 60, enemyId: 'rex', seed }).enemy.hp);
    }
    expect(Math.min(...seen)).toBe(30);
    expect(Math.max(...seen)).toBe(40);
  });

  it('uses openingMoveId, otherwise the pattern', () => {
    const base = { deck, playerHp: 60, playerMaxHp: 60, seed: 1 };
    expect(startCombat(db, { ...base, enemyId: 'opener' }).enemy.nextMoveId).toBe('big');
    expect(startCombat(db, { ...base, enemyId: 'dummy' }).enemy.nextMoveId).toBe('bite');
  });

  it('draws what is there when the deck is small and clamps HP to max', () => {
    const state = startCombat(db, { deck: [inst('strike'), inst('defend')], playerHp: 80, playerMaxHp: 60, enemyId: 'dummy', seed: 3 });
    expect(state.hand).toHaveLength(2);
    expect(state.drawPile).toHaveLength(0);
    expect(state.player.hp).toBe(60);
    expect(ofType(state, 'shuffle')).toHaveLength(0);
  });

  it('throws for unknown enemies', () => {
    expect(() => startCombat(db, { deck, playerHp: 60, playerMaxHp: 60, enemyId: 'nope', seed: 1 })).toThrow('nope');
  });
});

describe('canPlay', () => {
  it('reports the reason a card cannot be played', () => {
    const { state, cards } = withHand(['strike', 'boulder'], { energy: 2 });
    expect(canPlay(db, state, first(cards).uid)).toEqual({ ok: true });
    expect(canPlay(db, state, at(cards, 1).uid)).toEqual({ ok: false, reason: 'notEnoughEnergy' });
    expect(canPlay(db, state, 'missing')).toEqual({ ok: false, reason: 'notInHand' });
    expect(canPlay(db, { ...state, phase: 'won' }, first(cards).uid)).toEqual({ ok: false, reason: 'combatOver' });
    expect(canPlay(db, { ...state, phase: 'lost' }, first(cards).uid)).toEqual({ ok: false, reason: 'combatOver' });
  });

  it('uses the upgraded cost', () => {
    const mend = inst('mend');
    const mendPlus = inst('mend', true);
    const state = makeState({ hand: [mend, mendPlus], energy: 0 });
    expect(cardCost(db, mend)).toBe(1);
    expect(cardCost(db, mendPlus)).toBe(0);
    expect(canPlay(db, state, mend.uid)).toEqual({ ok: false, reason: 'notEnoughEnergy' });
    expect(canPlay(db, state, mendPlus.uid)).toEqual({ ok: true });
  });
});

describe('playCard basics', () => {
  it('pays energy, resolves damage and discards the card', () => {
    const { state, cards } = withHand(['strike', 'defend']);
    const strike = first(cards);
    const next = play(state, strike.uid);
    expect(next.enemy.hp).toBe(14);
    expect(next.energy).toBe(2);
    expect(next.hand.map((c) => c.uid)).toEqual([at(cards, 1).uid]);
    expect(next.discardPile).toEqual([strike]);
    expect(next.cardsPlayedThisTurn).toBe(1);
    expect(next.attacksPlayedThisTurn).toBe(1);
    expect(next.events).toEqual([
      { type: 'cardPlayed', uid: strike.uid, defId: 'strike' },
      { type: 'damage', target: 'enemy', amount: 6, blocked: 0, source: 'player' },
    ]);
  });

  it('only attack cards count as attacks', () => {
    const { state, cards } = withHand(['defend']);
    const next = play(state, first(cards).uid);
    expect(next.player.block).toBe(5);
    expect(next.cardsPlayedThisTurn).toBe(1);
    expect(next.attacksPlayedThisTurn).toBe(0);
    expect(next.events).toEqual([
      { type: 'cardPlayed', uid: first(cards).uid, defId: 'defend' },
      { type: 'block', target: 'player', amount: 5 },
    ]);
  });

  it('events only contain the events of the current action', () => {
    const { state, cards } = withHand(['strike', 'strike']);
    const once = play({ ...state, events: [{ type: 'turnStart', turn: 1 }] }, first(cards).uid);
    expect(once.events[0]).toEqual({ type: 'cardPlayed', uid: first(cards).uid, defId: 'strike' });
    const twice = play(once, at(cards, 1).uid);
    expect(ofType(twice, 'cardPlayed')).toHaveLength(1);
  });

  it('returns the state unchanged with empty events when not playable', () => {
    const { state, cards } = withHand(['boulder'], { energy: 1, events: [{ type: 'shuffle' }] });
    const next = play(state, first(cards).uid);
    expect(next).toEqual({ ...state, events: [] });
    expect(play(state, 'unknown')).toEqual({ ...state, events: [] });
  });
});

describe('damage formula', () => {
  it('adds strength, then weak (floor), then vulnerable (floor)', () => {
    expect(computeHitDamage(6, {}, {})).toBe(6);
    expect(computeHitDamage(6, { strength: 2 }, {})).toBe(8);
    expect(computeHitDamage(6, { weak: 1 }, {})).toBe(4); // 4.5 → 4
    expect(computeHitDamage(6, {}, { vulnerable: 1 })).toBe(9);
    expect(computeHitDamage(7, {}, { vulnerable: 3 })).toBe(10); // 10.5 → 10
    expect(computeHitDamage(5, { weak: 1 }, { vulnerable: 1 })).toBe(4); // 3.75 → 3, × 1.5 = 4.5 → 4
    expect(computeHitDamage(6, { strength: 2, weak: 1 }, { vulnerable: 1 })).toBe(9); // 8 → 6 → 9
    expect(computeHitDamage(3, { strength: -10 }, { vulnerable: 1 })).toBe(0);
  });

  it('applies weak/vulnerable when playing cards', () => {
    const { state, cards } = withHand(['strike', 'strike'], { player: { statuses: { weak: 1 } }, enemy: { statuses: { vulnerable: 2 } } });
    const next = play(state, first(cards).uid);
    expect(next.enemy.hp).toBe(20 - 6); // floor(6 × 0.75) = 4, floor(4 × 1.5) = 6
  });
});

describe('block, pierce, multi-hit and strength', () => {
  it('block absorbs first', () => {
    const { state, cards } = withHand(['strike'], { enemy: { block: 4 } });
    const next = play(state, first(cards).uid);
    expect(next.enemy.block).toBe(0);
    expect(next.enemy.hp).toBe(18);
    expect(ofType(next, 'damage')).toEqual([{ type: 'damage', target: 'enemy', amount: 2, blocked: 4, source: 'player' }]);
  });

  it('a fully blocked hit deals no damage', () => {
    const { state, cards } = withHand(['strike'], { enemy: { block: 10 } });
    const next = play(state, first(cards).uid);
    expect(next.enemy).toMatchObject({ hp: 20, block: 4 });
    expect(ofType(next, 'damage')).toEqual([{ type: 'damage', target: 'enemy', amount: 0, blocked: 6, source: 'player' }]);
  });

  it('pierce ignores and keeps block', () => {
    const { state, cards } = withHand(['spear'], { enemy: { block: 10 } });
    const next = play(state, first(cards).uid);
    expect(next.enemy).toMatchObject({ hp: 15, block: 10 });
    expect(ofType(next, 'damage')).toEqual([{ type: 'damage', target: 'enemy', amount: 5, blocked: 0, source: 'player' }]);
  });

  it('multi-hit resolves each hit against remaining block', () => {
    const { state, cards } = withHand(['twin'], { enemy: { block: 4 } });
    const next = play(state, first(cards).uid);
    expect(next.enemy).toMatchObject({ hp: 18, block: 0 });
    expect(ofType(next, 'damage').map((e) => [e.amount, e.blocked])).toEqual([
      [0, 3],
      [2, 1],
    ]);
  });

  it('strength adds to every hit and lasts the whole combat', () => {
    const { state, cards } = withHand(['flex', 'twin'], { drawPile: [inst('defend')] });
    const flexed = play(state, first(cards).uid);
    expect(flexed.player.statuses).toEqual({ strength: 2 });
    expect(flexed.energy).toBe(3);
    expect(ofType(flexed, 'status')).toEqual([{ type: 'status', target: 'player', status: 'strength', amount: 2 }]);
    const hit = play(flexed, at(cards, 1).uid);
    expect(hit.enemy.hp).toBe(20 - 5 - 5);
    const later = end(end(hit));
    expect(later.player.statuses.strength).toBe(2);
  });

  it('status stacks add up', () => {
    const { state, cards } = withHand(['bash', 'weaken', 'weaken'], { energy: 5, enemy: { hp: 40, maxHp: 40 } });
    let next = play(state, first(cards).uid);
    expect(next.enemy.statuses).toEqual({ vulnerable: 2 });
    next = play(next, at(cards, 1).uid);
    next = play(next, at(cards, 2).uid);
    expect(next.enemy.statuses).toEqual({ vulnerable: 2, weak: 4 });
  });
});

describe('enemy turn', () => {
  it('discards the hand, attacks, picks the next move and starts the next turn', () => {
    const hand = [inst('strike'), inst('defend')];
    const drawPile = ['strike', 'strike', 'strike', 'defend', 'defend', 'jab'].map((id) => inst(id));
    const state = makeState({ hand, drawPile, energy: 1, cardsPlayedThisTurn: 2, attacksPlayedThisTurn: 1 });
    const next = end(state);
    expect(next.player.hp).toBe(44);
    expect(next.enemy.history).toEqual(['bite']);
    expect(next.enemy.nextMoveId).toBe('guard');
    expect(next.turn).toBe(2);
    expect(next.energy).toBe(3);
    expect(next.hand).toEqual(drawPile.slice(0, 5));
    expect(next.drawPile).toEqual(drawPile.slice(5));
    expect(next.discardPile).toEqual(hand);
    expect(next.cardsPlayedThisTurn).toBe(0);
    expect(next.attacksPlayedThisTurn).toBe(0);
    expect(next.events).toEqual([
      { type: 'enemyMove', moveId: 'bite' },
      { type: 'damage', target: 'player', amount: 6, blocked: 0, source: 'enemy' },
      { type: 'turnStart', turn: 2 },
      { type: 'draw', count: 5 },
    ]);
  });

  it('player block absorbs the attack and resets at the start of the next turn', () => {
    const next = end(makeState({ player: { block: 10 } }));
    expect(next.player.hp).toBe(50);
    expect(next.player.block).toBe(0);
    expect(ofType(next, 'damage')).toEqual([{ type: 'damage', target: 'player', amount: 0, blocked: 6, source: 'enemy' }]);
  });

  it('enemy block resets at the start of its turn; new block lasts through the player turn', () => {
    const next = end(makeState({ enemy: { nextMoveId: 'guard', block: 3 } }));
    expect(next.enemy.block).toBe(5);
    expect(ofType(next, 'block')).toEqual([{ type: 'block', target: 'enemy', amount: 5 }]);
    expect(next.enemy.nextMoveId).toBe('roar');
  });

  it('enemy buffs apply to later attacks; cycle loops', () => {
    let state = makeState({ enemy: { nextMoveId: 'roar' } });
    state = end(state);
    expect(state.enemy.statuses).toEqual({ strength: 2 });
    expect(state.enemy.nextMoveId).toBe('bite');
    state = end(state);
    expect(state.player.hp).toBe(50 - 8);
    expect(state.enemy.nextMoveId).toBe('guard');
  });

  it('applies debuffs, self-buff before attack, heals and block+attack', () => {
    let state = makeState({ enemy: { defId: 'hexer', nextMoveId: 'curse', hp: 25, maxHp: 25 } });
    state = end(state);
    expect(state.player.statuses).toEqual({ weak: 2, vulnerable: 2 });
    expect(ofType(state, 'status')).toEqual([
      { type: 'status', target: 'player', status: 'weak', amount: 2 },
      { type: 'status', target: 'player', status: 'vulnerable', amount: 2 },
    ]);
    // pummel: +1 strength, then 2 × (4 + 1) × 1.5 (player still vulnerable 1)
    state = end(state);
    expect(state.player.statuses).toEqual({ weak: 1, vulnerable: 1 });
    expect(state.enemy.statuses).toEqual({ strength: 1 });
    expect(ofType(state, 'damage').map((e) => e.amount)).toEqual([7, 7]);
    expect(state.player.hp).toBe(50 - 14);
    // regrow: heal capped at max HP
    state = end({ ...state, enemy: { ...state.enemy, hp: 22 } });
    expect(state.enemy.hp).toBe(25);
    expect(ofType(state, 'heal')).toEqual([{ type: 'heal', target: 'enemy', amount: 3 }]);
    // shellBash: block 6, attack 5 + 1
    state = end(state);
    expect(state.enemy.block).toBe(6);
    expect(ofType(state, 'damage').map((e) => e.amount)).toEqual([6]);
  });

  it('multi-hit enemy attacks stop when the player dies', () => {
    const state = makeState({ player: { hp: 3 }, enemy: { defId: 'rex', nextMoveId: 'stomp', hp: 30, maxHp: 30 } });
    const next = end(state);
    expect(next.phase).toBe('lost');
    expect(next.player.hp).toBe(0);
    expect(ofType(next, 'damage')).toHaveLength(1);
    expect(next.events[next.events.length - 1]).toEqual({ type: 'defeat' });
    expect(ofType(next, 'turnStart')).toHaveLength(0);
    expect(next.turn).toBe(1);
  });
});

describe('status decrement timing', () => {
  it('player weak lasts for the player turn and ticks down at its end', () => {
    const { state, cards } = withHand(['strike'], { player: { statuses: { weak: 1 } } });
    const played = play(state, first(cards).uid);
    expect(played.enemy.hp).toBe(16);
    expect(end(played).player.statuses).toEqual({});
  });

  it('player vulnerable ticks down before the enemy attacks', () => {
    expect(end(makeState({ player: { statuses: { vulnerable: 1 } } })).player.hp).toBe(44);
    const twice = end(makeState({ player: { statuses: { vulnerable: 2 } } }));
    expect(twice.player.hp).toBe(41);
    expect(twice.player.statuses).toEqual({ vulnerable: 1 });
  });

  it('enemy vulnerable lasts for the rest of the player turn and ticks after its move', () => {
    const { state, cards } = withHand(['strike'], { enemy: { statuses: { vulnerable: 1 } } });
    const played = play(state, first(cards).uid);
    expect(played.enemy.hp).toBe(11);
    expect(end(played).enemy.statuses).toEqual({});
  });

  it('enemy weak applies to its move and ticks after it', () => {
    const next = end(makeState({ enemy: { statuses: { weak: 2 } } }));
    expect(next.player.hp).toBe(46);
    expect(next.enemy.statuses).toEqual({ weak: 1 });
  });
});

describe('bleed', () => {
  it('ticks at the start of the enemy turn, ignores block, then decreases', () => {
    const { state, cards } = withHand(['cut'], { enemy: { block: 2 } });
    const cut = play(state, first(cards).uid);
    expect(cut.enemy.statuses).toEqual({ bleed: 3 });
    expect(cut.enemy.hp).toBe(18);
    const next = end(cut);
    expect(next.enemy.hp).toBe(15);
    expect(next.enemy.statuses).toEqual({ bleed: 2 });
    expect(next.events.slice(0, 2)).toEqual([
      { type: 'damage', target: 'enemy', amount: 3, blocked: 0, source: 'bleed' },
      { type: 'enemyMove', moveId: 'bite' },
    ]);
    const after = end(end(next));
    expect(after.enemy.hp).toBe(15 - 2 - 1);
    expect(after.enemy.statuses).toEqual({ strength: 2 }); // bleed gone; the third move was "roar"
  });

  it('bleed killing the enemy during its turn wins before it acts', () => {
    const next = end(makeState({ enemy: { hp: 3, statuses: { bleed: 3 } } }));
    expect(next.phase).toBe('won');
    expect(next.enemy.hp).toBe(0);
    expect(next.player.hp).toBe(50);
    expect(next.events).toEqual([
      { type: 'damage', target: 'enemy', amount: 3, blocked: 0, source: 'bleed' },
      { type: 'victory' },
    ]);
  });

  it('player bleed ticks at the start of the player turn and can kill', () => {
    const hurt = end(makeState({ player: { hp: 20, statuses: { bleed: 2 } }, enemy: { nextMoveId: 'guard' } }));
    expect(hurt.player.hp).toBe(18);
    expect(hurt.player.statuses).toEqual({ bleed: 1 });
    const dead = end(makeState({ player: { hp: 2, statuses: { bleed: 2 } }, enemy: { nextMoveId: 'guard' } }));
    expect(dead.phase).toBe('lost');
    expect(dead.events.slice(-2)).toEqual([
      { type: 'damage', target: 'player', amount: 2, blocked: 0, source: 'bleed' },
      { type: 'defeat' },
    ]);
    expect(ofType(dead, 'turnStart')).toHaveLength(0);
  });
});

describe('confused', () => {
  it('turns the enemy attack against itself, then ticks down', () => {
    const { state, cards } = withHand(['daze'], { player: { statuses: { vulnerable: 3 } } });
    const dazed = play(state, first(cards).uid);
    expect(dazed.enemy.statuses).toEqual({ confused: 1 });
    const next = end(dazed);
    expect(next.player.hp).toBe(50);
    expect(next.enemy.hp).toBe(14); // player's vulnerable is ignored
    expect(next.enemy.statuses).toEqual({});
    expect(next.events.slice(0, 3)).toEqual([
      { type: 'enemyMove', moveId: 'bite' },
      { type: 'confusedHit' },
      { type: 'damage', target: 'enemy', amount: 6, blocked: 0, source: 'enemy' },
    ]);
  });

  it('uses enemy strength and hits its own block from the same move', () => {
    expect(end(makeState({ enemy: { statuses: { confused: 1, strength: 2 } } })).enemy.hp).toBe(12);
    const shell = end(makeState({ enemy: { defId: 'hexer', nextMoveId: 'shellBash', hp: 25, maxHp: 25, statuses: { confused: 1 } } }));
    expect(shell.enemy).toMatchObject({ hp: 25, block: 1 });
    expect(ofType(shell, 'damage')).toEqual([{ type: 'damage', target: 'enemy', amount: 0, blocked: 5, source: 'enemy' }]);
    expect(shell.player.hp).toBe(50);
  });

  it('all hits of the move hit the enemy; only one stack is used', () => {
    const next = end(makeState({ enemy: { defId: 'rex', nextMoveId: 'stomp', hp: 30, maxHp: 30, statuses: { confused: 2 } } }));
    expect(next.enemy.hp).toBe(24);
    expect(next.enemy.statuses).toEqual({ confused: 1 });
    expect(ofType(next, 'confusedHit')).toHaveLength(1);
  });

  it('non-attack moves keep the confusion', () => {
    const next = end(makeState({ enemy: { nextMoveId: 'guard', statuses: { confused: 1 } } }));
    expect(next.enemy.statuses).toEqual({ confused: 1 });
    expect(ofType(next, 'confusedHit')).toHaveLength(0);
  });

  it('a lethal self-hit wins the combat', () => {
    const next = end(makeState({ enemy: { hp: 5, statuses: { confused: 1 } } }));
    expect(next.phase).toBe('won');
    expect(next.events[next.events.length - 1]).toEqual({ type: 'victory' });
    expect(next.player.hp).toBe(50);
  });
});

describe('energy', () => {
  it('energy effects add energy; the turn start refills to max', () => {
    const { state, cards } = withHand(['surge', 'strike']);
    const surged = play(state, first(cards).uid);
    expect(surged.energy).toBe(5);
    expect(ofType(surged, 'energy')).toEqual([{ type: 'energy', amount: 2 }]);
    expect(end(surged).energy).toBe(3);
    expect(end(makeState({ energy: 0 })).energy).toBe(3);
  });

  it('cannot spend more energy than available', () => {
    const { state, cards } = withHand(['bash', 'bash']);
    const once = play(state, first(cards).uid);
    expect(once.energy).toBe(1);
    expect(canPlay(db, once, at(cards, 1).uid)).toEqual({ ok: false, reason: 'notEnoughEnergy' });
  });
});

describe('draw, reshuffle and hand limit', () => {
  it('reshuffles the discard pile without the card being played', () => {
    const [study, a, b, c] = [inst('study'), inst('strike'), inst('defend'), inst('jab')] as const;
    const state = makeState({ hand: [study], drawPile: [a], discardPile: [b, c] });
    const next = play(state, study.uid);
    expect(next.hand[0]).toBe(a);
    expect(next.hand).toHaveLength(2);
    expect([b.uid, c.uid]).toContain(next.hand[1]?.uid);
    expect(next.hand.map((x) => x.uid)).not.toContain(study.uid);
    expect(next.discardPile).toEqual([study]);
    expect(next.drawPile).toHaveLength(1);
    expect(types(next)).toEqual(['cardPlayed', 'shuffle', 'draw']);
    expect(ofType(next, 'draw')).toEqual([{ type: 'draw', count: 2 }]);
    expect(next.rngState).not.toBe(state.rngState);
  });

  it('drawing from empty piles does nothing', () => {
    const { state, cards } = withHand(['study']);
    const next = play(state, first(cards).uid);
    expect(next.hand).toEqual([]);
    expect(types(next)).toEqual(['cardPlayed']);
  });

  it('reshuffles at the turn start, including the discarded hand', () => {
    const hand = ['strike', 'strike', 'strike'].map((id) => inst(id));
    const drawPile = [inst('defend'), inst('defend')];
    const next = end(makeState({ hand, drawPile }));
    expect(next.hand).toHaveLength(5);
    expect(next.hand.slice(0, 2)).toEqual(drawPile);
    expect(next.drawPile).toEqual([]);
    expect(next.discardPile).toEqual([]);
    expect(types(next)).toEqual(['enemyMove', 'damage', 'turnStart', 'shuffle', 'draw']);
  });

  it('cards drawn into a full hand are discarded', () => {
    const study = inst('study');
    const others = Array.from({ length: 9 }, () => inst('jab'));
    const [x, y, z] = [inst('strike'), inst('defend'), inst('twin')] as const;
    const state = makeState({ hand: [study, ...others], drawPile: [x, y, z] });
    const next = play(state, study.uid);
    expect(HAND_LIMIT).toBe(10);
    expect(next.hand).toHaveLength(10);
    expect(next.hand[9]).toBe(x);
    expect(next.discardPile).toEqual([y, study]);
    expect(next.drawPile).toEqual([z]);
    expect(ofType(next, 'draw')).toEqual([{ type: 'draw', count: 1 }]);
  });
});

describe('exhaust and heal', () => {
  it('exhausted cards leave the combat and never come back', () => {
    const surge = inst('surge');
    const filler = ['strike', 'defend', 'jab', 'strike', 'defend', 'jab'].map((id) => inst(id));
    let state = play(makeState({ hand: [surge, ...filler.slice(0, 4)], drawPile: filler.slice(4), enemy: { hp: 999, maxHp: 999 } }), surge.uid);
    expect(state.exhaustPile).toEqual([surge]);
    expect(state.discardPile).toEqual([]);
    for (let i = 0; i < 6; i++) {
      state = end({ ...state, player: { ...state.player, hp: 50 } });
      expect(allCards(state).filter((c) => c.uid === surge.uid)).toHaveLength(1);
      expect(state.exhaustPile).toEqual([surge]);
    }
  });

  it('heals up to max HP; the upgrade can remove exhaust and lower the cost', () => {
    const mend = inst('mend');
    const healed = play(makeState({ hand: [mend], player: { hp: 58 } }), mend.uid);
    expect(healed.player.hp).toBe(60);
    expect(ofType(healed, 'heal')).toEqual([{ type: 'heal', target: 'player', amount: 2 }]);
    expect(healed.exhaustPile).toEqual([mend]);

    const mendPlus = inst('mend', true);
    const upgraded = play(makeState({ hand: [mendPlus], player: { hp: 40 } }), mendPlus.uid);
    expect(upgraded.player.hp).toBe(44);
    expect(upgraded.energy).toBe(3);
    expect(upgraded.discardPile).toEqual([mendPlus]);
    expect(upgraded.exhaustPile).toEqual([]);

    const full = play(makeState({ hand: [mend], player: { hp: 60 } }), mend.uid);
    expect(ofType(full, 'heal')).toEqual([]);
  });
});

describe('upgraded cards', () => {
  it('use the upgrade effects', () => {
    const strike = inst('strike', true);
    const defend = inst('defend', true);
    const state = makeState({ hand: [strike, defend] });
    expect(play(state, strike.uid).enemy.hp).toBe(11);
    expect(play(state, defend.uid).player.block).toBe(8);
  });
});

describe('conditionals', () => {
  it('execute kills the enemy at or below the threshold, ignoring block', () => {
    const { state, cards } = withHand(['finisher', 'strike'], { enemy: { hp: 15, block: 50 } });
    const next = play(state, first(cards).uid);
    expect(next.enemy.hp).toBe(0);
    expect(next.phase).toBe('won');
    expect(types(next)).toEqual(['cardPlayed', 'execute', 'victory']);
    expect(next.discardPile).toEqual([first(cards)]);
    expect(play(next, at(cards, 1).uid).events).toEqual([]);
  });

  it('uses the else branch above the threshold', () => {
    const { state, cards } = withHand(['finisher'], { enemy: { hp: 16 } });
    const next = play(state, first(cards).uid);
    expect(next.enemy.hp).toBe(11);
    expect(next.phase).toBe('player');
  });

  it('enemyHasStatus and playerBlockAtLeast', () => {
    const vuln = withHand(['mark'], { enemy: { statuses: { vulnerable: 1 } } });
    expect(play(vuln.state, first(vuln.cards).uid).enemy.hp).toBe(11);
    const plain = withHand(['mark']);
    expect(play(plain.state, first(plain.cards).uid).enemy.hp).toBe(17);

    const low = withHand(['fortify']);
    expect(play(low.state, first(low.cards).uid).player.block).toBe(3);
    const high = withHand(['fortify'], { player: { block: 2 } });
    const next = play(high.state, first(high.cards).uid);
    expect(next.player.block).toBe(8);
    expect(ofType(next, 'block').map((e) => e.amount)).toEqual([3, 3]);
  });

  it('chance consumes one roll and follows it', () => {
    const lucky = rngStateWhere(50, true);
    const unlucky = rngStateWhere(50, false);
    const make = (rngState: number) => withHand(['gamble'], { rngState, drawPile: [inst('strike')] });

    const win = make(lucky);
    const won = play(win.state, first(win.cards).uid);
    expect(won.hand).toHaveLength(1);
    expect(won.rngState).toBe(nextFloat(lucky).state);

    const lose = make(unlucky);
    const lost = play(lose.state, first(lose.cards).uid);
    expect(lost.hand).toHaveLength(0);
    expect(lost.rngState).toBe(nextFloat(unlucky).state);
  });

  it('firstAttackThisTurn is true until an attack card was played this turn', () => {
    const { state, cards } = withHand(['ambush', 'strike', 'ambush', 'flex', 'ambush'], { energy: 10, enemy: { hp: 99, maxHp: 99 } });
    expect(play(state, first(cards).uid).enemy.hp).toBe(89);

    const afterStrike = play(state, at(cards, 1).uid);
    expect(play(afterStrike, at(cards, 2).uid).enemy.hp).toBe(93 - 4);

    const afterFlex = play(state, at(cards, 3).uid);
    expect(afterFlex.attacksPlayedThisTurn).toBe(0);
    expect(play(afterFlex, at(cards, 4).uid).enemy.hp).toBe(99 - 12);

    const ambushOne = play(state, first(cards).uid);
    expect(play(ambushOne, at(cards, 2).uid).enemy.hp).toBe(89 - 4);

    const nextTurn = end({ ...afterStrike, hand: [at(cards, 2)], drawPile: [] });
    expect(nextTurn.attacksPlayedThisTurn).toBe(0);
    const ambush = nextTurn.hand.find((c) => c.uid === at(cards, 2).uid);
    expect(ambush).toBeDefined();
    expect(play(nextTurn, at(cards, 2).uid).enemy.hp).toBe(nextTurn.enemy.hp - 10);
  });
});

describe('scaling', () => {
  it('tagInZone counts tagged cards in the zone, capped at max', () => {
    const some = withHand(['stampede'], { discardPile: [inst('leaf'), inst('leaf'), inst('strike')] });
    expect(play(some.state, first(some.cards).uid).enemy.hp).toBe(20 - 8);
    const many = withHand(['stampede'], { discardPile: Array.from({ length: 5 }, () => inst('leaf')), enemy: { hp: 30 } });
    expect(play(many.state, first(many.cards).uid).enemy.hp).toBe(30 - 10);
  });

  it('does not count the played card itself', () => {
    const { state, cards } = withHand(['stampede', 'stampede']);
    const once = play(state, first(cards).uid);
    expect(once.enemy.hp).toBe(16);
    expect(play(once, at(cards, 1).uid).enemy.hp).toBe(16 - 6);

    const herd = withHand(['herd', 'herd', 'leaf', 'strike']);
    expect(play(herd.state, first(herd.cards).uid).enemy.hp).toBe(20 - 3);
  });

  it('cardsPlayedThisTurn counts earlier cards only', () => {
    const { state, cards } = withHand(['frenzy', 'jab', 'jab', 'frenzy']);
    expect(play(state, first(cards).uid).enemy.hp).toBe(18);
    const twoJabs = play(play(state, at(cards, 1).uid), at(cards, 2).uid);
    expect(play(twoJabs, at(cards, 3).uid).enemy.hp).toBe(18 - 6);
  });

  it('playerBlock adds the current block', () => {
    const { state, cards } = withHand(['shieldBash'], { player: { block: 7 } });
    const next = play(state, first(cards).uid);
    expect(next.enemy.hp).toBe(13);
    expect(next.player.block).toBe(7);
  });
});

describe('victory and defeat', () => {
  it('victory in the middle of a multi-hit stops all further hits and effects', () => {
    const flurry = inst('flurry');
    const other = inst('strike');
    const draw = inst('defend');
    const state = makeState({ hand: [flurry, other], drawPile: [draw], enemy: { hp: 5 } });
    const next = play(state, flurry.uid);
    expect(next.phase).toBe('won');
    expect(next.enemy.hp).toBe(0);
    expect(ofType(next, 'damage')).toHaveLength(3);
    expect(ofType(next, 'draw')).toHaveLength(0);
    expect(next.events[next.events.length - 1]).toEqual({ type: 'victory' });
    expect(next.hand).toEqual([other]);
    expect(next.drawPile).toEqual([draw]);
    expect(next.discardPile).toEqual([flurry]);
  });

  it('victory stops the remaining effects of the card', () => {
    const { state, cards } = withHand(['bash'], { enemy: { hp: 8 } });
    const next = play(state, first(cards).uid);
    expect(next.phase).toBe('won');
    expect(next.enemy.statuses).toEqual({});
    expect(ofType(next, 'status')).toEqual([]);
  });

  it('overkill clamps HP at 0 and reports the damage dealt', () => {
    const { state, cards } = withHand(['strike'], { enemy: { hp: 2 } });
    const next = play(state, first(cards).uid);
    expect(next.enemy.hp).toBe(0);
    expect(ofType(next, 'damage')[0]?.amount).toBe(6);
  });

  it('defeat ends the combat; no actions afterwards', () => {
    const { state, cards } = withHand(['strike'], { player: { hp: 5 } });
    const lost = end(state);
    expect(lost.phase).toBe('lost');
    expect(lost.player.hp).toBe(0);
    expect(lost.events.slice(-1)).toEqual([{ type: 'defeat' }]);
    expect(end(lost)).toEqual({ ...lost, events: [] });
    expect(play(lost, first(cards).uid)).toEqual({ ...lost, events: [] });
    expect(canPlay(db, lost, first(cards).uid)).toEqual({ ok: false, reason: 'combatOver' });
  });

  it('nothing happens after victory', () => {
    const won = makeState({ phase: 'won', hand: [inst('strike')], events: [{ type: 'victory' }] });
    expect(end(won)).toEqual({ ...won, events: [] });
  });
});

describe('getIntent', () => {
  it('shows modified attack damage', () => {
    expect(getIntent(db, makeState())).toEqual({ kinds: ['attack'], moveName: 'Biss', damage: 6, hits: 1 });
    expect(getIntent(db, makeState({ enemy: { statuses: { strength: 2 } } })).damage).toBe(8);
    expect(getIntent(db, makeState({ enemy: { statuses: { strength: 2, weak: 1 } } })).damage).toBe(6);
    expect(getIntent(db, makeState({ player: { statuses: { vulnerable: 2 } } })).damage).toBe(9);
  });

  it('ignores player vulnerable that expires before the enemy acts', () => {
    expect(getIntent(db, makeState({ player: { statuses: { vulnerable: 1 } } })).damage).toBe(6);
  });

  it('derives kinds from the move effects', () => {
    const intent = (defId: string, nextMoveId: string) => getIntent(db, makeState({ enemy: { defId, nextMoveId } }));
    expect(intent('dummy', 'guard')).toEqual({ kinds: ['defend'], moveName: 'Panzer', block: 5 });
    expect(intent('dummy', 'roar')).toEqual({ kinds: ['buff'], moveName: 'Brüllen' });
    expect(intent('hexer', 'curse')).toEqual({ kinds: ['debuff'], moveName: 'Fluch' });
    expect(intent('hexer', 'pummel')).toEqual({ kinds: ['attack', 'buff'], moveName: 'Prügeln', damage: 5, hits: 2 });
    expect(intent('hexer', 'regrow')).toEqual({ kinds: ['heal'], moveName: 'Nachwachsen' });
    expect(intent('hexer', 'shellBash')).toEqual({ kinds: ['attack', 'defend'], moveName: 'Panzerstoß', damage: 5, hits: 1, block: 6 });
    expect(intent('rex', 'stomp')).toEqual({ kinds: ['attack'], moveName: 'Stampfen', damage: 3, hits: 2 });
    expect(intent('dummy', 'missing')).toEqual({ kinds: ['unknown'], moveName: '?' });
  });

  it('marks self-hits when confused and uses the enemy as target', () => {
    const state = makeState({ player: { statuses: { vulnerable: 3 } }, enemy: { statuses: { confused: 1, vulnerable: 1 } } });
    expect(getIntent(db, state)).toEqual({ kinds: ['attack'], moveName: 'Biss', damage: 9, hits: 1, selfHit: true });
    expect(end(state).enemy.hp).toBe(20 - 9);
    expect(getIntent(db, makeState({ enemy: { nextMoveId: 'guard', statuses: { confused: 1 } } })).selfHit).toBeUndefined();
  });

  it('matches the damage the enemy actually deals', () => {
    const variants: StateOverrides[] = [
      {},
      { player: { statuses: { vulnerable: 2 } } },
      { player: { statuses: { vulnerable: 1, weak: 3 } } },
      { enemy: { statuses: { weak: 1, strength: 3 } } },
      { enemy: { defId: 'hexer', nextMoveId: 'pummel', statuses: { strength: 1 } }, player: { statuses: { vulnerable: 2 } } },
      { enemy: { defId: 'rex', nextMoveId: 'stomp', statuses: { weak: 2 } } },
    ];
    for (const overrides of variants) {
      const state = makeState({ ...overrides, player: { hp: 99, maxHp: 99, ...overrides.player } });
      const intent = getIntent(db, state);
      const hits = ofType(end(state), 'damage').filter((e) => e.target === 'player');
      expect(hits).toHaveLength(intent.hits ?? 0);
      for (const hit of hits) expect(hit.amount + hit.blocked).toBe(intent.damage);
    }
  });
});

describe('previewDamage', () => {
  it('returns modified per-hit damage of the first damage effect', () => {
    const cards = ['strike', 'twin', 'defend', 'powerUp', 'spear'].map((id) => inst(id));
    const [strike, twin, defend, powerUp, spear] = cards as [CardInstance, CardInstance, CardInstance, CardInstance, CardInstance];
    const state = makeState({ hand: cards });
    expect(previewDamage(db, state, strike.uid)).toBe(6);
    expect(previewDamage(db, state, twin.uid)).toBe(3);
    expect(previewDamage(db, state, defend.uid)).toBeNull();
    expect(previewDamage(db, state, powerUp.uid)).toBe(6);
    expect(previewDamage(db, state, spear.uid)).toBe(5);
    expect(previewDamage(db, state, 'missing')).toBeNull();

    const modded = makeState({ hand: cards, player: { statuses: { strength: 2, weak: 1 } }, enemy: { statuses: { vulnerable: 1 } } });
    expect(previewDamage(db, modded, strike.uid)).toBe(9);
    expect(previewDamage(db, modded, twin.uid)).toBe(4); // (3 + 2) × 0.75 = 3, × 1.5 = 4
  });

  it('includes upgrades, scaling (without the card) and conditions', () => {
    const strikePlus = inst('strike', true);
    const stampede = inst('stampede');
    const herd = inst('herd');
    const ambush = inst('ambush');
    const finisher = inst('finisher');
    const shieldBash = inst('shieldBash');
    const hand = [strikePlus, stampede, herd, ambush, finisher, shieldBash, inst('leaf')];
    const state = makeState({ hand, discardPile: [inst('leaf')], player: { block: 4 } });
    expect(previewDamage(db, state, strikePlus.uid)).toBe(9);
    expect(previewDamage(db, state, stampede.uid)).toBe(6);
    expect(previewDamage(db, state, herd.uid)).toBe(1 + 2); // stampede + leaf in hand, not itself
    expect(previewDamage(db, state, ambush.uid)).toBe(10);
    expect(previewDamage(db, { ...state, attacksPlayedThisTurn: 1 }, ambush.uid)).toBe(4);
    expect(previewDamage(db, state, finisher.uid)).toBe(5);
    expect(previewDamage(db, { ...state, enemy: { ...state.enemy, hp: 10 } }, finisher.uid)).toBeNull();
    expect(previewDamage(db, state, shieldBash.uid)).toBe(4);
  });

  it('agrees with the damage actually dealt', () => {
    const hand = ['strike', 'twin', 'stampede', 'herd', 'frenzy', 'mark', 'powerUp', 'ambush', 'shieldBash'].map((id) => inst(id));
    const state = makeState({
      hand,
      energy: 9,
      cardsPlayedThisTurn: 2,
      discardPile: [inst('leaf'), inst('herd')],
      player: { block: 3, statuses: { strength: 1 } },
      enemy: { hp: 999, maxHp: 999, statuses: { vulnerable: 2 } },
    });
    for (const card of hand) {
      const preview = previewDamage(db, state, card.uid);
      const firstHit = ofType(play(state, card.uid), 'damage')[0];
      expect(firstHit).toBeDefined();
      expect(preview).toBe((firstHit?.amount ?? 0) + (firstHit?.blocked ?? 0));
    }
  });
});
