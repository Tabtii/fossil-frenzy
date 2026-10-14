import { describe, expect, it } from '@jest/globals';
import { canPlay } from '../combat';
import {
  ACT_COUNT,
  availableNodes,
  chooseCardReward,
  chooseDig,
  chooseRest,
  createRun,
  currentNode,
  deckFossils,
  enterNode,
  resolveCombat,
  runEndTurn,
  runPlayCard,
  startNextAct,
} from '../run';
import type {
  CardDef,
  CardEffect,
  CardType,
  ContentDB,
  EnemyDef,
  EnemyMove,
  EnemyTier,
  Era,
  Rarity,
  RunState,
} from '../types';
import { ERAS } from '../types';

// Plays complete runs with real combat and a simple greedy policy to make sure
// the run state machine always reaches victory or defeat and never gets stuck.

// ---------------------------------------------------------------------------
// Fixture content with a broad mix of effects (never import src/data here)
// ---------------------------------------------------------------------------

interface Template {
  type: CardType;
  cost: number;
  effects: CardEffect[];
  upgraded: CardEffect[];
  exhaust?: boolean;
}

const TEMPLATES: Template[] = [
  { type: 'attack', cost: 1, effects: [{ type: 'damage', amount: 8 }], upgraded: [{ type: 'damage', amount: 11 }] },
  {
    type: 'defense',
    cost: 1,
    effects: [{ type: 'block', amount: 7 }, { type: 'draw', amount: 1 }],
    upgraded: [{ type: 'block', amount: 9 }, { type: 'draw', amount: 1 }],
  },
  {
    type: 'attack',
    cost: 1,
    effects: [{ type: 'damage', amount: 4, hits: 2 }],
    upgraded: [{ type: 'damage', amount: 5, hits: 2 }],
  },
  {
    type: 'support',
    cost: 1,
    effects: [{ type: 'status', status: 'bleed', amount: 4, target: 'enemy' }],
    upgraded: [{ type: 'status', status: 'bleed', amount: 6, target: 'enemy' }],
  },
  {
    type: 'defense',
    cost: 1,
    effects: [{ type: 'block', amount: 4 }, { type: 'status', status: 'weak', amount: 2, target: 'enemy' }],
    upgraded: [{ type: 'block', amount: 6 }, { type: 'status', status: 'weak', amount: 2, target: 'enemy' }],
  },
  {
    type: 'support',
    cost: 0,
    exhaust: true,
    effects: [{ type: 'energy', amount: 1 }, { type: 'draw', amount: 1 }],
    upgraded: [{ type: 'energy', amount: 2 }, { type: 'draw', amount: 1 }],
  },
  {
    type: 'attack',
    cost: 1,
    effects: [
      { type: 'conditional', condition: { kind: 'firstAttackThisTurn' }, then: [{ type: 'damage', amount: 10 }], else: [{ type: 'damage', amount: 5 }] },
    ],
    upgraded: [{ type: 'damage', amount: 12 }],
  },
  {
    type: 'attack',
    cost: 1,
    effects: [{ type: 'damage', amount: 5, scaling: { per: 'cardsPlayedThisTurn', amount: 2, max: 6 } }],
    upgraded: [{ type: 'damage', amount: 7, scaling: { per: 'cardsPlayedThisTurn', amount: 2, max: 8 } }],
  },
  {
    type: 'support',
    cost: 1,
    exhaust: true,
    effects: [{ type: 'status', status: 'strength', amount: 2, target: 'self' }],
    upgraded: [{ type: 'status', status: 'strength', amount: 3, target: 'self' }],
  },
  {
    type: 'support',
    cost: 1,
    effects: [{ type: 'status', status: 'confused', amount: 1, target: 'enemy' }, { type: 'block', amount: 3 }],
    upgraded: [{ type: 'status', status: 'confused', amount: 1, target: 'enemy' }, { type: 'block', amount: 6 }],
  },
  {
    type: 'support',
    cost: 1,
    exhaust: true,
    effects: [{ type: 'heal', amount: 5 }],
    upgraded: [{ type: 'heal', amount: 8 }],
  },
  {
    type: 'attack',
    cost: 2,
    effects: [
      {
        type: 'conditional',
        condition: { kind: 'enemyHpAtMost', value: 10 },
        then: [{ type: 'execute' }],
        else: [{ type: 'damage', amount: 9, pierce: true }],
      },
    ],
    upgraded: [
      {
        type: 'conditional',
        condition: { kind: 'enemyHpAtMost', value: 14 },
        then: [{ type: 'execute' }],
        else: [{ type: 'damage', amount: 12, pierce: true }],
      },
    ],
  },
  {
    type: 'attack',
    cost: 1,
    effects: [
      { type: 'damage', amount: 3, scaling: { per: 'tagInZone', tag: 'carnivore', zone: 'deck', amount: 1, max: 6 } },
      { type: 'status', status: 'vulnerable', amount: 1, target: 'enemy' },
    ],
    upgraded: [
      { type: 'damage', amount: 5, scaling: { per: 'tagInZone', tag: 'carnivore', zone: 'deck', amount: 1, max: 8 } },
      { type: 'status', status: 'vulnerable', amount: 2, target: 'enemy' },
    ],
  },
  {
    type: 'attack',
    cost: 1,
    effects: [{ type: 'damage', amount: 2, scaling: { per: 'playerBlock', amount: 1, max: 10 } }],
    upgraded: [{ type: 'damage', amount: 4, scaling: { per: 'playerBlock', amount: 1, max: 12 } }],
  },
];

