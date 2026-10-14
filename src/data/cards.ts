import type { CardDef } from '@/engine/types';

// Card catalogue. Rules text is generated from `effects` (src/engine/describe.ts),
// so every number here is exactly what the player reads on the card.
//
// Balance guide (docs/ARCHITECTURE.md "Balance-Ziele"): a common card is worth
// about 6 damage or 5 block per energy; uncommon cards are a bit stronger or
// add a synergy, rare cards are build-arounds. Bleed N deals N + (N-1) + … + 1
// in total; status effects and draw are priced into the base numbers.
//
// Era identities and tag synergies:
//   Trias   – packs that grow with every card played, first plants, bleeding
//             marine reptiles.
//   Jura    – giant herbivores whose block scales with the herd, Stegosaurus
//             turning block into damage, piercing early birds, ammonite energy.
//   Kreide  – piercing flyers, armour and horns, confusion, bleed payoffs and
//             the Tyrannosaurus finisher.
//   Eiszeit – mammals that gain strength, heal and scale with other mammals.

/** Starter cards (rarity 'starter', era 'trias'). */
const STARTER_CARDS: CardDef[] = [
  {
    id: 'eoraptor',
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
  },
  {
    id: 'proganochelys',
    name: 'Urschildkröte',
    emoji: '🐢',
    era: 'trias',
    type: 'defense',
    rarity: 'starter',
    cost: 1,
    tags: [],
    effects: [{ type: 'block', amount: 5 }],
    upgrade: { effects: [{ type: 'block', amount: 8 }] },
    fossilId: 'proganochelys',
  },
  {
    id: 'tanystropheus',
    name: 'Tanystropheus',
    emoji: '🦎',
    era: 'trias',
    type: 'attack',
    rarity: 'starter',
    cost: 2,
    tags: ['marine', 'carnivore'],
    effects: [
      { type: 'damage', amount: 8 },
      { type: 'status', status: 'vulnerable', amount: 2, target: 'enemy' },
    ],
    upgrade: {
      effects: [
        { type: 'damage', amount: 10 },
        { type: 'status', status: 'vulnerable', amount: 3, target: 'enemy' },
      ],
    },
    fossilId: 'tanystropheus',
  },
];

