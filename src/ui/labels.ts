import { KEYWORD_INFO } from '@/engine/describe';
import type { CardType, Era, FossilEntry, FossilKind, IntentKind, Rarity } from '@/engine/types';

// German display labels for engine enums. Kept in the UI layer so screens do
// not need to import content modules for simple names.

export const ERA_LABELS: Record<Era, string> = {
  trias: 'Trias',
  jura: 'Jura',
  kreide: 'Kreide',
  eiszeit: 'Eiszeit',
};

export const ERA_ICONS: Record<Era, string> = {
  trias: '🌋',
  jura: '🌿',
  kreide: '🌸',
  eiszeit: '❄️',
};

export const CARD_TYPE_LABELS: Record<CardType, string> = {
  attack: 'Angriff',
  defense: 'Verteidigung',
  support: 'Unterstützung',
};

export const CARD_TYPE_ICONS: Record<CardType, string> = {
  attack: '⚔️',
  defense: '🛡️',
  support: '✨',
};

export const RARITY_LABELS: Record<Rarity, string> = {
  starter: 'Start',
  common: 'Gewöhnlich',
  uncommon: 'Ungewöhnlich',
  rare: 'Selten',
};

export const INTENT_LABELS: Record<IntentKind, string> = {
  attack: 'Angriff',
  defend: 'Verteidigung',
  buff: 'Stärkt sich',
  debuff: 'Schwächt dich',
  heal: 'Heilt sich',
  unknown: 'Unbekannt',
};

export const INTENT_ICONS: Record<IntentKind, string> = {
  attack: '⚔️',
  defend: '🛡️',
  buff: '💪',
  debuff: '🌀',
  heal: '💚',
  unknown: '❓',
};

/** Icon for an attack that hits the (confused) enemy itself. */
export const SELF_HIT_ICON = '💫';

export const FOSSIL_KIND_LABELS: Record<FossilKind, string> = {
  dinosaur: 'Dinosaurier',
  bird: 'Vogel',
  pterosaur: 'Flugsaurier',
  'marine-reptile': 'Meeresreptil',
  mammal: 'Säugetier',
  reptile: 'Reptil',
  fish: 'Fisch',
  invertebrate: 'Wirbelloses Tier',
  plant: 'Pflanze',
};

export const DIET_LABELS: Record<FossilEntry['diet'], string> = {
  carnivore: 'Fleischfresser',
  herbivore: 'Pflanzenfresser',
  omnivore: 'Allesfresser',
  filter: 'Filtrierer',
  photosynthesis: 'Photosynthese',
};

/**
 * Card keywords for glossaries. Re-exported from the engine so the glossary
 * always uses the exact words of the generated rules text.
 */
export const KEYWORD_LABELS = KEYWORD_INFO;

/** Common UI strings shared by components. */
export const UI_STRINGS = {
  back: 'Zurück',
  close: 'Schließen',
  hp: 'LP',
  block: 'Block',
  energy: 'Energie',
  upgraded: 'verbessert',
  notEnoughEnergy: 'Nicht genug Energie',
  blocked: 'Geblockt',
  selfHit: 'Trifft sich selbst!',
  intent: 'Absicht',
  fossil: 'Fossil',
  facts: 'Wusstest du?',
  keywords: 'Begriffe',
} as const;
