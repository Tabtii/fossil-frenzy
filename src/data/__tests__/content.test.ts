import { describe, expect, it } from '@jest/globals';
import { CARDS, STARTER_DECK } from '@/data/cards';
import { ENEMIES } from '@/data/enemies';
import { ERA_MYA, ERA_NAMES, FOSSILS } from '@/data/fossils';
import { CONTENT } from '@/data';
import { describeCard, describeEnemy, describeMove } from '@/engine/describe';
import type {
  CardDef,
  CardEffect,
  CardTag,
  Condition,
  EnemyDef,
  EnemyEffect,
  EnemyTier,
  Era,
  FossilEntry,
  Rarity,
  Scaling,
} from '@/engine/types';
import { ERAS } from '@/engine/types';

// Static validation of all game content (cards, enemies, fossils).

const MAX_NAME_LENGTH = 18;
/** Cards are rendered small on phones; their names must stay short. */
const MAX_CARD_NAME_LENGTH = 16;
const MAX_FACT_LENGTH = 130;
const CARDS_PER_ERA = 10;
const ENEMIES_PER_ERA: Record<EnemyTier, number> = { normal: 4, elite: 2, boss: 1 };
const RARITY_PER_ERA: Record<Exclude<Rarity, 'starter'>, [number, number]> = {
  common: [4, 4],
  uncommon: [3, 4],
  rare: [2, 2],
};

/** Inclusive HP bands per act ("Balance-Ziele" in docs/ARCHITECTURE.md). */
const HP_BANDS: Record<Era, Record<EnemyTier, [number, number]>> = {
  trias: { normal: [18, 30], elite: [40, 55], boss: [90, 110] },
  jura: { normal: [30, 42], elite: [60, 75], boss: [130, 150] },
  kreide: { normal: [40, 55], elite: [80, 95], boss: [170, 190] },
  eiszeit: { normal: [50, 65], elite: [95, 110], boss: [200, 220] },
};

const ALL_TAGS: CardTag[] = ['carnivore', 'herbivore', 'flyer', 'marine', 'plant', 'mammal', 'invertebrate', 'pack'];

const fossilsById = new Map(FOSSILS.map((f) => [f.id, f]));
const cardsById = new Map(CARDS.map((c) => [c.id, c]));
const nonStarterCards = CARDS.filter((c) => c.rarity !== 'starter');

function duplicates(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const dups = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) dups.add(value);
    seen.add(value);
  }
  return [...dups];
}

function isPositiveInt(value: number): boolean {
  return Number.isInteger(value) && value > 0;
}

function fossilOf(ref: { fossilId: string }): FossilEntry {
  const fossil = fossilsById.get(ref.fossilId);
  if (!fossil) throw new Error(`Unknown fossil ${ref.fossilId}`);
  return fossil;
}

/** Every effect of a list, including the ones nested in conditionals. */
function flattenEffects(effects: readonly CardEffect[]): CardEffect[] {
  return effects.flatMap((effect) =>
    effect.type === 'conditional'
      ? [effect, ...flattenEffects(effect.then), ...flattenEffects(effect.else ?? [])]
      : [effect],
  );
}

function upgradedEffects(card: CardDef): readonly CardEffect[] {
  return card.upgrade.effects ?? card.effects;
}

/** Problems with a scaling spec, as readable strings (empty when fine). */
function scalingProblems(scaling: Scaling): string[] {
  const problems: string[] = [];
  if (!isPositiveInt(scaling.amount)) problems.push(`scaling amount ${scaling.amount}`);
  if (scaling.max !== undefined && (!isPositiveInt(scaling.max) || scaling.max < scaling.amount)) {
    problems.push(`scaling max ${scaling.max}`);
  }
  if (scaling.per === 'tagInZone' && !ALL_TAGS.includes(scaling.tag)) problems.push(`scaling tag ${scaling.tag}`);
  return problems;
}

function conditionProblems(condition: Condition): string[] {
  switch (condition.kind) {
    case 'enemyHpAtMost':
    case 'playerBlockAtLeast':
      return isPositiveInt(condition.value) ? [] : [`${condition.kind} value ${condition.value}`];
    case 'chance':
      return condition.percent > 0 && condition.percent < 100 ? [] : [`chance ${condition.percent}`];
    case 'enemyHasStatus':
    case 'firstAttackThisTurn':
      return [];
  }
}

