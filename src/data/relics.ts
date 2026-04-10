import { Relic } from '../types';

// ============================================================================
// RELIC DATABASE - Passive bonuses for the player
// ============================================================================

// Starter Relics (given at start of run)
export const starterRelics: Relic[] = [
  {
    id: 'fossil_amulet',
    name: 'Fossilien-Amulett',
    description: 'Starte jeden Kampf mit 5额外 Block.',
    emoji: '🦴',
    effect: 'Startkampf: +5 Block',
    rarity: 'starter',
    tier: 0,
    trigger: 'combat_start',
  },
];

// Common Relics
export const commonRelics: Relic[] = [
  {
    id: 'amber_necklace',
    name: 'Bernstein-Halskette',
    description: 'Erhalte am Ende deines Zuges 1 zusätzliche Energie.',
    emoji: '🧡',
    effect: 'Zugende: +1 Energie',
    rarity: 'common',
    tier: 1,
    trigger: 'turn_start',
  },
  {
    id: 'dino_tooth',
    name: 'Dino-Zahn',
    description: 'Angriffe fügen +2 Schaden zu.',
    emoji: '🦷',
    effect: 'Angriffe: +2 Schaden',
    rarity: 'common',
    tier: 1,
    trigger: 'card_played',
  },
  {
    id: 'stone_scale',
    name: 'Steinschuppe',
    description: 'Erhalte am Start jedes Kampfes 8 Block.',
    emoji: '🪨',
    effect: 'Kampfstart: +8 Block',
    rarity: 'common',
    tier: 1,
    trigger: 'combat_start',
  },
  {
    id: 'ancient_seed',
    name: 'Uralter Samen',
    description: 'Heile 3 LP am Ende jedes Kampfes.',
    emoji: '🌱',
    effect: 'Kampfende: +3 HP',
    rarity: 'common',
    tier: 1,
    trigger: 'combat_start',
  },
];

// Uncommon Relics
export const uncommonRelics: Relic[] = [
  {
    id: 'predator_claw',
    name: 'Raubtierklaue',
    description: 'Wenn du einen Gegner besiegst, erhalte 1 temporären Schaden für den nächsten Kampf.',
    emoji: '🦅',
    effect: 'Sieg: +1 Schaden (nächster Kampf)',
    rarity: 'uncommon',
    tier: 2,
    trigger: 'combat_start',
  },
  {
    id: 'herbivore_teeth',
    name: 'Pflanzenfresser-Gebiss',
    description: 'Skill-Karten kosten 1 Energie weniger (Minimum 0).',
    emoji: '🌿',
    effect: 'Skills: -1 Kosten',
    rarity: 'uncommon',
    tier: 2,
    trigger: 'card_played',
  },
  {
    id: 'time_capsule',
    name: 'Zeitkapsel',
    description: 'Behalte unausgespielte Karten für den nächsten Zug.',
    emoji: '⏳',
    effect: 'Karten behalten am Zugende',
    rarity: 'uncommon',
    tier: 2,
    trigger: 'turn_start',
  },
  {
    id: 'golden_egg',
    name: 'Goldenes Ei',
    description: 'Erhalte nach jedem Kampf 10 zusätzliches Gold.',
    emoji: '🥚',
    effect: 'Kampfende: +10 Gold',
    rarity: 'uncommon',
    tier: 2,
    trigger: 'combat_start',
  },
];

// Rare Relics
export const rareRelics: Relic[] = [
  {
    id: 'primal_heart',
    name: 'Urzeit-Herz',
    description: 'Erhöhe deine maximalen LP um 20.',
    emoji: '❤️',
    effect: '+20 Max HP',
    rarity: 'rare',
    tier: 3,
    trigger: 'combat_start',
  },
  {
    id: 'meteor_fragment',
    name: 'Meteoriten-Fragment',
    description: 'Deine Angriffe ignorieren 5 Block des Gegners.',
    emoji: '☄️',
    effect: 'Angriffe: -5 Gegner-Block',
    rarity: 'rare',
    tier: 3,
    trigger: 'card_played',
  },
  {
    id: 'evolution_stone',
    name: 'Evolutionsstein',
    description: 'Verbessere zufällig eine Karte in deiner Hand am Start jedes Kampfes.',
    emoji: '💎',
    effect: 'Kampfstart: Verbessere 1 Karte',
    rarity: 'rare',
    tier: 3,
    trigger: 'combat_start',
  },
  {
    id: 'alpha_crown',
    name: 'Alpha-Krone',
    description: 'Starte jeden Kampf mit 1 zusätzlichen Energiewürfel.',
    emoji: '👑',
    effect: 'Kampfstart: +1 Max Energie',
    rarity: 'rare',
    tier: 3,
    trigger: 'combat_start',
  },
  {
    id: 'phoenix_feather',
    name: 'Phönix-Feder',
    description: 'Wenn du auf 0 HP fällst, werde mit 50% HP wiederbelebt (einmal pro Kampf).',
    emoji: '🔥',
    effect: 'Wiederbelebung bei 0 HP',
    rarity: 'rare',
    tier: 3,
    trigger: 'damage_taken',
  },
];

// Boss Relics (powerful but with trade-offs)
export const bossRelics: Relic[] = [
  {
    id: 'titan_skull',
    name: 'Titanenschädel',
    description: 'Erhöhe deinen Schaden um 50%, aber du erhältst auch 50% mehr Schaden.',
    emoji: '💀',
    effect: '+50% Schaden, +50% erlittener Schaden',
    rarity: 'boss',
    tier: 4,
    trigger: 'damage_taken',
  },
  {
    id: 'void_crystal',
    name: 'Leeren-Kristall',
    description: 'Starte jeden Kampf mit 3 Energie, aber dein Deck wird um 5 Karten vergrößert.',
    emoji: '🔮',
    effect: 'Kampfstart: +3 Energie, Deck: +5 Karten',
    rarity: 'boss',
    tier: 4,
    trigger: 'combat_start',
  },
  {
    id: 'eternal_flame',
    name: 'Ewige Flamme',
    description: 'Besiege normale Gegner sofort, aber Bosse haben 100% mehr HP.',
    emoji: '🔥',
    effect: 'Sofortsieg gegen Normale, Bosse: +100% HP',
    rarity: 'boss',
    tier: 4,
    trigger: 'combat_start',
  },
];

// All relics combined
export const allRelics: Relic[] = [
  ...starterRelics,
  ...commonRelics,
  ...uncommonRelics,
  ...rareRelics,
  ...bossRelics,
];

// Helper functions
export function getRelicById(id: string): Relic | undefined {
  return allRelics.find(relic => relic.id === id);
}

export function getRelicsByRarity(rarity: string): Relic[] {
  return allRelics.filter(relic => relic.rarity === rarity);
}

export function getRandomRelic(rarity?: string): Relic {
  if (rarity) {
    const pool = allRelics.filter(r => r.rarity === rarity);
    return pool[Math.floor(Math.random() * pool.length)] || commonRelics[0];
  }
  return allRelics[Math.floor(Math.random() * allRelics.length)];
}

export function getRewardsForNode(type: string): Relic[] {
  switch (type) {
    case 'battle':
      return commonRelics;
    case 'elite':
      return [...uncommonRelics, ...rareRelics];
    case 'boss':
      return bossRelics;
    default:
      return commonRelics;
  }
}
