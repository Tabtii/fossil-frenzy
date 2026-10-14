import type { CardDef, CardEffect, CardInstance, CombatState, ContentDB, EnemyDef, EnemyState, Combatant } from '../../types';

// Small, self-contained content for engine tests (never imports src/data).

function card(id: string, effects: CardEffect[], extra: Partial<CardDef> = {}): CardDef {
  return {
    id,
    name: id,
    emoji: '🦴',
    era: 'trias',
    type: 'attack',
    rarity: 'common',
    cost: 1,
    tags: [],
    effects,
    upgrade: {},
    fossilId: `fossil-${id}`,
    ...extra,
  };
}

const CARD_LIST: CardDef[] = [
  card('strike', [{ type: 'damage', amount: 6 }], { upgrade: { effects: [{ type: 'damage', amount: 9 }] } }),
  card('defend', [{ type: 'block', amount: 5 }], { type: 'defense', upgrade: { effects: [{ type: 'block', amount: 8 }] } }),
  card('twin', [{ type: 'damage', amount: 3, hits: 2 }]),
  card('spear', [{ type: 'damage', amount: 5, pierce: true }]),
  card('flex', [{ type: 'status', status: 'strength', amount: 2, target: 'self' }], { type: 'support', cost: 0 }),
  card('bash', [
    { type: 'damage', amount: 8 },
    { type: 'status', status: 'vulnerable', amount: 2, target: 'enemy' },
  ], { cost: 2 }),
  card('weaken', [{ type: 'status', status: 'weak', amount: 2, target: 'enemy' }], { type: 'support' }),
  card('cut', [
    { type: 'damage', amount: 4 },
    { type: 'status', status: 'bleed', amount: 3, target: 'enemy' },
  ]),
  card('daze', [{ type: 'status', status: 'confused', amount: 1, target: 'enemy' }], { type: 'support' }),
  card('study', [{ type: 'draw', amount: 2 }], { type: 'support' }),
  card('surge', [{ type: 'energy', amount: 2 }], { type: 'support', cost: 0, exhaust: true }),
  card('mend', [{ type: 'heal', amount: 4 }], { type: 'support', exhaust: true, upgrade: { cost: 0, exhaust: false } }),
  card('finisher', [
    { type: 'conditional', condition: { kind: 'enemyHpAtMost', value: 15 }, then: [{ type: 'execute' }], else: [{ type: 'damage', amount: 5 }] },
  ]),
  card('ambush', [
    {
      type: 'conditional',
      condition: { kind: 'firstAttackThisTurn' },
      then: [{ type: 'damage', amount: 10 }],
      else: [{ type: 'damage', amount: 4 }],
    },
  ]),
  card('gamble', [{ type: 'conditional', condition: { kind: 'chance', percent: 50 }, then: [{ type: 'draw', amount: 1 }] }], {
    type: 'support',
    cost: 0,
  }),
  card(
    'stampede',
    [{ type: 'damage', amount: 4, scaling: { per: 'tagInZone', tag: 'herbivore', zone: 'discardPile', amount: 2, max: 6 } }],
    { tags: ['herbivore'] },
  ),
  card('herd', [{ type: 'damage', amount: 1, scaling: { per: 'tagInZone', tag: 'herbivore', zone: 'hand', amount: 1 } }], {
    tags: ['herbivore'],
  }),
  card('frenzy', [{ type: 'damage', amount: 2, scaling: { per: 'cardsPlayedThisTurn', amount: 2 } }], { cost: 0 }),
  card('shieldBash', [{ type: 'damage', amount: 0, scaling: { per: 'playerBlock', amount: 1 } }]),
  card(
    'fortify',
    [
      { type: 'block', amount: 3 },
      { type: 'conditional', condition: { kind: 'playerBlockAtLeast', value: 5 }, then: [{ type: 'block', amount: 3 }] },
    ],
    { type: 'defense' },
  ),
  card('mark', [
    {
      type: 'conditional',
      condition: { kind: 'enemyHasStatus', status: 'vulnerable' },
      then: [{ type: 'damage', amount: 6 }],
      else: [{ type: 'damage', amount: 3 }],
    },
  ]),
  card('flurry', [
    { type: 'damage', amount: 2, hits: 5 },
    { type: 'draw', amount: 1 },
  ]),
  card('leaf', [{ type: 'block', amount: 4 }], { type: 'defense', tags: ['herbivore', 'plant'] }),
  card('jab', [{ type: 'damage', amount: 1 }], { cost: 0 }),
  card('boulder', [{ type: 'damage', amount: 20 }], { cost: 3 }),
  card('powerUp', [
    { type: 'status', status: 'strength', amount: 1, target: 'self' },
    { type: 'damage', amount: 5 },
  ]),
  card('cycle', [
    { type: 'draw', amount: 1 },
    { type: 'energy', amount: 1 },
  ], { type: 'support', cost: 0, exhaust: true }),
];

function enemy(id: string, extra: Partial<EnemyDef> & Pick<EnemyDef, 'moves' | 'pattern'>): EnemyDef {
  return { id, name: id, emoji: '🦖', era: 'trias', tier: 'normal', hp: [20, 20], fossilId: `fossil-${id}`, ...extra };
}