const TRIAS_CARDS: CardDef[] = [
  // --- common ---
  {
    id: 'coelophysis',
    name: 'Coelophysis',
    emoji: '🦖',
    era: 'trias',
    type: 'attack',
    rarity: 'common',
    cost: 1,
    tags: ['carnivore', 'pack'],
    effects: [{ type: 'damage', amount: 4, scaling: { per: 'cardsPlayedThisTurn', amount: 2, max: 6 } }],
    upgrade: {
      effects: [{ type: 'damage', amount: 5, scaling: { per: 'cardsPlayedThisTurn', amount: 3, max: 9 } }],
    },
    fossilId: 'coelophysis',
  },
  {
    id: 'nothosaurus',
    name: 'Nothosaurus',
    emoji: '🐊',
    era: 'trias',
    type: 'attack',
    rarity: 'common',
    cost: 1,
    tags: ['marine', 'carnivore'],
    effects: [
      { type: 'damage', amount: 4 },
      { type: 'status', status: 'bleed', amount: 2, target: 'enemy' },
    ],
    upgrade: {
      effects: [
        { type: 'damage', amount: 6 },
        { type: 'status', status: 'bleed', amount: 3, target: 'enemy' },
      ],
    },
    fossilId: 'nothosaurus',
  },
  {
    id: 'plateosaurus',
    name: 'Plateosaurus',
    emoji: '🦕',
    era: 'trias',
    type: 'defense',
    rarity: 'common',
    cost: 1,
    tags: ['herbivore'],
    effects: [
      { type: 'block', amount: 6, scaling: { per: 'tagInZone', tag: 'plant', zone: 'deck', amount: 1, max: 3 } },
    ],
    upgrade: {
      effects: [
        { type: 'block', amount: 8, scaling: { per: 'tagInZone', tag: 'plant', zone: 'deck', amount: 2, max: 6 } },
      ],
    },
    fossilId: 'plateosaurus',
  },
  {
    id: 'equisetites',
    name: 'Schachtelhalm',
    emoji: '🌿',
    era: 'trias',
    type: 'defense',
    rarity: 'common',
    cost: 1,
    tags: ['plant'],
    effects: [
      { type: 'block', amount: 4 },
      { type: 'draw', amount: 1 },
    ],
    upgrade: {
      effects: [
        { type: 'block', amount: 7 },
        { type: 'draw', amount: 1 },
      ],
    },
    fossilId: 'equisetites',
  },
  // --- uncommon ---
  {
    id: 'eudimorphodon',
    name: 'Eudimorphodon',
    emoji: '🦅',
    era: 'trias',
    type: 'attack',
    rarity: 'uncommon',
    cost: 1,
    tags: ['flyer', 'carnivore'],
    effects: [{ type: 'damage', amount: 4, hits: 2, pierce: true }],
    upgrade: { effects: [{ type: 'damage', amount: 5, hits: 2, pierce: true }] },
    fossilId: 'eudimorphodon',
  },
  {
    id: 'herrerasaurus',
    name: 'Herrerasaurus',
    emoji: '🦖',
    era: 'trias',
    type: 'attack',
    rarity: 'uncommon',
    cost: 1,
    tags: ['carnivore'],
    effects: [
      {
        type: 'conditional',
        condition: { kind: 'firstAttackThisTurn' },
        then: [{ type: 'damage', amount: 10 }],
        else: [{ type: 'damage', amount: 5 }],
      },
    ],
    upgrade: {
      effects: [
        {
          type: 'conditional',
          condition: { kind: 'firstAttackThisTurn' },
          then: [{ type: 'damage', amount: 14 }],
          else: [{ type: 'damage', amount: 7 }],
        },
      ],
    },
    fossilId: 'herrerasaurus',
  },
  {
    id: 'placodus',
    name: 'Placodus',
    emoji: '🐢',
    era: 'trias',
    type: 'defense',
    rarity: 'uncommon',
    cost: 1,
    tags: ['marine'],
    effects: [
      { type: 'block', amount: 6 },
      { type: 'status', status: 'weak', amount: 1, target: 'enemy' },
    ],
    upgrade: {
      effects: [
        { type: 'block', amount: 8 },
        { type: 'status', status: 'weak', amount: 2, target: 'enemy' },
      ],
    },
    fossilId: 'placodus',
  },
  {
    id: 'dicroidium',
    name: 'Dicroidium',
    emoji: '🌱',
    era: 'trias',
    type: 'support',
    rarity: 'uncommon',
    cost: 1,
    tags: ['plant'],
    effects: [
      { type: 'heal', amount: 4 },
      { type: 'draw', amount: 2 },
    ],
    exhaust: true,
    upgrade: { cost: 0 },
    fossilId: 'dicroidium',
  },
  // --- rare ---
  {
    id: 'shonisaurus',
    name: 'Shonisaurus',
    emoji: '🐋',
    era: 'trias',
    type: 'attack',
    rarity: 'rare',
    cost: 2,
    tags: ['marine', 'carnivore'],
    effects: [
      { type: 'damage', amount: 10 },
      { type: 'status', status: 'bleed', amount: 4, target: 'enemy' },
    ],
    upgrade: {
      effects: [
        { type: 'damage', amount: 13 },
        { type: 'status', status: 'bleed', amount: 5, target: 'enemy' },
      ],
    },
    fossilId: 'shonisaurus',
  },
  {
    id: 'postosuchus',
    name: 'Postosuchus',
    emoji: '🐊',
    era: 'trias',
    type: 'attack',
    rarity: 'rare',
    cost: 2,
    tags: ['carnivore'],
    effects: [
      { type: 'status', status: 'vulnerable', amount: 1, target: 'enemy' },
      { type: 'damage', amount: 7, hits: 2 },
    ],
    upgrade: {
      effects: [
        { type: 'status', status: 'vulnerable', amount: 2, target: 'enemy' },
        { type: 'damage', amount: 9, hits: 2 },
      ],
    },
    fossilId: 'postosuchus',
  },
];

