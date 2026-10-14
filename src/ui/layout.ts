import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';
import { type EdgeInsets, useSafeAreaInsets } from 'react-native-safe-area-context';

import { spacing } from './theme';

// Responsive layout for phones from 320 dp (small Android) to 430 dp (large
// iPhone) and tablets (content centred, max. 560 dp). All maths lives in pure
// functions so it can be unit-tested without rendering.

/** Design base width in dp. */
export const BASE_WIDTH = 360;
/** Smallest supported phone width in dp. */
export const MIN_WIDTH = 320;
/** Max. width of the content column (tablets, landscape). */
export const MAX_CONTENT_WIDTH = 560;
/** Below this width the layout is "compact" (small Android phones). */
export const COMPACT_MAX_WIDTH = 360;
/** Shortest window side from which a device counts as a tablet. */
export const TABLET_MIN_SHORT_SIDE = 600;

/** Card height = width × CARD_ASPECT (poker-like 5:7). */
export const CARD_ASPECT = 1.4;
/** Gap between hand cards when they fit without overlap. */
export const HAND_GAP = 4;
/** Horizontal padding of the hand row inside the content column. */
export const HAND_SIDE_PADDING = 8;
/** Hand card width relative to the available hand width. */
const HAND_CARD_RATIO = 0.26;
export const HAND_CARD_MIN_WIDTH = 72;
export const HAND_CARD_MAX_WIDTH = 120;
/** Absolute floor when many cards force shrinking. */
export const HAND_CARD_FLOOR_WIDTH = 56;
/** Hand size up to which cards keep their full width. */
export const HAND_FULL_SIZE_COUNT = 5;
/** Width reduction per card above HAND_FULL_SIZE_COUNT (4 % each). */
const HAND_SHRINK_PER_CARD = 0.04;
/** Max. rotation (degrees) of the outermost cards in a fanned hand. */
export const HAND_MAX_ROTATION = 6;
/** Max. drop (dp) of the outermost cards in a fanned hand. */
export const HAND_MAX_ARC = 10;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Rounds down to 0.5 dp so sums of steps never exceed the available width. */
function floorHalf(value: number): number {
  return Math.floor(value * 2) / 2;
}

export function isCompactWidth(width: number): boolean {
  return width < COMPACT_MAX_WIDTH;
}

export function isTabletSize(width: number, height: number): boolean {
  return Math.min(width, height) >= TABLET_MIN_SHORT_SIDE;
}

/** Width of the centred content column: window minus side insets, max. 560 dp. */
export function computeContentWidth(width: number, insets: Pick<EdgeInsets, 'left' | 'right'> = { left: 0, right: 0 }): number {
  return Math.max(0, Math.min(width - insets.left - insets.right, MAX_CONTENT_WIDTH));
}

/** Horizontal screen padding: 12 dp compact, 16 dp phones, 24 dp tablets. */
export function computeGutter(width: number, height: number): number {
  if (isTabletSize(width, height)) return spacing.xxl;
  return isCompactWidth(width) ? spacing.md : spacing.lg;
}

/** Card height for a given card width. */
export function cardHeightFor(cardWidth: number): number {
  return Math.round(cardWidth * CARD_ASPECT);
}

/**
 * Hand card width for the available hand width and number of cards. Up to five
 * cards keep the base size; larger hands shrink 4 % per extra card so the
 * visible strip of each card stays large enough to tap.
 */
export function handCardWidth(availableWidth: number, count: number = HAND_FULL_SIZE_COUNT): number {
  const base = clamp(Math.round(availableWidth * HAND_CARD_RATIO), HAND_CARD_MIN_WIDTH, HAND_CARD_MAX_WIDTH);
  const extra = Math.max(0, count - HAND_FULL_SIZE_COUNT);
  const shrunk = Math.round(base * (1 - HAND_SHRINK_PER_CARD * extra));
  // Never wider than the row itself (only relevant for absurdly narrow rows).
  return Math.max(1, Math.min(Math.max(HAND_CARD_FLOOR_WIDTH, shrunk), availableWidth));
}

export interface HandCardPosition {
  /** Left edge relative to the hand row (0 … availableWidth − cardWidth). */
  x: number;
  /** Downward offset for the fan arc (outer cards sit lower). */
  y: number;
  /** Rotation in degrees for the fan (negative = left). */
  rotate: number;
  /** Stacking order: later cards on top. */
  zIndex: number;
}

export interface HandLayout {
  cardWidth: number;
  cardHeight: number;
  /** Horizontal distance between the left edges of neighbouring cards. */
  step: number;
  /** How much each card overlaps its left neighbour (0 when there is a gap). */
  overlap: number;
  /** Total width covered by the cards. */
  totalWidth: number;
  positions: HandCardPosition[];
}

