import { describe, expect, it } from '@jest/globals';
import {
  ACT_COUNT,
  MAX_HP_GAIN,
  STARTING_HP,
  availableNodes,
  chooseCardReward,
  chooseDig,
  chooseRest,
  createRun,
  currentNode,
  deckFossils,
  enterNode,
  resolveCombat,
  rollCardChoices,
  runEndTurn,
  runPlayCard,
  startNextAct,
} from '../run';
import type {
  CardDef,
  CardEffect,
  CardType,
  CombatState,
  ContentDB,
  EnemyDef,
  EnemyTier,
  Era,
  MapNode,
  NodeType,
  Rarity,
  RunScreen,
  RunState,
} from '../types';
import { ERAS } from '../types';

// ---------------------------------------------------------------------------
// Fixture content (never import src/data in engine tests)
// ---------------------------------------------------------------------------

function card(
  id: string,
  era: Era,
  rarity: Rarity,
  type: CardType,
  effects: CardEffect[],
  cost = 1,
): CardDef {
  return {
    id,
    name: id,
    emoji: '🦴',
    era,
    type,
    rarity,
    cost,
    tags: [],
    effects,
    upgrade: {},
    fossilId: `fossil-${id}`,
  };
}

function enemy(id: string, era: Era, tier: EnemyTier, hp: number): EnemyDef {
  return {
    id,
    name: id,
    emoji: '🦖',
    era,
    tier,
    hp: [hp, hp],
    moves: [{ id: 'bite', name: 'Biss', effects: [{ type: 'attack', amount: 5 }] }],
    pattern: { type: 'cycle' },
    fossilId: `fossil-${id}`,
  };
}

const RARITY_COUNTS: Record<Exclude<Rarity, 'starter'>, number> = { common: 4, uncommon: 3, rare: 2 };

function makeDb(): ContentDB {
  const cards: CardDef[] = [
    card('strike', 'trias', 'starter', 'attack', [{ type: 'damage', amount: 6 }]),
    card('guard', 'trias', 'starter', 'defense', [{ type: 'block', amount: 5 }]),
    // Test-only cards (starter rarity, so never offered as rewards).
    card('test-execute', 'trias', 'starter', 'attack', [{ type: 'execute' }], 0),
    card('test-nuke', 'trias', 'starter', 'attack', [{ type: 'damage', amount: 999 }], 0),
  ];
  const enemies: EnemyDef[] = [];
  for (const era of ERAS) {
    for (const [rarity, count] of Object.entries(RARITY_COUNTS) as [Rarity, number][]) {
      for (let i = 0; i < count; i++) {
        const attack = i % 2 === 0;
        cards.push(
          card(
            `${era}-${rarity}-${i}`,
            era,
            rarity,
            attack ? 'attack' : 'defense',
            [attack ? { type: 'damage', amount: 7 } : { type: 'block', amount: 6 }],
          ),
        );
      }
    }
    for (let i = 0; i < 4; i++) enemies.push(enemy(`${era}-normal-${i}`, era, 'normal', 20));
    for (let i = 0; i < 2; i++) enemies.push(enemy(`${era}-elite-${i}`, era, 'elite', 40));
    enemies.push(enemy(`${era}-boss`, era, 'boss', 80));
  }
  return {
    cards: Object.fromEntries(cards.map((c) => [c.id, c])),
    enemies: Object.fromEntries(enemies.map((e) => [e.id, e])),
    fossils: {},
    starterDeck: ['strike', 'strike', 'strike', 'strike', 'strike', 'guard', 'guard', 'guard', 'guard', 'guard'],
  };
}

const db = makeDb();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function screenOf<T extends RunScreen['type']>(run: RunState, type: T): Extract<RunScreen, { type: T }> {
  if (run.screen.type !== type) throw new Error(`expected screen ${type}, got ${run.screen.type}`);
  return run.screen as Extract<RunScreen, { type: T }>;
}

function combatOf(run: RunState): CombatState {
  return screenOf(run, 'combat').combat;
}

function patchCombat(run: RunState, patch: (combat: CombatState) => CombatState): RunState {
  const screen = screenOf(run, 'combat');
  return { ...run, screen: { ...screen, combat: patch(screen.combat) } };
}

