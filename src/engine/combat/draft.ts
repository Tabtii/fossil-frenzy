import { shuffle } from '../rng';
import type { CardDef, Combatant, CombatState, ContentDB, EnemyDef, Side } from '../types';
import { decrementStatus, statusOf } from './damage';

// Every public combat action works on a "draft": a copy of the input state
// whose nested objects/arrays are fresh, so helpers may mutate it freely while
// the caller's state stays untouched. Card instances are shared (never mutated).

export const BASE_ENERGY = 3;
export const CARDS_PER_TURN = 5;
export const HAND_LIMIT = 10;

export type Draft = CombatState;

export function beginAction(state: CombatState): Draft {
  return {
    ...state,
    player: { ...state.player, statuses: { ...state.player.statuses } },
    enemy: { ...state.enemy, statuses: { ...state.enemy.statuses }, history: [...state.enemy.history] },
    drawPile: [...state.drawPile],
    hand: [...state.hand],
    discardPile: [...state.discardPile],
    exhaustPile: [...state.exhaustPile],
    events: [],
  };
}

/** Same state, no events: the result of an action that was not allowed. */
export function rejectAction(state: CombatState): CombatState {
  return { ...state, events: [] };
}

export function getCardDef(db: ContentDB, defId: string): CardDef {
  const def = db.cards[defId];
  if (!def) throw new Error(`Unknown card "${defId}"`);
  return def;
}

export function getEnemyDef(db: ContentDB, defId: string): EnemyDef {
  const def = db.enemies[defId];
  if (!def) throw new Error(`Unknown enemy "${defId}"`);
  return def;
}

export function combatant(d: Draft, side: Side): Combatant {
  return side === 'player' ? d.player : d.enemy;
}

/**
 * Applies already-modified damage to one side. Block absorbs first unless
 * `pierce`. HP is clamped at 0. The event's `amount` is the damage that got
 * through block (it may exceed the remaining HP), `blocked` what block absorbed.
 */
export function dealDamage(d: Draft, target: Side, amount: number, source: Side | 'bleed', pierce: boolean): void {
  const c = combatant(d, target);
  const damage = Math.max(0, amount);
  const blocked = pierce ? 0 : Math.min(c.block, damage);
  const through = damage - blocked;
  c.block -= blocked;
  c.hp = Math.max(0, c.hp - through);
  d.events.push({ type: 'damage', target, amount: through, blocked, source });
}

/** Start-of-turn bleed: loses N HP ignoring block and modifiers, then N − 1. */
export function tickBleed(d: Draft, side: Side): void {
  const c = combatant(d, side);
  const bleed = statusOf(c.statuses, 'bleed');
  if (bleed <= 0) return;
  dealDamage(d, side, bleed, 'bleed', true);
  decrementStatus(c.statuses, 'bleed');
}

/**
 * Ends the combat as soon as one side is at 0 HP (victory takes precedence).
 * Returns true when the combat is over, so callers can stop resolving.
 */
export function checkCombatEnd(d: Draft): boolean {
  if (d.phase !== 'player') return true;
  if (d.enemy.hp <= 0) {
    d.phase = 'won';
    d.events.push({ type: 'victory' });
    return true;
  }
  if (d.player.hp <= 0) {
    d.phase = 'lost';
    d.events.push({ type: 'defeat' });
    return true;
  }
  return false;
}

/**
 * Draws `count` cards from the top (index 0) of the draw pile. An empty draw
 * pile is refilled by shuffling the discard pile ('shuffle' event). Cards
 * drawn while the hand holds HAND_LIMIT cards go straight to the discard pile.
 * Emits one 'draw' event with the number of cards that reached the hand.
 */
export function drawCards(d: Draft, count: number): void {
  let drawn = 0;
  for (let i = 0; i < count; i++) {
    if (d.drawPile.length === 0) {
      if (d.discardPile.length === 0) break;
      const shuffled = shuffle(d.rngState, d.discardPile);
      d.rngState = shuffled.state;
      d.drawPile = shuffled.value;
      d.discardPile = [];
      d.events.push({ type: 'shuffle' });
    }
    const card = d.drawPile.shift();
    if (!card) break;
    if (d.hand.length >= HAND_LIMIT) {
      d.discardPile.push(card);
    } else {
      d.hand.push(card);
      drawn += 1;
    }
  }
  if (drawn > 0) d.events.push({ type: 'draw', count: drawn });
}
