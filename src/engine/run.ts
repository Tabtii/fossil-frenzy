import { canPlay, endTurn, playCard, startCombat } from './combat';
import { deriveSeed, nextFloat } from './rng';
import { eraForAct, generateActMap } from './run/map';
import { MAX_HP_GAIN, rollCardChoices } from './run/rewards';
import type {
  CardInstance,
  CombatState,
  ContentDB,
  EnemyTier,
  MapNode,
  RestChoice,
  RunScreen,
  RunState,
  RunStats,
} from './types';

// Expedition / run progression. Every function is pure: it never mutates its
// input and returns the input unchanged for invalid actions.

export const ACT_COUNT = 4;
export const STARTING_HP = 60;
/** Rest site heals this percentage of max HP (rounded up). */
export const REST_HEAL_PERCENT = 30;
/** Starting a new act heals this percentage of the missing HP (rounded up). */
export const ACT_HEAL_PERCENT = 50;

export {
  BOSS_FLOOR,
  BOSS_LANE,
  FLOORS_PER_ACT,
  MAP_LANES,
  MIN_ELITE_REST_FLOOR,
  eraForAct,
  generateActMap,
} from './run/map';
export { MAX_HP_GAIN, RARITY_ODDS, REWARD_CHOICES, rollCardChoices } from './run/rewards';

// Salts for deriveSeed; arbitrary but fixed so saved runs stay reproducible.
const RUN_SALT = 0x52554e; // "RUN"
const MAP_SALT = 0x4d4150; // "MAP"
const COMBAT_SALT = 0x434f4d; // "COM"

const ZERO_STATS: RunStats = {
  enemiesDefeated: 0,
  elitesDefeated: 0,
  bossesDefeated: 0,
  cardsPlayed: 0,
  damageDealt: 0,
  floorsCleared: 0,
};

/** Map seed of an act: depends only on the run seed, not on the player's choices. */
function mapSeed(seed: number, act: number): number {
  return deriveSeed(seed, MAP_SALT + act);
}

export function getNode(run: RunState, nodeId: string | null): MapNode | undefined {
  if (nodeId === null) return undefined;
  return run.map.find((node) => node.id === nodeId);
}

/** The node the player stands on (or is resolving), if any. */
export function currentNode(run: RunState): MapNode | undefined {
  return getNode(run, run.currentNodeId);
}

function tierOfNode(node: MapNode | undefined): EnemyTier {
  if (node?.type === 'boss') return 'boss';
  if (node?.type === 'elite') return 'elite';
  return 'normal';
}

/**
 * Enemy HP removed by one action: replays the action's events against the
 * enemy's HP before the action, so overkill is not counted and `execute`
 * counts the HP it removed. Bleed and confused self-hits count as well.
 */
function damageToEnemy(before: CombatState, after: CombatState): number {
  let hp = Math.max(0, before.enemy.hp);
  let total = 0;
  for (const event of after.events) {
    if (event.type === 'damage' && event.target === 'enemy') {
      const dealt = Math.min(hp, Math.max(0, event.amount));
      total += dealt;
      hp -= dealt;
    } else if (event.type === 'heal' && event.target === 'enemy') {
      hp = Math.min(before.enemy.maxHp, hp + Math.max(0, event.amount));
    } else if (event.type === 'execute') {
      total += hp;
      hp = 0;
    }
  }
  return total;
}

function addCard(run: RunState, defId: string): Pick<RunState, 'deck' | 'nextUid'> {
  const card: CardInstance = { uid: `c${run.nextUid}`, defId, upgraded: false };
  return { deck: [...run.deck, card], nextUid: run.nextUid + 1 };
}