const JURA_CARDS: CardDef[] = [
  // --- common ---
  {
    id: 'compsognathus',
    name: 'Compsognathus',
    emoji: '🦎',
    era: 'jura',
    type: 'attack',
    rarity: 'common',
    cost: 0,
    tags: ['carnivore'],
    effects: [
      { type: 'damage', amount: 3 },
      { type: 'conditional', condition: { kind: 'chance', percent: 50 }, then: [{ type: 'draw', amount: 1 }] },
    ],
    upgrade: {
      effects: [
        { type: 'damage', amount: 5 },
        { type: 'conditional', condition: { kind: 'chance', percent: 50 }, then: [{ type: 'draw', amount: 1 }] },
      ],
    },
    fossilId: 'compsognathus',
  },
  {
    id: 'diplodocus',
    name: 'Diplodocus',
    emoji: '🦕',
    era: 'jura',
    type: 'attack',
    rarity: 'common',
    cost: 1,
    tags: ['herbivore'],
    effects: [{ type: 'damage', amount: 2, hits: 3 }],
    upgrade: { effects: [{ type: 'damage', amount: 3, hits: 3 }] },
    fossilId: 'diplodocus',
  },
  {
    id: 'kentrosaurus',
    name: 'Kentrosaurus',
    emoji: '🦕',
    era: 'jura',
    type: 'defense',
    rarity: 'common',
    cost: 1,
    tags: ['herbivore'],
    effects: [
      { type: 'block', amount: 4 },
      { type: 'damage', amount: 3 },
    ],
    upgrade: {
      effects: [
        { type: 'block', amount: 6 },
        { type: 'damage', amount: 5 },
      ],
    },
    fossilId: 'kentrosaurus',
  },
  {
    id: 'ginkgo',
    name: 'Ginkgo',
    emoji: '🍃',
    era: 'jura',
    type: 'defense',
    rarity: 'common',
    cost: 0,
    tags: ['plant'],
    effects: [{ type: 'block', amount: 3 }],
    upgrade: { effects: [{ type: 'block', amount: 5 }] },
    fossilId: 'ginkgo',
  },
  // --- uncommon ---
  {
    id: 'archaeopteryx',
    name: 'Archaeopteryx',
    emoji: '🐦',
    era: 'jura',
    type: 'attack',
    rarity: 'uncommon',
    cost: 1,
    tags: ['flyer'],
    effects: [
      { type: 'damage', amount: 5, pierce: true },
      { type: 'draw', amount: 1 },
    ],
    upgrade: {
      effects: [
        { type: 'damage', amount: 8, pierce: true },
        { type: 'draw', amount: 1 },
      ],
    },
    fossilId: 'archaeopteryx',
  },
  {
    id: 'stegosaurus',
    name: 'Stegosaurus',
    emoji: '🦕',
    era: 'jura',
    type: 'attack',
    rarity: 'uncommon',
    cost: 1,
    tags: ['herbivore'],
    effects: [{ type: 'damage', amount: 3, scaling: { per: 'playerBlock', amount: 1, max: 10 } }],
    upgrade: { effects: [{ type: 'damage', amount: 5, scaling: { per: 'playerBlock', amount: 1, max: 15 } }] },
    fossilId: 'stegosaurus',
  },
  {
    id: 'plesiosaurus',
    name: 'Plesiosaurus',
    emoji: '🦕',
    era: 'jura',
    type: 'attack',
    rarity: 'uncommon',
    cost: 1,
    tags: ['marine', 'carnivore'],
    effects: [
      { type: 'damage', amount: 5 },
      {
        type: 'conditional',
        condition: { kind: 'enemyHasStatus', status: 'bleed' },
        then: [{ type: 'damage', amount: 5 }],
      },
    ],
    upgrade: {
      effects: [
        { type: 'damage', amount: 7 },
        {
          type: 'conditional',
          condition: { kind: 'enemyHasStatus', status: 'bleed' },
          then: [{ type: 'damage', amount: 7 }],
        },
      ],
    },
    fossilId: 'plesiosaurus',
  },
  {
    id: 'dactylioceras',
    name: 'Ammonit',
    emoji: '🐚',
    era: 'jura',
    type: 'support',
    rarity: 'uncommon',
    cost: 0,
    tags: ['invertebrate', 'marine'],
    effects: [
      { type: 'energy', amount: 1 },
      { type: 'draw', amount: 1 },
    ],
    exhaust: true,
    upgrade: {
      effects: [
        { type: 'energy', amount: 1 },
        { type: 'draw', amount: 2 },
      ],
    },
    fossilId: 'dactylioceras',
  },
  // --- rare ---
  {
    id: 'brachiosaurus',
    name: 'Brachiosaurus',
    emoji: '🦕',
    era: 'jura',
    type: 'defense',
    rarity: 'rare',
    cost: 2,
    tags: ['herbivore'],
    effects: [
      { type: 'block', amount: 10, scaling: { per: 'tagInZone', tag: 'herbivore', zone: 'deck', amount: 1, max: 8 } },
    ],
    upgrade: {
      effects: [
        {
          type: 'block',
          amount: 12,
          scaling: { per: 'tagInZone', tag: 'herbivore', zone: 'deck', amount: 2, max: 12 },
        },
      ],
    },
    fossilId: 'brachiosaurus',
  },
  {
    id: 'allosaurus',
    name: 'Allosaurus',
    emoji: '🦖',
    era: 'jura',
    type: 'attack',
    rarity: 'rare',
    cost: 2,
    tags: ['carnivore'],
    effects: [
      { type: 'damage', amount: 10 },
      { type: 'status', status: 'strength', amount: 1, target: 'self' },
    ],
    upgrade: {
      effects: [
        { type: 'damage', amount: 13 },
        { type: 'status', status: 'strength', amount: 2, target: 'self' },
      ],
    },
    fossilId: 'allosaurus',
  },
];

