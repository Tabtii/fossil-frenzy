import { Enemy } from '../types';

// ============================================================================
// ENEMY DATABASE - All dinosaur enemies for battles
// ============================================================================

// Act 1 Enemies (Easy)
const act1Enemies: Enemy[] = [
  {
    id: 'raptor',
    name: 'Velociraptor',
    hp: 42,
    maxHP: 42,
    emoji: '🦕',
    attack: 8,
    intent: 'attack',
    pattern: ['attack', 'attack', 'defend', 'attack'],
    currentPatternIndex: 0,
    nextMoveValue: 8,
    elite: false,
    boss: false,
    act: 1,
    spriteId: 'raptor',
  },
  {
    id: 'dilophosaurus',
    name: 'Dilophosaurus',
    hp: 38,
    maxHP: 38,
    emoji: '🦎',
    attack: 7,
    intent: 'attack',
    pattern: ['attack', 'buff', 'attack', 'attack'],
    currentPatternIndex: 0,
    nextMoveValue: 7,
    elite: false,
    boss: false,
    act: 1,
    spriteId: 'dilo',
  },
  {
    id: 'coelophysis',
    name: 'Coelophysis',
    hp: 35,
    maxHP: 35,
    emoji: '🦖',
    attack: 6,
    intent: 'attack',
    pattern: ['attack', 'attack', 'attack', 'defend'],
    currentPatternIndex: 0,
    nextMoveValue: 6,
    elite: false,
    boss: false,
    act: 1,
    spriteId: 'coelo',
  },
  {
    id: 'plateosaurus',
    name: 'Plateosaurus',
    hp: 50,
    maxHP: 50,
    emoji: '🦕',
    attack: 9,
    intent: 'defend',
    pattern: ['defend', 'attack', 'defend', 'attack'],
    currentPatternIndex: 0,
    nextMoveValue: 9,
    elite: false,
    boss: false,
    act: 1,
    spriteId: 'plateo',
  },
];

// Act 2 Enemies (Medium)
const act2Enemies: Enemy[] = [
  {
    id: 'allosaurus',
    name: 'Allosaurus',
    hp: 65,
    maxHP: 65,
    emoji: '🦖',
    attack: 12,
    intent: 'attack',
    pattern: ['attack', 'attack', 'buff', 'attack'],
    currentPatternIndex: 0,
    nextMoveValue: 12,
    elite: false,
    boss: false,
    act: 2,
    spriteId: 'allo',
  },
  {
    id: 'stegosaurus',
    name: 'Stegosaurus',
    hp: 70,
    maxHP: 70,
    emoji: '🦎',
    attack: 10,
    intent: 'defend',
    pattern: ['defend', 'attack', 'defend', 'attack'],
    currentPatternIndex: 0,
    nextMoveValue: 10,
    elite: false,
    boss: false,
    act: 2,
    spriteId: 'stego',
  },
  {
    id: 'ceratosaurus',
    name: 'Ceratosaurus',
    hp: 60,
    maxHP: 60,
    emoji: '🦕',
    attack: 11,
    intent: 'attack',
    pattern: ['attack', 'buff', 'attack', 'attack'],
    currentPatternIndex: 0,
    nextMoveValue: 11,
    elite: false,
    boss: false,
    act: 2,
    spriteId: 'cerato',
  },
  {
    id: 'ankylosaurus',
    name: 'Ankylosaurus',
    hp: 75,
    maxHP: 75,
    emoji: '🛡️',
    attack: 8,
    intent: 'defend',
    pattern: ['defend', 'defend', 'attack', 'attack'],
    currentPatternIndex: 0,
    nextMoveValue: 8,
    elite: false,
    boss: false,
    act: 2,
    spriteId: 'ankyl',
  },
];

// Act 3 Enemies (Hard)
const act3Enemies: Enemy[] = [
  {
    id: 'carnotaurus',
    name: 'Carnotaurus',
    hp: 85,
    maxHP: 85,
    emoji: '😈',
    attack: 14,
    intent: 'attack',
    pattern: ['attack', 'attack', 'buff', 'attack'],
    currentPatternIndex: 0,
    nextMoveValue: 14,
    elite: false,
    boss: false,
    act: 3,
    spriteId: 'carno',
  },
  {
    id: 'spinosaurus',
    name: 'Spinosaurus',
    hp: 90,
    maxHP: 90,
    emoji: '🦕',
    attack: 13,
    intent: 'attack',
    pattern: ['attack', 'defend', 'attack', 'attack'],
    currentPatternIndex: 0,
    nextMoveValue: 13,
    elite: false,
    boss: false,
    act: 3,
    spriteId: 'spino',
  },
  {
    id: 'therizinosaurus',
    name: 'Therizinosaurus',
    hp: 80,
    maxHP: 80,
    emoji: '🦖',
    attack: 15,
    intent: 'attack',
    pattern: ['attack', 'attack', 'attack', 'defend'],
    currentPatternIndex: 0,
    nextMoveValue: 15,
    elite: false,
    boss: false,
    act: 3,
    spriteId: 'theri',
  },
  {
    id: 'brachiosaurus',
    name: 'Brachiosaurus',
    hp: 95,
    maxHP: 95,
    emoji: '🦕',
    attack: 10,
    intent: 'defend',
    pattern: ['defend', 'defend', 'attack', 'attack'],
    currentPatternIndex: 0,
    nextMoveValue: 10,
    elite: false,
    boss: false,
    act: 3,
    spriteId: 'brachio',
  },
];