/** Test-only: ends the active combat with the given outcome. */
function forceOutcome(run: RunState, phase: 'won' | 'lost', playerHp?: number): RunState {
  return patchCombat(run, (combat) => ({
    ...combat,
    phase,
    player: { ...combat.player, hp: playerHp ?? (phase === 'lost' ? 0 : combat.player.hp) },
  }));
}

function mapNode(id: string, type: NodeType, enemyId?: string): MapNode {
  const node: MapNode = { id, floor: 0, lane: 0, type, next: [] };
  if (enemyId) node.enemyId = enemyId;
  return node;
}

/** A run standing in front of a single node of the given type. */
function runAt(type: NodeType, overrides: Partial<RunState> = {}): RunState {
  const enemyId =
    type === 'fight' ? 'trias-normal-0' : type === 'elite' ? 'trias-elite-0' : type === 'boss' ? 'trias-boss' : undefined;
  return { ...createRun(db, 42), map: [mapNode('x', type, enemyId)], ...overrides };
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const key of Object.keys(value)) deepFreeze((value as Record<string, unknown>)[key]);
  }
  return value;
}

function snapshot(value: unknown): string {
  return JSON.stringify(value);
}

const ALL_ACTIONS = (run: RunState): RunState[] => [
  enterNode(db, run, availableNodes(run)[0]?.id ?? 'nope'),
  runPlayCard(db, run, run.screen.type === 'combat' ? (run.screen.combat.hand[0]?.uid ?? 'x') : 'x'),
  runEndTurn(db, run),
  resolveCombat(db, run),
  chooseCardReward(db, run, null),
  chooseDig(db, run, null),
  chooseRest(db, run, { type: 'heal' }),
  startNextAct(db, run),
];

// ---------------------------------------------------------------------------
// createRun / availableNodes / enterNode
// ---------------------------------------------------------------------------

describe('createRun', () => {
  it('builds the starting state', () => {
    const run = createRun(db, 1234);
    expect(run.seed).toBe(1234);
    expect(run.act).toBe(0);
    expect(run.hp).toBe(STARTING_HP);
    expect(run.maxHp).toBe(STARTING_HP);
    expect(run.currentNodeId).toBeNull();
    expect(run.visited).toEqual([]);
    expect(run.screen).toEqual({ type: 'map' });
    expect(run.deck.map((c) => c.defId)).toEqual(db.starterDeck);
    expect(run.deck.map((c) => c.uid)).toEqual(db.starterDeck.map((_, i) => `c${i}`));
    expect(run.deck.every((c) => !c.upgraded)).toBe(true);
    expect(run.nextUid).toBe(db.starterDeck.length);
    expect(run.stats).toEqual({
      enemiesDefeated: 0,
      elitesDefeated: 0,
      bossesDefeated: 0,
      cardsPlayed: 0,
      damageDealt: 0,
      floorsCleared: 0,
    });
    expect(run.map.every((n) => n.id.startsWith('a0'))).toBe(true);
  });

  it('is deterministic and normalises the seed to uint32', () => {
    expect(createRun(db, 99)).toEqual(createRun(db, 99));
    expect(createRun(db, -1).seed).toBe(0xffffffff);
    expect(createRun(db, 2.7).seed).toBe(2);
    expect(Number.isInteger(createRun(db, 5).rngState)).toBe(true);
  });
});

describe('availableNodes', () => {
  it('offers floor 0 at the start, then the next nodes of the current node', () => {
    let run = createRun(db, 7);
    const start = availableNodes(run);
    expect(start.length).toBeGreaterThanOrEqual(2);
    expect(start.every((n) => n.floor === 0)).toBe(true);

    const first = start[0] as MapNode;
    run = enterNode(db, run, first.id);
    expect(availableNodes(run)).toEqual([]); // not on the map screen
    run = chooseCardReward(db, resolveCombat(db, forceOutcome(run, 'won')), null);
    expect(availableNodes(run).map((n) => n.id)).toEqual(first.next);
  });
});

