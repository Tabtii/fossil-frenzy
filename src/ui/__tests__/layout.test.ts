import { describe, expect, it } from '@jest/globals';
import {
  CARD_ASPECT,
  computeContentWidth,
  computeHandLayout,
  computeLayout,
  handCardWidth,
  HAND_SIDE_PADDING,
  MAX_CONTENT_WIDTH,
} from '../layout';
import { TOUCH_TARGET } from '../theme';

const NO_INSETS = { top: 0, right: 0, bottom: 0, left: 0 };
const WIDTHS = [320, 360, 390, 430, 768] as const;

function handWidthFor(width: number): number {
  return computeLayout(width, width === 768 ? 1024 : 800, NO_INSETS).handWidth;
}

describe('computeHandLayout', () => {
  for (const width of WIDTHS) {
    const available = handWidthFor(width);
    for (let count = 1; count <= 10; count += 1) {
      it(`fits ${count} card(s) into ${width} dp`, () => {
        const layout = computeHandLayout(count, available);
        expect(layout.positions).toHaveLength(count);
        expect(layout.cardHeight).toBe(Math.round(layout.cardWidth * CARD_ASPECT));
        expect(layout.overlap).toBeGreaterThanOrEqual(0);
        for (const [i, pos] of layout.positions.entries()) {
          expect(pos.x).toBeGreaterThanOrEqual(0);
          expect(pos.x + layout.cardWidth).toBeLessThanOrEqual(available);
          if (i > 0) expect(pos.x).toBeGreaterThan(layout.positions[i - 1]!.x);
          expect(pos.zIndex).toBe(i + 1);
        }
      });
    }
  }

  it('keeps five cards tappable (≥ 48 dp visible strip) on a 320 dp phone', () => {
    const layout = computeHandLayout(5, handWidthFor(320));
    expect(layout.step).toBeGreaterThanOrEqual(TOUCH_TARGET);
    expect(layout.cardWidth).toBeGreaterThanOrEqual(72);
  });

  it('does not overlap when the cards fit side by side', () => {
    const layout = computeHandLayout(3, handWidthFor(430));
    expect(layout.overlap).toBe(0);
    expect(layout.step).toBe(layout.cardWidth + 4);
  });

  it('centres the hand', () => {
    const available = handWidthFor(390);
    const layout = computeHandLayout(2, available);
    const first = layout.positions[0]!;
    const last = layout.positions[1]!;
    const left = first.x;
    const right = available - (last.x + layout.cardWidth);
    expect(Math.abs(left - right)).toBeLessThanOrEqual(1);
  });

  it('fans symmetrically and leaves a single card upright', () => {
    const layout = computeHandLayout(5, handWidthFor(360));
    const rotations = layout.positions.map((p) => p.rotate);
    expect(rotations[0]).toBeLessThan(0);
    expect(rotations[2]).toBe(0);
    expect(rotations[0]).toBe(-rotations[4]!);
    expect(layout.positions[0]!.y).toBe(layout.positions[4]!.y);
    expect(computeHandLayout(1, 300).positions[0]).toMatchObject({ rotate: 0, y: 0 });
    expect(computeHandLayout(5, 300, { fan: false }).positions.every((p) => p.rotate === 0 && p.y === 0)).toBe(true);
  });

  it('shrinks cards for big hands', () => {
    const available = handWidthFor(360);
    expect(handCardWidth(available, 10)).toBeLessThan(handCardWidth(available, 5));
    expect(handCardWidth(available, 3)).toBe(handCardWidth(available, 5));
  });

  it('handles an empty hand', () => {
    expect(computeHandLayout(0, 320)).toMatchObject({ positions: [], totalWidth: 0, overlap: 0 });
  });
});

describe('computeLayout', () => {
  it('flags compact phones and tablets', () => {
    expect(computeLayout(320, 640, NO_INSETS).isCompact).toBe(true);
    expect(computeLayout(360, 780, NO_INSETS).isCompact).toBe(false);
    expect(computeLayout(430, 932, NO_INSETS).isTablet).toBe(false);
    expect(computeLayout(768, 1024, NO_INSETS).isTablet).toBe(true);
  });

  it('clamps the content column to 560 dp and subtracts side insets', () => {
    expect(computeLayout(768, 1024, NO_INSETS).contentWidth).toBe(MAX_CONTENT_WIDTH);
    expect(computeContentWidth(390, { left: 10, right: 10 })).toBe(370);
    const layout = computeLayout(360, 780, NO_INSETS);
    expect(layout.handWidth).toBe(360 - 2 * HAND_SIDE_PADDING);
    expect(layout.innerWidth).toBe(360 - 2 * layout.gutter);
  });

  it('reports hand card size and overlap for five cards', () => {
    const layout = computeLayout(320, 640, NO_INSETS);
    const hand = computeHandLayout(5, layout.handWidth);
    expect(layout.cardWidth).toBe(hand.cardWidth);
    expect(layout.cardHeight).toBe(hand.cardHeight);
    expect(layout.handOverlap).toBe(hand.overlap);
    expect(layout.handOverlap).toBeGreaterThan(0);
  });

  it('scales relative to 360 dp within limits', () => {
    expect(computeLayout(360, 780, NO_INSETS).scale(10)).toBe(10);
    expect(computeLayout(430, 932, NO_INSETS).scale(100)).toBe(119);
    expect(computeLayout(320, 640, NO_INSETS).scale(100)).toBe(89);
    expect(computeLayout(768, 1024, NO_INSETS).scale(100)).toBe(125);
  });
});
