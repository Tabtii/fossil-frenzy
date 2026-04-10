export type CardType = 'attack' | 'skill' | 'power';
export type Era = 'trias' | 'jura' | 'kreide' | 'eiszeit';
export type NodeType = 'battle' | 'elite' | 'event' | 'shop' | 'rest' | 'boss' | 'start';
export type IntentType = 'attack' | 'defend' | 'buff' | 'debuff' | 'special';
export type Rarity = 'common' | 'uncommon' | 'rare' | 'legendary' | 'special';

export interface Card {
  id: string;
  name: string;
  type: CardType;
  damage?: number;
  block?: number;
  heal?: number;
  energyGain?: number;
  drawCards?: number;
  effect?: string;
  era: Era;
  fact: string;
  emoji: string;
  energyCost: number;
  rarity: Rarity;
  upgradeable?: boolean;
  upgraded?: boolean;
  upgradeDamage?: number;
  upgradeBlock?: number;
  upgradeEffect?: string;
  target?: 'enemy' | 'self' | 'all';
}

export interface Enemy {
  id: string;
  name: string;
  hp: number;
  maxHP: number;
  emoji: string;
  attack: number;
  intent: IntentType;
  pattern: IntentType[];
  currentPatternIndex: number;
  nextMoveValue?: number;
  elite?: boolean;
  boss?: boolean;
  act: 1 | 2 | 3;
  spriteId?: string;
}

export interface Intent {
  type: IntentType;
  value?: number;
  description: string;
  emoji: string;
}

export interface Relic {
  id: string;
  name: string;
  description: string;
  emoji: string;
  effect: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'boss' | 'starter';
  tier: number;
  trigger?: 'combat_start' | 'turn_start' | 'damage_taken' | 'card_played';
}

export interface Potion {
  id: string;
  name: string;
  description: string;
  emoji: string;
  effect: string;
  rarity: Rarity;
  usage: 'instant' | 'combat';
}

export interface StatusEffect {
  id: string;
  name: string;
  stacks: number;
  description: string;
  isDebuff: boolean;
  emoji?: string;
}

export interface MapNode {
  id: string;
  type: NodeType;
  x: number;
  y: number;
  completed: boolean;
  locked: boolean;
  visited?: boolean;
  connectedTo?: string[];
  data?: NodeData;
}

export interface NodeData {
  enemy?: Enemy;
  event?: GameEvent;
  shopItems?: ShopItem[];
  restOptions?: RestOption[];
  reward?: { cards?: string[]; relics?: string[]; gold?: number };
}

export interface GameEvent {
  id: string;
  title: string;
  description: string;
  emoji: string;
  choices: EventChoice[];
}

export interface EventChoice {
  id: string;
  text: string;
  requirement?: (state: RunState) => boolean;
}

export interface ShopItem {
  id: string;
  type: 'card' | 'relic' | 'potion';
  item: Card | Relic | Potion;
  cost: number;
}

export interface RestOption {
  id: string;
  text: string;
  emoji: string;
}

export interface RunState {
  currentScreen: 'map' | 'battle' | 'event' | 'shop' | 'rest' | 'gameover' | 'victory';
  map: MapNode[][];
  currentNode: MapNode | null;
  gameState: GameState | null;
  relics: Relic[];
  gold: number;
  potions: Potion[];
  score: number;
  floor: number;
  maxFloors: number;
  runsWon: number;
  runsPlayed: number;
  seed?: number;
}

export interface GameState {
  playerHP: number;
  playerMaxHP: number;
  playerBlock: number;
  enemyHP: number;
  enemyMaxHP: number;
  deck: Card[];
  hand: Card[];
  discardPile: Card[];
  drawPile: Card[];
  energy: number;
  maxEnergy: number;
  turn: number;
  relics: Relic[];
  gold: number;
  potions: Potion[];
  statusEffects: StatusEffect[];
  currentEnemy?: Enemy;
  battleLog?: string[];
}
