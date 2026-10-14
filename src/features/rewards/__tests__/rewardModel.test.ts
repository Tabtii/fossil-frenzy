import { describe, expect, it } from '@jest/globals';

import { CONTENT } from '@/data';
import type { CardInstance, FossilRecord } from '@/engine/types';

import {
  carouselIndex,
  carouselOffset,
  CHOICE_CARD_MAX_WIDTH,
  choiceCarouselMetrics,
  choiceDefs,
  fossilFinds,
  gridColumns,
  groupUpgradeOptions,
  restHealAmount,
  upgradableCards,
  upgradePreview,
} from '../rewardModel';

const record = (timesFound: number): FossilRecord => ({ discoveredAt: '2026-01-01T00:00:00.000Z', timesFound });

describe('fossilFinds', () => {
  const [first, second] = Object.keys(CONTENT.fossils);
  if (!first || !second) throw new Error('content has no fossils');

  it('marks first finds (timesFound === 1) as new', () => {
    const finds = fossilFinds(CONTENT, [first, second], { [first]: record(1), [second]: record(3) });
    expect(finds.map((find) => [find.fossil.id, find.isNew])).toEqual([
      [first, true],
      [second, false],
    ]);
  });

  it('skips unknown ids and duplicates; a missing record is not new', () => {
    const finds = fossilFinds(CONTENT, ['nope', first, first], {});
    expect(finds).toHaveLength(1);
    expect(finds[0]?.isNew).toBe(false);
  });
});

describe('choiceDefs', () => {
  it('resolves card ids and skips unknown ones', () => {
    expect(choiceDefs(CONTENT, ['dicroidium', 'unknown']).map((def) => def.id)).toEqual(['dicroidium']);
  });
});

describe('choiceCarouselMetrics', () => {
  const screens: [number, number][] = [
    [320, 568],
    [320, 640],
    [360, 760],
    [390, 844],
    [430, 932],
    [560, 1024],
  ];

  it.each(screens)('fits full cards on a %p × %p dp screen', (width, height) => {
    const metrics = choiceCarouselMetrics(width, height, 3);
    expect(metrics.cardWidth).toBeLessThanOrEqual(CHOICE_CARD_MAX_WIDTH);
    expect(metrics.cardWidth).toBeLessThanOrEqual(width - 2 * metrics.gap);
    expect(metrics.cardWidth).toBeGreaterThanOrEqual(150);
    expect(metrics.cardHeight).toBe(Math.round(metrics.cardWidth * 1.4));
    // The first card is centred, the neighbour peeks in.
    expect(metrics.sidePadding * 2 + metrics.cardWidth).toBeCloseTo(width, -1);
    expect(metrics.sidePadding + metrics.cardWidth + metrics.gap).toBeLessThan(width);
    expect(metrics.contentWidth).toBe(metrics.sidePadding * 2 + 3 * metrics.cardWidth + 2 * metrics.gap);
  });

  it('maps offsets to indices and back', () => {
    const metrics = choiceCarouselMetrics(360, 760, 3);
    for (let index = 0; index < 3; index += 1) {
      expect(carouselIndex(metrics, carouselOffset(metrics, index), 3)).toBe(index);
    }
    expect(carouselIndex(metrics, -50, 3)).toBe(0);
    expect(carouselIndex(metrics, 99999, 3)).toBe(2);
    expect(carouselIndex(metrics, metrics.snapInterval * 0.6, 3)).toBe(1);
    expect(carouselIndex(metrics, 0, 0)).toBe(0);
  });
});

describe('restHealAmount', () => {
  it('heals 30 % of max HP, rounded up and capped', () => {
    expect(restHealAmount(30, 60)).toBe(18);
    expect(restHealAmount(55, 60)).toBe(5);
    expect(restHealAmount(60, 60)).toBe(0);
    expect(restHealAmount(10, 61)).toBe(19);
    expect(restHealAmount(0, 64)).toBe(20);
  });
});

describe('upgrades', () => {
  const deck: CardInstance[] = [
    { uid: 'c0', defId: 'dicroidium', upgraded: false },
    { uid: 'c1', defId: 'dicroidium', upgraded: true },
    { uid: 'c2', defId: 'unknown', upgraded: false },
    { uid: 'c3', defId: 'placodus', upgraded: false },
    { uid: 'c4', defId: 'dicroidium', upgraded: false },
  ];

  it('lists not yet upgraded cards with known defs in deck order', () => {
    expect(upgradableCards(CONTENT, deck).map((option) => option.card.uid)).toEqual(['c0', 'c3', 'c4']);
    expect(upgradableCards(CONTENT, [])).toEqual([]);
  });

  it('groups copies of the same card', () => {
    const groups = groupUpgradeOptions(upgradableCards(CONTENT, deck));
    expect(groups.map((group) => [group.def.id, group.uids])).toEqual([
      ['dicroidium', ['c0', 'c4']],
      ['placodus', ['c3']],
    ]);
  });

  it('describes a cost-only upgrade', () => {
    const def = CONTENT.cards.dicroidium;
    if (!def) throw new Error('missing card');
    const preview = upgradePreview(def);
    expect(preview.costBefore).toBe(1);
    expect(preview.costAfter).toBe(0);
    expect(preview.changes).toContain('Kosten 1 → 0 Energie');
    expect(preview.changes.some((line) => line.startsWith('Neu:'))).toBe(false);
  });

  it('describes a rules text upgrade', () => {
    const def = CONTENT.cards.placodus;
    if (!def) throw new Error('missing card');
    const preview = upgradePreview(def);
    expect(preview.textAfter).not.toBe(preview.textBefore);
    expect(preview.changes).toContain(`Neu: ${preview.textAfter}`);
  });

  it('computes grid columns', () => {
    expect(gridColumns(288, 64, 8)).toBe(4);
    expect(gridColumns(50, 64, 8)).toBe(1);
    expect(gridColumns(100, 0, 8)).toBe(1);
  });
});
