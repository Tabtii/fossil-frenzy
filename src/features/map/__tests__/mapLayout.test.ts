import { describe, expect, it } from '@jest/globals';

import { CONTENT } from '@/data';
import { BOSS_FLOOR, FLOORS_PER_ACT, generateActMap } from '@/engine/run';
import type { MapNode } from '@/engine/types';

import {
  computeMapLayout,
  edgeBox,
  floorY,
  laneX,
  MAP_BOSS_SIZE,
  MAP_NODE_SIZE,
  MAP_PADDING_Y,
  MAP_ROW_HEIGHT,
  mapHeight,
  mapWidth,
  scrollOffsetForFloor,
  segmentDots,
  trimSegment,
} from '../mapLayout';

// Lane area widths: 320 dp (12 dp gutter), 360/390/430 dp (16 dp), tablet column 560 dp (24 dp).
const WIDTHS = [296, 328, 358, 398, 512].map((width) => mapWidth(width));

function endpoints(box: ReturnType<typeof edgeBox>) {
  const cx = box.left + box.width / 2;
  const cy = box.top + box.height / 2;
  const rad = (box.angle * Math.PI) / 180;
  const hx = (Math.cos(rad) * box.width) / 2;
  const hy = (Math.sin(rad) * box.width) / 2;
  return { start: { x: cx - hx, y: cy - hy }, end: { x: cx + hx, y: cy + hy } };
}

describe('laneX / floorY', () => {
  it('splits the width into equal lane columns', () => {
    expect(laneX(0, 300)).toBe(50);
    expect(laneX(1, 300)).toBe(150);
    expect(laneX(2, 300)).toBe(250);
    expect(laneX(7, 300)).toBe(250);
    expect(laneX(-1, 300)).toBe(50);
  });

  it('puts floor 0 at the bottom and the boss floor on top', () => {
    expect(floorY(BOSS_FLOOR)).toBe(MAP_PADDING_Y);
    expect(floorY(0)).toBe(MAP_PADDING_Y + (FLOORS_PER_ACT - 1) * MAP_ROW_HEIGHT);
    expect(floorY(0)).toBeGreaterThan(floorY(1));
    expect(mapHeight()).toBe(floorY(0) + MAP_PADDING_Y);
  });

  it('caps the lane area width', () => {
    expect(mapWidth(296)).toBe(296);
    expect(mapWidth(900)).toBe(420);
    expect(mapWidth(-5)).toBe(0);
  });
});

describe('segment helpers', () => {
  it('builds a horizontal edge box', () => {
    const box = edgeBox({ x1: 10, y1: 20, x2: 110, y2: 20 }, 4);
    expect(box).toMatchObject({ left: 10, top: 18, width: 100, height: 4, angle: 0 });
  });

  it('rotates the box so its ends hit the segment ends', () => {
    const segment = { x1: 50, y1: 300, x2: 150, y2: 188 };
    const { start, end } = endpoints(edgeBox(segment));
    expect(start.x).toBeCloseTo(segment.x1, 1);
    expect(start.y).toBeCloseTo(segment.y1, 1);
    expect(end.x).toBeCloseTo(segment.x2, 1);
    expect(end.y).toBeCloseTo(segment.y2, 1);
  });

  it('points straight up for a vertical edge from a lower to a higher floor', () => {
    expect(edgeBox({ x1: 0, y1: 100, x2: 0, y2: 0 }).angle).toBe(-90);
  });

  it('trims both ends and drops segments that are too short', () => {
    expect(trimSegment({ x1: 0, y1: 0, x2: 100, y2: 0 }, 10, 20)).toEqual({ x1: 10, y1: 0, x2: 80, y2: 0 });
    expect(trimSegment({ x1: 0, y1: 0, x2: 20, y2: 0 }, 10, 10)).toBeNull();
    expect(trimSegment({ x1: 5, y1: 5, x2: 5, y2: 5 }, 0, 0)).toBeNull();
  });

  it('spaces dots evenly including both ends', () => {
    const dots = segmentDots({ x1: 0, y1: 0, x2: 0, y2: 100 }, 10);
    expect(dots).toHaveLength(11);
    expect(dots[0]).toEqual({ x: 0, y: 0 });
    expect(dots[10]).toEqual({ x: 0, y: 100 });
    expect(segmentDots({ x1: 0, y1: 0, x2: 3, y2: 0 }, 10)).toHaveLength(2);
  });
});

