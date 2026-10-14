import { describe, expect, it } from '@jest/globals';
import type { CardDef, IntentView } from '@/engine/types';

import {
  cardAccessibilityLabel,
  cardGlossary,
  floatingNumbersFromEvents,
  floatingNumberText,
  formatIntent,
  formatLength,
  formatMya,
  formatNumberDe,
  getCardView,
  planDamagePreview,
  previewTrend,
  statAccessibilityLabel,
} from '../format';

const strike: CardDef = {
  id: 'strike',
  name: 'Eoraptor',
  emoji: '🦎',
  era: 'trias',
  type: 'attack',
  rarity: 'starter',
  cost: 1,
  tags: [],
  effects: [{ type: 'damage', amount: 6 }],
  upgrade: { effects: [{ type: 'damage', amount: 9 }] },
  fossilId: 'eoraptor',
};

const scaled: CardDef = {
  ...strike,
  id: 'scaled',
  name: 'Rudel',
  effects: [{ type: 'damage', amount: 4, scaling: { per: 'cardsPlayedThisTurn', amount: 2 } }],
  upgrade: {},
};

const finisher: CardDef = {
  ...strike,
  id: 'finisher',
  name: 'Tyrannosaurus',
  rarity: 'rare',
  era: 'kreide',
  cost: 2,
  effects: [
    { type: 'status', status: 'vulnerable', amount: 1, target: 'enemy' },
    {
      type: 'conditional',
      condition: { kind: 'enemyHasStatus', status: 'bleed' },
      then: [{ type: 'damage', amount: 12, pierce: true }],
      else: [{ type: 'damage', amount: 8 }],
    },
  ],
  exhaust: true,
  upgrade: { cost: 1 },
};

describe('number formatting', () => {
  it('formats German numbers', () => {
    expect(formatNumberDe(11700, 0)).toBe('11.700');
    expect(formatNumberDe(2.6)).toBe('2,6');
    expect(formatNumberDe(-3)).toBe('−3');
  });

  it('formats fossil ages', () => {
    expect(formatMya([231, 228])).toBe('vor 231–228 Mio. Jahren');
    expect(formatMya([2.6, 0.0117])).toBe('vor 2,6 Mio. bis 11.700 Jahren');
    expect(formatMya([0.05, 0.01])).toBe('vor 50.000–10.000 Jahren');
    expect(formatMya([66, 66])).toBe('vor 66 Mio. Jahren');
    expect(formatMya([1, 0])).toBe('vor 1 Mio. Jahren bis heute');
    expect(formatMya([0, 0])).toBe('heute');
    expect(formatLength(1)).toBe('ca. 1 m');
    expect(formatLength(0.45)).toBe('ca. 0,45 m');
  });
});

describe('cards', () => {
  it('builds the card view with upgrade marker', () => {
    const view = getCardView(strike, true);
    expect(view.name).toBe('Eoraptor+');
    expect(view.cost).toBe(1);
    expect(view.text).toContain('9');
    expect(view.typeLabel).toBe('Angriff');
    expect(view.rarityLabel).toBe('Start');
    expect(getCardView(finisher, true).cost).toBe(1);
  });

  it('replaces unscaled damage inline', () => {
    const preview = planDamagePreview(strike, false, 9);
    expect(preview.mode).toBe('inline');
    if (preview.mode !== 'inline') return;
    expect(`${preview.before}${preview.value}${preview.after}`).toBe(getCardView({ ...strike, effects: [{ type: 'damage', amount: 9 }] }, false).text);
    expect(previewTrend(preview)).toBe(1);
    expect(previewTrend(planDamagePreview(strike, false, 4))).toBe(-1);
    expect(previewTrend(planDamagePreview(strike, false, 6))).toBe(0);
  });

  it('uses a badge for scaled or conditional damage', () => {
    expect(planDamagePreview(scaled, false, 10)).toMatchObject({ mode: 'badge', value: 10, base: null });
    expect(planDamagePreview(finisher, false, 18)).toMatchObject({ mode: 'badge', value: 18, base: 12 });
    expect(planDamagePreview(strike, false, null)).toEqual({ mode: 'none' });
    expect(planDamagePreview(strike, false, undefined)).toEqual({ mode: 'none' });
  });

  it('builds an accessibility label with name, cost, text and preview', () => {
    const label = cardAccessibilityLabel(strike, true, { previewDamage: 11, unaffordable: true });
    expect(label).toContain('Eoraptor, verbessert');
    expect(label).toContain('Kosten 1 Energie');
    expect(label).toContain('Angriff, Start, Trias');
    expect(label).toContain('Voraussichtlicher Schaden 11');
    expect(label).toContain('Nicht genug Energie');
  });

  it('collects glossary entries for statuses and keywords', () => {
    const keys = cardGlossary(finisher, false).map((entry) => entry.key);
    expect(keys).toEqual(['vulnerable', 'bleed', 'pierce', 'exhaust']);
    expect(cardGlossary(strike, false)).toEqual([]);
  });
});

