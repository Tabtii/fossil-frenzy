export type CardType = 'attacker' | 'defender' | 'support' | 'hybrid';
export type Era = 'trias' | ' Jura' | 'kreide' | 'eiszeit';

export interface Card {
  id: string;
  name: string;
  type: CardType;
  damage?: number;
  block?: number;
  heal?: number;
  effect?: string;
  era: Era;
  fact: string;
  emoji: string;
  energyCost: number;
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
  energy: number;
  maxEnergy: number;
  turn: number;
}

export interface Enemy {
  name: string;
  hp: number;
  maxHP: number;
  emoji: string;
  attack: number;
}
