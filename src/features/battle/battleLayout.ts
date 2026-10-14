import { CARD_ASPECT, cardHeightFor, HAND_FULL_SIZE_COUNT, HAND_MAX_ARC, handCardWidth, spacing } from '@/ui';

// Size maths of the combat screen (pure, unit-tested). The hand always fits
// the row (computeHandLayout); on short screens the cards are additionally
// capped by the window height so the arena keeps enough room.

/** How far a selected hand card rises (dp). */
export const CARD_LIFT = 16;
/** Scale of the selected hand card. */
export const SELECTED_CARD_SCALE = 1.06;
/**
 * Transparent space above the hand cards inside the hand area. The lifted
 * card stays inside the area (Android only delivers touches inside a parent's
 * bounds); the area overlaps the arena by this amount and lets touches through.
 */
export const HAND_TOP_SPACE = 26;

/** Max. share of the window height a hand card may take. */
const HAND_CARD_HEIGHT_RATIO = 0.19;
const HAND_CARD_MIN_HEIGHT = 96;

/** Max. hand card height for a window height. */
export function maxHandCardHeight(windowHeight: number): number {
  return Math.max(HAND_CARD_MIN_HEIGHT, Math.round(windowHeight * HAND_CARD_HEIGHT_RATIO));
}

/** Hand card width: the design system's width, capped by the window height. */
export function handCardWidthFor(count: number, handWidth: number, windowHeight: number): number {
  const byHeight = Math.floor(maxHandCardHeight(windowHeight) / CARD_ASPECT);
  return Math.max(1, Math.min(handCardWidth(handWidth, count), byHeight));
}

/**
 * Height of the hand area (constant for every hand size, so the layout never
 * jumps): five-card height, fan arc, lift space and a small bottom margin.
 */
export function handAreaHeight(handWidth: number, windowHeight: number): number {
  const width = handCardWidthFor(HAND_FULL_SIZE_COUNT, handWidth, windowHeight);
  return cardHeightFor(width) + HAND_MAX_ARC + HAND_TOP_SPACE + spacing.xs;
}

/** Upward drag distance that plays a card. */
export function swipeThreshold(cardHeight: number): number {
  return Math.max(48, Math.round(cardHeight * 0.45));
}

export const PREVIEW_MIN_WIDTH = 104;
export const PREVIEW_MAX_WIDTH = 220;
/** Height of the caption under the preview card. */
export const PREVIEW_CAPTION_HEIGHT = 26;
/** Room kept free below the enemy target so its HP bar stays visible. */
export const ENEMY_BAR_CLEARANCE = 32;

/**
 * Width of the enlarged preview of the selected card. It sits at the bottom of
 * the arena and must leave the enemy's tap target uncovered (`targetBottom`
 * is the target's bottom edge inside the arena). Null when there is not
 * enough room; the lifted hand card and the "Ausspielen" button remain.
 */
export function previewCardWidth(arenaHeight: number, targetBottom: number, innerWidth: number): number | null {
  if (arenaHeight <= 0) return null;
  const available =
    arenaHeight - targetBottom - ENEMY_BAR_CLEARANCE - spacing.sm - HAND_TOP_SPACE - PREVIEW_CAPTION_HEIGHT;
  const byHeight = Math.floor(available / CARD_ASPECT);
  const width = Math.min(byHeight, Math.round(innerWidth * 0.62), PREVIEW_MAX_WIDTH);
  return width >= PREVIEW_MIN_WIDTH ? width : null;
}

/** Arena height below which enemy and player zones use their compact variant. */
export const COMPACT_ARENA_HEIGHT = 340;

export function isCompactArena(arenaHeight: number): boolean {
  return arenaHeight < COMPACT_ARENA_HEIGHT;
}

/** Enemy emoji size for the arena height (before the first layout: window based). */
export function enemyEmojiSize(arenaHeight: number): number {
  return Math.min(108, Math.max(52, Math.round(arenaHeight * 0.2)));
}
