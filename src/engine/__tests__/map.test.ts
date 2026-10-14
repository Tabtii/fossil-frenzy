import { describe, expect, it } from '@jest/globals';
import {
  BOSS_FLOOR,
  BOSS_LANE,
  FLOORS_PER_ACT,
  MAP_LANES,
  MIN_ELITE_REST_FLOOR,
  createRun,
  eraForAct,
  generateActMap,
} from '../run';
import type { ContentDB, EnemyDef, EnemyTier, Era, MapNode } from '../types';
import { ERAS } from '../types';

// ---------------------------------------------------------------------------
// Fixture content (never import src/data in engine tests)
// ---------------------------------------------------------------------------

function enemy(id: string, era: Era, tier: EnemyTier): EnemyDef {
  return {
    id,
    name: id,
    emoji: '🦖',
    era,
    tier,
    hp: [20, 24],
    moves: [{ id: 'bite', name: 'Biss', effects: [{ type: 'attack', amount: 5 }] }],
    pattern: { type: 'cycle' },
    fossilId: `fossil-${id}`,
  };
}

function makeDb(): ContentDB {
  const enemies: EnemyDef[] = [];
  for (const era of ERAS) {
    for (let i = 0; i < 4; i++) enemies.push(enemy(`${era}-normal-${i}`, era, 'normal'));
    for (let i = 0; i < 2; i++) enemies.push(enemy(`${era}-elite-${i}`, era, 'elite'));
    enemies.push(enemy(`${era}-boss`, era, 'boss'));
  }
  return {
    cards: {},
    enemies: Object.fromEntries(enemies.map((e) => [e.id, e])),
    fossils: {},
    starterDeck: [],
  };
}

const db = makeDb();
const SEEDS = Array.from({ length: 200 }, (_, i) => i * 7919 + 1);

// ---------------------------------------------------------------------------
// Invariant checker
// ---------------------------------------------------------------------------

function nodeIndex(map: MapNode[]): Map<string, MapNode> {
  return new Map(map.map((node) => [node.id, node]));
}

function reachableFrom(map: MapNode[], starts: MapNode[], forward: boolean): Set<string> {
  const index = nodeIndex(map);
  const preds = new Map<string, string[]>();
  for (const node of map) {
    for (const id of node.next) preds.set(id, [...(preds.get(id) ?? []), node.id]);
  }
  const seen = new Set<string>();
  const queue = starts.map((n) => n.id);
  while (queue.length > 0) {
    const id = queue.pop() as string;
    if (seen.has(id)) continue;
    seen.add(id);
    const neighbours = forward ? (index.get(id)?.next ?? []) : (preds.get(id) ?? []);
    queue.push(...neighbours);
  }
  return seen;
}