describe('enterNode', () => {
  it('rejects unknown, unreachable and off-screen nodes', () => {
    const run = createRun(db, 3);
    expect(enterNode(db, run, 'does-not-exist')).toBe(run);
    const later = run.map.find((n) => n.floor === 1) as MapNode;
    expect(enterNode(db, run, later.id)).toBe(run);
    const boss = run.map.find((n) => n.type === 'boss') as MapNode;
    expect(enterNode(db, run, boss.id)).toBe(run);

    const inCombat = enterNode(db, run, availableNodes(run)[0]?.id ?? '');
    expect(inCombat.screen.type).toBe('combat');
    expect(enterNode(db, inCombat, availableNodes(run)[1]?.id ?? '')).toBe(inCombat);
  });

  it('cannot skip ahead or go back after moving', () => {
    let run = createRun(db, 11);
    const [a, b] = availableNodes(run) as [MapNode, MapNode];
    run = chooseCardReward(db, resolveCombat(db, forceOutcome(enterNode(db, run, a.id), 'won')), null);
    expect(enterNode(db, run, b.id)).toBe(run); // sibling on floor 0
    expect(enterNode(db, run, a.id)).toBe(run); // same node again
  });

  it('starts a combat against the pre-rolled enemy with the current deck and HP', () => {
    const base = createRun(db, 5);
    const run = { ...base, hp: 37 };
    const target = availableNodes(run)[0] as MapNode;
    const next = enterNode(db, run, target.id);
    const screen = screenOf(next, 'combat');
    expect(screen.nodeId).toBe(target.id);
    expect(next.currentNodeId).toBe(target.id);
    expect(next.visited).toEqual([target.id]);
    expect(screen.combat.enemy.defId).toBe(target.enemyId);
    expect(screen.combat.player.hp).toBe(37);
    expect(screen.combat.player.maxHp).toBe(STARTING_HP);
    expect(screen.combat.phase).toBe('player');
    const cards = [...screen.combat.hand, ...screen.combat.drawPile, ...screen.combat.discardPile];
    expect(cards.map((c) => c.uid).sort()).toEqual(run.deck.map((c) => c.uid).sort());
    expect(next.rngState).not.toBe(run.rngState);
  });

  it('opens rest and dig screens', () => {
    const rest = enterNode(db, runAt('rest'), 'x');
    expect(rest.screen).toEqual({ type: 'rest', nodeId: 'x' });

    const dig = enterNode(db, runAt('dig'), 'x');
    const { choices } = screenOf(dig, 'dig');
    expect(choices).toHaveLength(3);
    expect(new Set(choices).size).toBe(3);
    expect(choices.every((id) => db.cards[id]?.rarity !== 'starter')).toBe(true);
    expect(dig.visited).toEqual(['x']);
  });

  it('refuses combat nodes whose enemy is missing from the content', () => {
    const run = { ...createRun(db, 1), map: [mapNode('x', 'fight', 'ghost')] };
    expect(enterNode(db, run, 'x')).toBe(run);
  });
});

// ---------------------------------------------------------------------------
// Combat delegation and stats
// ---------------------------------------------------------------------------

describe('runPlayCard / runEndTurn', () => {
  it('are no-ops outside combat or for invalid cards', () => {
    const run = createRun(db, 2);
    expect(runPlayCard(db, run, 'c0')).toBe(run);
    expect(runEndTurn(db, run)).toBe(run);
    const fight = enterNode(db, runAt('fight'), 'x');
    expect(runPlayCard(db, fight, 'not-in-hand')).toBe(fight);
  });

  it('counts played cards and damage dealt to the enemy', () => {
    const fight = enterNode(db, runAt('fight'), 'x');
    const strike = combatOf(fight).hand.find((c) => c.defId === 'strike');
    expect(strike).toBeDefined();
    const next = runPlayCard(db, fight, strike?.uid ?? '');
    expect(next.stats.cardsPlayed).toBe(1);
    expect(next.stats.damageDealt).toBe(combatOf(fight).enemy.hp - combatOf(next).enemy.hp);
    expect(next.stats.damageDealt).toBe(6);

    const ended = runEndTurn(db, next);
    expect(combatOf(ended).turn).toBe(2);
    expect(ended.stats.cardsPlayed).toBe(1);
  });

  it('does not count overkill but counts execute', () => {
    const fight = enterNode(db, runAt('fight'), 'x');
    const withHand = (defId: string) =>
      patchCombat(fight, (c) => ({ ...c, hand: [{ uid: 'c99', defId, upgraded: false }] }));

    const nuked = runPlayCard(db, withHand('test-nuke'), 'c99');
    expect(combatOf(nuked).phase).toBe('won');
    expect(nuked.stats.damageDealt).toBe(20);

    const executed = runPlayCard(db, withHand('test-execute'), 'c99');
    expect(combatOf(executed).phase).toBe('won');
    expect(executed.stats.damageDealt).toBe(20);
  });

  it('stops accepting combat actions once the combat is over', () => {
    const fight = enterNode(db, runAt('fight'), 'x');
    const won = forceOutcome(fight, 'won');
    expect(runEndTurn(db, won)).toBe(won);
    expect(runPlayCard(db, won, combatOf(won).hand[0]?.uid ?? '')).toBe(won);
  });
});

