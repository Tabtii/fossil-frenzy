import { Card, GameState, Enemy } from '../types';
import { allCards } from '../data/cards';

// Extended deck with duplicates for better variety
function createDeck(): Card[] {
  const deck: Card[] = [];
  
  // 2x of each common card
  const commonCards = ['archaeopteryx', 'uranfarn', 'trilobit'];
  commonCards.forEach(id => {
    const card = allCards.find(c => c.id === id);
    if (card) {
      deck.push({ ...card });
      deck.push({ ...card, id: `${card.id}_2` });
    }
  });
  
  // 1x of each unique card
  const uniqueCards = ['trex', 'triceratops', 'stegosaurus', 'velociraptor', 'mammut', 'pteranodon', 'brachiosaurus', 'sabelzahntiger'];
  uniqueCards.forEach(id => {
    const card = allCards.find(c => c.id === id);
    if (card) deck.push(card);
  });
  
  return shuffleArray(deck);
}

export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export interface ExtendedGameState extends GameState {
  playerConfused: boolean;
  playerVulnerable: number; // Turns of vulnerability
  enemyConfused: number; // Turns enemy is confused
  enemyAttackedTwice: boolean; // Track if enemy already attacked this turn
}

export function createInitialState(): ExtendedGameState {
  return {
    playerHP: 50,
    playerMaxHP: 50,
    playerBlock: 0,
    enemyHP: 30,
    enemyMaxHP: 30,
    deck: createDeck(),
    hand: [],
    discardPile: [],
    energy: 3,
    maxEnergy: 3,
    turn: 1,
    playerConfused: false,
    playerVulnerable: 0,
    enemyConfused: 0,
    enemyAttackedTwice: false,
  };
}

export function drawCards(state: ExtendedGameState, count: number): ExtendedGameState {
  let newDeck = [...state.deck];
  let newHand = [...state.hand];
  let newDiscard = [...state.discardPile];

  for (let i = 0; i < count; i++) {
    if (newDeck.length === 0) {
      newDeck = shuffleArray([...newDiscard]);
      newDiscard = [];
    }
    if (newDeck.length > 0) {
      newHand.push(newDeck.pop()!);
    }
  }

  return { ...state, deck: newDeck, hand: newHand, discardPile: newDiscard };
}

function countAttackersInHand(state: ExtendedGameState): number {
  return state.hand.filter(c => c.type === 'attacker' || c.type === 'hybrid').length;
}

function isConfused(state: ExtendedGameState): boolean {
  return state.playerConfused;
}

export function playCard(state: ExtendedGameState, cardId: string): ExtendedGameState {
  const cardIndex = state.hand.findIndex(c => c.id === cardId);
  if (cardIndex === -1) return state;

  const card = state.hand[cardIndex];
  if (state.energy < card.energyCost) return state;

  const newHand = state.hand.filter((_, i) => i !== cardIndex);
  let newState: ExtendedGameState = {
    ...state,
    hand: newHand,
    energy: state.energy - card.energyCost,
    enemyConfused: state.enemyConfused,
  };

  // Calculate damage with card effects
  let finalDamage = card.damage || 0;
  let finalBlock = card.block || 0;
  
  // Velociraptor: 2x damage if it's the only attacker in hand (checked BEFORE playing)
  // We need to check if THIS is the only attacker being played
  const attackersInHand = countAttackersInHand(newState);
  if (card.id === 'velociraptor' && attackersInHand === 0) {
    finalDamage *= 2;
  }
  
  // Sabelzahnkatze: 40% critical hit chance for 2x damage
  if (card.id === 'sabelzahntiger') {
    if (Math.random() < 0.4) {
      finalDamage *= 2;
    }
  }
  
  // Pteranodon: unblockable - but we don't have block mechanics yet, so just note it
  // (Block will be bypassed if we add block-ignoring attacks)

  // Apply damage
  if (finalDamage > 0) {
    let actualDamage = finalDamage;
    
    // If confused, damage applies to self!
    if (isConfused(newState)) {
      newState.playerHP = Math.max(0, newState.playerHP - actualDamage);
    } else {
      newState.enemyHP = Math.max(0, newState.enemyHP - actualDamage);
    }
  }

  // Apply block
  if (finalBlock > 0) {
    newState.playerBlock += finalBlock;
  }

  // Apply heal
  if (card.heal) {
    newState.playerHP = Math.min(state.playerMaxHP, newState.playerHP + card.heal);
  }

  // Card-specific effects
  // Archaeopteryx: Confuse enemy for 1 turn
  if (card.id === 'archaeopteryx') {
    newState.enemyConfused = 1;
  }
  
  // Triceratops: +2 block for each plant card in deck (simplified: just +2)
  if (card.id === 'triceratops') {
    newState.playerBlock += 2;
  }
  
  // Stegosaurus: Gets stronger with plant eaters - simplified bonus
  if (card.id === 'stegosaurus') {
    const plantCards = newState.discardPile.filter(c => c.type === 'support' || c.id === 'uranfarn').length;
    newState.playerBlock += Math.min(plantCards * 2, 6);
  }
  
  // Mammut: heals when block is high
  if (card.id === 'mammut' && state.playerBlock >= 5) {
    newState.playerHP = Math.min(state.playerMaxHP, newState.playerHP + 3);
  }
  
  // Pteranodon: piercing damage (ignores 50% of block)
  if (card.id === 'pteranodon') {
    const piercingDamage = Math.floor(finalDamage * 0.5);
    newState.enemyHP = Math.max(0, newState.enemyHP - piercingDamage);
  }
  
  // Trilobit: draw a card
  if (card.id === 'trilobit') {
    const drawn = drawCardsInternal(newState, 1);
    newState = { ...newState, hand: drawn.hand, deck: drawn.deck };
  }

  // Add to discard
  newState.discardPile = [...state.discardPile, card];

  return newState;
}

