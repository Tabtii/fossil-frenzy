// Shared domain types for Fossil Frenzy. This file is the contract between
// engine, content, state and UI — change it deliberately.

// ---------------------------------------------------------------------------
// Content
// ---------------------------------------------------------------------------

export type Era = 'trias' | 'jura' | 'kreide' | 'eiszeit';
export const ERAS: readonly Era[] = ['trias', 'jura', 'kreide', 'eiszeit'];

export type CardType = 'attack' | 'defense' | 'support';
export type Rarity = 'starter' | 'common' | 'uncommon' | 'rare';

/** Thematic tags; some effects scale with the number of tagged cards. */
export type CardTag =
  | 'carnivore'
  | 'herbivore'
  | 'flyer'
  | 'marine'
  | 'plant'
  | 'mammal'
  | 'invertebrate'
  | 'pack';

/**
 * strength:   +N damage per hit dealt (permanent for the combat)
 * vulnerable: takes 50% more attack damage; N = turns left
 * weak:       deals 25% less attack damage; N = turns left
 * bleed:      loses N HP at the start of its turn (ignores block), then N -= 1
 * confused:   its next N attacks hit itself instead (one stack per attack move)
 */
export type StatusId = 'strength' | 'vulnerable' | 'weak' | 'bleed' | 'confused';
export type Statuses = Partial<Record<StatusId, number>>;

export type Zone = 'hand' | 'drawPile' | 'discardPile' | 'deck';

/** Adds `amount` per match, optionally capped at `max` total bonus. */
export type Scaling =
  | { per: 'tagInZone'; tag: CardTag; zone: Zone; amount: number; max?: number }
  | { per: 'cardsPlayedThisTurn'; amount: number; max?: number }
  | { per: 'playerBlock'; amount: number; max?: number };

export type Condition =
  | { kind: 'enemyHpAtMost'; value: number }
  | { kind: 'playerBlockAtLeast'; value: number }
  /** True when no other attack card was played earlier this turn. */
  | { kind: 'firstAttackThisTurn' }
  | { kind: 'enemyHasStatus'; status: StatusId }
  | { kind: 'chance'; percent: number };

export type CardEffect =
  | { type: 'damage'; amount: number; hits?: number; pierce?: boolean; scaling?: Scaling }
  | { type: 'block'; amount: number; scaling?: Scaling }
  | { type: 'heal'; amount: number }
  | { type: 'draw'; amount: number }
  | { type: 'energy'; amount: number }
  | { type: 'status'; status: StatusId; amount: number; target: 'enemy' | 'self' }
  /** Kills the enemy outright (used inside a conditional). */
  | { type: 'execute' }
  | { type: 'conditional'; condition: Condition; then: CardEffect[]; else?: CardEffect[] };

export interface CardDef {
  id: string;
  name: string;
  emoji: string;
  era: Era;
  type: CardType;
  rarity: Rarity;
  cost: number;
  tags: CardTag[];
  effects: CardEffect[];
  /** Removed for the rest of the combat after being played. */
  exhaust?: boolean;
  /** Overrides applied when the card is upgraded. */
  upgrade: { cost?: number; effects?: CardEffect[]; exhaust?: boolean };
  /** Fossil book entry unlocked by finding this card. */
  fossilId: string;
}

export type EnemyTier = 'normal' | 'elite' | 'boss';

export type EnemyEffect =
  | { type: 'attack'; amount: number; hits?: number }
  | { type: 'block'; amount: number }
  | { type: 'heal'; amount: number }
  | { type: 'status'; status: StatusId; amount: number; target: 'player' | 'self' };

export interface EnemyMove {
  id: string;
  /** Short German label shown under the intent, e.g. "Biss". */
  name: string;
  effects: EnemyEffect[];
}

export type EnemyPattern =
  /** Moves in order, looping. */
  | { type: 'cycle' }
  /** Weighted random; never the same move more than twice in a row. */
  | { type: 'weighted'; weights: Record<string, number> };

export interface EnemyDef {
  id: string;
  name: string;
  emoji: string;
  era: Era;
  tier: EnemyTier;
  /** Inclusive HP range; actual HP is rolled per encounter. */
  hp: [number, number];
  moves: EnemyMove[];
  pattern: EnemyPattern;
  /** Optional first move id (otherwise chosen by the pattern). */
  openingMoveId?: string;
  fossilId: string;
}

export type FossilKind =
  | 'dinosaur'
  | 'bird'
  | 'pterosaur'
  | 'marine-reptile'
  | 'mammal'
  | 'reptile'
  | 'fish'
  | 'invertebrate'
  | 'plant';

export interface FossilEntry {
  id: string;
  name: string;
  /** Scientific genus/species name, italicised in the UI. */
  scientificName: string;
  emoji: string;
  era: Era;
  kind: FossilKind;
  /** Age in millions of years, e.g. [68, 66]. */
  mya: [number, number];
  diet: 'carnivore' | 'herbivore' | 'omnivore' | 'filter' | 'photosynthesis';
  /** Approximate length in metres, if meaningful. */
  lengthM?: number;
  /** Where fossils were found, e.g. "Nordamerika". */
  foundIn: string;
  /** 2–4 short, verified German facts. */
  facts: string[];
}

