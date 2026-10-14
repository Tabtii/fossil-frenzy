import { chooseOpeningMove, findMove } from './combat/ai';
import { addStatus, computeHitDamage, decrementStatus, statusOf } from './combat/damage';
import {
  BASE_ENERGY,
  CARDS_PER_TURN,
  beginAction,
  checkCombatEnd,
  drawCards,
  getCardDef,
  getEnemyDef,
  rejectAction,
  tickBleed,
} from './combat/draft';
import { previewCardDamage, resolveCardEffects, type PlayContext } from './combat/effects';
import { isSelfHitMove, runEnemyTurn } from './combat/enemyTurn';
import { resolveCard } from './describe';
import { nextInt, shuffle, toUint32 } from './rng';
import type { CardInstance, CombatState, ContentDB, IntentKind, IntentView, PlayCheck } from './types';

// Pure combat engine. Every action returns a NEW state whose `events` hold
// only that action's events; the input state is never mutated. Once the phase
// is 'won' or 'lost' every action returns the state unchanged with no events.

export { BASE_ENERGY, CARDS_PER_TURN, HAND_LIMIT } from './combat/draft';
export { computeHitDamage } from './combat/damage';

export interface StartCombatInput {
  deck: CardInstance[];
  playerHp: number;
  playerMaxHp: number;
  enemyId: string;
  /** Seed for this combat's RNG (shuffles, enemy HP roll, AI, chance effects). */
  seed: number;
}

/** Shuffles the deck, rolls enemy HP, picks the first intent and draws the opening hand. */
export function startCombat(db: ContentDB, input: StartCombatInput): CombatState {
  const def = getEnemyDef(db, input.enemyId);
  let rng = toUint32(input.seed);

  const shuffled = shuffle(rng, input.deck);
  rng = shuffled.state;
  const hpRoll = nextInt(rng, def.hp[0], def.hp[1]);
  rng = hpRoll.state;
  const opening = chooseOpeningMove(def, rng);
  rng = opening.rngState;

  const enemyHp = Math.max(1, hpRoll.value);
  const state: CombatState = {
    player: {
      hp: Math.min(input.playerHp, input.playerMaxHp),
      maxHp: input.playerMaxHp,
      block: 0,
      statuses: {},
    },
    enemy: {
      hp: enemyHp,
      maxHp: enemyHp,
      block: 0,
      statuses: {},
      defId: def.id,
      nextMoveId: opening.moveId,
      history: [],
    },
    drawPile: shuffled.value,
    hand: [],
    discardPile: [],
    exhaustPile: [],
    energy: BASE_ENERGY,
    maxEnergy: BASE_ENERGY,
    turn: 1,
    cardsPlayedThisTurn: 0,
    attacksPlayedThisTurn: 0,
    phase: 'player',
    rngState: rng,
    events: [{ type: 'turnStart', turn: 1 }],
  };
  drawCards(state, CARDS_PER_TURN);
  return state;
}

export function canPlay(db: ContentDB, state: CombatState, uid: string): PlayCheck {
  if (state.phase !== 'player') return { ok: false, reason: 'combatOver' };
  const card = state.hand.find((c) => c.uid === uid);
  if (!card) return { ok: false, reason: 'notInHand' };
  const { cost } = resolveCard(getCardDef(db, card.defId), card.upgraded);
  if (cost > state.energy) return { ok: false, reason: 'notEnoughEnergy' };
  return { ok: true };
}

/** Energy cost of a card instance (upgrade applied). */
export function cardCost(db: ContentDB, card: CardInstance): number {
  return resolveCard(getCardDef(db, card.defId), card.upgraded).cost;
}

/** Returns the state unchanged (with empty events) when the card cannot be played. */
export function playCard(db: ContentDB, state: CombatState, uid: string): CombatState {
  if (!canPlay(db, state, uid).ok) return rejectAction(state);

  const d = beginAction(state);
  const index = d.hand.findIndex((c) => c.uid === uid);
  const card = d.hand[index];
  if (!card) return rejectAction(state);
  const def = getCardDef(db, card.defId);
  const resolved = resolveCard(def, card.upgraded);

  // The card leaves the hand first and stays "in play" (in no pile) while its
  // effects resolve: scaling never counts it and a reshuffle triggered by one
  // of its own draw effects cannot pick it up. It is put into the discard or
  // exhaust pile only after all effects resolved (also on victory, so the
  // total card count stays constant).
  d.hand.splice(index, 1);
  d.energy -= resolved.cost;
  const ctx: PlayContext = {
    db,
    firstAttack: d.attacksPlayedThisTurn === 0,
    cardsPlayedBefore: d.cardsPlayedThisTurn,
  };
  d.cardsPlayedThisTurn += 1;
  if (def.type === 'attack') d.attacksPlayedThisTurn += 1;
  d.events.push({ type: 'cardPlayed', uid: card.uid, defId: card.defId });

  resolveCardEffects(d, ctx, resolved.effects);

  if (resolved.exhaust) d.exhaustPile.push(card);
  else d.discardPile.push(card);
  checkCombatEnd(d);
  return d;
}

