import { describe, expect, it } from '@jest/globals';

import { CONTENT } from '@/data';
import { availableNodes, createRun } from '@/engine/run';
import type { EnemyDef, MapNode } from '@/engine/types';

import {
  deriveMapState,
  edgeState,
  floorProgressText,
  focusFloor,
  NODE_INFO,
  NODE_TYPES,
  nodeAccessibilityLabel,
  nodeSheetInfo,
  nodeState,
} from '../mapModel';

// Small hand-made map:
//   f2:        boss
//            /      \
//   f1:   b0          b1
//         |  \        |
//   f0:   a0   a1 ----+
const MAP: MapNode[] = [
  { id: 'a0', floor: 0, lane: 0, type: 'fight', next: ['b0'], enemyId: 'x' },
  { id: 'a1', floor: 0, lane: 1, type: 'fight', next: ['b0', 'b1'], enemyId: 'x' },
  { id: 'b0', floor: 1, lane: 0, type: 'rest', next: ['boss'] },
  { id: 'b1', floor: 1, lane: 2, type: 'dig', next: ['boss'] },
  { id: 'boss', floor: 2, lane: 1, type: 'boss', next: [], enemyId: 'y' },
];

describe('deriveMapState', () => {
  it('starts with every node reachable and floor 0 available', () => {
    const state = deriveMapState({ map: MAP, visited: [], currentNodeId: null }, ['a0', 'a1']);
    expect(state.current).toBeNull();
    expect([...state.reachable].sort()).toEqual(['a0', 'a1', 'b0', 'b1', 'boss']);
    expect(nodeState(state, 'a0')).toBe('available');
    expect(nodeState(state, 'boss')).toBe('reachable');
    expect(edgeState(state, 'a0', 'b0')).toBe('open');
  });

  it('marks the path, the current node and nodes that can no longer be reached', () => {
    const state = deriveMapState({ map: MAP, visited: ['old-act-node', 'a0'], currentNodeId: 'a0' }, ['b0']);
    expect(state.path).toEqual(['a0']);
    expect(nodeState(state, 'a0')).toBe('current');
    expect(nodeState(state, 'b0')).toBe('available');
    expect(nodeState(state, 'a1')).toBe('unreachable');
    expect(nodeState(state, 'b1')).toBe('unreachable');
    expect(nodeState(state, 'boss')).toBe('reachable');
    expect(edgeState(state, 'a0', 'b0')).toBe('available');
    expect(edgeState(state, 'b0', 'boss')).toBe('open');
    expect(edgeState(state, 'a1', 'b1')).toBe('closed');
    expect(edgeState(state, 'b1', 'boss')).toBe('closed');
  });

  it('highlights travelled edges in path order', () => {
    const state = deriveMapState({ map: MAP, visited: ['a1', 'b1'], currentNodeId: 'b1' }, ['boss']);
    expect(nodeState(state, 'a1')).toBe('visited');
    expect(edgeState(state, 'a1', 'b1')).toBe('travelled');
    expect(edgeState(state, 'a1', 'b0')).toBe('closed');
    expect(edgeState(state, 'b1', 'boss')).toBe('available');
  });

  it('agrees with the engine for a fresh run', () => {
    const run = createRun(CONTENT, 1234);
    const available = availableNodes(run).map((node) => node.id);
    const state = deriveMapState(run, available);
    const states = run.map.map((node) => nodeState(state, node.id));
    expect(states.filter((value) => value === 'available')).toHaveLength(available.length);
    expect(states.every((value) => value === 'available' || value === 'reachable')).toBe(true);
  });
});

describe('focus and progress', () => {
  it('focuses the next floor to enter', () => {
    expect(focusFloor({ map: MAP, currentNodeId: null })).toBe(0);
    expect(focusFloor({ map: MAP, currentNodeId: 'a1' })).toBe(1);
    expect(focusFloor({ map: MAP, currentNodeId: 'boss' })).toBeLessThanOrEqual(5);
  });

  it('describes the floor progress in German', () => {
    expect(floorProgressText({ map: MAP, currentNodeId: null })).toBe('Start · 6 Etagen');
    expect(floorProgressText({ map: MAP, currentNodeId: 'b0' })).toBe('Etage 2 von 6');
  });
});

describe('labels', () => {
  it('has an icon and a German label for every node type', () => {
    expect(NODE_TYPES).toHaveLength(5);
    expect(NODE_INFO.fight.icon).toBe('⚔️');
    expect(NODE_INFO.elite.icon).toBe('💀');
    expect(NODE_INFO.rest.icon).toBe('🔥');
    expect(NODE_INFO.dig.icon).toBe('⛏️');
    expect(NODE_INFO.boss.icon).toBe('👑');
    expect(NODE_INFO.dig.label).toBe('Ausgrabung');
  });

  it('builds spoken node labels', () => {
    expect(nodeAccessibilityLabel({ type: 'fight', floor: 1 }, 'available')).toBe('Kampf, Etage 2, jetzt erreichbar');
    expect(nodeAccessibilityLabel({ type: 'boss', floor: 5 }, 'reachable')).toBe(
      'Boss, Etage 6, Boss-Etage, später erreichbar',
    );
  });
});

describe('nodeSheetInfo', () => {
  const enemies = Object.values(CONTENT.enemies);
  const elite = enemies.find((enemy) => enemy.tier === 'elite') as EnemyDef;
  const normal = enemies.find((enemy) => enemy.tier === 'normal') as EnemyDef;

  it('shows the enemy, its tier and HP range for fights', () => {
    const info = nodeSheetInfo(
      CONTENT,
      { id: 'n', floor: 0, lane: 0, type: 'fight', next: [], enemyId: normal.id },
      'available',
    );
    expect(info.title).toBe('⚔️ Kampf');
    expect(info.enemy?.name).toBe(normal.name);
    expect(info.enemy?.tierLabel).toBe('Normaler Gegner');
    expect(info.enemy?.hpText).toMatch(/^\d+(–\d+)? LP$/);
    expect(info.maxHpGain).toBe(0);
    expect(info.lockedReason).toBeNull();
  });

  it('shows the max-HP bonus for elites and a reason for locked nodes', () => {
    const info = nodeSheetInfo(
      CONTENT,
      { id: 'n', floor: 3, lane: 0, type: 'elite', next: [], enemyId: elite.id },
      'unreachable',
    );
    expect(info.enemy?.tierLabel).toBe('Elite-Gegner');
    expect(info.maxHpGain).toBe(4);
    expect(info.lockedReason).toBe('Von deinem Standort führt kein Weg mehr hierher.');
  });

  it('has no enemy for rest and dig nodes', () => {
    const info = nodeSheetInfo(CONTENT, { id: 'n', floor: 2, lane: 0, type: 'rest', next: [] }, 'reachable');
    expect(info.enemy).toBeNull();
    expect(info.hint).toContain('30 %');
  });
});