/** Problems with a card effect list; `nested` is true inside a conditional. */
function effectProblems(effects: readonly CardEffect[], nested: boolean): string[] {
  const problems: string[] = [];
  for (const effect of effects) {
    switch (effect.type) {
      case 'damage':
        if (!(isPositiveInt(effect.amount) || (effect.amount === 0 && effect.scaling))) {
          problems.push(`damage amount ${effect.amount}`);
        }
        if (effect.hits !== undefined && !isPositiveInt(effect.hits)) problems.push(`hits ${effect.hits}`);
        if (effect.scaling) problems.push(...scalingProblems(effect.scaling));
        break;
      case 'block':
        if (!isPositiveInt(effect.amount)) problems.push(`block amount ${effect.amount}`);
        if (effect.scaling) problems.push(...scalingProblems(effect.scaling));
        break;
      case 'heal':
      case 'draw':
      case 'energy':
        if (!isPositiveInt(effect.amount)) problems.push(`${effect.type} amount ${effect.amount}`);
        break;
      case 'status':
        if (!isPositiveInt(effect.amount)) problems.push(`status amount ${effect.amount}`);
        if (effect.status === 'confused' && effect.target === 'self') problems.push('confused on self');
        break;
      case 'execute':
        if (!nested) problems.push('execute outside of a conditional');
        break;
      case 'conditional':
        problems.push(...conditionProblems(effect.condition));
        if (effect.then.length === 0) problems.push('conditional with empty then');
        if (effect.else !== undefined && effect.else.length === 0) problems.push('conditional with empty else');
        problems.push(...effectProblems(effect.then, true), ...effectProblems(effect.else ?? [], true));
        break;
    }
  }
  if (!nested && effects.length === 0) problems.push('no effects');
  return problems;
}

function enemyEffectProblems(effect: EnemyEffect): string[] {
  switch (effect.type) {
    case 'attack':
      return [
        ...(isPositiveInt(effect.amount) ? [] : [`attack amount ${effect.amount}`]),
        ...(effect.hits === undefined || isPositiveInt(effect.hits) ? [] : [`hits ${effect.hits}`]),
      ];
    case 'block':
    case 'heal':
      return isPositiveInt(effect.amount) ? [] : [`${effect.type} amount ${effect.amount}`];
    case 'status':
      return isPositiveInt(effect.amount) ? [] : [`status amount ${effect.amount}`];
  }
}

/** Total attack damage of a move (before modifiers). */
function moveDamage(effects: readonly EnemyEffect[]): number {
  return effects.reduce((sum, e) => (e.type === 'attack' ? sum + e.amount * (e.hits ?? 1) : sum), 0);
}

describe('ids and references', () => {
  it('has unique ids per collection', () => {
    expect(duplicates(CARDS.map((c) => c.id))).toEqual([]);
    expect(duplicates(ENEMIES.map((e) => e.id))).toEqual([]);
    expect(duplicates(FOSSILS.map((f) => f.id))).toEqual([]);
  });

  it('uses url-safe ids', () => {
    const pattern = /^[a-z][a-z0-9-]*$/;
    for (const id of [...CARDS, ...ENEMIES, ...FOSSILS].map((x) => x.id)) {
      expect(id).toMatch(pattern);
    }
  });

  it('has unique move ids per enemy', () => {
    for (const enemy of ENEMIES) {
      expect({ enemy: enemy.id, dups: duplicates(enemy.moves.map((m) => m.id)) }).toEqual({
        enemy: enemy.id,
        dups: [],
      });
    }
  });

  it('resolves every fossilId', () => {
    const missing = [...CARDS, ...ENEMIES].filter((x) => !fossilsById.has(x.fossilId)).map((x) => x.id);
    expect(missing).toEqual([]);
  });

  it('references every fossil from at least one card or enemy', () => {
    const referenced = new Set([...CARDS, ...ENEMIES].map((x) => x.fossilId));
    expect(FOSSILS.filter((f) => !referenced.has(f.id)).map((f) => f.id)).toEqual([]);
  });

  it('places cards and enemies in the era of their fossil', () => {
    for (const item of [...CARDS, ...ENEMIES]) {
      expect({ id: item.id, era: item.era }).toEqual({ id: item.id, era: fossilOf(item).era });
    }
  });

  it('builds the CONTENT registry from the lists', () => {
    expect(Object.keys(CONTENT.cards)).toHaveLength(CARDS.length);
    expect(Object.keys(CONTENT.enemies)).toHaveLength(ENEMIES.length);
    expect(Object.keys(CONTENT.fossils)).toHaveLength(FOSSILS.length);
    expect(CONTENT.starterDeck).toEqual(STARTER_DECK);
    for (const card of CARDS) expect(CONTENT.cards[card.id]).toBe(card);
  });
});