/** Returns a list of human-readable rule violations (empty when valid). */
function mapViolations(map: MapNode[], act: number): string[] {
  const problems: string[] = [];
  const fail = (message: string) => problems.push(message);
  const index = nodeIndex(map);
  const era = eraForAct(act);

  // Unique, well-formed ids.
  if (index.size !== map.length) fail('duplicate node ids');
  for (const node of map) {
    if (!new RegExp(`^a${act}f${node.floor}n\\d+$`).test(node.id)) fail(`bad id ${node.id}`);
  }

  // Ordered by floor, then lane.
  const sorted = [...map].sort((a, b) => a.floor - b.floor || a.lane - b.lane);
  if (sorted.some((n, i) => n !== map[i])) fail('nodes not ordered by floor/lane');

  // Floors: 0..BOSS_FLOOR-1 with 2–3 nodes, the boss floor with one boss.
  for (let floor = 0; floor < FLOORS_PER_ACT; floor++) {
    const nodes = map.filter((n) => n.floor === floor);
    if (floor === BOSS_FLOOR) {
      const [boss] = nodes;
      if (nodes.length !== 1 || boss?.type !== 'boss') fail('boss floor must hold one boss');
      if (boss?.lane !== BOSS_LANE || boss.next.length !== 0) fail('boss lane/next');
    } else if (nodes.length < 2 || nodes.length > 3) {
      fail(`floor ${floor} has ${nodes.length} nodes`);
    }
    const lanes = nodes.map((n) => n.lane);
    if (new Set(lanes).size !== lanes.length) fail(`floor ${floor} reuses a lane`);
    if (lanes.some((l) => l < 0 || l >= MAP_LANES)) fail(`floor ${floor} lane out of range`);
  }
  if (map.some((n) => n.floor < 0 || n.floor >= FLOORS_PER_ACT)) fail('floor out of range');
  if (map.some((n) => n.type === 'boss' && n.floor !== BOSS_FLOOR)) fail('boss before last floor');

  // Edges: 1–2 per node, next floor only, adjacent lanes, no crossings.
  const edges: [MapNode, MapNode][] = [];
  for (const node of map) {
    if (node.floor === BOSS_FLOOR) continue;
    if (node.next.length < 1 || node.next.length > 2) fail(`${node.id} has ${node.next.length} edges`);
    if (new Set(node.next).size !== node.next.length) fail(`${node.id} duplicate edge`);
    for (const id of node.next) {
      const target = index.get(id);
      if (!target) {
        fail(`${node.id} -> unknown ${id}`);
        continue;
      }
      if (target.floor !== node.floor + 1) fail(`${node.id} -> ${id} skips floors`);
      if (Math.abs(target.lane - node.lane) > 1) fail(`${node.id} -> ${id} not adjacent`);
      edges.push([node, target]);
    }
  }
  for (const [a, b] of edges) {
    for (const [c, d] of edges) {
      if (a.floor === c.floor && a.lane < c.lane && b.lane > d.lane) fail(`crossing ${a.id}/${c.id}`);
    }
  }

  // Reachability: every node from floor 0, and the boss from every node.
  const start = map.filter((n) => n.floor === 0);
  if (reachableFrom(map, start, true).size !== map.length) fail('unreachable node');
  const boss = map.filter((n) => n.type === 'boss');
  if (reachableFrom(map, boss, false).size !== map.length) fail('node without path to boss');

  // Node type rules.
  for (const node of map) {
    if (node.floor === 0 && node.type !== 'fight') fail(`floor 0 ${node.type}`);
    if ((node.type === 'elite' || node.type === 'rest') && node.floor < MIN_ELITE_REST_FLOOR) {
      fail(`${node.type} on floor ${node.floor}`);
    }
  }
  if (!map.some((n) => n.type === 'rest')) fail('no rest site');
  if (!map.some((n) => n.type === 'dig')) fail('no dig site');
  for (const [from, to] of edges) {
    if (from.type === 'rest' && to.type === 'rest') fail(`rest -> rest ${from.id}`);
  }

  // Enemies: pre-rolled for combat nodes, matching era and tier.
  for (const node of map) {
    const tier: EnemyTier | null =
      node.type === 'fight' ? 'normal' : node.type === 'elite' ? 'elite' : node.type === 'boss' ? 'boss' : null;
    if (tier === null) {
      if (node.enemyId !== undefined) fail(`${node.id} (${node.type}) has an enemy`);
      continue;
    }
    const def = node.enemyId === undefined ? undefined : db.enemies[node.enemyId];
    if (!def || def.era !== era || def.tier !== tier) fail(`${node.id} enemy ${node.enemyId}`);
  }
  for (const [from, to] of edges) {
    if (from.type === 'fight' && to.type === 'fight' && from.enemyId === to.enemyId) {
      fail(`repeated enemy ${from.id} -> ${to.id}`);
    }
  }
  return problems;
}

