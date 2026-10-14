import { BOSS_FLOOR, FLOORS_PER_ACT, MAX_HP_GAIN, REST_HEAL_PERCENT } from '@/engine/run';
import type { ContentDB, EnemyDef, EnemyTier, MapNode, NodeType } from '@/engine/types';

// Pure view model of the expedition map: node/edge states, German labels and
// the info shown in the node sheet. No React, no store access.

export type NodeState = 'current' | 'visited' | 'available' | 'reachable' | 'unreachable';
export type EdgeState = 'travelled' | 'available' | 'open' | 'closed';

export interface NodeTypeInfo {
  icon: string;
  label: string;
  /** Short German explanation for the node sheet and the legend. */
  hint: string;
}

export const NODE_TYPES: readonly NodeType[] = ['fight', 'elite', 'rest', 'dig', 'boss'];

export const NODE_INFO: Record<NodeType, NodeTypeInfo> = {
  fight: {
    icon: '⚔️',
    label: 'Kampf',
    hint: 'Ein Tier dieser Ära stellt sich dir in den Weg. Nach dem Sieg wählst du eine neue Karte.',
  },
  elite: {
    icon: '💀',
    label: 'Elite',
    hint: `Ein besonders gefährlicher Gegner. Dafür winken seltenere Karten und +${MAX_HP_GAIN.elite} Max-LP.`,
  },
  rest: {
    icon: '🔥',
    label: 'Rast',
    hint: `Am Lagerfeuer heilst du ${REST_HEAL_PERCENT} % deiner Max-LP oder verbesserst eine Karte.`,
  },
  dig: {
    icon: '⛏️',
    label: 'Ausgrabung',
    hint: 'Kein Kampf: Lege ein Fossil frei und nimm 1 von 3 Karten mit.',
  },
  boss: {
    icon: '👑',
    label: 'Boss',
    hint: `Der Herrscher dieser Ära. Besiege ihn, um den Akt abzuschließen (+${MAX_HP_GAIN.boss} Max-LP, nur seltene Karten).`,
  },
};

export const TIER_LABELS: Record<EnemyTier, string> = {
  normal: 'Normaler Gegner',
  elite: 'Elite-Gegner',
  boss: 'Boss',
};

export const NODE_STATE_LABELS: Record<NodeState, string> = {
  current: 'dein Standort',
  visited: 'besucht',
  available: 'jetzt erreichbar',
  reachable: 'später erreichbar',
  unreachable: 'nicht mehr erreichbar',
};

export interface MapState {
  /** Node ids of this act on the travelled path, in order. */
  path: string[];
  current: string | null;
  available: ReadonlySet<string>;
  reachable: ReadonlySet<string>;
}

/**
 * Derives the map state. `availableIds` comes from the engine
 * (`availableNodes`, empty outside the map screen); `reachable` holds every
 * node that can still be reached from the current position.
 */
export interface MapProgress {
  map: readonly MapNode[];
  visited: readonly string[];
  currentNodeId: string | null;
}

export function deriveMapState(run: MapProgress, availableIds: readonly string[]): MapState {
  const byId = new Map(run.map.map((node) => [node.id, node] as const));
  const path = run.visited.filter((id) => byId.has(id));
  const current = run.currentNodeId !== null && byId.has(run.currentNodeId) ? run.currentNodeId : null;

  const reachable = new Set<string>();
  const queue: string[] = current === null ? run.map.filter((node) => node.floor === 0).map((node) => node.id) : [];
  if (current !== null) queue.push(...(byId.get(current)?.next ?? []));
  while (queue.length > 0) {
    const id = queue.shift();
    if (id === undefined || reachable.has(id)) continue;
    const node = byId.get(id);
    if (!node) continue;
    reachable.add(id);
    queue.push(...node.next);
  }

  return { path, current, available: new Set(availableIds), reachable };
}

export function nodeState(state: MapState, nodeId: string): NodeState {
  if (nodeId === state.current) return 'current';
  if (state.path.includes(nodeId)) return 'visited';
  if (state.available.has(nodeId)) return 'available';
  if (state.reachable.has(nodeId)) return 'reachable';
  return 'unreachable';
}