describe('starter deck', () => {
  it('has exactly 10 cards that all exist', () => {
    expect(STARTER_DECK).toHaveLength(10);
    for (const id of STARTER_DECK) expect(cardsById.has(id)).toBe(true);
  });

  it('only contains starter cards from the Trias', () => {
    for (const id of STARTER_DECK) {
      const card = cardsById.get(id);
      expect(card?.rarity).toBe('starter');
      expect(card?.era).toBe('trias');
    }
  });

  it('uses every starter card and mixes attack and defense', () => {
    const starterIds = CARDS.filter((c) => c.rarity === 'starter').map((c) => c.id);
    expect(new Set(STARTER_DECK)).toEqual(new Set(starterIds));
    const types = STARTER_DECK.map((id) => cardsById.get(id)?.type);
    expect(types.filter((t) => t === 'attack').length).toBeGreaterThanOrEqual(5);
    expect(types.filter((t) => t === 'defense').length).toBeGreaterThanOrEqual(4);
  });
});

describe('per-era counts', () => {
  it.each(ERAS)('%s has 10 non-starter cards with the right rarity mix', (era) => {
    const cards = nonStarterCards.filter((c) => c.era === era);
    expect(cards).toHaveLength(CARDS_PER_ERA);
    for (const [rarity, [min, max]] of Object.entries(RARITY_PER_ERA)) {
      const count = cards.filter((c) => c.rarity === rarity).length;
      expect({ era, rarity, ok: count >= min && count <= max }).toEqual({ era, rarity, ok: true });
    }
  });

  it.each(ERAS)('%s has 4 normal enemies, 2 elites and exactly 1 boss', (era) => {
    for (const [tier, count] of Object.entries(ENEMIES_PER_ERA)) {
      expect({ era, tier, count: ENEMIES.filter((e) => e.era === era && e.tier === tier).length }).toEqual({
        era,
        tier,
        count,
      });
    }
  });

  it('has at least one card of each type per era', () => {
    for (const era of ERAS) {
      const types = new Set(nonStarterCards.filter((c) => c.era === era).map((c) => c.type));
      expect({ era, attack: types.has('attack'), defense: types.has('defense') }).toEqual({
        era,
        attack: true,
        defense: true,
      });
    }
  });
});

