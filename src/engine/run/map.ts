import type { ContentDB, EnemyDef, EnemyTier, Era, MapNode, NodeType } from '../types';
import { ERAS } from '../types';
import { byId, pickOne, weightedPick } from './random';

// Act map generation. One act = FLOORS_PER_ACT floors; floors 0..BOSS_FLOOR-1
// hold 2–3 nodes on MAP_LANES lanes, the last floor holds the single boss.

export const FLOORS_PER_ACT = 6;
export const BOSS_FLOOR = FLOORS_PER_ACT - 1;
/** Lanes are 0..MAP_LANES-1; the boss sits in the middle lane. */
export const MAP_LANES = 3;
export const BOSS_LANE = 1;
/** Elites and rest sites never appear before this floor. */
export const MIN_ELITE_REST_FLOOR = 2;
/** Every non-boss node connects to 1..MAX_OUT_EDGES nodes of the next floor. */
export const MAX_OUT_EDGES = 2;

const LAYOUTS: readonly (readonly [readonly number[], number])[] = [
  [[0, 1, 2], 4],
  [[0, 1], 2],
  [[1, 2], 2],
  [[0, 2], 1],
];

type SpecialType = Exclude<NodeType, 'boss'>;

/** Node type weights for the floors between the opening fights and the boss. */
function typeWeights(floor: number): Record<SpecialType, number> {
  if (floor < MIN_ELITE_REST_FLOOR) return { fight: 70, elite: 0, rest: 0, dig: 30 };
  if (floor === BOSS_FLOOR - 1) return { fight: 35, elite: 20, rest: 30, dig: 15 };
  if (floor === MIN_ELITE_REST_FLOOR) return { fight: 50, elite: 15, rest: 15, dig: 20 };
  return { fight: 45, elite: 20, rest: 15, dig: 20 };
}

/** Era of a 0-based act (clamped to the last era). */
export function eraForAct(act: number): Era {
  const index = Math.max(0, Math.min(ERAS.length - 1, Math.floor(act)));
  return ERAS[index] ?? 'trias';
}

/** Node id, unique per run: "a{act}f{floor}n{index}". */
export function nodeId(act: number, floor: number, index: number): string {
  return `a${act}f${floor}n${index}`;
}

/** Edge as [fromIndex, toIndex] into the lane arrays of two adjacent floors. */
type Edge = readonly [number, number];

/**
 * All non-crossing ways to connect two floors: monotone "staircase" paths
 * through the (from × to) grid. Every node gets at least one edge, edges only
 * join adjacent lanes and no node has more than MAX_OUT_EDGES outgoing edges.
 */
function connectionOptions(fromLanes: readonly number[], toLanes: readonly number[]): Edge[][] {
  const results: Edge[][] = [];
  const lastFrom = fromLanes.length - 1;
  const lastTo = toLanes.length - 1;
  const walk = (i: number, j: number, path: readonly Edge[]): void => {
    const a = fromLanes[i];
    const b = toLanes[j];
    if (a === undefined || b === undefined || Math.abs(a - b) > 1) return;
    const nextPath: Edge[] = [...path, [i, j]];
    if (i === lastFrom && j === lastTo) {
      results.push(nextPath);
      return;
    }
    if (i < lastFrom) walk(i + 1, j, nextPath);
    if (j < lastTo) walk(i, j + 1, nextPath);
    if (i < lastFrom && j < lastTo) walk(i + 1, j + 1, nextPath);
  };
  if (lastFrom >= 0 && lastTo >= 0) walk(0, 0, []);
  return results.filter((edges) => {
    const outDegree = new Map<number, number>();
    for (const [from] of edges) outDegree.set(from, (outDegree.get(from) ?? 0) + 1);
    return [...outDegree.values()].every((count) => count <= MAX_OUT_EDGES);
  });
}

interface DraftNode {
  id: string;
  floor: number;
  lane: number;
  type: NodeType;
  next: DraftNode[];
  prev: DraftNode[];
  enemyId?: string;
}

/**
 * Enemies for an era and tier, sorted by id. Falls back to the same tier of
 * any era, then normal enemies of the era, then anything, so broken content
 * never yields an unplayable map.
 */
export function enemyPool(db: ContentDB, era: Era, tier: EnemyTier): EnemyDef[] {
  const all = Object.values(db.enemies).sort(byId);
  const attempts = [
    all.filter((e) => e.era === era && e.tier === tier),
    all.filter((e) => e.tier === tier),
    all.filter((e) => e.era === era && e.tier === 'normal'),
    all,
  ];
  return attempts.find((pool) => pool.length > 0) ?? [];
}

function tierOf(type: NodeType): EnemyTier | null {
  if (type === 'fight') return 'normal';
  if (type === 'elite') return 'elite';
  if (type === 'boss') return 'boss';
  return null;
}