export function edgeState(state: MapState, from: string, to: string): EdgeState {
  const index = state.path.indexOf(from);
  if (index >= 0 && state.path[index + 1] === to) return 'travelled';
  if (from === state.current && state.available.has(to)) return 'available';
  const fromOpen = from === state.current || state.reachable.has(from);
  if (fromOpen && state.reachable.has(to)) return 'open';
  return 'closed';
}

/** Floor the map should scroll to: the next floor to enter (0 at act start). */
export function focusFloor(run: Pick<MapProgress, 'map' | 'currentNodeId'>): number {
  const current = run.map.find((node) => node.id === run.currentNodeId);
  if (!current) return 0;
  return Math.min(BOSS_FLOOR, current.floor + 1);
}

/** "Etage 3 von 6": the floor the player stands on (0 before the first node). */
export function floorProgressText(run: Pick<MapProgress, 'map' | 'currentNodeId'>): string {
  const current = run.map.find((node) => node.id === run.currentNodeId);
  const reached = current ? current.floor + 1 : 0;
  return reached === 0 ? `Start · ${FLOORS_PER_ACT} Etagen` : `Etage ${reached} von ${FLOORS_PER_ACT}`;
}

export function floorName(floor: number): string {
  return floor >= BOSS_FLOOR ? `Etage ${floor + 1}, Boss-Etage` : `Etage ${floor + 1}`;
}

/** Spoken label of a map node, e.g. "Kampf, Etage 2, jetzt erreichbar". */
export function nodeAccessibilityLabel(node: Pick<MapNode, 'type' | 'floor'>, state: NodeState): string {
  return `${NODE_INFO[node.type].label}, ${floorName(node.floor)}, ${NODE_STATE_LABELS[state]}`;
}

export function nodeAccessibilityHint(state: NodeState): string {
  return state === 'available' ? 'Zeigt Details und lässt dich den Ort betreten.' : 'Zeigt Details zu diesem Ort.';
}

function tierOfType(type: NodeType): EnemyTier | null {
  if (type === 'fight') return 'normal';
  if (type === 'elite') return 'elite';
  if (type === 'boss') return 'boss';
  return null;
}

export interface NodeSheetInfo {
  title: string;
  icon: string;
  label: string;
  hint: string;
  floorText: string;
  enemy: { emoji: string; name: string; tierLabel: string; hpText: string } | null;
  /** Max HP gained by winning (elite/boss), 0 otherwise. */
  maxHpGain: number;
  /** Shown instead of the "Betreten" button when the node cannot be entered. */
  lockedReason: string | null;
}

function hpText(enemy: EnemyDef): string {
  const [min, max] = enemy.hp;
  return min === max ? `${min} LP` : `${min}–${max} LP`;
}

const LOCKED_REASONS: Record<NodeState, string | null> = {
  available: null,
  current: 'Hier stehst du gerade.',
  visited: 'Diesen Ort hast du schon besucht.',
  reachable: 'Diesen Ort erreichst du erst später auf deinem Weg.',
  unreachable: 'Von deinem Standort führt kein Weg mehr hierher.',
};

/** Content of the bottom sheet that opens when a node is tapped. */
export function nodeSheetInfo(db: ContentDB, node: MapNode, state: NodeState): NodeSheetInfo {
  const info = NODE_INFO[node.type];
  const tier = tierOfType(node.type);
  const enemyDef = node.enemyId !== undefined ? db.enemies[node.enemyId] : undefined;
  return {
    title: `${info.icon} ${info.label}`,
    icon: info.icon,
    label: info.label,
    hint: info.hint,
    floorText: floorName(node.floor),
    enemy:
      tier !== null && enemyDef
        ? {
            emoji: enemyDef.emoji,
            name: enemyDef.name,
            tierLabel: TIER_LABELS[enemyDef.tier],
            hpText: hpText(enemyDef),
          }
        : null,
    maxHpGain: tier !== null ? MAX_HP_GAIN[tier] : 0,
    lockedReason: LOCKED_REASONS[state],
  };
}
