import type { CardInstance, CombatState, ContentDB, IntentView, PlayCheck } from './types';

// CONTRACT STUB — implemented by the combat engine. Signatures are fixed.

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
  throw new Error('not implemented');
}

export function canPlay(db: ContentDB, state: CombatState, uid: string): PlayCheck {
  throw new Error('not implemented');
}

/** Returns the state unchanged (with empty events) when the card cannot be played. */
export function playCard(db: ContentDB, state: CombatState, uid: string): CombatState {
  throw new Error('not implemented');
}

/** Ends the player turn, resolves the enemy turn and starts the next player turn. */
export function endTurn(db: ContentDB, state: CombatState): CombatState {
  throw new Error('not implemented');
}

export function getIntent(db: ContentDB, state: CombatState): IntentView {
  throw new Error('not implemented');
}

/** Damage the card would deal to the enemy right now (per hit), for card previews. */
export function previewDamage(db: ContentDB, state: CombatState, uid: string): number | null {
  throw new Error('not implemented');
}