// Internal draw without extending state
function drawCardsInternal(state: ExtendedGameState, count: number): ExtendedGameState {
  let newDeck = [...state.deck];
  let newHand = [...state.hand];

  for (let i = 0; i < count; i++) {
    if (newDeck.length === 0) {
      newDeck = shuffleArray([...state.discardPile]);
    }
    if (newDeck.length > 0) {
      newHand.push(newDeck.pop()!);
    }
  }

  return { ...state, deck: newDeck, hand: newHand };
}

export function endTurn(state: ExtendedGameState): ExtendedGameState {
  let enemyDamage = 5;
  
  // Apply vulnerability
  if (state.playerVulnerable > 0) {
    enemyDamage += 3;
  }
  
  // Block reduces damage
  const actualDamage = Math.max(0, enemyDamage - state.playerBlock);
  
  // Confused enemy deals damage to itself
  let newEnemyHP = state.enemyHP;
  let newPlayerHP = state.playerHP;
  
  if (state.enemyConfused > 0) {
    newEnemyHP = Math.max(0, newEnemyHP - 3);
  } else {
    newPlayerHP = Math.max(0, newPlayerHP - actualDamage);
  }
  
  // Environmental damage to enemy (every 3rd turn)
  const envDamage = state.turn % 3 === 0 ? 1 : 0;
  
  const newDiscard = [...state.discardPile, ...state.hand];
  
  return {
    ...state,
    playerBlock: 0,
    playerConfused: false,
    playerVulnerable: Math.max(0, state.playerVulnerable - 1),
    enemyConfused: Math.max(0, state.enemyConfused - 1),
    enemyAttackedTwice: false,
    enemyHP: Math.max(0, newEnemyHP - envDamage),
    playerHP: newPlayerHP,
    hand: [],
    discardPile: newDiscard,
    energy: state.maxEnergy,
    turn: state.turn + 1,
  };
}

export function startBattle(state: ExtendedGameState): ExtendedGameState {
  return drawCards(state, 5);
}

export function isGameOver(state: ExtendedGameState): 'player' | 'enemy' | null {
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

// Boss enemies for later phases
export const bossEnemies: Enemy[] = [
  {
    name: 'Urzeitlicher Leviathan',
    hp: 50,
    maxHP: 50,
    emoji: '🦞',
    attack: 6,
  },
  {
    name: 'Brachiosaurus Elder',
    hp: 60,
    maxHP: 60,
    emoji: '🦕',
    attack: 8,
  },
  {
    name: 'T-Rex Alpha',
    hp: 80,
    maxHP: 80,
    emoji: '🦖',
    attack: 10,
  },
  {
    name: 'Mammut Herd Leader',
    hp: 70,
    maxHP: 70,
    emoji: '🦣',
    attack: 7,
  },
];