const KREIDE_CARDS: CardDef[] = [
  // --- common ---
  {
    id: 'velociraptor',
    name: 'Velociraptor',
    emoji: '🦖',
    era: 'kreide',
    type: 'attack',
    rarity: 'common',
    cost: 1,
    tags: ['carnivore', 'pack'],
    effects: [{ type: 'damage', amount: 2, hits: 2, scaling: { per: 'cardsPlayedThisTurn', amount: 1, max: 4 } }],
    upgrade: {
      effects: [{ type: 'damage', amount: 3, hits: 2, scaling: { per: 'cardsPlayedThisTurn', amount: 2, max: 6 } }],
    },
    fossilId: 'velociraptor',
  },
  {
    id: 'iguanodon',
    name: 'Iguanodon',
    emoji: '🦕',
    era: 'kreide',
    type: 'defense',
    rarity: 'common',
    cost: 1,
    tags: ['herbivore'],
    effects: [
      { type: 'block', amount: 5, scaling: { per: 'tagInZone', tag: 'herbivore', zone: 'hand', amount: 2, max: 4 } },
    ],
    upgrade: {
      effects: [
        { type: 'block', amount: 7, scaling: { per: 'tagInZone', tag: 'herbivore', zone: 'hand', amount: 2, max: 6 } },
      ],
    },
    fossilId: 'iguanodon',
  },
  {
    id: 'pteranodon',
    name: 'Pteranodon',
    emoji: '🦅',
    era: 'kreide',
    type: 'attack',
    rarity: 'common',
    cost: 1,
    tags: ['flyer'],
    effects: [{ type: 'damage', amount: 6, pierce: true }],
    upgrade: { effects: [{ type: 'damage', amount: 9, pierce: true }] },
    fossilId: 'pteranodon',
  },
  {
    id: 'archaefructus',
    name: 'Archaefructus',
    emoji: '🌸',
    era: 'kreide',
    type: 'support',
    rarity: 'common',
    cost: 1,
    tags: ['plant'],
    effects: [
      { type: 'block', amount: 2 },
      { type: 'draw', amount: 2 },
    ],
    upgrade: {
      effects: [
        { type: 'block', amount: 4 },
        { type: 'draw', amount: 2 },
      ],
    },
    fossilId: 'archaefructus',
  },
  // --- uncommon ---
  {
    id: 'parasaurolophus',
    name: 'Parasaurolophus',
    emoji: '🦕',
    era: 'kreide',
    type: 'support',
    rarity: 'uncommon',
    cost: 1,
    tags: ['herbivore'],
    effects: [
      { type: 'status', status: 'weak', amount: 2, target: 'enemy' },
      { type: 'draw', amount: 1 },
    ],
    upgrade: {
      effects: [
        { type: 'status', status: 'weak', amount: 3, target: 'enemy' },
        { type: 'draw', amount: 2 },
      ],
    },
    fossilId: 'parasaurolophus',
  },
  {
    id: 'triceratops',
    name: 'Triceratops',
    emoji: '🦕',
    era: 'kreide',
    type: 'attack',
    rarity: 'uncommon',
    cost: 2,
    tags: ['herbivore'],
    effects: [
      { type: 'block', amount: 6 },
      { type: 'damage', amount: 6, scaling: { per: 'tagInZone', tag: 'herbivore', zone: 'deck', amount: 1, max: 6 } },
    ],
    upgrade: {
      effects: [
        { type: 'block', amount: 8 },
        { type: 'damage', amount: 8, scaling: { per: 'tagInZone', tag: 'herbivore', zone: 'deck', amount: 1, max: 8 } },
      ],
    },
    fossilId: 'triceratops',
  },
  {
    id: 'ankylosaurus',
    name: 'Ankylosaurus',
    emoji: '🦕',
    era: 'kreide',
    type: 'defense',
    rarity: 'uncommon',
    cost: 2,
    tags: ['herbivore'],
    effects: [
      { type: 'block', amount: 11 },
      {
        type: 'conditional',
        condition: { kind: 'playerBlockAtLeast', value: 15 },
        then: [{ type: 'damage', amount: 10 }],
      },
    ],
    upgrade: {
      effects: [
        { type: 'block', amount: 14 },
        {
          type: 'conditional',
          condition: { kind: 'playerBlockAtLeast', value: 15 },
          then: [{ type: 'damage', amount: 14 }],
        },
      ],
    },
    fossilId: 'ankylosaurus',
  },
  {
    id: 'pachycephalosaurus',
    name: 'Dickkopfsaurier',
    emoji: '🦕',
    era: 'kreide',
    type: 'attack',
    rarity: 'uncommon',
    cost: 1,
    tags: ['herbivore'],
    effects: [
      { type: 'damage', amount: 5 },
      { type: 'status', status: 'confused', amount: 1, target: 'enemy' },
    ],
    exhaust: true,
    upgrade: {
      effects: [
        { type: 'damage', amount: 9 },
        { type: 'status', status: 'confused', amount: 1, target: 'enemy' },
      ],
    },
    fossilId: 'pachycephalosaurus',
  },
  // --- rare ---
  {
    id: 'tyrannosaurus',
    name: 'Tyrannosaurus',
    emoji: '🦖',
    era: 'kreide',
    type: 'attack',
    rarity: 'rare',
    cost: 3,
    tags: ['carnivore'],
    effects: [
      { type: 'damage', amount: 20 },
      { type: 'conditional', condition: { kind: 'enemyHpAtMost', value: 15 }, then: [{ type: 'execute' }] },
    ],
    upgrade: {
      effects: [
        { type: 'damage', amount: 25 },
        { type: 'conditional', condition: { kind: 'enemyHpAtMost', value: 20 }, then: [{ type: 'execute' }] },
      ],
    },
    fossilId: 'tyrannosaurus',
  },
  {
    id: 'mosasaurus',
    name: 'Mosasaurus',
    emoji: '🐊',
    era: 'kreide',
    type: 'attack',
    rarity: 'rare',
    cost: 2,
    tags: ['marine', 'carnivore'],
    effects: [
      { type: 'status', status: 'bleed', amount: 3, target: 'enemy' },
      {
        type: 'damage',
        amount: 6,
        hits: 2,
        scaling: { per: 'tagInZone', tag: 'marine', zone: 'deck', amount: 1, max: 6 },
      },
    ],
    upgrade: {
      effects: [
        { type: 'status', status: 'bleed', amount: 4, target: 'enemy' },
        {
          type: 'damage',
          amount: 8,
          hits: 2,
          scaling: { per: 'tagInZone', tag: 'marine', zone: 'deck', amount: 1, max: 8 },
        },
      ],
    },
    fossilId: 'mosasaurus',
  },
];