function card(id: string, era: Era, rarity: Rarity, template: Template): CardDef {
  const def: CardDef = {
    id,
    name: id,
    emoji: '🦴',
    era,
    type: template.type,
    rarity,
    cost: template.cost,
    tags: template.type === 'attack' ? ['carnivore'] : ['herbivore'],
    effects: template.effects,
    upgrade: { effects: template.upgraded },
    fossilId: `fossil-${id}`,
  };
  if (template.exhaust) def.exhaust = true;
  return def;
}

function enemy(
  id: string,
  era: Era,
  tier: EnemyTier,
  hp: [number, number],
  moves: EnemyMove[],
  pattern: EnemyDef['pattern'],
): EnemyDef {
  return { id, name: id, emoji: '🦖', era, tier, hp, moves, pattern, fossilId: `fossil-${id}` };
}

function makeDb(): ContentDB {
  const cards: CardDef[] = [
    card('strike', 'trias', 'starter', TEMPLATES[0] as Template),
    card('guard', 'trias', 'starter', {
      type: 'defense',
      cost: 1,
      effects: [{ type: 'block', amount: 5 }],
      upgraded: [{ type: 'block', amount: 8 }],
    }),
    card('roar', 'trias', 'starter', {
      type: 'attack',
      cost: 2,
      effects: [{ type: 'damage', amount: 8 }, { type: 'status', status: 'vulnerable', amount: 2, target: 'enemy' }],
      upgraded: [{ type: 'damage', amount: 10 }, { type: 'status', status: 'vulnerable', amount: 3, target: 'enemy' }],
    }),
  ];
  // Starter strike deals 6, not 8.
  cards[0] = { ...(cards[0] as CardDef), effects: [{ type: 'damage', amount: 6 }], upgrade: { effects: [{ type: 'damage', amount: 9 }] } };

  const enemies: EnemyDef[] = [];
  let t = 0;
  ERAS.forEach((era, act) => {
    const counts: [Rarity, number][] = [
      ['common', 5],
      ['uncommon', 4],
      ['rare', 3],
    ];
    for (const [rarity, count] of counts) {
      for (let i = 0; i < count; i++) {
        cards.push(card(`${era}-${rarity}-${i}`, era, rarity, TEMPLATES[t++ % TEMPLATES.length] as Template));
      }
    }
    const scale = 1 + act * 0.25;
    const dmg = (n: number) => Math.round(n * scale);
    for (let i = 0; i < 4; i++) {
      enemies.push(
        enemy(
          `${era}-normal-${i}`,
          era,
          'normal',
          [dmg(18), dmg(24)],
          [
            { id: 'bite', name: 'Biss', effects: [{ type: 'attack', amount: dmg(6) }] },
            { id: 'guard', name: 'Deckung', effects: [{ type: 'block', amount: 5 }, { type: 'attack', amount: dmg(3) }] },
            { id: 'roar', name: 'Brüllen', effects: [{ type: 'status', status: 'strength', amount: 1, target: 'self' }] },
            { id: 'spit', name: 'Spucken', effects: [{ type: 'status', status: 'weak', amount: 1, target: 'player' }] },
          ],
          i % 2 === 0 ? { type: 'weighted', weights: { bite: 4, guard: 3, roar: 1, spit: 2 } } : { type: 'cycle' },
        ),
      );
    }
    for (let i = 0; i < 2; i++) {
      enemies.push(
        enemy(
          `${era}-elite-${i}`,
          era,
          'elite',
          [dmg(36), dmg(42)],
          [
            { id: 'slash', name: 'Hieb', effects: [{ type: 'attack', amount: dmg(9) }] },
            { id: 'double', name: 'Doppelbiss', effects: [{ type: 'attack', amount: dmg(4), hits: 2 }] },
            { id: 'pump', name: 'Aufpumpen', effects: [{ type: 'status', status: 'strength', amount: 2, target: 'self' }] },
          ],
          { type: 'cycle' },
        ),
      );
    }
    enemies.push(
      enemy(
        `${era}-boss`,
        era,
        'boss',
        [70 + act * 20, 80 + act * 20],
        [
          { id: 'smash', name: 'Zermalmen', effects: [{ type: 'attack', amount: dmg(12) }] },
          { id: 'stomp', name: 'Stampfen', effects: [{ type: 'attack', amount: dmg(5), hits: 2 }] },
          { id: 'mend', name: 'Regeneration', effects: [{ type: 'heal', amount: 6 }, { type: 'block', amount: 8 }] },
          { id: 'gore', name: 'Aufspießen', effects: [{ type: 'status', status: 'bleed', amount: 3, target: 'player' }] },
        ],
        { type: 'weighted', weights: { smash: 3, stomp: 3, mend: 1, gore: 2 } },
      ),
    );
    const boss = enemies[enemies.length - 1] as EnemyDef;
    boss.openingMoveId = 'gore';
  });

  return {
    cards: Object.fromEntries(cards.map((c) => [c.id, c])),
    enemies: Object.fromEntries(enemies.map((e) => [e.id, e])),
    fossils: {},
    starterDeck: ['strike', 'strike', 'strike', 'strike', 'strike', 'guard', 'guard', 'guard', 'guard', 'roar'],
  };
}