function expectValidMap(map: MapNode[], act: number): void {
  expect(mapViolations(map, act)).toEqual([]);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('generateActMap', () => {
  it('satisfies all map invariants for 200 seeds in every act', () => {
    for (const seed of SEEDS) {
      for (let act = 0; act < ERAS.length; act++) {
        expectValidMap(generateActMap(db, act, seed), act);
      }
    }
  });

  it('is deterministic per seed and act', () => {
    for (const seed of SEEDS.slice(0, 20)) {
      expect(generateActMap(db, 2, seed)).toEqual(generateActMap(db, 2, seed));
    }
  });

  it('does not depend on the key order of the content registry', () => {
    const reversed: ContentDB = {
      ...db,
      enemies: Object.fromEntries(Object.entries(db.enemies).reverse()),
    };
    for (const seed of SEEDS.slice(0, 20)) {
      expect(generateActMap(reversed, 1, seed)).toEqual(generateActMap(db, 1, seed));
    }
  });

  it('produces varied maps across seeds', () => {
    const maps = SEEDS.map((seed) => generateActMap(db, 0, seed));
    const distinct = new Set(maps.map((map) => JSON.stringify(map)));
    expect(distinct.size).toBeGreaterThan(150);

    const all = maps.flat();
    for (const type of ['fight', 'elite', 'rest', 'dig', 'boss'] as const) {
      expect(all.some((n) => n.type === type)).toBe(true);
    }
    const floorSizes = new Set(
      maps.flatMap((map) => [0, 1, 2, 3, 4].map((f) => map.filter((n) => n.floor === f).length)),
    );
    expect([...floorSizes].sort()).toEqual([2, 3]);
    // Splits and merges both occur.
    expect(all.some((n) => n.next.length === 2)).toBe(true);
    const merges = maps.some((map) => {
      const targets = map.filter((n) => n.floor < BOSS_FLOOR - 1).flatMap((n) => n.next);
      return new Set(targets).size < targets.length;
    });
    expect(merges).toBe(true);
  });

  it('uses all enemies of an era across seeds', () => {
    const seen = new Set(
      SEEDS.flatMap((seed) => generateActMap(db, 3, seed).map((n) => n.enemyId)).filter(Boolean),
    );
    const eiszeit = Object.values(db.enemies).filter((e) => e.era === 'eiszeit');
    expect([...seen].sort()).toEqual(eiszeit.map((e) => e.id).sort());
  });

  it('falls back to other eras when an era lacks a tier', () => {
    const noJuraElites: ContentDB = {
      ...db,
      enemies: Object.fromEntries(
        Object.entries(db.enemies).filter(([, e]) => !(e.era === 'jura' && e.tier === 'elite')),
      ),
    };
    for (const seed of SEEDS.slice(0, 50)) {
      for (const node of generateActMap(noJuraElites, 1, seed)) {
        if (node.type === 'elite') {
          expect(node.enemyId).toBeDefined();
          expect(noJuraElites.enemies[node.enemyId ?? '']?.tier).toBe('elite');
        }
      }
    }
  });

  it('node ids are unique across all acts of a run', () => {
    for (const seed of SEEDS.slice(0, 20)) {
      const ids = [0, 1, 2, 3].flatMap((act) => generateActMap(db, act, seed).map((n) => n.id));
      expect(new Set(ids).size).toBe(ids.length);
    }
  });
});

describe('map invariant checker', () => {
  it('detects broken maps (guards the invariant test itself)', () => {
    const valid = generateActMap(db, 0, 5);
    expect(mapViolations(valid, 0)).toEqual([]);

    const firstFight = valid.find((n) => n.floor === 0) as MapNode;
    const orphan = valid.map((n) => (n.floor === 0 ? { ...n, next: [] } : n));
    expect(mapViolations(orphan, 0).length).toBeGreaterThan(0);

    const eliteStart = valid.map((n) => (n.id === firstFight.id ? { ...n, type: 'elite' as const } : n));
    expect(mapViolations(eliteStart, 0)).toContain('floor 0 elite');

    const noRest = valid.map((n) => (n.type === 'rest' ? { ...n, type: 'fight' as const, enemyId: 'trias-normal-0' } : n));
    expect(mapViolations(noRest, 0)).toContain('no rest site');

    const wrongEra = valid.map((n) => (n.type === 'boss' ? { ...n, enemyId: 'jura-boss' } : n));
    expect(mapViolations(wrongEra, 0).some((p) => p.includes('enemy jura-boss'))).toBe(true);
  });
});

describe('eraForAct', () => {
  it('maps acts to eras in order and clamps out-of-range acts', () => {
    expect([0, 1, 2, 3].map(eraForAct)).toEqual(['trias', 'jura', 'kreide', 'eiszeit']);
    expect(eraForAct(-1)).toBe('trias');
    expect(eraForAct(9)).toBe('eiszeit');
  });
});

describe('createRun map', () => {
  it('starts on a valid Trias map and is reproducible from the seed', () => {
    for (const seed of SEEDS.slice(0, 50)) {
      const run = createRun(db, seed);
      expectValidMap(run.map, 0);
      expect(createRun(db, seed)).toEqual(run);
    }
    expect(createRun(db, 1).map).not.toEqual(createRun(db, 2).map);
  });
});