describe('formatIntent', () => {
  it('shows attack damage with hits', () => {
    const intent: IntentView = { kinds: ['attack'], moveName: 'Biss', damage: 12, hits: 2 };
    const display = formatIntent(intent);
    expect(display.text).toBe('⚔️ 12×2');
    expect(display.primary).toBe('attack');
    expect(display.accessibilityLabel).toBe('Absicht: Biss. Angriff mit 12 Schaden, 2-mal.');
  });

  it('shows defend without a number and combined intents', () => {
    expect(formatIntent({ kinds: ['defend'], moveName: 'Panzer' }).text).toBe('🛡️');
    expect(formatIntent({ kinds: ['attack', 'defend'], moveName: 'X', damage: 5, hits: 1, block: 4 }).text).toBe('⚔️ 5 🛡️ 4');
    expect(formatIntent({ kinds: ['buff', 'debuff'], moveName: 'Brüllen' }).text).toBe('💪 🌀');
  });

  it('highlights a confused self-hit', () => {
    const display = formatIntent({ kinds: ['attack'], moveName: 'Biss', damage: 7, hits: 1, selfHit: true });
    expect(display.text).toBe('💫 7');
    expect(display.selfHit).toBe(true);
    expect(display.segments[0]?.selfHit).toBe(true);
    expect(display.accessibilityLabel).toContain('trifft sich selbst mit 7 Schaden');
  });

  it('falls back to unknown', () => {
    expect(formatIntent({ kinds: [], moveName: '?' }).text).toBe('❓');
  });
});

describe('stat and floating number helpers', () => {
  it('labels stats', () => {
    expect(statAccessibilityLabel('LP', 45, 60)).toBe('LP 45 von 60');
    expect(statAccessibilityLabel('LP', 45, 60, 8)).toBe('LP 45 von 60, 8 Block');
  });

  it('formats floating numbers', () => {
    expect(floatingNumberText({ kind: 'damage', value: 12 })).toBe('−12');
    expect(floatingNumberText({ kind: 'damage', value: 0 })).toBe('Geblockt');
    expect(floatingNumberText({ kind: 'block', value: 5 })).toBe('+5 🛡️');
    expect(floatingNumberText({ kind: 'heal', value: 3 })).toBe('+3 💚');
  });

  it('maps combat events to floating numbers per side', () => {
    const events = [
      { type: 'cardPlayed', uid: 'c1', defId: 'strike' },
      { type: 'damage', target: 'enemy', amount: 6, blocked: 0, source: 'player' },
      { type: 'damage', target: 'enemy', amount: 0, blocked: 5, source: 'player' },
      { type: 'damage', target: 'player', amount: 3, blocked: 0, source: 'enemy' },
      { type: 'block', target: 'player', amount: 5 },
      { type: 'heal', target: 'enemy', amount: 4 },
    ] as const;
    expect(floatingNumbersFromEvents(events, 'enemy')).toEqual([
      { kind: 'damage', value: 6 },
      { kind: 'damage', value: 0 },
      { kind: 'heal', value: 4 },
    ]);
    expect(floatingNumbersFromEvents(events, 'player')).toEqual([
      { kind: 'damage', value: 3 },
      { kind: 'block', value: 5 },
    ]);
  });
});
