import { FLOORS_PER_ACT, MAP_LANES } from '@/engine/run';
import type { MapNode } from '@/engine/types';

// Pure geometry for the expedition map: node centres on a lane × floor grid
// (floor 0 at the bottom, the boss on top) and straight edges between floors
// drawn as rotated Views (no SVG). Everything is unit-tested.

/** Diameter of a normal map node in dp (≥ 56 dp touch target). */
export const MAP_NODE_SIZE = 60;
/** Diameter of the boss node in dp. */
export const MAP_BOSS_SIZE = 80;
/** Vertical distance between two floors in dp. */
export const MAP_ROW_HEIGHT = 112;
/** Free space above the top and below the bottom node centre in dp. */
export const MAP_PADDING_Y = 64;
/** Max. width of the lane area; wider screens centre the map. */
export const MAP_MAX_WIDTH = 420;
/** Thickness of an edge line in dp. */
export const MAP_EDGE_THICKNESS = 4;
/** Gap between an edge's end and the node circle in dp. */
export const MAP_EDGE_GAP = 6;

export interface MapLayoutOptions {
  floors?: number;
  lanes?: number;
  rowHeight?: number;
  paddingY?: number;
  nodeSize?: number;
  bossSize?: number;
  edgeThickness?: number;
  edgeGap?: number;
}

export interface NodePlacement {
  id: string;
  floor: number;
  lane: number;
  /** Centre in dp, relative to the map's top-left corner. */
  x: number;
  y: number;
  /** Diameter in dp. */
  size: number;
}

export interface Segment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/**
 * A straight edge as an absolutely positioned View: a horizontal bar of
 * `width` × `height` at (`left`, `top`), rotated by `angle` degrees around
 * its centre so it runs from (x1, y1) to (x2, y2).
 */
export interface EdgeBox extends Segment {
  left: number;
  top: number;
  width: number;
  height: number;
  /** Rotation in degrees (clockwise, 0 = pointing right). */
  angle: number;
}

export interface EdgePlacement extends EdgeBox {
  /** Stable key "from>to". */
  key: string;
  from: string;
  to: string;
}

export interface MapLayout {
  width: number;
  height: number;
  nodes: NodePlacement[];
  byId: Record<string, NodePlacement>;
  edges: EdgePlacement[];
  rowHeight: number;
  paddingY: number;
  floors: number;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Horizontal centre of a lane: lanes split the width into equal columns. */
export function laneX(lane: number, width: number, lanes: number = MAP_LANES): number {
  const count = Math.max(1, lanes);
  const clamped = Math.min(count - 1, Math.max(0, lane));
  return round2((width * (clamped + 0.5)) / count);
}

/** Vertical centre of a floor; floor 0 is at the bottom, the last floor on top. */
export function floorY(
  floor: number,
  floors: number = FLOORS_PER_ACT,
  rowHeight: number = MAP_ROW_HEIGHT,
  paddingY: number = MAP_PADDING_Y,
): number {
  const clamped = Math.min(floors - 1, Math.max(0, floor));
  return paddingY + (floors - 1 - clamped) * rowHeight;
}

/** Total map height for the given number of floors. */
export function mapHeight(
  floors: number = FLOORS_PER_ACT,
  rowHeight: number = MAP_ROW_HEIGHT,
  paddingY: number = MAP_PADDING_Y,
): number {
  return paddingY * 2 + Math.max(0, floors - 1) * rowHeight;
}

/** Width of the lane area for an available width (capped, never negative). */
export function mapWidth(availableWidth: number, maxWidth: number = MAP_MAX_WIDTH): number {
  return Math.max(0, Math.min(availableWidth, maxWidth));
}

/**
 * Shortens a segment by `startTrim` at its start and `endTrim` at its end
 * (e.g. so it stops at the node circles). Returns null when nothing is left.
 */
export function trimSegment(segment: Segment, startTrim: number, endTrim: number): Segment | null {
  const dx = segment.x2 - segment.x1;
  const dy = segment.y2 - segment.y1;
  const length = Math.hypot(dx, dy);
  if (length <= startTrim + endTrim || length === 0) return null;
  const ux = dx / length;
  const uy = dy / length;
  return {
    x1: round2(segment.x1 + ux * startTrim),
    y1: round2(segment.y1 + uy * startTrim),
    x2: round2(segment.x2 - ux * endTrim),
    y2: round2(segment.y2 - uy * endTrim),
  };
}

/** Box + rotation that draws `segment` as a View of the given thickness. */
export function edgeBox(segment: Segment, thickness: number = MAP_EDGE_THICKNESS): EdgeBox {
  const dx = segment.x2 - segment.x1;
  const dy = segment.y2 - segment.y1;
  const length = Math.hypot(dx, dy);
  const midX = (segment.x1 + segment.x2) / 2;
  const midY = (segment.y1 + segment.y2) / 2;
  return {
    ...segment,
    left: round2(midX - length / 2),
    top: round2(midY - thickness / 2),
    width: round2(length),
    height: thickness,
    angle: round2((Math.atan2(dy, dx) * 180) / Math.PI),
  };
}

/** Evenly spaced points along a segment (for dotted edges), ends included. */
export function segmentDots(segment: Segment, spacing: number): { x: number; y: number }[] {
  const length = Math.hypot(segment.x2 - segment.x1, segment.y2 - segment.y1);
  const steps = spacing > 0 ? Math.max(1, Math.round(length / spacing)) : 1;
  const dots: { x: number; y: number }[] = [];
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    dots.push({
      x: round2(segment.x1 + (segment.x2 - segment.x1) * t),
      y: round2(segment.y1 + (segment.y2 - segment.y1) * t),
    });
  }
  return dots;
}

