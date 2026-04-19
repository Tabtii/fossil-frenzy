import { allCards } from '../data/cards';

// Balancing adjustments based on game designer review
export const balancedCards = allCards.map(card => {
  const balanced = { ...card };
  
  // Fix 1-energy outliers
  if (card.id === 'archaeopteryx') {
    balanced.damage = 3; // Was 4, now 3 (DPS 3.0 instead of 4.0)
  }
  if (card.id === 'uranfarn') {
    balanced.heal = 4; // Was 5, now 4 (HP 4.0 instead of 5.0)
  }
  
  // Buff underperformers
  if (card.id === 'pteranodon') {
    balanced.damage = 6; // Was 5, now 6 (competitive with Velociraptor)
  }
  if (card.id === 'stegosaurus') {
    balanced.block = 7; // Was 6, now 7 (closer to Triceratops)
  }
  if (card.id === 'brachiosaurus') {
    balanced.damage = 5;
    balanced.block = 3; // Was 4+4, now 5+3 (better split)
  }
  if (card.id === 'trilobit') {
    balanced.heal = 3; // Was 2, now 3
  }
  
  // T-Rex buff: was already 12 for 3 energy, slightly underpowered vs two 2-cost cards
  // Already decent at 4.0 DPS but make it more special
  if (card.id === 'trex') {
    balanced.effect = 'Tötet Gegner unter 15 HP sofort'; // New effect
  }
  
  // Velociraptor: Change from "when alone" to more interesting effect
  if (card.id === 'velociraptor') {
    balanced.effect = '+50% Schaden für jeden Angreifer im Deck';
  }
  
  return balanced;
});

// New high-cost "capstone" cards for late-game variety
export const newCards = [
  {
    id: 'ankylosaurus',
    name: 'Ankylosaurus',
    type: 'defender' as const,
    block: 8,
    damage: 3,
    era: 'kreide' as const,
    fact: 'Der gepanzerte Dinosaurier mit dem massiven Keulenschwanz.',
    emoji: '🦎',
    energyCost: 4,
  },
  {
    id: 'spinosaurus',
    name: 'Spinosaurus',
    type: 'attacker' as const,
    damage: 15,
    era: 'kreide' as const,
    fact: 'Der größte fleischfressende Dinosaurier, sogar größer als der T-Rex.',
    emoji: '🦖',
    energyCost: 5,
  },
  {
    id: 'quetzalcoatlus',
    name: 'Quetzalcoatlus',
    type: 'attacker' as const,
    damage: 8,
    era: 'kreide' as const,
    effect: 'Kann nicht blockiert werden',
    era: 'kreide',
    fact: 'Das größte fliegende Tier das je gelebt hat.',
    emoji: '🦅',
    energyCost: 4,
  },
];

// Combine all cards
export const gameCards = [...balancedCards, ...newCards];