export interface HandLayoutOptions {
  /** Force a card width (otherwise derived from the available width). */
  cardWidth?: number;
  /** Fan the cards on an arc (default true). Rotation/arc are 0 for one card. */
  fan?: boolean;
  /** Gap when the cards fit side by side (default HAND_GAP). */
  gap?: number;
}

/**
 * Lays out `count` hand cards centred in a row of `availableWidth` dp. Cards
 * overlap only when they do not fit side by side; every card stays fully
 * inside the row (0 ≤ x and x + cardWidth ≤ availableWidth).
 */
export function computeHandLayout(count: number, availableWidth: number, options: HandLayoutOptions = {}): HandLayout {
  const n = Math.max(0, Math.floor(count));
  const width = Math.max(0, availableWidth);
  const cardWidth = Math.min(options.cardWidth ?? handCardWidth(width, n), Math.max(1, width));
  const cardHeight = cardHeightFor(cardWidth);
  const gap = options.gap ?? HAND_GAP;
  const fan = options.fan ?? true;

  if (n === 0) {
    return { cardWidth, cardHeight, step: 0, overlap: 0, totalWidth: 0, positions: [] };
  }

  const naturalWidth = n * cardWidth + (n - 1) * gap;
  const step = n === 1 ? 0 : naturalWidth <= width ? cardWidth + gap : floorHalf((width - cardWidth) / (n - 1));
  const totalWidth = n === 1 ? cardWidth : cardWidth + step * (n - 1);
  const startX = floorHalf(Math.max(0, (width - totalWidth) / 2));
  const overlap = Math.max(0, cardWidth - step);

  const mid = (n - 1) / 2;
  // Fan gets a little stronger with more cards, capped at the max values.
  const maxRotation = fan && n > 1 ? Math.min(HAND_MAX_ROTATION, (n - 1) * 1.5) : 0;
  const maxArc = fan && n > 1 ? Math.min(HAND_MAX_ARC, (n - 1) * 2.5) : 0;

  const positions: HandCardPosition[] = [];
  for (let i = 0; i < n; i += 1) {
    const t = mid === 0 ? 0 : (i - mid) / mid; // −1 … 1
    positions.push({
      x: startX + step * i,
      y: Math.round(maxArc * t * t * 10) / 10,
      rotate: Math.round(maxRotation * t * 10) / 10,
      zIndex: i + 1,
    });
  }

  return { cardWidth, cardHeight, step, overlap, totalWidth, positions };
}

/** Factor for `scale(n)`: content width relative to 360 dp, clamped. */
export function scaleFactor(contentWidth: number): number {
  return clamp(contentWidth / BASE_WIDTH, 0.88, 1.25);
}

export interface LayoutInfo {
  /** Window size in dp. */
  width: number;
  height: number;
  insets: EdgeInsets;
  /** Width of the centred content column (max. 560 dp on tablets). */
  contentWidth: number;
  /** Horizontal screen padding inside the content column. */
  gutter: number;
  /** contentWidth − 2 × gutter. */
  innerWidth: number;
  /** Width < 360 dp. */
  isCompact: boolean;
  isTablet: boolean;
  isLandscape: boolean;
  /** System font scale (1 = default). */
  fontScale: number;
  /** Width available for the hand row. */
  handWidth: number;
  /** Hand card size for up to five cards. */
  cardWidth: number;
  cardHeight: number;
  /** Overlap of five hand cards (0 if they fit side by side). */
  handOverlap: number;
  /** Scales a dp value relative to the 360 dp base width (clamped 0.88–1.25). */
  scale: (value: number) => number;
}

/** Pure version of `useLayout` for tests and non-hook callers. */
export function computeLayout(width: number, height: number, insets: EdgeInsets, fontScale: number = 1): LayoutInfo {
  const contentWidth = computeContentWidth(width, insets);
  const gutter = computeGutter(width, height);
  const handWidth = Math.max(0, contentWidth - 2 * HAND_SIDE_PADDING);
  const hand = computeHandLayout(HAND_FULL_SIZE_COUNT, handWidth);
  const factor = scaleFactor(contentWidth);
  return {
    width,
    height,
    insets,
    contentWidth,
    gutter,
    innerWidth: Math.max(0, contentWidth - 2 * gutter),
    isCompact: isCompactWidth(width),
    isTablet: isTabletSize(width, height),
    isLandscape: width > height,
    fontScale,
    handWidth,
    cardWidth: hand.cardWidth,
    cardHeight: hand.cardHeight,
    handOverlap: hand.overlap,
    scale: (value: number) => Math.round(value * factor),
  };
}

/** Responsive layout info from window size and safe-area insets. */
export function useLayout(): LayoutInfo {
  const { width, height, fontScale } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { top, right, bottom, left } = insets;
  return useMemo(
    () => computeLayout(width, height, { top, right, bottom, left }, fontScale),
    [width, height, top, right, bottom, left, fontScale],
  );
}