// ---------------------------------------------------------------------------
// resolveCombat and rewards
// ---------------------------------------------------------------------------

describe('resolveCombat', () => {
  it('is a no-op while the combat is running or outside combat', () => {
    const run = createRun(db, 4);
    expect(resolveCombat(db, run)).toBe(run);
    const fight = enterNode(db, runAt('fight'), 'x');
    expect(resolveCombat(db, fight)).toBe(fight);
  });

  it('moves to defeat when the combat is lost and freezes the run', () => {
    const fight = enterNode(db, runAt('fight'), 'x');
    const lost = resolveCombat(db, forceOutcome(fight, 'lost'));
    expect(lost.screen).toEqual({ type: 'defeat', nodeId: 'x' });
    expect(lost.hp).toBe(0);
    expect(lost.stats.enemiesDefeated).toBe(0);
    expect(lost.stats.floorsCleared).toBe(0);
    for (const next of ALL_ACTIONS(lost)) expect(next).toBe(lost);
    expect(availableNodes(lost)).toEqual([]);
  });

  it('syncs HP, stats and rolls a reward after a normal fight', () => {
    const fight = enterNode(db, runAt('fight'), 'x');
    const won = resolveCombat(db, forceOutcome(fight, 'won', 41));
    const { reward, nodeId } = screenOf(won, 'reward');
    expect(nodeId).toBe('x');
    expect(won.hp).toBe(41);
    expect(won.maxHp).toBe(STARTING_HP);
    expect(reward.maxHpGain).toBe(0);
    expect(reward.fossilsFound).toEqual(['fossil-trias-normal-0']);
    expect(reward.choices).toHaveLength(3);
    expect(new Set(reward.choices).size).toBe(3);
    expect(reward.choices.every((id) => db.cards[id] && db.cards[id]?.rarity !== 'starter')).toBe(true);
    expect(won.stats).toMatchObject({ enemiesDefeated: 1, elitesDefeated: 0, bossesDefeated: 0, floorsCleared: 1 });
    // Resolving twice does nothing.
    expect(resolveCombat(db, won)).toBe(won);
  });

  it('grants max HP after elites and bosses', () => {
    const elite = resolveCombat(db, forceOutcome(enterNode(db, runAt('elite'), 'x'), 'won', 30));
    expect(screenOf(elite, 'reward').reward.maxHpGain).toBe(MAX_HP_GAIN.elite);
    expect(elite.maxHp).toBe(STARTING_HP + 4);
    expect(elite.hp).toBe(34);
    expect(elite.stats).toMatchObject({ enemiesDefeated: 1, elitesDefeated: 1, bossesDefeated: 0 });

    const boss = resolveCombat(db, forceOutcome(enterNode(db, runAt('boss'), 'x'), 'won', STARTING_HP));
    const { reward } = screenOf(boss, 'reward');
    expect(reward.maxHpGain).toBe(8);
    expect(boss.maxHp).toBe(STARTING_HP + 8);
    expect(boss.hp).toBe(STARTING_HP + 8);
    expect(reward.choices.every((id) => db.cards[id]?.rarity === 'rare')).toBe(true);
    expect(boss.stats).toMatchObject({ enemiesDefeated: 1, elitesDefeated: 0, bossesDefeated: 1 });
  });
});