describe('cards', () => {
  it('costs between 0 and 3 energy, upgraded never more expensive', () => {
    for (const card of CARDS) {
      expect({ id: card.id, ok: Number.isInteger(card.cost) && card.cost >= 0 && card.cost <= 3 }).toEqual({
        id: card.id,
        ok: true,
      });
      const upgradedCost = card.upgrade.cost ?? card.cost;
      expect({
        id: card.id,
        ok: Number.isInteger(upgradedCost) && upgradedCost >= 0 && upgradedCost <= card.cost,
      }).toEqual({
        id: card.id,
        ok: true,
      });
    }
  });

  it('only lets rare cards cost 3', () => {
    expect(CARDS.filter((c) => c.cost === 3 && c.rarity !== 'rare').map((c) => c.id)).toEqual([]);
  });

  it('has well-formed effects (base and upgraded)', () => {
    for (const card of CARDS) {
      expect({ id: card.id, problems: effectProblems(card.effects, false) }).toEqual({ id: card.id, problems: [] });
      expect({ id: card.id, problems: effectProblems(upgradedEffects(card), false) }).toEqual({
        id: card.id,
        problems: [],
      });
    }
  });

  it('has a meaningful upgrade', () => {
    for (const card of CARDS) {
      const costChanged = card.upgrade.cost !== undefined && card.upgrade.cost !== card.cost;
      const effectsChanged =
        card.upgrade.effects !== undefined && JSON.stringify(card.upgrade.effects) !== JSON.stringify(card.effects);
      const exhaustChanged = card.upgrade.exhaust !== undefined && card.upgrade.exhaust !== (card.exhaust ?? false);
      expect({ id: card.id, changed: costChanged || effectsChanged || exhaustChanged }).toEqual({
        id: card.id,
        changed: true,
      });
    }
  });

  it('matches its type: attacks deal damage, defense cards block', () => {
    for (const card of CARDS) {
      for (const effects of [card.effects, upgradedEffects(card)]) {
        const flat = flattenEffects(effects);
        if (card.type === 'attack')
          expect({ id: card.id, damage: flat.some((e) => e.type === 'damage') }).toEqual({ id: card.id, damage: true });
        if (card.type === 'defense')
          expect({ id: card.id, block: flat.some((e) => e.type === 'block') }).toEqual({ id: card.id, block: true });
      }
    }
  });

  it('only scales with tags that some card actually has', () => {
    const usedTags = new Set(CARDS.flatMap((c) => c.tags));
    for (const card of CARDS) {
      for (const effect of flattenEffects([...card.effects, ...upgradedEffects(card)])) {
        if ((effect.type === 'damage' || effect.type === 'block') && effect.scaling?.per === 'tagInZone') {
          expect({ id: card.id, tag: usedTags.has(effect.scaling.tag) }).toEqual({ id: card.id, tag: true });
        }
      }
    }
  });

  it('has unique tags that fit the animal', () => {
    for (const card of CARDS) {
      expect({ id: card.id, dups: duplicates(card.tags) }).toEqual({ id: card.id, dups: [] });
      const fossil = fossilOf(card);
      const fits: Record<CardTag, boolean> = {
        carnivore: fossil.diet === 'carnivore' || fossil.diet === 'omnivore',
        herbivore: fossil.diet === 'herbivore' || fossil.diet === 'omnivore',
        flyer: fossil.kind === 'pterosaur' || fossil.kind === 'bird',
        marine: ['marine-reptile', 'fish', 'invertebrate', 'reptile'].includes(fossil.kind),
        plant: fossil.kind === 'plant',
        mammal: fossil.kind === 'mammal',
        invertebrate: fossil.kind === 'invertebrate',
        pack: fossil.diet === 'carnivore',
      };
      for (const tag of card.tags)
        expect({ id: card.id, tag, fits: fits[tag] }).toEqual({ id: card.id, tag, fits: true });
    }
  });

  it('generates non-empty German rules text for every card and upgrade', () => {
    for (const card of CARDS) {
      for (const upgraded of [false, true]) {
        const text = describeCard(card, upgraded);
        expect(typeof text).toBe('string');
        expect({ id: card.id, upgraded, empty: text.trim().length === 0 }).toEqual({
          id: card.id,
          upgraded,
          empty: false,
        });
        expect(text).not.toMatch(/undefined|NaN|\[object/);
      }
    }
  });
});

describe('enemies', () => {
  it('has a valid HP range inside the act band', () => {
    for (const enemy of ENEMIES) {
      const [lo, hi] = enemy.hp;
      const [min, max] = HP_BANDS[enemy.era][enemy.tier];
      expect({
        id: enemy.id,
        ok: isPositiveInt(lo) && isPositiveInt(hi) && lo <= hi && lo >= min && hi <= max,
      }).toEqual({
        id: enemy.id,
        ok: true,
      });
    }
  });

  it('has well-formed moves', () => {
    for (const enemy of ENEMIES) {
      expect(enemy.moves.length).toBeGreaterThanOrEqual(enemy.tier === 'boss' ? 4 : 3);
      for (const move of enemy.moves) {
        expect(move.effects.length).toBeGreaterThan(0);
        expect({ id: `${enemy.id}/${move.id}`, problems: move.effects.flatMap(enemyEffectProblems) }).toEqual({
          id: `${enemy.id}/${move.id}`,
          problems: [],
        });
      }
      expect(enemy.moves.some((m) => m.effects.some((e) => e.type === 'attack'))).toBe(true);
    }
  });

  it('only weights existing moves and can use every move', () => {
    for (const enemy of ENEMIES) {
      const moveIds = enemy.moves.map((m) => m.id);
      if (enemy.pattern.type === 'weighted') {
        const weights = enemy.pattern.weights;
        expect({ id: enemy.id, unknown: Object.keys(weights).filter((k) => !moveIds.includes(k)) }).toEqual({
          id: enemy.id,
          unknown: [],
        });
        for (const moveId of moveIds) {
          const weight = weights[moveId] ?? 0;
          expect({ id: `${enemy.id}/${moveId}`, ok: Number.isFinite(weight) && weight > 0 }).toEqual({
            id: `${enemy.id}/${moveId}`,
            ok: true,
          });
        }
      }
    }
  });

  it('has a valid opening move', () => {
    for (const enemy of ENEMIES) {
      if (enemy.openingMoveId !== undefined) {
        expect({ id: enemy.id, ok: enemy.moves.some((m) => m.id === enemy.openingMoveId) }).toEqual({
          id: enemy.id,
          ok: true,
        });
      }
    }
  });

  it('hits harder in later acts', () => {
    // Expected attack damage per enemy turn (pattern weights applied), averaged per era and tier.
    const perTurn = (enemy: EnemyDef) => {
      const weightOf = (moveId: string) =>
        enemy.pattern.type === 'weighted' ? (enemy.pattern.weights[moveId] ?? 0) : 1;
      const total = enemy.moves.reduce((sum, m) => sum + weightOf(m.id), 0);
      return enemy.moves.reduce((sum, m) => sum + moveDamage(m.effects) * weightOf(m.id), 0) / total;
    };
    const average = (era: Era, tier: EnemyTier) => {
      const list = ENEMIES.filter((e) => e.era === era && e.tier === tier).map(perTurn);
      return list.reduce((a, b) => a + b, 0) / list.length;
    };
    for (const tier of ['normal', 'elite'] as const) {
      for (let i = 1; i < ERAS.length; i++) {
        const prev = ERAS[i - 1] as Era;
        const era = ERAS[i] as Era;
        expect({ tier, era, harder: average(era, tier) > average(prev, tier) }).toEqual({ tier, era, harder: true });
      }
    }
  });

  it('generates a German move summary for every enemy', () => {
    for (const enemy of ENEMIES) {
      expect(describeEnemy(enemy).length).toBeGreaterThan(0);
      for (const move of enemy.moves) expect(describeMove(move)).toContain(move.name);
    }
  });
});

describe('fossils', () => {
  it('has era bounds that are ordered and contiguous', () => {
    for (let i = 0; i < ERAS.length; i++) {
      const [start, end] = ERA_MYA[ERAS[i] as Era];
      expect(start).toBeGreaterThan(end);
      if (i > 0) expect(start).toBeLessThanOrEqual(ERA_MYA[ERAS[i - 1] as Era][1]);
      expect(ERA_NAMES[ERAS[i] as Era].length).toBeGreaterThan(0);
    }
  });

  it('has an age range inside its era', () => {
    for (const fossil of FOSSILS) {
      const [older, younger] = fossil.mya;
      const [eraStart, eraEnd] = ERA_MYA[fossil.era];
      // Ice-age animals may have survived into the Holocene (e.g. the last
      // woolly mammoths on Wrangel Island) or still live today (musk ox).
      const youngest = fossil.era === 'eiszeit' ? 0 : eraEnd;
      expect({
        id: fossil.id,
        ok:
          older >= younger &&
          younger >= 0 &&
          older <= eraStart &&
          older > eraEnd &&
          younger >= youngest &&
          younger < eraStart,
      }).toEqual({ id: fossil.id, ok: true });
    }
  });

  it('has 2–4 short facts per entry', () => {
    for (const fossil of FOSSILS) {
      expect({ id: fossil.id, ok: fossil.facts.length >= 2 && fossil.facts.length <= 4 }).toEqual({
        id: fossil.id,
        ok: true,
      });
      expect(duplicates(fossil.facts)).toEqual([]);
      for (const fact of fossil.facts) {
        expect({ id: fossil.id, fact, ok: fact.length <= MAX_FACT_LENGTH && /[.!?]$/.test(fact) }).toEqual({
          id: fossil.id,
          fact,
          ok: true,
        });
      }
    }
  });

  it('has sensible optional lengths', () => {
    for (const fossil of FOSSILS) {
      if (fossil.lengthM !== undefined) {
        expect({ id: fossil.id, ok: fossil.lengthM > 0 && fossil.lengthM < 40 }).toEqual({ id: fossil.id, ok: true });
      }
      if (fossil.kind === 'plant') {
        expect(fossil.diet).toBe('photosynthesis');
        expect(fossil.lengthM).toBeUndefined();
      }
    }
  });

  it('uses a binomial or trinomial scientific name', () => {
    for (const fossil of FOSSILS) {
      expect(fossil.scientificName).toMatch(/^[A-Z][a-z]+( [a-z]+){1,2}$/);
    }
  });

  it('does not repeat the old v1 mistakes', () => {
    const text = FOSSILS.flatMap((f) => [f.name, ...f.facts]).join(' ');
    // Ferns were not among the first land plants; trilobites died out in the Permian.
    expect(text).not.toMatch(/ersten Landpflanzen/);
    expect(FOSSILS.some((f) => /trilobit/i.test(f.name))).toBe(false);
    // Non-dinosaurs that are often mistaken for dinosaurs say so.
    for (const id of ['pteranodon', 'mammuthus', 'smilodon']) {
      expect(fossilsById.get(id)?.facts.some((fact) => /(keine?|noch ein) Dinosaurier/.test(fact))).toBe(true);
    }
  });
});

describe('strings', () => {
  const named: { id: string; name: string; emoji: string }[] = [...CARDS, ...ENEMIES, ...FOSSILS];

  it('has no empty strings', () => {
    const blank = (s: string) => s.trim().length === 0;
    for (const item of named) {
      expect({ id: item.id, ok: !blank(item.name) && !blank(item.emoji) }).toEqual({ id: item.id, ok: true });
    }
    for (const fossil of FOSSILS) {
      for (const s of [fossil.scientificName, fossil.foundIn, ...fossil.facts]) {
        expect({ id: fossil.id, ok: !blank(s) }).toEqual({ id: fossil.id, ok: true });
      }
    }
    for (const enemy of ENEMIES) {
      for (const move of enemy.moves)
        expect({ id: `${enemy.id}/${move.id}`, ok: !blank(move.name) }).toEqual({
          id: `${enemy.id}/${move.id}`,
          ok: true,
        });
    }
  });

  it('keeps names short', () => {
    for (const item of named) {
      expect({ id: item.id, name: item.name, ok: item.name.length <= MAX_NAME_LENGTH }).toEqual({
        id: item.id,
        name: item.name,
        ok: true,
      });
    }
    for (const card of CARDS) {
      expect({ id: card.id, ok: card.name.length <= MAX_CARD_NAME_LENGTH }).toEqual({ id: card.id, ok: true });
    }
    for (const enemy of ENEMIES) {
      for (const move of enemy.moves)
        expect({ id: `${enemy.id}/${move.id}`, ok: move.name.length <= MAX_NAME_LENGTH }).toEqual({
          id: `${enemy.id}/${move.id}`,
          ok: true,
        });
    }
  });

  it('has no leading/trailing whitespace or ASCII stand-ins for German quotes', () => {
    const strings = [
      ...named.map((x) => x.name),
      ...FOSSILS.flatMap((f) => [f.scientificName, f.foundIn, ...f.facts]),
      ...ENEMIES.flatMap((e) => e.moves.map((m) => m.name)),
    ];
    for (const s of strings) {
      expect(s).toBe(s.trim());
      expect(s).not.toMatch(/["`]|\s{2,}/);
    }
  });
});