/**
 * Generates the map of one act. Pure and deterministic: the same
 * (content, act, seed) always yields the same map. Nodes are ordered by
 * floor, then lane.
 */
export function generateActMap(db: ContentDB, act: number, seed: number): MapNode[] {
  let rng = seed >>> 0;
  const era = eraForAct(act);

  // 1) Lane layout per floor and the connections between floors.
  const floors: DraftNode[][] = [];
  let prevLanes: readonly number[] = [];
  for (let floor = 0; floor < FLOORS_PER_ACT; floor++) {
    let lanes: readonly number[];
    let edges: Edge[] = [];
    if (floor === BOSS_FLOOR) {
      lanes = [BOSS_LANE];
    } else {
      const candidates = LAYOUTS.filter(
        ([layout]) => floor === 0 || connectionOptions(prevLanes, layout).length > 0,
      );
      const layout = weightedPick(rng, candidates);
      rng = layout.state;
      lanes = layout.value ?? [0, 1, 2];
    }
    if (floor > 0) {
      const option = pickOne(rng, connectionOptions(prevLanes, lanes));
      rng = option.state;
      edges = option.value ?? [];
    }

    const nodes: DraftNode[] = lanes.map((lane, index) => ({
      id: nodeId(act, floor, index),
      floor,
      lane,
      type: floor === BOSS_FLOOR ? 'boss' : 'fight',
      next: [],
      prev: [],
    }));
    const previous = floors[floor - 1] ?? [];
    for (const [fromIndex, toIndex] of edges) {
      const from = previous[fromIndex];
      const to = nodes[toIndex];
      if (from && to) {
        from.next.push(to);
        to.prev.push(from);
      }
    }
    floors.push(nodes);
    prevLanes = lanes;
  }

  // 2) Node types. Floor 0 is all fights, the boss floor is fixed. At most one
  // elite / rest / dig per floor, and a rest never follows another rest.
  for (let floor = 1; floor < BOSS_FLOOR; floor++) {
    const used = new Set<NodeType>();
    for (const node of floors[floor] ?? []) {
      const weights = typeWeights(floor);
      const entries = (Object.entries(weights) as [SpecialType, number][]).filter(([type]) => {
        if (type === 'fight') return true;
        if (used.has(type)) return false;
        if (type === 'rest') return !node.prev.some((p) => p.type === 'rest');
        return true;
      });
      const choice = weightedPick(rng, entries);
      rng = choice.state;
      node.type = choice.value ?? 'fight';
      used.add(node.type);
    }
  }

  // 3) Guarantee at least one rest and one dig per act.
  const all = floors.flat();
  const count = (type: NodeType) => all.filter((n) => n.type === type).length;
  const convert = (type: NodeType, minFloor: number, sources: NodeType[]): void => {
    if (count(type) > 0) return;
    for (const source of sources) {
      const candidates = all.filter(
        (n) =>
          n.type === source &&
          n.floor >= minFloor &&
          n.floor < BOSS_FLOOR &&
          !(type === 'rest' && [...n.prev, ...n.next].some((m) => m.type === 'rest')),
      );
      const choice = pickOne(rng, candidates);
      rng = choice.state;
      if (choice.value) {
        choice.value.type = type;
        return;
      }
    }
  };
  convert('rest', MIN_ELITE_REST_FLOOR, count('dig') > 1 ? ['fight', 'dig', 'elite'] : ['fight', 'elite']);
  convert('dig', 1, count('rest') > 1 ? ['fight', 'elite', 'rest'] : ['fight', 'elite']);

  // 4) Pre-roll enemies. Avoid repeating an enemy on directly connected nodes
  // (and, where possible, on sibling nodes of the same floor).
  for (const nodes of floors) {
    for (const node of nodes) {
      const tier = tierOf(node.type);
      if (!tier) continue;
      const pool = enemyPool(db, era, tier).map((e) => e.id);
      const fromPrev = new Set(node.prev.map((p) => p.enemyId));
      const fromSiblings = new Set(nodes.map((s) => s.enemyId));
      const attempts = [
        pool.filter((id) => !fromPrev.has(id) && !fromSiblings.has(id)),
        pool.filter((id) => !fromPrev.has(id)),
        pool,
      ];
      const choice = pickOne(rng, attempts.find((a) => a.length > 0) ?? []);
      rng = choice.state;
      if (choice.value !== undefined) node.enemyId = choice.value;
    }
  }

  return all.map((node) => {
    const mapNode: MapNode = {
      id: node.id,
      floor: node.floor,
      lane: node.lane,
      type: node.type,
      next: [...node.next].sort((a, b) => a.lane - b.lane).map((n) => n.id),
    };
    if (node.enemyId !== undefined) mapNode.enemyId = node.enemyId;
    return mapNode;
  });
}
