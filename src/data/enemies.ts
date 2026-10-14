import type { EnemyDef } from '@/engine/types';

// Enemies per era: 4 normal, 2 elite, 1 boss. HP and damage follow the
// "Balance-Ziele" in docs/ARCHITECTURE.md and rise act by act:
//
//   Akt   normal LP   elite LP   boss LP    normal Schaden/Zug
//   1     18–30       40–55      90–110     ~5–9
//   2     30–42       60–75      130–150    ~8–12
//   3     40–55       80–95      170–190    ~10–15
//   4     50–65       95–110     200–220    ~12–18
//
// Notes on status timing (see src/engine/combat.ts):
// - `vulnerable` on the player only matters with 2+ stacks, because it ticks
//   down at the end of the player's turn before the enemy attacks again.
// - `weak` on the player affects the player's next turn.
// - Big hits are telegraphed by the intent, so set-up moves (block, strength,
//   vulnerable) are usually followed by a heavy attack.

const TRIAS_ENEMIES: EnemyDef[] = [
  // --- normal ---
  {
    id: 'coelophysis',
    name: 'Coelophysis-Rudel',
    emoji: '🦖',
    era: 'trias',
    tier: 'normal',
    hp: [24, 28],
    moves: [
      { id: 'schnappen', name: 'Schnappen', effects: [{ type: 'attack', amount: 4, hits: 2 }] },
      { id: 'biss', name: 'Biss', effects: [{ type: 'attack', amount: 8 }] },
      {
        id: 'rudelruf',
        name: 'Rudelruf',
        effects: [
          { type: 'status', status: 'strength', amount: 1, target: 'self' },
          { type: 'block', amount: 3 },
        ],
      },
    ],
    pattern: { type: 'weighted', weights: { schnappen: 4, biss: 3, rudelruf: 2 } },
    openingMoveId: 'schnappen',
    fossilId: 'coelophysis',
  },
  {
    id: 'desmatosuchus',
    name: 'Desmatosuchus',
    emoji: '🐊',
    era: 'trias',
    tier: 'normal',
    hp: [27, 30],
    moves: [
      { id: 'rammen', name: 'Rammen', effects: [{ type: 'attack', amount: 8 }] },
      {
        id: 'panzer',
        name: 'Panzer anlegen',
        effects: [
          { type: 'block', amount: 6 },
          { type: 'attack', amount: 3 },
        ],
      },
      {
        id: 'schulterstacheln',
        name: 'Schulterstacheln',
        effects: [
          { type: 'attack', amount: 5 },
          { type: 'status', status: 'weak', amount: 1, target: 'player' },
        ],
      },
    ],
    pattern: { type: 'cycle' },
    fossilId: 'desmatosuchus',
  },
  {
    id: 'nothosaurus',
    name: 'Nothosaurus',
    emoji: '🐊',
    era: 'trias',
    tier: 'normal',
    hp: [26, 30],
    moves: [
      {
        id: 'fangzaehne',
        name: 'Fangzähne',
        effects: [
          { type: 'attack', amount: 4 },
          { type: 'status', status: 'bleed', amount: 2, target: 'player' },
        ],
      },
      { id: 'zuschnappen', name: 'Zuschnappen', effects: [{ type: 'attack', amount: 9 }] },
      { id: 'abtauchen', name: 'Abtauchen', effects: [{ type: 'block', amount: 7 }] },
    ],
    pattern: { type: 'weighted', weights: { fangzaehne: 4, zuschnappen: 4, abtauchen: 2 } },
    openingMoveId: 'fangzaehne',
    fossilId: 'nothosaurus',
  },
  {
    id: 'eudimorphodon',
    name: 'Eudimorphodon',
    emoji: '🦅',
    era: 'trias',
    tier: 'normal',
    hp: [24, 28],
    moves: [
      { id: 'sturzflug', name: 'Sturzflug', effects: [{ type: 'attack', amount: 9 }] },
      { id: 'pickhiebe', name: 'Pickhiebe', effects: [{ type: 'attack', amount: 4, hits: 2 }] },
      {
        id: 'kreischen',
        name: 'Kreischen',
        effects: [
          { type: 'status', status: 'weak', amount: 1, target: 'player' },
          { type: 'block', amount: 4 },
        ],
      },
    ],
    pattern: { type: 'weighted', weights: { sturzflug: 3, pickhiebe: 4, kreischen: 2 } },
    fossilId: 'eudimorphodon',
  },
  // --- elite ---
  {
    id: 'herrerasaurus',
    name: 'Herrerasaurus',
    emoji: '🦖',
    era: 'trias',
    tier: 'elite',
    hp: [44, 50],
    moves: [
      { id: 'klauenhiebe', name: 'Klauenhiebe', effects: [{ type: 'attack', amount: 5, hits: 2 }] },
      { id: 'kieferbiss', name: 'Kieferbiss', effects: [{ type: 'attack', amount: 12 }] },
      {
        id: 'lauern',
        name: 'Lauern',
        effects: [
          { type: 'status', status: 'strength', amount: 2, target: 'self' },
          { type: 'block', amount: 6 },
        ],
      },
    ],
    pattern: { type: 'weighted', weights: { klauenhiebe: 4, kieferbiss: 3, lauern: 2 } },
    openingMoveId: 'klauenhiebe',
    fossilId: 'herrerasaurus',
  },
  {
    id: 'shonisaurus',
    name: 'Shonisaurus',
    emoji: '🐋',
    era: 'trias',
    tier: 'elite',
    hp: [50, 55],
    moves: [
      {
        id: 'flutwelle',
        name: 'Flutwelle',
        effects: [
          { type: 'attack', amount: 8 },
          { type: 'status', status: 'weak', amount: 1, target: 'player' },
        ],
      },
      { id: 'luftholen', name: 'Luft holen', effects: [{ type: 'block', amount: 12 }] },
      { id: 'rammstoss', name: 'Rammstoß', effects: [{ type: 'attack', amount: 14 }] },
    ],
    pattern: { type: 'cycle' },
    fossilId: 'shonisaurus',
  },
  // --- boss ---
  {
    id: 'postosuchus',
    name: 'Postosuchus',
    emoji: '🐊',
    era: 'trias',
    tier: 'boss',
    hp: [92, 100],
    moves: [
      { id: 'prankenhiebe', name: 'Prankenhiebe', effects: [{ type: 'attack', amount: 5, hits: 2 }] },
      {
        id: 'knochenplatten',
        name: 'Knochenplatten',
        effects: [
          { type: 'block', amount: 10 },
          { type: 'attack', amount: 4 },
        ],
      },
      {
        id: 'bruellen',
        name: 'Brüllen',
        effects: [
          { type: 'status', status: 'strength', amount: 2, target: 'self' },
          { type: 'status', status: 'weak', amount: 1, target: 'player' },
        ],
      },
      { id: 'todesbiss', name: 'Todesbiss', effects: [{ type: 'attack', amount: 14 }] },
    ],
    pattern: { type: 'cycle' },
    fossilId: 'postosuchus',
  },
];