const db = makeDb();

// ---------------------------------------------------------------------------
// Greedy driver
// ---------------------------------------------------------------------------

const MAX_STEPS = 20000;
const MAX_TURNS = 100;

interface Outcome {
  run: RunState;
  steps: number;
  cardsPlayed: number;
  combatsWon: number;
}

function invariantViolations(run: RunState): string[] {
  const problems: string[] = [];
  if (run.hp < 0 || run.hp > run.maxHp) problems.push(`hp ${run.hp}/${run.maxHp}`);
  if (run.hp === 0 && run.screen.type !== 'defeat') problems.push('alive with 0 hp');
  if (run.act < 0 || run.act >= ACT_COUNT) problems.push(`act ${run.act}`);
  const uids = run.deck.map((c) => c.uid);
  if (new Set(uids).size !== uids.length) problems.push('duplicate uid');
  if (uids.some((uid) => !(Number(uid.slice(1)) < run.nextUid))) problems.push('uid >= nextUid');
  if (run.deck.some((c) => !db.cards[c.defId])) problems.push('unknown card in deck');
  if (run.screen.type === 'map' && availableNodes(run).length === 0) problems.push('stuck on map');
  if (run.screen.type === 'combat' && run.screen.combat.turn > MAX_TURNS) problems.push('combat never ends');
  if (run.currentNodeId !== null && !currentNode(run)) problems.push('current node not on map');
  return problems;
}

