import { describe, expect, it } from '@jest/globals';
import { TEST_DB } from '@/engine/combat/__fixtures__/content';
import { KEYWORD_INFO, STATUS_INFO, describeCard, describeEffects, describeEnemy, describeMove, resolveCard } from '@/engine/describe';
import type { CardDef, CardEffect, EnemyDef, StatusId } from '@/engine/types';

function cardDef(id: string): CardDef {
  const def = TEST_DB.cards[id];
  if (!def) throw new Error(id);
  return def;
}

function enemyDef(id: string): EnemyDef {
  const def = TEST_DB.enemies[id];
  if (!def) throw new Error(id);
  return def;
}

function text(id: string, upgraded = false): string {
  return describeCard(cardDef(id), upgraded);
}

function inline(effects: CardEffect[], extra: Partial<CardDef> = {}): string {
  const def: CardDef = {
    id: 'x',
    name: 'X',
    emoji: '🦴',
    era: 'jura',
    type: 'attack',
    rarity: 'common',
    cost: 1,
    tags: [],
    effects,
    upgrade: {},
    fossilId: 'x',
    ...extra,
  };
  return describeCard(def, false);
}

describe('resolveCard', () => {
  it('returns the base values when not upgraded', () => {
    const mend = cardDef('mend');
    expect(resolveCard(mend, false)).toEqual({ cost: 1, effects: mend.effects, exhaust: true });
    expect(resolveCard(cardDef('strike'), false).exhaust).toBe(false);
  });

  it('applies upgrade overrides and keeps what is not overridden', () => {
    expect(resolveCard(cardDef('mend'), true)).toEqual({ cost: 0, effects: cardDef('mend').effects, exhaust: false });
    expect(resolveCard(cardDef('strike'), true)).toEqual({ cost: 1, effects: [{ type: 'damage', amount: 9 }], exhaust: false });
    expect(resolveCard(cardDef('surge'), true).exhaust).toBe(true);
  });
});