/** Ends the player turn, resolves the enemy turn and starts the next player turn. */
export function endTurn(db: ContentDB, state: CombatState): CombatState {
  if (state.phase !== 'player') return rejectAction(state);
  const d = beginAction(state);

  // 1. End of the player turn.
  d.discardPile.push(...d.hand);
  d.hand = [];
  decrementStatus(d.player.statuses, 'weak');
  decrementStatus(d.player.statuses, 'vulnerable');

  // 2. Enemy turn.
  runEnemyTurn(db, d);
  if (d.phase !== 'player') return d;

  // 3. Next player turn.
  d.player.block = 0;
  tickBleed(d, 'player');
  if (checkCombatEnd(d)) return d;
  d.turn += 1;
  d.events.push({ type: 'turnStart', turn: d.turn });
  d.energy = d.maxEnergy;
  drawCards(d, CARDS_PER_TURN);
  d.cardsPlayedThisTurn = 0;
  d.attacksPlayedThisTurn = 0;
  return d;
}

const INTENT_ORDER: readonly IntentKind[] = ['attack', 'defend', 'buff', 'debuff', 'heal'];

/**
 * What the enemy will do on its next turn. `damage` is the per-hit damage of
 * the move's first attack as it will actually resolve: enemy strength/weak,
 * status effects earlier in the same move, and the player's vulnerable as it
 * will be after the end-of-turn decrement. When confused, the attack targets
 * the enemy itself (`selfHit`) and uses the enemy's own vulnerable instead.
 * `hits` is that attack's hit count, `block` the total block of the move.
 */
export function getIntent(db: ContentDB, state: CombatState): IntentView {
  const def = db.enemies[state.enemy.defId];
  const move = def ? findMove(def, state.enemy.nextMoveId) : undefined;
  if (!move) return { kinds: ['unknown'], moveName: '?' };

  const selfHit = isSelfHitMove(statusOf(state.enemy.statuses, 'confused'), move.effects);
  const enemyStatuses = { ...state.enemy.statuses };
  const playerStatuses = { ...state.player.statuses };
  // The player's weak/vulnerable tick down before the enemy acts.
  decrementStatus(playerStatuses, 'weak');
  decrementStatus(playerStatuses, 'vulnerable');

  const kinds = new Set<IntentKind>();
  let damage: number | undefined;
  let hits: number | undefined;
  let block = 0;
  for (const effect of move.effects) {
    switch (effect.type) {
      case 'attack':
        kinds.add('attack');
        if (damage === undefined) {
          damage = computeHitDamage(effect.amount, enemyStatuses, selfHit ? enemyStatuses : playerStatuses);
          hits = effect.hits ?? 1;
        }
        break;
      case 'block':
        kinds.add('defend');
        block += effect.amount;
        break;
      case 'heal':
        kinds.add('heal');
        break;
      case 'status':
        if (effect.target === 'self') {
          kinds.add('buff');
          addStatus(enemyStatuses, effect.status, effect.amount);
        } else {
          kinds.add('debuff');
          addStatus(playerStatuses, effect.status, effect.amount);
        }
        break;
    }
  }

  const intent: IntentView = {
    kinds: kinds.size > 0 ? INTENT_ORDER.filter((kind) => kinds.has(kind)) : ['unknown'],
    moveName: move.name,
  };
  if (damage !== undefined) intent.damage = damage;
  if (hits !== undefined) intent.hits = hits;
  if (kinds.has('defend')) intent.block = block;
  if (selfHit) intent.selfHit = true;
  return intent;
}

/** Damage the card would deal to the enemy right now (per hit), for card previews. */
export function previewDamage(db: ContentDB, state: CombatState, uid: string): number | null {
  const card = state.hand.find((c) => c.uid === uid);
  if (!card) return null;
  const { effects } = resolveCard(getCardDef(db, card.defId), card.upgraded);
  return previewCardDamage(db, state, card, effects);
}