/**
 * Lays out one act's map for a lane area `width` dp wide. Floors without a
 * node keep their row, unknown edge targets are skipped.
 */
export function computeMapLayout(nodes: readonly MapNode[], width: number, options: MapLayoutOptions = {}): MapLayout {
  const lastFloor = nodes.reduce((max, node) => Math.max(max, node.floor), -1);
  const floors = Math.max(options.floors ?? FLOORS_PER_ACT, lastFloor + 1, 1);
  const lanes = options.lanes ?? MAP_LANES;
  const rowHeight = options.rowHeight ?? MAP_ROW_HEIGHT;
  const paddingY = options.paddingY ?? MAP_PADDING_Y;
  const nodeSize = options.nodeSize ?? MAP_NODE_SIZE;
  const bossSize = options.bossSize ?? MAP_BOSS_SIZE;
  const thickness = options.edgeThickness ?? MAP_EDGE_THICKNESS;
  const gap = options.edgeGap ?? MAP_EDGE_GAP;

  const placements: NodePlacement[] = nodes.map((node) => ({
    id: node.id,
    floor: node.floor,
    lane: node.lane,
    x: laneX(node.lane, width, lanes),
    y: floorY(node.floor, floors, rowHeight, paddingY),
    size: node.type === 'boss' ? bossSize : nodeSize,
  }));
  const byId: Record<string, NodePlacement> = {};
  for (const placement of placements) byId[placement.id] = placement;

  const edges: EdgePlacement[] = [];
  for (const node of nodes) {
    const from = byId[node.id];
    if (!from) continue;
    for (const targetId of node.next) {
      const to = byId[targetId];
      if (!to) continue;
      const trimmed = trimSegment(
        { x1: from.x, y1: from.y, x2: to.x, y2: to.y },
        from.size / 2 + gap,
        to.size / 2 + gap,
      );
      if (!trimmed) continue;
      edges.push({ key: `${node.id}>${targetId}`, from: node.id, to: targetId, ...edgeBox(trimmed, thickness) });
    }
  }

  return {
    width,
    height: mapHeight(floors, rowHeight, paddingY),
    nodes: placements,
    byId,
    edges,
    rowHeight,
    paddingY,
    floors,
  };
}

/**
 * Scroll offset that centres `floor` in a viewport of `viewportHeight` dp
 * (clamped to the scrollable range of the map plus `extraContent` dp).
 */
export function scrollOffsetForFloor(
  layout: Pick<MapLayout, 'height' | 'floors' | 'rowHeight' | 'paddingY'>,
  floor: number,
  viewportHeight: number,
  extraContent: number = 0,
): number {
  const y = floorY(floor, layout.floors, layout.rowHeight, layout.paddingY);
  const maxOffset = Math.max(0, layout.height + extraContent - viewportHeight);
  return Math.round(Math.min(maxOffset, Math.max(0, y - viewportHeight / 2)));
}