describe('computeMapLayout', () => {
  const maps: MapNode[][] = [];
  for (let act = 0; act < 4; act += 1) {
    for (const seed of [1, 42, 1234, 98765, 4242424]) maps.push(generateActMap(CONTENT, act, seed));
  }

  it.each(WIDTHS)('keeps every node inside a %p dp wide map without overlaps', (width) => {
    for (const nodes of maps) {
      const layout = computeMapLayout(nodes, width);
      expect(layout.nodes).toHaveLength(nodes.length);
      for (const node of layout.nodes) {
        expect(node.size).toBeGreaterThanOrEqual(56);
        expect(node.x - node.size / 2).toBeGreaterThanOrEqual(0);
        expect(node.x + node.size / 2).toBeLessThanOrEqual(width);
        expect(node.y - node.size / 2).toBeGreaterThanOrEqual(0);
        expect(node.y + node.size / 2).toBeLessThanOrEqual(layout.height);
      }
      for (const a of layout.nodes) {
        for (const b of layout.nodes) {
          if (a === b) continue;
          const distance = Math.hypot(a.x - b.x, a.y - b.y);
          expect(distance).toBeGreaterThanOrEqual((a.size + b.size) / 2 + 8);
        }
      }
    }
  });

  it('draws one edge per connection, ending outside the node circles', () => {
    for (const nodes of maps) {
      const layout = computeMapLayout(nodes, 296);
      const expected = nodes.reduce((sum, node) => sum + node.next.length, 0);
      expect(layout.edges).toHaveLength(expected);
      for (const edge of layout.edges) {
        const from = layout.byId[edge.from];
        const to = layout.byId[edge.to];
        if (!from || !to) throw new Error('edge without node');
        expect(edge.width).toBeGreaterThan(0);
        // Edges always climb (from a lower floor to the one above).
        expect(edge.y2).toBeLessThan(edge.y1);
        expect(Math.hypot(edge.x1 - from.x, edge.y1 - from.y)).toBeGreaterThan(from.size / 2);
        expect(Math.hypot(edge.x2 - to.x, edge.y2 - to.y)).toBeGreaterThan(to.size / 2);
        const { start, end } = endpoints(edge);
        expect(start.x).toBeCloseTo(edge.x1, 1);
        expect(end.y).toBeCloseTo(edge.y2, 1);
      }
    }
  });

  it('puts the larger boss node on top', () => {
    const nodes = maps[0] ?? [];
    const layout = computeMapLayout(nodes, 328);
    const boss = layout.nodes.find((node) => node.floor === BOSS_FLOOR);
    expect(boss?.size).toBe(MAP_BOSS_SIZE);
    expect(boss?.y).toBe(Math.min(...layout.nodes.map((node) => node.y)));
    expect(layout.nodes.filter((node) => node.floor === 0).every((node) => node.size === MAP_NODE_SIZE)).toBe(true);
  });

  it('skips edges to unknown nodes', () => {
    const nodes: MapNode[] = [{ id: 'a', floor: 0, lane: 0, type: 'fight', next: ['missing'] }];
    expect(computeMapLayout(nodes, 300).edges).toEqual([]);
  });
});

describe('scrollOffsetForFloor', () => {
  const layout = computeMapLayout(generateActMap(CONTENT, 0, 7), 296);

  it('centres the floor in the viewport', () => {
    const offset = scrollOffsetForFloor(layout, 2, 300);
    expect(offset).toBe(Math.round(floorY(2) - 150));
  });

  it('clamps to the scrollable range', () => {
    expect(scrollOffsetForFloor(layout, BOSS_FLOOR, 300)).toBe(0);
    expect(scrollOffsetForFloor(layout, 0, 300)).toBe(layout.height - 300);
    expect(scrollOffsetForFloor(layout, 0, 2000)).toBe(0);
  });
});
