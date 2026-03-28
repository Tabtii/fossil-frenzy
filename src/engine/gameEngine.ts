import { Card, GameState, Enemy } from '../types';
import { starterDeck } from '../data/cards';

export function createInitialState(): GameState {
  const deck = shuffleArray([...starterDeck]);
  return {
    playerHP: 50,
    playerMaxHP: 50,
    playerBlock: 0,
    enemyHP: 30,
    enemyMaxHP: 30,
    deck,
    hand: [],
    discardPile: [],
    energy: 3,
    maxEnergy: 3,
    turn: 1,
  };
}

export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function drawCards(state: GameState, count: number): GameState {
  let newDeck = [...state.deck];
  let newHand = [...state.hand];
  let newDiscard = [...state.discardPile];

  for (let i = 0; i < count; i++) {
    if (newDeck.length === 0) {
      // Shuffle discard back into deck
      newDeck = shuffleArray([...newDiscard]);
      newDiscard = [];
    }
    if (newDeck.length > 0) {
      newHand.push(newDeck.pop()!);
    }
  }

  return { ...state, deck: newDeck, hand: newHand, discardPile: newDiscard };
}

export function playCard(state: GameState, cardId: string): GameState {
  const cardIndex = state.hand.findIndex(c => c.id === cardId);
  if (cardIndex === -1) return state;

  const card = state.hand[cardIndex];
  if (state.energy < card.energyCost) return state;

  // Remove card from hand
  const newHand = state.hand.filter((_, i) => i !== cardIndex);

  // Apply card effects
  let newState = { ...state, hand: newHand, energy: state.energy - card.energyCost };

  if (card.damage) {
    newState.enemyHP = Math.max(0, state.enemyHP - card.damage);
  }

  if (card.block) {
    newState.playerBlock += card.block;
  }

  if (card.heal) {
    newState.playerHP = Math.min(state.playerMaxHP, state.playerHP + card.heal);
  }

  // Add to discard
  newState.discardPile = [...state.discardPile, card];

  return newState;
}

export function endTurn(state: GameState): GameState {
  const enemyDamage = Math.max(0, 5 - state.playerBlock); // Simple enemy attack
  const newDiscard = [...state.discardPile, ...state.hand];
  
  return {
    ...state,
    playerBlock: 0,
    enemyHP: state.enemyHP - 1, // Environmental damage
    playerHP: Math.max(0, state.playerHP - enemyDamage),
    hand: [],
    discardPile: newDiscard,
    energy: state.maxEnergy,
    turn: state.turn + 1,
  };
}

export function startBattle(state: GameState): GameState {
  return drawCards(state, 5);
}

export function isGameOver(state: GameState): 'player' | 'enemy' | null {
  if (state.playerHP <= 0) return 'player';
  if (state.enemyHP <= 0) return 'enemy';
  return null;
}

export const sampleEnemy: Enemy = {
  name: 'Raptor-Schwarm',
  hp: 30,
  maxHP: 30,
  emoji: '🦕',
  attack: 5,
};