const JURA_ENEMIES: EnemyDef[] = [
  // --- normal ---
  {
    id: 'dilophosaurus',
    name: 'Dilophosaurus',
    emoji: '🦖',
    era: 'jura',
    tier: 'normal',
    hp: [34, 40],
    moves: [
      { id: 'biss', name: 'Biss', effects: [{ type: 'attack', amount: 11 }] },
      { id: 'krallen', name: 'Krallen', effects: [{ type: 'attack', amount: 5, hits: 2 }] },
      {
        id: 'imponieren',
        name: 'Imponieren',
        effects: [
          { type: 'status', status: 'strength', amount: 1, target: 'self' },
          { type: 'block', amount: 6 },
        ],
      },
    ],
    pattern: { type: 'weighted', weights: { biss: 4, krallen: 4, imponieren: 2 } },
    fossilId: 'dilophosaurus',
  },
  {
    id: 'dimorphodon',
    name: 'Dimorphodon',
    emoji: '🦅',
    era: 'jura',
    tier: 'normal',
    hp: [30, 36],
    moves: [
      { id: 'sturzflug', name: 'Sturzflug', effects: [{ type: 'attack', amount: 11 }] },
      { id: 'schnabelhiebe', name: 'Schnabelhiebe', effects: [{ type: 'attack', amount: 4, hits: 3 }] },
      {
        id: 'kreischen',
        name: 'Kreischen',
        effects: [
          { type: 'status', status: 'weak', amount: 2, target: 'player' },
          { type: 'block', amount: 5 },
        ],
      },
    ],
    pattern: { type: 'weighted', weights: { sturzflug: 4, schnabelhiebe: 4, kreischen: 2 } },
    openingMoveId: 'schnabelhiebe',
    fossilId: 'dimorphodon',
  },
  {
    id: 'kentrosaurus',
    name: 'Kentrosaurus',
    emoji: '🦕',
    era: 'jura',
    tier: 'normal',
    hp: [38, 42],
    moves: [
      {
        id: 'stachelwall',
        name: 'Stachelwall',
        effects: [
          { type: 'block', amount: 10 },
          { type: 'attack', amount: 4 },
        ],
      },
      { id: 'schwanzstachel', name: 'Schwanzstachel', effects: [{ type: 'attack', amount: 12 }] },
      {
        id: 'schulterstacheln',
        name: 'Schulterstacheln',
        effects: [
          { type: 'attack', amount: 6 },
          { type: 'status', status: 'vulnerable', amount: 2, target: 'player' },
        ],
      },
    ],
    pattern: { type: 'cycle' },
    fossilId: 'kentrosaurus',
  },
  {
    id: 'stenopterygius',
    name: 'Stenopterygius',
    emoji: '🐬',
    era: 'jura',
    tier: 'normal',
    hp: [32, 38],
    moves: [
      {
        id: 'zahnreihe',
        name: 'Zahnreihe',
        effects: [
          { type: 'attack', amount: 6 },
          { type: 'status', status: 'bleed', amount: 3, target: 'player' },
        ],
      },
      { id: 'rammen', name: 'Rammen', effects: [{ type: 'attack', amount: 12 }] },
      { id: 'abtauchen', name: 'Abtauchen', effects: [{ type: 'block', amount: 9 }] },
    ],
    pattern: { type: 'weighted', weights: { zahnreihe: 4, rammen: 4, abtauchen: 2 } },
    openingMoveId: 'zahnreihe',
    fossilId: 'stenopterygius',
  },
  // --- elite ---
  {
    id: 'stegosaurus',
    name: 'Stegosaurus',
    emoji: '🦕',
    era: 'jura',
    tier: 'elite',
    hp: [64, 72],
    moves: [
      { id: 'platten', name: 'Platten aufstellen', effects: [{ type: 'block', amount: 14 }] },
      {
        id: 'stampfen',
        name: 'Stampfen',
        effects: [
          { type: 'attack', amount: 9 },
          { type: 'status', status: 'vulnerable', amount: 2, target: 'player' },
        ],
      },
      { id: 'thagomizer', name: 'Schwanzstachel', effects: [{ type: 'attack', amount: 8, hits: 2 }] },
    ],
    pattern: { type: 'cycle' },
    fossilId: 'stegosaurus',
  },
  {
    id: 'liopleurodon',
    name: 'Liopleurodon',
    emoji: '🐊',
    era: 'jura',
    tier: 'elite',
    hp: [68, 75],
    moves: [
      {
        id: 'reissen',
        name: 'Reißen',
        effects: [
          { type: 'attack', amount: 7 },
          { type: 'status', status: 'bleed', amount: 3, target: 'player' },
        ],
      },
      { id: 'kieferbiss', name: 'Kieferbiss', effects: [{ type: 'attack', amount: 15 }] },
      {
        id: 'kreisen',
        name: 'Kreisen',
        effects: [
          { type: 'status', status: 'strength', amount: 2, target: 'self' },
          { type: 'block', amount: 10 },
        ],
      },
    ],
    pattern: { type: 'weighted', weights: { reissen: 4, kieferbiss: 3, kreisen: 2 } },
    openingMoveId: 'reissen',
    fossilId: 'liopleurodon',
  },
  // --- boss ---
  {
    id: 'allosaurus',
    name: 'Allosaurus',
    emoji: '🦖',
    era: 'jura',
    tier: 'boss',
    hp: [130, 134],
    moves: [
      {
        id: 'hackbiss',
        name: 'Hackbiss',
        effects: [
          { type: 'attack', amount: 7 },
          { type: 'status', status: 'bleed', amount: 2, target: 'player' },
        ],
      },
      { id: 'krallenhiebe', name: 'Krallenhiebe', effects: [{ type: 'attack', amount: 5, hits: 2 }] },
      {
        id: 'bruellen',
        name: 'Brüllen',
        effects: [
          { type: 'status', status: 'strength', amount: 2, target: 'self' },
          { type: 'block', amount: 10 },
        ],
      },
      { id: 'ansprung', name: 'Ansprung', effects: [{ type: 'attack', amount: 14 }] },
    ],
    pattern: { type: 'cycle' },
    fossilId: 'allosaurus',
  },
];