describe('describeCard', () => {
  it('describes basic effects', () => {
    expect(text('strike')).toBe('Verursache 6 Schaden.');
    expect(text('twin')).toBe('Verursache 3 Schaden 2-mal.');
    expect(text('flurry')).toBe('Verursache 2 Schaden 5-mal. Ziehe 1 Karte.');
    expect(text('defend')).toBe('Erhalte 5 Block.');
    expect(text('study')).toBe('Ziehe 2 Karten.');
    expect(text('spear')).toBe('Verursache 5 Schaden (Durchschlagend).');
    expect(text('bash')).toBe('Verursache 8 Schaden. Verleihe 2 Verwundbar.');
    expect(text('flex')).toBe('Erhalte 2 Stärke.');
    expect(text('weaken')).toBe('Verleihe 2 Geschwächt.');
    expect(text('cut')).toBe('Verursache 4 Schaden. Verleihe 3 Blutung.');
    expect(text('daze')).toBe('Verleihe 1 Verwirrt.');
    expect(text('powerUp')).toBe('Erhalte 1 Stärke. Verursache 5 Schaden.');
  });

  it('adds the exhaust keyword and handles energy', () => {
    expect(text('surge')).toBe('+2 Energie. Verbannen.');
    expect(text('cycle')).toBe('Ziehe 1 Karte. +1 Energie. Verbannen.');
    expect(text('mend')).toBe('Heile 4 LP. Verbannen.');
    expect(inline([{ type: 'energy', amount: 1 }])).toBe('+1 Energie.');
  });

  it('uses the upgraded values', () => {
    expect(text('strike', true)).toBe('Verursache 9 Schaden.');
    expect(text('defend', true)).toBe('Erhalte 8 Block.');
    expect(text('mend', true)).toBe('Heile 4 LP.');
  });

  it('describes conditionals', () => {
    expect(text('finisher')).toBe('Falls der Gegner höchstens 15 LP hat: Töte ihn sofort. Sonst: Verursache 5 Schaden.');
    expect(text('ambush')).toBe('Falls erster Angriff in diesem Zug: Verursache 10 Schaden. Sonst: Verursache 4 Schaden.');
    expect(text('gamble')).toBe('Mit 50 % Chance: Ziehe 1 Karte.');
    expect(text('fortify')).toBe('Erhalte 3 Block. Falls du mindestens 5 Block hast: Erhalte 3 Block.');
    expect(text('mark')).toBe('Falls der Gegner verwundbar ist: Verursache 6 Schaden. Sonst: Verursache 3 Schaden.');
    expect(
      inline([{ type: 'conditional', condition: { kind: 'chance', percent: 25 }, then: [{ type: 'status', status: 'bleed', amount: 2, target: 'enemy' }] }]),
    ).toBe('Mit 25 % Chance: Verleihe 2 Blutung.');
    expect(
      inline([{ type: 'conditional', condition: { kind: 'enemyHasStatus', status: 'bleed' }, then: [{ type: 'draw', amount: 1 }] }]),
    ).toBe('Falls der Gegner blutet: Ziehe 1 Karte.');
    expect(
      inline([{ type: 'conditional', condition: { kind: 'playerBlockAtLeast', value: 10 }, then: [{ type: 'execute' }] }]),
    ).toBe('Falls du mindestens 10 Block hast: Töte den Gegner sofort.');
    expect(inline([{ type: 'execute' }])).toBe('Töte den Gegner sofort.');
  });

  it('describes scaling', () => {
    expect(text('stampede')).toBe('Verursache 4 Schaden, +2 je Pflanzenfresser-Karte im Ablagestapel (max. +6).');
    expect(text('herd')).toBe('Verursache 1 Schaden, +1 je Pflanzenfresser-Karte auf der Hand.');
    expect(text('frenzy')).toBe('Verursache 2 Schaden, +2 je zuvor in diesem Zug gespielte Karte.');
    expect(text('shieldBash')).toBe('Verursache Schaden in Höhe deines Blocks.');
    expect(
      inline([{ type: 'block', amount: 0, scaling: { per: 'tagInZone', tag: 'plant', zone: 'hand', amount: 2, max: 6 } }]),
    ).toBe('Erhalte 2 Block je Pflanzen-Karte auf der Hand (max. 6).');
    expect(
      inline([{ type: 'damage', amount: 3, hits: 2, pierce: true, scaling: { per: 'tagInZone', tag: 'carnivore', zone: 'deck', amount: 1 } }]),
    ).toBe('Verursache 3 Schaden 2-mal (Durchschlagend), +1 je Fleischfresser-Karte im Deck.');
    expect(
      inline([{ type: 'block', amount: 4, scaling: { per: 'tagInZone', tag: 'marine', zone: 'drawPile', amount: 1, max: 3 } }]),
    ).toBe('Erhalte 4 Block, +1 je Meeresbewohner-Karte im Nachziehstapel (max. +3).');
  });

  it('uses singular and plural correctly', () => {
    expect(inline([{ type: 'draw', amount: 1 }])).toBe('Ziehe 1 Karte.');
    expect(inline([{ type: 'draw', amount: 3 }])).toBe('Ziehe 3 Karten.');
    expect(inline([{ type: 'damage', amount: 5, hits: 1 }])).toBe('Verursache 5 Schaden.');
  });

  it('describes every fixture card without placeholders', () => {
    for (const def of Object.values(TEST_DB.cards)) {
      for (const upgraded of [false, true]) {
        const description = describeCard(def, upgraded);
        expect(description.length).toBeGreaterThan(0);
        expect(description).not.toMatch(/undefined|NaN|\[object/);
        expect(description.endsWith('.')).toBe(true);
      }
    }
  });

  it('describeEffects matches describeCard without keywords', () => {
    expect(describeEffects(cardDef('surge').effects)).toBe('+2 Energie.');
  });
});

describe('describeEnemy', () => {
  it('summarises the moves', () => {
    expect(describeEnemy(enemyDef('dummy'))).toBe('Biss: 6 Schaden · Panzer: 5 Block · Brüllen: erhält 2 Stärke');
    expect(describeEnemy(enemyDef('hexer'))).toBe(
      'Fluch: verleiht 2 Geschwächt, verleiht 2 Verwundbar · Prügeln: erhält 1 Stärke, 4 Schaden 2-mal · ' +
        'Nachwachsen: heilt 6 LP · Panzerstoß: 6 Block, 5 Schaden',
    );
  });

  it('describes single moves', () => {
    expect(describeMove({ id: 'm', name: 'Stampfen', effects: [{ type: 'attack', amount: 3, hits: 2 }] })).toBe('Stampfen: 3 Schaden 2-mal');
    expect(describeMove({ id: 'm', name: 'Lauern', effects: [] })).toBe('Lauern');
  });
});

describe('STATUS_INFO and KEYWORD_INFO', () => {
  it('has German names, emoji and descriptions for every status', () => {
    const ids: StatusId[] = ['strength', 'vulnerable', 'weak', 'bleed', 'confused'];
    expect(Object.keys(STATUS_INFO).sort()).toEqual([...ids].sort());
    expect(STATUS_INFO.strength.name).toBe('Stärke');
    expect(STATUS_INFO.vulnerable.name).toBe('Verwundbar');
    expect(STATUS_INFO.weak.name).toBe('Geschwächt');
    expect(STATUS_INFO.bleed.name).toBe('Blutung');
    expect(STATUS_INFO.confused.name).toBe('Verwirrt');
    for (const id of ids) {
      expect(STATUS_INFO[id].emoji.length).toBeGreaterThan(0);
      expect(STATUS_INFO[id].description.length).toBeGreaterThan(10);
    }
  });

  it('names the card keywords used in generated text', () => {
    expect(KEYWORD_INFO.pierce.name).toBe('Durchschlagend');
    expect(KEYWORD_INFO.exhaust.name).toBe('Verbannen');
  });
});