const EISZEIT_CARDS: CardDef[] = [
  // --- common ---
  {
    id: 'crocuta-spelaea',
    name: 'Höhlenhyäne',
    emoji: '🐺',
    era: 'eiszeit',
    type: 'attack',
    rarity: 'common',
    cost: 1,
    tags: ['mammal', 'carnivore', 'pack'],
    effects: [
      { type: 'damage', amount: 4, scaling: { per: 'tagInZone', tag: 'mammal', zone: 'hand', amount: 2, max: 6 } },
    ],
    upgrade: {
      effects: [
        { type: 'damage', amount: 6, scaling: { per: 'tagInZone', tag: 'mammal', zone: 'hand', amount: 2, max: 8 } },
      ],
    },
    fossilId: 'crocuta-spelaea',
  },
  {
    id: 'glyptodon',
    name: 'Glyptodon',
    emoji: '🐢',
    era: 'eiszeit',
    type: 'defense',
    rarity: 'common',
    cost: 2,
    tags: ['mammal', 'herbivore'],
    effects: [{ type: 'block', amount: 12 }],
    upgrade: { effects: [{ type: 'block', amount: 16 }] },
    fossilId: 'glyptodon',
  },
  {
    id: 'megaloceros',
    name: 'Riesenhirsch',
    emoji: '🦌',
    era: 'eiszeit',
    type: 'attack',
    rarity: 'common',
    cost: 1,
    tags: ['mammal', 'herbivore'],
    effects: [
      { type: 'damage', amount: 5 },
      { type: 'block', amount: 3 },
    ],
    upgrade: {
      effects: [
        { type: 'damage', amount: 7 },
        { type: 'block', amount: 5 },
      ],
    },
    fossilId: 'megaloceros',
  },
  {
    id: 'coelodonta',
    name: 'Wollnashorn',
    emoji: '🦏',
    era: 'eiszeit',
    type: 'attack',
    rarity: 'common',
    cost: 2,
    tags: ['mammal', 'herbivore'],
    effects: [
      { type: 'damage', amount: 10 },
      { type: 'status', status: 'vulnerable', amount: 1, target: 'enemy' },
    ],
    upgrade: {
      effects: [
        { type: 'damage', amount: 13 },
        { type: 'status', status: 'vulnerable', amount: 2, target: 'enemy' },
      ],
    },
    fossilId: 'coelodonta',
  },
  // --- uncommon ---
  {
    id: 'smilodon',
    name: 'Säbelzahnkatze',
    emoji: '🐯',
    era: 'eiszeit',
    type: 'attack',
    rarity: 'uncommon',
    cost: 1,
    tags: ['mammal', 'carnivore'],
    effects: [
      { type: 'damage', amount: 6 },
      { type: 'status', status: 'bleed', amount: 3, target: 'enemy' },
    ],
    upgrade: {
      effects: [
        { type: 'damage', amount: 8 },
        { type: 'status', status: 'bleed', amount: 4, target: 'enemy' },
      ],
    },
    fossilId: 'smilodon',
  },
  {
    id: 'ursus-spelaeus',
    name: 'Höhlenbär',
    emoji: '🐻',
    era: 'eiszeit',
    type: 'support',
    rarity: 'uncommon',
    cost: 1,
    tags: ['mammal'],
    effects: [
      { type: 'status', status: 'strength', amount: 2, target: 'self' },
      { type: 'heal', amount: 4 },
    ],
    exhaust: true,
    upgrade: {
      effects: [
        { type: 'status', status: 'strength', amount: 3, target: 'self' },
        { type: 'heal', amount: 6 },
      ],
    },
    fossilId: 'ursus-spelaeus',
  },
  {
    id: 'panthera-spelaea',
    name: 'Höhlenlöwe',
    emoji: '🦁',
    era: 'eiszeit',
    type: 'attack',
    rarity: 'uncommon',
    cost: 2,
    tags: ['mammal', 'carnivore'],
    effects: [
      { type: 'status', status: 'strength', amount: 1, target: 'self' },
      { type: 'damage', amount: 5, hits: 2 },
    ],
    upgrade: {
      effects: [
        { type: 'status', status: 'strength', amount: 2, target: 'self' },
        { type: 'damage', amount: 6, hits: 2 },
      ],
    },
    fossilId: 'panthera-spelaea',
  },
  {
    id: 'ovibos',
    name: 'Moschusochse',
    emoji: '🐂',
    era: 'eiszeit',
    type: 'defense',
    rarity: 'uncommon',
    cost: 1,
    tags: ['mammal', 'herbivore'],
    effects: [
      { type: 'block', amount: 5, scaling: { per: 'tagInZone', tag: 'mammal', zone: 'hand', amount: 2, max: 6 } },
    ],
    upgrade: {
      effects: [
        { type: 'block', amount: 7, scaling: { per: 'tagInZone', tag: 'mammal', zone: 'hand', amount: 3, max: 9 } },
      ],
    },
    fossilId: 'ovibos',
  },
  // --- rare ---
  {
    id: 'mammuthus',
    name: 'Wollhaarmammut',
    emoji: '🦣',
    era: 'eiszeit',
    type: 'defense',
    rarity: 'rare',
    cost: 2,
    tags: ['mammal', 'herbivore'],
    effects: [
      { type: 'block', amount: 10, scaling: { per: 'tagInZone', tag: 'mammal', zone: 'deck', amount: 1, max: 8 } },
      { type: 'heal', amount: 3 },
    ],
    upgrade: {
      effects: [
        { type: 'block', amount: 13, scaling: { per: 'tagInZone', tag: 'mammal', zone: 'deck', amount: 1, max: 10 } },
        { type: 'heal', amount: 5 },
      ],
    },
    fossilId: 'mammuthus',
  },
  {
    id: 'megatherium',
    name: 'Riesenfaultier',
    emoji: '🦥',
    era: 'eiszeit',
    type: 'attack',
    rarity: 'rare',
    cost: 3,
    tags: ['mammal', 'herbivore'],
    effects: [
      { type: 'damage', amount: 7, hits: 3 },
      { type: 'status', status: 'weak', amount: 2, target: 'enemy' },
    ],
    upgrade: {
      effects: [
        { type: 'damage', amount: 9, hits: 3 },
        { type: 'status', status: 'weak', amount: 2, target: 'enemy' },
      ],
    },
    fossilId: 'megatherium',
  },
];

export const CARDS: CardDef[] = [...STARTER_CARDS, ...TRIAS_CARDS, ...JURA_CARDS, ...KREIDE_CARDS, ...EISZEIT_CARDS];

/** 5× basic attack, 4× basic block, 1× special (card def ids, duplicates intended). */
export const STARTER_DECK: string[] = [
  'eoraptor',
  'eoraptor',
  'eoraptor',
  'eoraptor',
  'eoraptor',
  'proganochelys',
  'proganochelys',
  'proganochelys',
  'proganochelys',
  'tanystropheus',
];