const KREIDE_ENEMIES: EnemyDef[] = [
  // --- normal ---
  {
    id: 'velociraptor',
    name: 'Velociraptoren',
    emoji: '🦖',
    era: 'kreide',
    tier: 'normal',
    hp: [40, 46],
    moves: [
      { id: 'sichelkralle', name: 'Sichelkralle', effects: [{ type: 'attack', amount: 4, hits: 3 }] },
      { id: 'biss', name: 'Biss', effects: [{ type: 'attack', amount: 12 }] },
      {
        id: 'umzingeln',
        name: 'Umzingeln',
        effects: [
          { type: 'status', status: 'strength', amount: 1, target: 'self' },
          { type: 'block', amount: 8 },
        ],
      },
    ],
    pattern: { type: 'weighted', weights: { sichelkralle: 4, biss: 3, umzingeln: 2 } },
    openingMoveId: 'sichelkralle',
    fossilId: 'velociraptor',
  },
  {
    id: 'pachycephalosaurus',
    name: 'Dickkopfsaurier',
    emoji: '🦕',
    era: 'kreide',
    tier: 'normal',
    hp: [44, 50],
    moves: [
      {
        id: 'rempeln',
        name: 'Rempeln',
        effects: [
          { type: 'attack', amount: 8 },
          { type: 'block', amount: 5 },
        ],
      },
      {
        id: 'anlauf',
        name: 'Anlauf nehmen',
        effects: [
          { type: 'status', status: 'strength', amount: 2, target: 'self' },
          { type: 'block', amount: 8 },
        ],
      },
      { id: 'kopfstoss', name: 'Kopfstoß', effects: [{ type: 'attack', amount: 14 }] },
    ],
    pattern: { type: 'cycle' },
    fossilId: 'pachycephalosaurus',
  },
  {
    id: 'quetzalcoatlus',
    name: 'Quetzalcoatlus',
    emoji: '🦅',
    era: 'kreide',
    tier: 'normal',
    hp: [42, 48],
    moves: [
      { id: 'schnabelstoss', name: 'Schnabelstoß', effects: [{ type: 'attack', amount: 13 }] },
      { id: 'sturzflug', name: 'Sturzflug', effects: [{ type: 'attack', amount: 6, hits: 2 }] },
      {
        id: 'fluegelschlag',
        name: 'Flügelschlag',
        effects: [
          { type: 'attack', amount: 6 },
          { type: 'status', status: 'weak', amount: 2, target: 'player' },
        ],
      },
    ],
    pattern: { type: 'weighted', weights: { schnabelstoss: 4, sturzflug: 3, fluegelschlag: 3 } },
    fossilId: 'quetzalcoatlus',
  },
  {
    id: 'ankylosaurus',
    name: 'Ankylosaurus',
    emoji: '🦕',
    era: 'kreide',
    tier: 'normal',
    hp: [50, 55],
    moves: [
      { id: 'schwanzkeule', name: 'Schwanzkeule', effects: [{ type: 'attack', amount: 15 }] },
      { id: 'panzer', name: 'Panzer anlegen', effects: [{ type: 'block', amount: 14 }] },
      {
        id: 'stachelpanzer',
        name: 'Stachelpanzer',
        effects: [
          { type: 'block', amount: 8 },
          { type: 'attack', amount: 7 },
        ],
      },
    ],
    pattern: { type: 'weighted', weights: { schwanzkeule: 3, panzer: 2, stachelpanzer: 4 } },
    openingMoveId: 'stachelpanzer',
    fossilId: 'ankylosaurus',
  },
  // --- elite ---
  {
    id: 'spinosaurus',
    name: 'Spinosaurus',
    emoji: '🦖',
    era: 'kreide',
    tier: 'elite',
    hp: [84, 92],
    moves: [
      {
        id: 'krokodilmaul',
        name: 'Krokodilmaul',
        effects: [
          { type: 'attack', amount: 9 },
          { type: 'status', status: 'bleed', amount: 2, target: 'player' },
        ],
      },
      { id: 'daumenkrallen', name: 'Daumenkrallen', effects: [{ type: 'attack', amount: 6, hits: 2 }] },
      {
        id: 'segel',
        name: 'Segel aufstellen',
        effects: [
          { type: 'status', status: 'strength', amount: 2, target: 'self' },
          { type: 'block', amount: 10 },
        ],
      },
    ],
    pattern: { type: 'cycle' },
    fossilId: 'spinosaurus',
  },
  {
    id: 'triceratops',
    name: 'Triceratops',
    emoji: '🦕',
    era: 'kreide',
    tier: 'elite',
    hp: [88, 95],
    moves: [
      {
        id: 'ansturm',
        name: 'Ansturm',
        effects: [
          { type: 'attack', amount: 9 },
          { type: 'status', status: 'vulnerable', amount: 2, target: 'player' },
        ],
      },
      {
        id: 'nackenschild',
        name: 'Nackenschild',
        effects: [
          { type: 'block', amount: 16 },
          { type: 'attack', amount: 6 },
        ],
      },
      { id: 'hornstoss', name: 'Hornstoß', effects: [{ type: 'attack', amount: 17 }] },
    ],
    pattern: { type: 'cycle' },
    fossilId: 'triceratops',
  },
  // --- boss ---
  {
    id: 'tyrannosaurus',
    name: 'Tyrannosaurus',
    emoji: '🦖',
    era: 'kreide',
    tier: 'boss',
    hp: [170, 174],
    moves: [
      { id: 'stampfen', name: 'Stampfen', effects: [{ type: 'attack', amount: 5, hits: 2 }] },
      {
        id: 'bruellen',
        name: 'Brüllen',
        effects: [
          { type: 'status', status: 'strength', amount: 2, target: 'self' },
          { type: 'status', status: 'weak', amount: 1, target: 'player' },
        ],
      },
      { id: 'knochenbrecher', name: 'Knochenbrecher', effects: [{ type: 'attack', amount: 15 }] },
      {
        id: 'beute-wittern',
        name: 'Beute wittern',
        effects: [
          { type: 'block', amount: 14 },
          { type: 'attack', amount: 5 },
        ],
      },
    ],
    pattern: { type: 'cycle' },
    fossilId: 'tyrannosaurus',
  },
];

