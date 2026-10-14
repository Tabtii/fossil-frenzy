import { describe, expect, it } from '@jest/globals';

import { CARD_ASPECT, computeHandLayout, computeLayout, HAND_MAX_ARC } from '@/ui';

import {
  CARD_LIFT,
  enemyEmojiSize,
  HAND_TOP_SPACE,
  handAreaHeight,
  handCardWidthFor,
  maxHandCardHeight,
  PREVIEW_MAX_WIDTH,
  PREVIEW_MIN_WIDTH,
  previewCardWidth,
  SELECTED_CARD_SCALE,
  swipeThreshold,
} from '../battleLayout';
import { battleTimings, enemyTurnDuration, resolveDelay } from '../timing';

const INSETS = { top: 24, right: 0, bottom: 16, left: 0 };
const PHONES: [number, number][] = [
  [320, 568],
  [320, 640],
  [360, 640],
  [360, 800],
  [390, 844],
  [430, 932],
];

describe('hand sizing', () => {
  it('fits 1–10 cards into the hand row on every phone without leaving it', () => {
    for (const [width, height] of PHONES) {
      const { handWidth } = computeLayout(width, height, INSETS);
      for (let count = 1; count <= 10; count += 1) {
        const cardWidth = handCardWidthFor(count, handWidth, height);
        const layout = computeHandLayout(count, handWidth, { cardWidth });
        for (const position of layout.positions) {
          expect(position.x).toBeGreaterThanOrEqual(0);
          expect(position.x + layout.cardWidth).toBeLessThanOrEqual(handWidth + 0.01);
        }
        // Every card keeps a tappable strip (≥ 24 dp, ≥ 48 dp up to five cards).
        if (count > 1) expect(layout.step).toBeGreaterThanOrEqual(count <= 5 ? 48 : 24);
      }
    }
  });

  it('caps the card height on short screens', () => {
    const { handWidth } = computeLayout(430, 600, INSETS);
    const width = handCardWidthFor(5, handWidth, 600);
    expect(Math.round(width * CARD_ASPECT)).toBeLessThanOrEqual(maxHandCardHeight(600));
    // Tall screens use the design-system width.
    const tall = computeLayout(360, 800, INSETS);
    expect(handCardWidthFor(5, tall.handWidth, 800)).toBe(tall.cardWidth);
  });

  it('keeps the hand area constant and big enough for the lifted card', () => {
    for (const [width, height] of PHONES) {
      const { handWidth } = computeLayout(width, height, INSETS);
      const area = handAreaHeight(handWidth, height);
      for (let count = 1; count <= 10; count += 1) {
        const layout = computeHandLayout(count, handWidth, { cardWidth: handCardWidthFor(count, handWidth, height) });
        expect(HAND_TOP_SPACE + layout.cardHeight + HAND_MAX_ARC).toBeLessThanOrEqual(area);
        // The lifted, scaled card stays inside the area (touchable on Android).
        const grow = (layout.cardHeight * (SELECTED_CARD_SCALE - 1)) / 2;
        expect(CARD_LIFT + grow).toBeLessThanOrEqual(HAND_TOP_SPACE);
      }
      // The hand never takes more than a quarter of the screen.
      expect(area).toBeLessThanOrEqual(height * 0.27);
    }
  });

  it('needs a real swipe to play', () => {
    expect(swipeThreshold(80)).toBe(48);
    expect(swipeThreshold(160)).toBe(72);
  });
});

describe('preview and enemy sizes', () => {
  it('sizes the preview between the bounds or hides it', () => {
    expect(previewCardWidth(0, 0, 330)).toBeNull();
    expect(previewCardWidth(300, 200, 330)).toBeNull();
    const roomy = previewCardWidth(520, 200, 358);
    expect(roomy).not.toBeNull();
    expect(roomy ?? 0).toBeGreaterThanOrEqual(PREVIEW_MIN_WIDTH);
    expect(roomy ?? 0).toBeLessThanOrEqual(PREVIEW_MAX_WIDTH);
    expect(previewCardWidth(2000, 100, 2000)).toBe(PREVIEW_MAX_WIDTH);
    // Never wider than ~60 % of the content.
    expect(previewCardWidth(2000, 100, 300)).toBeLessThanOrEqual(186);
  });

  it('clamps the enemy emoji', () => {
    expect(enemyEmojiSize(0)).toBe(52);
    expect(enemyEmojiSize(400)).toBe(80);
    expect(enemyEmojiSize(5000)).toBe(108);
  });
});

describe('timings', () => {
  it('paces the enemy turn within 400–700 ms', () => {
    const normal = battleTimings(false);
    expect(enemyTurnDuration(normal)).toBeGreaterThanOrEqual(400);
    expect(enemyTurnDuration(normal)).toBeLessThanOrEqual(700);
  });

  it('is never slower with reduced motion and keeps a short pause', () => {
    const normal = battleTimings(false);
    const reduced = battleTimings(true);
    expect(enemyTurnDuration(reduced)).toBeLessThanOrEqual(enemyTurnDuration(normal));
    expect(enemyTurnDuration(reduced)).toBeGreaterThan(0);
    expect(reduced.flight).toBe(0);
    expect(reduced.resolveVictory).toBeLessThanOrEqual(normal.resolveVictory);
    expect(reduced.resolveDefeat).toBeLessThanOrEqual(normal.resolveDefeat);
  });

  it('returns stable objects and resolves after the outcome is visible', () => {
    expect(battleTimings(false)).toBe(battleTimings(false));
    const normal = battleTimings(false);
    expect(resolveDelay(normal, 'won')).toBeGreaterThan(normal.outcomeDelay);
    expect(resolveDelay(normal, 'lost')).toBeGreaterThanOrEqual(resolveDelay(normal, 'won'));
  });
});