export function createRun(db: ContentDB, seed: number): RunState {
  const runSeed = seed >>> 0;
  const deck: CardInstance[] = db.starterDeck.map((defId, index) => ({
    uid: `c${index}`,
    defId,
    upgraded: false,
  }));
  return {
    seed: runSeed,
    rngState: deriveSeed(runSeed, RUN_SALT),
    act: 0,
    map: generateActMap(db, 0, mapSeed(runSeed, 0)),
    currentNodeId: null,
    visited: [],
    deck,
    hp: STARTING_HP,
    maxHp: STARTING_HP,
    nextUid: deck.length,
    screen: { type: 'map' },
    stats: { ...ZERO_STATS },
  };
}

/** Nodes the player may enter from the current position. */
export function availableNodes(run: RunState): MapNode[] {
  if (run.screen.type !== 'map') return [];
  if (run.currentNodeId === null) return run.map.filter((node) => node.floor === 0);
  const current = currentNode(run);
  if (!current) return [];
  return current.next
    .map((id) => getNode(run, id))
    .filter((node): node is MapNode => node !== undefined);
}

/** Moves onto a node and opens its screen (combat, rest, dig). */
export function enterNode(db: ContentDB, run: RunState, nodeId: string): RunState {
  const node = availableNodes(run).find((candidate) => candidate.id === nodeId);
  if (!node) return run;
  const moved = { ...run, currentNodeId: node.id, visited: [...run.visited, node.id] };

  switch (node.type) {
    case 'fight':
    case 'elite':
    case 'boss': {
      if (node.enemyId === undefined || !db.enemies[node.enemyId]) return run;
      const combat = startCombat(db, {
        deck: [...run.deck],
        playerHp: run.hp,
        playerMaxHp: run.maxHp,
        enemyId: node.enemyId,
        seed: deriveSeed(run.rngState, COMBAT_SALT),
      });
      return {
        ...moved,
        rngState: nextFloat(run.rngState).state,
        screen: { type: 'combat', nodeId: node.id, combat },
      };
    }
    case 'rest':
      return { ...moved, screen: { type: 'rest', nodeId: node.id } };
    case 'dig': {
      const roll = rollCardChoices(db, eraForAct(run.act), 'normal', run.rngState);
      return {
        ...moved,
        rngState: roll.state,
        screen: { type: 'dig', nodeId: node.id, choices: roll.value },
      };
    }
    default:
      return run;
  }
}

function withCombat(
  run: RunState,
  screen: Extract<RunScreen, { type: 'combat' }>,
  combat: CombatState,
  cardsPlayed: number,
): RunState {
  return {
    ...run,
    screen: { ...screen, combat },
    stats: {
      ...run.stats,
      cardsPlayed: run.stats.cardsPlayed + cardsPlayed,
      damageDealt: run.stats.damageDealt + damageToEnemy(screen.combat, combat),
    },
  };
}

/** Play a card in the active combat (no-op outside combat). */
export function runPlayCard(db: ContentDB, run: RunState, uid: string): RunState {
  const { screen } = run;
  if (screen.type !== 'combat') return run;
  if (!canPlay(db, screen.combat, uid).ok) return run;
  return withCombat(run, screen, playCard(db, screen.combat, uid), 1);
}

/** End the turn in the active combat (no-op outside combat). */
export function runEndTurn(db: ContentDB, run: RunState): RunState {
  const { screen } = run;
  if (screen.type !== 'combat' || screen.combat.phase !== 'player') return run;
  return withCombat(run, screen, endTurn(db, screen.combat), 0);
}

/**
 * Called once the combat phase is 'won' or 'lost': syncs HP and stats and
 * moves to the reward / defeat / victory screen.
 */