const EISZEIT_ENEMIES: EnemyDef[] = [
  // --- normal ---
  {
    id: 'crocuta-spelaea',
    name: 'Höhlenhyänen',
    emoji: '🐺',
    era: 'eiszeit',
    tier: 'normal',
    hp: [50, 56],
    moves: [
      { id: 'zerren', name: 'Zerren', effects: [{ type: 'attack', amount: 5, hits: 3 }] },
      { id: 'knochenknacker', name: 'Knochenknacker', effects: [{ type: 'attack', amount: 15 }] },
      {
        id: 'kichern',
        name: 'Kichern',
        effects: [
          { type: 'status', status: 'strength', amount: 2, target: 'self' },
          { type: 'block', amount: 8 },
        ],
      },
    ],
    pattern: { type: 'weighted', weights: { zerren: 4, knochenknacker: 3, kichern: 2 } },
    openingMoveId: 'zerren',
    fossilId: 'crocuta-spelaea',
  },
  {
    id: 'coelodonta',
    name: 'Wollnashorn',
    emoji: '🦏',
    era: 'eiszeit',
    tier: 'normal',
    hp: [58, 64],
    moves: [
      {
        id: 'hornstoss',
        name: 'Hornstoß',
        effects: [
          { type: 'attack', amount: 9 },
          { type: 'status', status: 'vulnerable', amount: 2, target: 'player' },
        ],
      },
      { id: 'ansturm', name: 'Ansturm', effects: [{ type: 'attack', amount: 15 }] },
      {
        id: 'scharren',
        name: 'Scharren',
        effects: [
          { type: 'status', status: 'strength', amount: 2, target: 'self' },
          { type: 'block', amount: 12 },
        ],
      },
    ],
    pattern: { type: 'weighted', weights: { hornstoss: 4, ansturm: 3, scharren: 2 } },
    openingMoveId: 'hornstoss',
    fossilId: 'coelodonta',
  },
  {
    id: 'panthera-spelaea',
    name: 'Höhlenlöwe',
    emoji: '🦁',
    era: 'eiszeit',
    tier: 'normal',
    hp: [54, 60],
    moves: [
      { id: 'prankenhieb', name: 'Prankenhieb', effects: [{ type: 'attack', amount: 7, hits: 2 }] },
      {
        id: 'nackenbiss',
        name: 'Nackenbiss',
        effects: [
          { type: 'attack', amount: 12 },
          { type: 'status', status: 'bleed', amount: 2, target: 'player' },
        ],
      },
      {
        id: 'anschleichen',
        name: 'Anschleichen',
        effects: [
          { type: 'status', status: 'weak', amount: 2, target: 'player' },
          { type: 'block', amount: 10 },
        ],
      },
    ],
    pattern: { type: 'weighted', weights: { prankenhieb: 4, nackenbiss: 3, anschleichen: 2 } },
    fossilId: 'panthera-spelaea',
  },
  {
    id: 'glyptodon',
    name: 'Glyptodon',
    emoji: '🐢',
    era: 'eiszeit',
    tier: 'normal',
    hp: [60, 65],
    moves: [
      {
        id: 'rammen',
        name: 'Rammen',
        effects: [
          { type: 'attack', amount: 9 },
          { type: 'block', amount: 8 },
        ],
      },
      { id: 'panzer', name: 'Panzer', effects: [{ type: 'block', amount: 18 }] },
      { id: 'schwanzschlag', name: 'Schwanzschlag', effects: [{ type: 'attack', amount: 16 }] },
    ],
    pattern: { type: 'cycle' },
    fossilId: 'glyptodon',
  },
  // --- elite ---
  {
    id: 'smilodon',
    name: 'Säbelzahnkatze',
    emoji: '🐯',
    era: 'eiszeit',
    tier: 'elite',
    hp: [96, 104],
    moves: [
      {
        id: 'saebelbiss',
        name: 'Säbelbiss',
        effects: [
          { type: 'attack', amount: 9 },
          { type: 'status', status: 'bleed', amount: 3, target: 'player' },
        ],
      },
      { id: 'ansprung', name: 'Ansprung', effects: [{ type: 'attack', amount: 16 }] },
      {
        id: 'lauern',
        name: 'Lauern',
        effects: [
          { type: 'status', status: 'strength', amount: 2, target: 'self' },
          { type: 'block', amount: 14 },
        ],
      },
    ],
    pattern: { type: 'weighted', weights: { saebelbiss: 4, ansprung: 3, lauern: 2 } },
    openingMoveId: 'saebelbiss',
    fossilId: 'smilodon',
  },
  {
    id: 'ursus-spelaeus',
    name: 'Höhlenbär',
    emoji: '🐻',
    era: 'eiszeit',
    tier: 'elite',
    hp: [100, 110],
    moves: [
      { id: 'prankenschlag', name: 'Prankenschlag', effects: [{ type: 'attack', amount: 16 }] },
      {
        id: 'aufrichten',
        name: 'Aufrichten',
        effects: [
          { type: 'status', status: 'strength', amount: 2, target: 'self' },
          { type: 'status', status: 'weak', amount: 1, target: 'player' },
        ],
      },
      { id: 'baerenhiebe', name: 'Bärenhiebe', effects: [{ type: 'attack', amount: 5, hits: 3 }] },
      {
        id: 'beeren',
        name: 'Beeren naschen',
        effects: [
          { type: 'heal', amount: 10 },
          { type: 'block', amount: 10 },
        ],
      },
    ],
    pattern: { type: 'weighted', weights: { prankenschlag: 4, aufrichten: 2, baerenhiebe: 3, beeren: 1 } },
    openingMoveId: 'prankenschlag',
    fossilId: 'ursus-spelaeus',
  },
  // --- boss ---
  {
    id: 'mammuthus',
    name: 'Wollhaarmammut',
    emoji: '🦣',
    era: 'eiszeit',
    tier: 'boss',
    hp: [200, 208],
    moves: [
      { id: 'stosszahnhieb', name: 'Stoßzahnhieb', effects: [{ type: 'attack', amount: 18 }] },
      {
        id: 'trompeten',
        name: 'Trompeten',
        effects: [
          { type: 'status', status: 'strength', amount: 2, target: 'self' },
          { type: 'status', status: 'weak', amount: 1, target: 'player' },
        ],
      },
      { id: 'trampeln', name: 'Trampeln', effects: [{ type: 'attack', amount: 6, hits: 2 }] },
      {
        id: 'herde',
        name: 'Herde rufen',
        effects: [
          { type: 'block', amount: 15 },
          { type: 'heal', amount: 6 },
        ],
      },
    ],
    pattern: { type: 'cycle' },
    fossilId: 'mammuthus',
  },
];

export const ENEMIES: EnemyDef[] = [...TRIAS_ENEMIES, ...JURA_ENEMIES, ...KREIDE_ENEMIES, ...EISZEIT_ENEMIES];