describe('rollCardChoices', () => {
  const rolls = (tier: EnemyTier, era: Era, n = 3000, content = db) =>
    Array.from({ length: n }, (_, i) => rollCardChoices(content, era, tier, i * 2654435761).value);

  it('returns 3 distinct non-starter cards with at least 2 from the current era', () => {
    for (const era of ERAS) {
      for (const tier of ['normal', 'elite', 'boss'] as const) {
        for (const choices of rolls(tier, era, 300)) {
          expect(choices).toHaveLength(3);
          expect(new Set(choices).size).toBe(3);
          expect(choices.every((id) => db.cards[id]?.rarity !== 'starter')).toBe(true);
          if (tier !== 'boss') {
            expect(choices.filter((id) => db.cards[id]?.era === era).length).toBeGreaterThanOrEqual(2);
          }
        }
      }
    }
  });

  it('boss rewards are rare only (2 rares per era, so the era rule yields)', () => {
    for (const choices of rolls('boss', 'kreide', 300)) {
      expect(choices.every((id) => db.cards[id]?.rarity === 'rare')).toBe(true);
      expect(choices.filter((id) => db.cards[id]?.era === 'kreide').length).toBe(2);
    }
  });

  it('follows the rarity odds per tier', () => {
    const share = (tier: EnemyTier) => {
      const all = rolls(tier, 'jura').flat();
      const count = (rarity: Rarity) => all.filter((id) => db.cards[id]?.rarity === rarity).length / all.length;
      return { common: count('common'), uncommon: count('uncommon'), rare: count('rare') };
    };
    const normal = share('normal');
    expect(normal.common).toBeCloseTo(0.6, 1);
    expect(normal.uncommon).toBeCloseTo(0.33, 1);
    expect(normal.rare).toBeCloseTo(0.07, 1);
    const elite = share('elite');
    expect(elite.common).toBeCloseTo(0.4, 1);
    expect(elite.uncommon).toBeCloseTo(0.45, 1);
    expect(elite.rare).toBeCloseTo(0.15, 1);
  });

  it('is deterministic per RNG state', () => {
    expect(rollCardChoices(db, 'trias', 'normal', 77)).toEqual(rollCardChoices(db, 'trias', 'normal', 77));
  });

  it('falls back to neighbouring rarities and never offers starter-deck cards', () => {
    const noRares: ContentDB = {
      ...db,
      cards: Object.fromEntries(Object.entries(db.cards).filter(([, c]) => c.rarity !== 'rare')),
    };
    for (const choices of rolls('boss', 'trias', 100, noRares)) {
      expect(choices).toHaveLength(3);
      expect(choices.every((id) => noRares.cards[id]?.rarity === 'uncommon')).toBe(true);
    }

    const starterCommon: ContentDB = { ...db, starterDeck: ['trias-common-0'] };
    for (const choices of rolls('normal', 'trias', 300, starterCommon)) {
      expect(choices).not.toContain('trias-common-0');
    }

    const tiny: ContentDB = {
      ...db,
      cards: { a: card('a', 'jura', 'rare', 'attack', []), b: card('b', 'trias', 'common', 'attack', []) },
    };
    expect(rollCardChoices(tiny, 'trias', 'normal', 1).value.sort()).toEqual(['a', 'b']);
  });
});

// ---------------------------------------------------------------------------
// Choices: reward, dig, rest
// ---------------------------------------------------------------------------

describe('chooseCardReward', () => {
  const rewardRun = () => resolveCombat(db, forceOutcome(enterNode(db, runAt('fight'), 'x'), 'won'));

  it('adds the chosen card with a fresh uid and returns to the map', () => {
    const run = rewardRun();
    const pick = screenOf(run, 'reward').reward.choices[1] as string;
    const next = chooseCardReward(db, run, pick);
    expect(next.screen).toEqual({ type: 'map' });
    expect(next.deck).toHaveLength(run.deck.length + 1);
    expect(next.deck[next.deck.length - 1]).toEqual({ uid: `c${run.nextUid}`, defId: pick, upgraded: false });
    expect(next.nextUid).toBe(run.nextUid + 1);
  });

  it('skips with null and rejects cards that were not offered', () => {
    const run = rewardRun();
    const skipped = chooseCardReward(db, run, null);
    expect(skipped.deck).toBe(run.deck);
    expect(skipped.nextUid).toBe(run.nextUid);
    expect(skipped.screen).toEqual({ type: 'map' });

    const offered = screenOf(run, 'reward').reward.choices;
    const other = Object.keys(db.cards).find((id) => !offered.includes(id)) as string;
    expect(chooseCardReward(db, run, other)).toBe(run);
    const onMap = createRun(db, 1);
    expect(chooseCardReward(db, onMap, offered[0] ?? null)).toBe(onMap);
  });

  it('ends the act after a boss and wins the run after the last boss', () => {
    const boss = (act: number) =>
      resolveCombat(db, forceOutcome(enterNode(db, runAt('boss', { act }), 'x'), 'won'));
    expect(chooseCardReward(db, boss(0), null).screen).toEqual({ type: 'actComplete', act: 0 });
    expect(chooseCardReward(db, boss(2), null).screen).toEqual({ type: 'actComplete', act: 2 });
    const last = boss(ACT_COUNT - 1);
    expect(last.screen.type).toBe('reward'); // the reward is still shown first
    expect(chooseCardReward(db, last, null).screen).toEqual({ type: 'victory' });
  });
});