export interface ContentDB {
  cards: Record<string, CardDef>;
  enemies: Record<string, EnemyDef>;
  fossils: Record<string, FossilEntry>;
  starterDeck: string[];
}

// ---------------------------------------------------------------------------
// Combat
// ---------------------------------------------------------------------------

export interface CardInstance {
  /** Unique per run, e.g. "c12". Effects always key off `defId`. */
  uid: string;
  defId: string;
  upgraded: boolean;
}

export interface Combatant {
  hp: number;
  maxHp: number;
  block: number;
  statuses: Statuses;
}

export interface EnemyState extends Combatant {
  defId: string;
  nextMoveId: string;
  /** Last move ids, newest last (for pattern rules). */
  history: string[];
}

export type CombatPhase = 'player' | 'won' | 'lost';
export type Side = 'player' | 'enemy';

/** Events emitted by the last action, consumed by the UI for feedback. */
export type CombatEvent =
  | { type: 'cardPlayed'; uid: string; defId: string }
  | { type: 'damage'; target: Side; amount: number; blocked: number; source: Side | 'bleed' }
  | { type: 'block'; target: Side; amount: number }
  | { type: 'heal'; target: Side; amount: number }
  | { type: 'status'; target: Side; status: StatusId; amount: number }
  | { type: 'draw'; count: number }
  | { type: 'shuffle' }
  | { type: 'energy'; amount: number }
  | { type: 'enemyMove'; moveId: string }
  | { type: 'confusedHit' }
  | { type: 'execute' }
  | { type: 'turnStart'; turn: number }
  | { type: 'victory' }
  | { type: 'defeat' };

export interface CombatState {
  player: Combatant;
  enemy: EnemyState;
  drawPile: CardInstance[];
  hand: CardInstance[];
  discardPile: CardInstance[];
  exhaustPile: CardInstance[];
  energy: number;
  maxEnergy: number;
  turn: number;
  cardsPlayedThisTurn: number;
  attacksPlayedThisTurn: number;
  phase: CombatPhase;
  rngState: number;
  /** Events produced by the most recent action only. */
  events: CombatEvent[];
}

export type IntentKind = 'attack' | 'defend' | 'buff' | 'debuff' | 'heal' | 'unknown';

/** What the UI shows above the enemy. Damage already includes modifiers. */
export interface IntentView {
  kinds: IntentKind[];
  moveName: string;
  damage?: number;
  hits?: number;
  block?: number;
  /** True when the attack will hit the enemy itself (confused). */
  selfHit?: boolean;
}

export type PlayCheck =
  | { ok: true }
  | { ok: false; reason: 'notInHand' | 'notEnoughEnergy' | 'combatOver' };

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

export type NodeType = 'fight' | 'elite' | 'rest' | 'dig' | 'boss';

export interface MapNode {
  id: string;
  /** 0-based floor within the act; the boss is the last floor. */
  floor: number;
  /** Horizontal lane 0..(lanes-1) for layout. */
  lane: number;
  type: NodeType;
  /** Ids of reachable nodes on the next floor. */
  next: string[];
  /** Pre-rolled enemy for fight/elite/boss nodes. */
  enemyId?: string;
}

export interface CardReward {
  /** Card def ids to choose from (usually 3). */
  choices: string[];
  /** Fossil ids unlocked by this reward screen (e.g. the defeated enemy). */
  fossilsFound: string[];
  /** Max HP gained (elites/bosses). */
  maxHpGain: number;
}

export type RunScreen =
  | { type: 'map' }
  | { type: 'combat'; nodeId: string; combat: CombatState }
  | { type: 'reward'; nodeId: string; reward: CardReward }
  | { type: 'rest'; nodeId: string }
  | { type: 'dig'; nodeId: string; choices: string[] }
  | { type: 'actComplete'; act: number }
  | { type: 'victory' }
  | { type: 'defeat'; nodeId: string };

export interface RunStats {
  enemiesDefeated: number;
  elitesDefeated: number;
  bossesDefeated: number;
  cardsPlayed: number;
  damageDealt: number;
  floorsCleared: number;
}

export interface RunState {
  seed: number;
  rngState: number;
  /** 0-based act index; act n is set in ERAS[n]. */
  act: number;
  map: MapNode[];
  currentNodeId: string | null;
  visited: string[];
  deck: CardInstance[];
  hp: number;
  maxHp: number;
  nextUid: number;
  screen: RunScreen;
  stats: RunStats;
  /** First-ever fossil discoveries made in this expedition; absent in legacy saves. */
  newFossils?: string[];
}

export type RestChoice = { type: 'heal' } | { type: 'upgrade'; uid: string };

// ---------------------------------------------------------------------------
// Meta progression (persisted across runs)
// ---------------------------------------------------------------------------

export interface FossilRecord {
  /** ISO timestamp of first discovery. */
  discoveredAt: string;
  timesFound: number;
}

export interface Settings {
  haptics: boolean;
  reducedMotion: boolean;
}

export interface MetaState {
  fossils: Record<string, FossilRecord>;
  /** Card def ids the player has ever owned. */
  cardsSeen: string[];
  runsStarted: number;
  runsWon: number;
  /** Furthest progress: act and floor reached. */
  best: { act: number; floor: number } | null;
  settings: Settings;
}