const ENEMY_LIST: EnemyDef[] = [
  enemy('dummy', {
    moves: [
      { id: 'bite', name: 'Biss', effects: [{ type: 'attack', amount: 6 }] },
      { id: 'guard', name: 'Panzer', effects: [{ type: 'block', amount: 5 }] },
      { id: 'roar', name: 'Brüllen', effects: [{ type: 'status', status: 'strength', amount: 2, target: 'self' }] },
    ],
    pattern: { type: 'cycle' },
  }),
  enemy('rex', {
    hp: [30, 40],
    moves: [
      { id: 'chomp', name: 'Zubeißen', effects: [{ type: 'attack', amount: 7 }] },
      { id: 'stomp', name: 'Stampfen', effects: [{ type: 'attack', amount: 3, hits: 2 }] },
    ],
    pattern: { type: 'weighted', weights: { chomp: 3, stomp: 1 } },
  }),
  enemy('hexer', {
    hp: [25, 25],
    moves: [
      {
        id: 'curse',
        name: 'Fluch',
        effects: [
          { type: 'status', status: 'weak', amount: 2, target: 'player' },
          { type: 'status', status: 'vulnerable', amount: 2, target: 'player' },
        ],
      },
      {
        id: 'pummel',
        name: 'Prügeln',
        effects: [
          { type: 'status', status: 'strength', amount: 1, target: 'self' },
          { type: 'attack', amount: 4, hits: 2 },
        ],
      },
      { id: 'regrow', name: 'Nachwachsen', effects: [{ type: 'heal', amount: 6 }] },
      {
        id: 'shellBash',
        name: 'Panzerstoß',
        effects: [
          { type: 'block', amount: 6 },
          { type: 'attack', amount: 5 },
        ],
      },
    ],
    pattern: { type: 'cycle' },
  }),
  enemy('opener', {
    moves: [
      { id: 'small', name: 'Kratzer', effects: [{ type: 'attack', amount: 2 }] },
      { id: 'big', name: 'Rammstoß', effects: [{ type: 'attack', amount: 10 }] },
    ],
    pattern: { type: 'cycle' },
    openingMoveId: 'big',
  }),
  enemy('loner', {
    moves: [{ id: 'only', name: 'Einzig', effects: [{ type: 'attack', amount: 1 }] }],
    pattern: { type: 'weighted', weights: { only: 1 } },
  }),
  enemy('lopsided', {
    moves: [
      { id: 'a', name: 'A', effects: [{ type: 'attack', amount: 1 }] },
      { id: 'b', name: 'B', effects: [{ type: 'block', amount: 1 }] },
    ],
    pattern: { type: 'weighted', weights: { a: 1, b: 0 } },
  }),
];

export const TEST_DB: ContentDB = {
  cards: Object.fromEntries(CARD_LIST.map((c) => [c.id, c])),
  enemies: Object.fromEntries(ENEMY_LIST.map((e) => [e.id, e])),
  fossils: {},
  starterDeck: ['strike', 'strike', 'strike', 'strike', 'strike', 'defend', 'defend', 'defend', 'defend', 'bash'],
};

export const CARD_IDS: string[] = CARD_LIST.map((c) => c.id);

let uidCounter = 0;

/** A fresh card instance with a unique uid. */
export function inst(defId: string, upgraded = false, uid?: string): CardInstance {
  uidCounter += 1;
  return { uid: uid ?? `${defId}#${uidCounter}`, defId, upgraded };
}

export interface StateOverrides extends Partial<Omit<CombatState, 'player' | 'enemy'>> {
  player?: Partial<Combatant>;
  enemy?: Partial<EnemyState>;
}

/** A hand-built mid-combat state against `dummy` (20 HP, next move: bite 6). */
export function makeState(overrides: StateOverrides = {}): CombatState {
  const { player, enemy: enemyOverrides, ...rest } = overrides;
  return {
    player: { hp: 50, maxHp: 60, block: 0, statuses: {}, ...player },
    enemy: {
      hp: 20,
      maxHp: 20,
      block: 0,
      statuses: {},
      defId: 'dummy',
      nextMoveId: 'bite',
      history: [],
      ...enemyOverrides,
    },
    drawPile: [],
    hand: [],
    discardPile: [],
    exhaustPile: [],
    energy: 3,
    maxEnergy: 3,
    turn: 1,
    cardsPlayedThisTurn: 0,
    attacksPlayedThisTurn: 0,
    phase: 'player',
    rngState: 12345,
    events: [],
    ...rest,
  };
}

/** Recursively freezes a value so any mutation in strict-mode code throws. */
export function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const key of Object.keys(value)) {
      deepFreeze((value as Record<string, unknown>)[key]);
    }
  }
  return value;
}

/** All card instances of a combat in a canonical order (for conservation checks). */
export function allCards(state: CombatState): CardInstance[] {
  return [...state.drawPile, ...state.hand, ...state.discardPile, ...state.exhaustPile];
}