export function resolveCombat(db: ContentDB, run: RunState): RunState {
  const { screen } = run;
  if (screen.type !== 'combat') return run;
  const { combat, nodeId } = screen;
  if (combat.phase === 'player') return run;

  if (combat.phase === 'lost') {
    return { ...run, hp: 0, screen: { type: 'defeat', nodeId } };
  }

  const tier = tierOfNode(getNode(run, nodeId));
  const maxHpGain = MAX_HP_GAIN[tier];
  const maxHp = run.maxHp + maxHpGain;
  const hp = Math.max(1, Math.min(maxHp, combat.player.hp + maxHpGain));
  const enemy = db.enemies[combat.enemy.defId];
  const roll = rollCardChoices(db, eraForAct(run.act), tier, run.rngState);

  return {
    ...run,
    rngState: roll.state,
    hp,
    maxHp,
    screen: {
      type: 'reward',
      nodeId,
      reward: {
        choices: roll.value,
        fossilsFound: enemy ? [enemy.fossilId] : [],
        maxHpGain,
      },
    },
    stats: {
      ...run.stats,
      enemiesDefeated: run.stats.enemiesDefeated + 1,
      elitesDefeated: run.stats.elitesDefeated + (tier === 'elite' ? 1 : 0),
      bossesDefeated: run.stats.bossesDefeated + (tier === 'boss' ? 1 : 0),
      floorsCleared: run.stats.floorsCleared + 1,
    },
  };
}

/** Pick a reward card (or null to skip) and return to the map / act end. */
export function chooseCardReward(db: ContentDB, run: RunState, defId: string | null): RunState {
  const { screen } = run;
  if (screen.type !== 'reward') return run;
  if (defId !== null && !screen.reward.choices.includes(defId)) return run;

  const added = defId === null ? {} : addCard(run, defId);
  let next: RunScreen = { type: 'map' };
  if (getNode(run, screen.nodeId)?.type === 'boss') {
    next = run.act >= ACT_COUNT - 1 ? { type: 'victory' } : { type: 'actComplete', act: run.act };
  }
  return { ...run, ...added, screen: next };
}

export function chooseDig(db: ContentDB, run: RunState, defId: string | null): RunState {
  const { screen } = run;
  if (screen.type !== 'dig') return run;
  if (defId !== null && !screen.choices.includes(defId)) return run;

  const added = defId === null ? {} : addCard(run, defId);
  return {
    ...run,
    ...added,
    screen: { type: 'map' },
    stats: { ...run.stats, floorsCleared: run.stats.floorsCleared + 1 },
  };
}

export function chooseRest(db: ContentDB, run: RunState, choice: RestChoice): RunState {
  if (run.screen.type !== 'rest') return run;
  const done = {
    screen: { type: 'map' } as const,
    stats: { ...run.stats, floorsCleared: run.stats.floorsCleared + 1 },
  };

  if (choice.type === 'heal') {
    const heal = Math.ceil((run.maxHp * REST_HEAL_PERCENT) / 100);
    return { ...run, ...done, hp: Math.min(run.maxHp, run.hp + heal) };
  }
  if (choice.type === 'upgrade') {
    const target = run.deck.find((card) => card.uid === choice.uid);
    if (!target || target.upgraded) return run;
    return {
      ...run,
      ...done,
      deck: run.deck.map((card) => (card.uid === choice.uid ? { ...card, upgraded: true } : card)),
    };
  }
  return run;
}

/** From 'actComplete': generate the next act's map. */
export function startNextAct(db: ContentDB, run: RunState): RunState {
  if (run.screen.type !== 'actComplete') return run;
  const act = run.act + 1;
  if (act >= ACT_COUNT) return run;
  const missing = Math.max(0, run.maxHp - run.hp);
  return {
    ...run,
    act,
    hp: Math.min(run.maxHp, run.hp + Math.ceil((missing * ACT_HEAL_PERCENT) / 100)),
    map: generateActMap(db, act, mapSeed(run.seed, act)),
    currentNodeId: null,
    screen: { type: 'map' },
  };
}

/** Fossil ids discovered by everything currently in the deck (for meta sync). */
export function deckFossils(db: ContentDB, run: RunState): string[] {
  const fossils = new Set<string>();
  for (const card of run.deck) {
    const def = db.cards[card.defId];
    if (def) fossils.add(def.fossilId);
  }
  return [...fossils];
}