describe('chooseDig', () => {
  it('adds an offered card, skips with null and rejects others', () => {
    const run = enterNode(db, runAt('dig'), 'x');
    const { choices } = screenOf(run, 'dig');
    const picked = chooseDig(db, run, choices[0] ?? null);
    expect(picked.deck[picked.deck.length - 1]).toEqual({ uid: `c${run.nextUid}`, defId: choices[0], upgraded: false });
    expect(picked.screen).toEqual({ type: 'map' });
    expect(picked.stats.floorsCleared).toBe(run.stats.floorsCleared + 1);

    const skipped = chooseDig(db, run, null);
    expect(skipped.deck).toEqual(run.deck);
    expect(skipped.screen).toEqual({ type: 'map' });

    expect(chooseDig(db, run, 'strike')).toBe(run);
    const onMap = createRun(db, 1);
    expect(chooseDig(db, onMap, null)).toBe(onMap);
  });
});

describe('chooseRest', () => {
  it('heals 30 % of max HP rounded up, capped at max HP', () => {
    const rest = (hp: number, maxHp: number) => chooseRest(db, enterNode(db, runAt('rest', { hp, maxHp }), 'x'), { type: 'heal' });
    expect(rest(10, 60).hp).toBe(28);
    expect(rest(10, 64).hp).toBe(30); // 19.2 → 20
    expect(rest(55, 60).hp).toBe(60);
    const done = rest(10, 60);
    expect(done.screen).toEqual({ type: 'map' });
    expect(done.stats.floorsCleared).toBe(1);
  });

  it('upgrades one not-yet-upgraded card; invalid upgrades are no-ops', () => {
    const run = enterNode(db, runAt('rest'), 'x');
    const upgraded = chooseRest(db, run, { type: 'upgrade', uid: 'c3' });
    expect(upgraded.deck.find((c) => c.uid === 'c3')?.upgraded).toBe(true);
    expect(upgraded.deck.filter((c) => c.upgraded)).toHaveLength(1);
    expect(upgraded.hp).toBe(run.hp);
    expect(upgraded.screen).toEqual({ type: 'map' });

    expect(chooseRest(db, run, { type: 'upgrade', uid: 'nope' })).toBe(run);
    const already = { ...run, deck: run.deck.map((c) => (c.uid === 'c3' ? { ...c, upgraded: true } : c)) };
    expect(chooseRest(db, already, { type: 'upgrade', uid: 'c3' })).toBe(already);
    const map = createRun(db, 1);
    expect(chooseRest(db, map, { type: 'heal' })).toBe(map);
  });
});

// ---------------------------------------------------------------------------
// Acts, victory, invariants
// ---------------------------------------------------------------------------

describe('startNextAct', () => {
  it('advances the act, heals half the missing HP and builds the next map', () => {
    const boss = resolveCombat(db, forceOutcome(enterNode(db, runAt('boss'), 'x'), 'won', 13));
    const complete = chooseCardReward(db, boss, null);
    expect(complete.maxHp).toBe(68);
    expect(complete.hp).toBe(21);
    const next = startNextAct(db, complete);
    expect(next.act).toBe(1);
    expect(next.hp).toBe(21 + Math.ceil(47 / 2));
    expect(next.currentNodeId).toBeNull();
    expect(next.screen).toEqual({ type: 'map' });
    expect(next.map.every((n) => n.id.startsWith('a1'))).toBe(true);
    const enemies = next.map.flatMap((n) => (n.enemyId ? [db.enemies[n.enemyId]] : []));
    expect(enemies.every((e) => e?.era === 'jura')).toBe(true);
    expect(availableNodes(next).every((n) => n.floor === 0)).toBe(true);
  });

  it('is a no-op outside the act-complete screen', () => {
    const run = createRun(db, 1);
    expect(startNextAct(db, run)).toBe(run);
  });
});