// Elite Enemies
const eliteEnemies: Enemy[] = [
  {
    id: 'elite_raptor_pack',
    name: 'Rudel Velociraptoren',
    hp: 80,
    maxHP: 80,
    emoji: '🦖🦖',
    attack: 14,
    intent: 'attack',
    pattern: ['attack', 'attack', 'attack', 'buff'],
    currentPatternIndex: 0,
    nextMoveValue: 14,
    elite: true,
    boss: false,
    act: 1,
    spriteId: 'raptor_elite',
  },
  {
    id: 'elite_triceratops',
    name: 'Wütender Triceratops',
    hp: 90,
    maxHP: 90,
    emoji: '🦏',
    attack: 16,
    intent: 'attack',
    pattern: ['attack', 'defend', 'attack', 'attack'],
    currentPatternIndex: 0,
    nextMoveValue: 16,
    elite: true,
    boss: false,
    act: 2,
    spriteId: 'trike_elite',
  },
  {
    id: 'elite_giganotosaurus',
    name: 'Giganotosaurus',
    hp: 120,
    maxHP: 120,
    emoji: '👹',
    attack: 18,
    intent: 'attack',
    pattern: ['attack', 'attack', 'buff', 'attack'],
    currentPatternIndex: 0,
    nextMoveValue: 18,
    elite: true,
    boss: false,
    act: 3,
    spriteId: 'giga_elite',
  },
];

// Boss Enemies
const bossEnemies: Enemy[] = [
  {
    id: 'boss_trex',
    name: 'Tyrannosaurus Rex',
    hp: 120,
    maxHP: 120,
    emoji: '🦖',
    attack: 16,
    intent: 'attack',
    pattern: ['attack', 'attack', 'defend', 'attack', 'attack'],
    currentPatternIndex: 0,
    nextMoveValue: 16,
    elite: false,
    boss: true,
    act: 1,
    spriteId: 'trex_boss',
  },
  {
    id: 'boss_dreadnoughtus',
    name: 'Dreadnoughtus',
    hp: 150,
    maxHP: 150,
    emoji: '🦕',
    attack: 14,
    intent: 'defend',
    pattern: ['defend', 'attack', 'defend', 'attack', 'attack'],
    currentPatternIndex: 0,
    nextMoveValue: 14,
    elite: false,
    boss: true,
    act: 2,
    spriteId: 'dread_boss',
  },
  {
    id: 'boss_utahraptor',
    name: 'Utahraptor-König',
    hp: 140,
    maxHP: 140,
    emoji: '👑',
    attack: 20,
    intent: 'attack',
    pattern: ['attack', 'attack', 'buff', 'attack', 'attack'],
    currentPatternIndex: 0,
    nextMoveValue: 20,
    elite: false,
    boss: true,
    act: 3,
    spriteId: 'utah_boss',
  },
];

// Combine all enemies
export const allEnemies: Enemy[] = [
  ...act1Enemies,
  ...act2Enemies,
  ...act3Enemies,
  ...eliteEnemies,
  ...bossEnemies,
];

// Helper functions
export function getEnemyById(id: string): Enemy | undefined {
  return allEnemies.find(enemy => enemy.id === id);
}

export function getEnemiesByAct(act: number): Enemy[] {
  return allEnemies.filter(enemy => enemy.act === act && !enemy.elite && !enemy.boss);
}

export function getEliteEnemies(): Enemy[] {
  return eliteEnemies;
}

export function getBossEnemies(): Enemy[] {
  return bossEnemies;
}

export function getRandomEnemy(act: number, isElite: boolean = false, isBoss: boolean = false): Enemy {
  if (isBoss) {
    const bosses = bossEnemies.filter(b => b.act === act);
    return bosses[Math.floor(Math.random() * bosses.length)] || bossEnemies[0];
  }
  
  if (isElite) {
    const elites = eliteEnemies.filter(e => e.act === act);
    return elites[Math.floor(Math.random() * elites.length)] || eliteEnemies[0];
  }
  
  const actEnemies = allEnemies.filter(e => e.act === act && !e.elite && !e.boss);
  return actEnemies[Math.floor(Math.random() * actEnemies.length)] || act1Enemies[0];
}