function playRun(seed: number): Outcome {
  let run = createRun(db, seed);
  let steps = 0;
  let cardsPlayed = 0;
  let combatsWon = 0;
  let damageBefore = 0;

  while (run.screen.type !== 'victory' && run.screen.type !== 'defeat') {
    steps++;
    if (steps > MAX_STEPS) throw new Error(`seed ${seed}: step limit reached on ${run.screen.type}`);
    const problems = invariantViolations(run);
    if (problems.length > 0) throw new Error(`seed ${seed}: ${problems.join(', ')}`);

    const screen = run.screen;
    let next: RunState;
    switch (screen.type) {
      case 'map': {
        const options = availableNodes(run);
        const target = options[(seed + steps) % options.length];
        next = enterNode(db, run, target?.id ?? '');
        if (next.screen.type === 'combat') damageBefore = next.stats.damageDealt;
        break;
      }
      case 'combat': {
        const { combat } = screen;
        if (combat.phase !== 'player') {
          if (combat.phase === 'won') {
            combatsWon++;
            const enemyMaxHp = combat.enemy.maxHp;
            if (run.stats.damageDealt - damageBefore < enemyMaxHp) {
              throw new Error(`seed ${seed}: damage stat too low`);
            }
          }
          next = resolveCombat(db, run);
          break;
        }
        const playable = combat.hand.find((c) => canPlay(db, combat, c.uid).ok);
        if (playable) {
          next = runPlayCard(db, run, playable.uid);
          cardsPlayed++;
        } else {
          next = runEndTurn(db, run);
        }
        break;
      }
      case 'reward':
        next = chooseCardReward(db, run, screen.reward.choices[steps % 4] ?? null);
        break;
      case 'dig':
        next = chooseDig(db, run, screen.choices[0] ?? null);
        break;
      case 'rest': {
        const upgradable = run.deck.find((c) => !c.upgraded);
        next =
          run.hp < run.maxHp * 0.6 || !upgradable
            ? chooseRest(db, run, { type: 'heal' })
            : chooseRest(db, run, { type: 'upgrade', uid: upgradable.uid });
        break;
      }
      case 'actComplete':
        next = startNextAct(db, run);
        break;
    }
    if (next === run) throw new Error(`seed ${seed}: no progress on ${screen.type}`);
    run = next;
  }
  return { run, steps, cardsPlayed, combatsWon };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('simulated runs (greedy policy, real combat)', () => {
  const SEEDS = Array.from({ length: 40 }, (_, i) => 1000 + i * 31);
  let cache: (Outcome & { seed: number })[] | undefined;
  const outcomes = () => (cache ??= SEEDS.map((seed) => ({ seed, ...playRun(seed) })));

  it('always ends in victory or defeat without getting stuck', () => {
    for (const { run } of outcomes()) {
      expect(['victory', 'defeat']).toContain(run.screen.type);
      expect(invariantViolations(run)).toEqual([]);
    }
  });

  it('reaches both outcomes with this fixture', () => {
    const types = new Set(outcomes().map((o) => o.run.screen.type));
    expect(types).toEqual(new Set(['victory', 'defeat']));
  });

  it('keeps consistent stats', () => {
    for (const { run, cardsPlayed, combatsWon } of outcomes()) {
      expect(run.stats.cardsPlayed).toBe(cardsPlayed);
      expect(run.stats.enemiesDefeated).toBe(combatsWon);
      expect(run.stats.elitesDefeated + run.stats.bossesDefeated).toBeLessThanOrEqual(combatsWon);
      expect(run.stats.damageDealt).toBeGreaterThan(0);
      if (run.screen.type === 'victory') {
        expect(run.stats.bossesDefeated).toBe(ACT_COUNT);
        expect(run.stats.floorsCleared).toBe(ACT_COUNT * 6);
        expect(run.act).toBe(ACT_COUNT - 1);
      } else {
        expect(run.hp).toBe(0);
        expect(run.stats.bossesDefeated).toBe(run.act);
      }
      const fossils = deckFossils(db, run);
      expect(new Set(fossils).size).toBe(fossils.length);
    }
  });

  it('is fully deterministic per seed', () => {
    for (const seed of SEEDS.slice(0, 5)) {
      expect(playRun(seed).run).toEqual(outcomes().find((o) => o.seed === seed)?.run);
    }
  });
});