describe('full run with forced combat outcomes', () => {
  it('progresses through all four acts to victory', () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      let run = createRun(db, seed);
      const actsCompleted: number[] = [];
      let sawFinalReward = false;
      for (let step = 0; step < 1000 && run.screen.type !== 'victory'; step++) {
        const screen = run.screen;
        switch (screen.type) {
          case 'map': {
            const options = availableNodes(run);
            expect(options.length).toBeGreaterThan(0);
            run = enterNode(db, run, (options[step % options.length] as MapNode).id);
            break;
          }
          case 'combat':
            run = resolveCombat(db, forceOutcome(run, 'won'));
            break;
          case 'reward':
            if (currentNode(run)?.type === 'boss') {
              expect(screen.reward.choices.every((id) => db.cards[id]?.rarity === 'rare')).toBe(true);
              if (run.act === ACT_COUNT - 1) sawFinalReward = true;
            }
            run = chooseCardReward(db, run, screen.reward.choices[0] ?? null);
            break;
          case 'rest':
            run = chooseRest(db, run, { type: 'heal' });
            break;
          case 'dig':
            run = chooseDig(db, run, screen.choices[0] ?? null);
            break;
          case 'actComplete':
            actsCompleted.push(screen.act);
            run = startNextAct(db, run);
            break;
          case 'defeat':
            throw new Error('unexpected defeat');
        }
      }
      expect(run.screen).toEqual({ type: 'victory' });
      expect(sawFinalReward).toBe(true);
      expect(actsCompleted).toEqual([0, 1, 2]);
      expect(run.act).toBe(ACT_COUNT - 1);
      expect(run.stats.bossesDefeated).toBe(ACT_COUNT);
      expect(run.stats.floorsCleared).toBe(ACT_COUNT * 6);
      expect(run.visited).toHaveLength(ACT_COUNT * 6);
      expect(run.maxHp).toBe(STARTING_HP + 8 * ACT_COUNT + 4 * run.stats.elitesDefeated);

      const uids = run.deck.map((c) => c.uid);
      expect(new Set(uids).size).toBe(uids.length);
      expect(uids.every((uid) => Number(uid.slice(1)) < run.nextUid)).toBe(true);
      expect(run.deck.length).toBeGreaterThan(db.starterDeck.length);

      // Victory is terminal.
      for (const next of ALL_ACTIONS(run)) expect(next).toBe(run);
    }
  });
});

describe('purity', () => {
  it('never mutates its inputs', () => {
    const frozenDb = deepFreeze(makeDb());
    let run = deepFreeze(createRun(frozenDb, 2024));
    for (let step = 0; step < 400 && run.screen.type !== 'victory' && run.screen.type !== 'defeat'; step++) {
      const before = snapshot(run);
      const screen = run.screen;
      let next: RunState;
      switch (screen.type) {
        case 'map':
          next = enterNode(frozenDb, run, availableNodes(run)[0]?.id ?? '');
          break;
        case 'combat': {
          if (screen.combat.phase !== 'player') next = resolveCombat(frozenDb, run);
          else if (screen.combat.turn > 3) next = resolveCombat(frozenDb, forceOutcome(run, 'won'));
          else {
            const played = runPlayCard(frozenDb, run, screen.combat.hand[0]?.uid ?? '');
            next = played === run ? runEndTurn(frozenDb, run) : played;
          }
          break;
        }
        case 'reward':
          next = chooseCardReward(frozenDb, run, screen.reward.choices[0] ?? null);
          break;
        case 'rest':
          next = chooseRest(frozenDb, run, { type: 'upgrade', uid: run.deck.find((c) => !c.upgraded)?.uid ?? '' });
          break;
        case 'dig':
          next = chooseDig(frozenDb, run, screen.choices[0] ?? null);
          break;
        case 'actComplete':
          next = startNextAct(frozenDb, run);
          break;
      }
      expect(snapshot(run)).toBe(before);
      expect(next).not.toBe(run);
      run = deepFreeze(next);
    }
    expect(run.act).toBeGreaterThan(0);
  });
});

describe('deckFossils', () => {
  it('lists the unique fossils of the deck cards', () => {
    const run = createRun(db, 1);
    expect(deckFossils(db, run)).toEqual(['fossil-strike', 'fossil-guard']);
    const withUnknown = { ...run, deck: [...run.deck, { uid: 'c10', defId: 'ghost', upgraded: false }] };
    expect(deckFossils(db, withUnknown)).toEqual(['fossil-strike', 'fossil-guard']);
  });
});
