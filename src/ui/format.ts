import { describeCard, resolveCard, STATUS_INFO } from '@/engine/describe';
import type { CardDef, CardEffect, CombatEvent, IntentKind, IntentView, Side, StatusId } from '@/engine/types';

import {
  CARD_TYPE_LABELS,
  ERA_LABELS,
  INTENT_ICONS,
  INTENT_LABELS,
  KEYWORD_LABELS,
  RARITY_LABELS,
  SELF_HIT_ICON,
  UI_STRINGS,
} from './labels';

// Pure formatting helpers (German text, accessibility labels). No React here,
// so everything is unit-testable.

// ---------------------------------------------------------------------------
// Numbers
// ---------------------------------------------------------------------------

/** German number format without Intl: 11700 → "11.700", 2.6 → "2,6". */
export function formatNumberDe(value: number, maxDecimals: number = 1): string {
  const negative = value < 0;
  const factor = 10 ** maxDecimals;
  const rounded = Math.round(Math.abs(value) * factor) / factor;
  const [intPart = '0', decPart] = rounded.toString().split('.');
  const withThousands = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const text = decPart ? `${withThousands},${decPart}` : withThousands;
  return negative ? `−${text}` : text;
}

function myaPart(mya: number): { value: string; millions: boolean } {
  if (mya >= 1) return { value: formatNumberDe(mya), millions: true };
  return { value: formatNumberDe(Math.round(mya * 1_000_000), 0), millions: false };
}

/**
 * Fossil age range in German, oldest first:
 * [231, 228] → "vor 231–228 Mio. Jahren", [2.6, 0.0117] → "vor 2,6 Mio. bis 11.700 Jahren",
 * [1, 0] (still alive) → "vor 1 Mio. Jahren bis heute", [0, 0] → "heute".
 */
export function formatMya(mya: readonly [number, number]): string {
  const [from, to] = mya;
  if (to <= 0) return from <= 0 ? 'heute' : `${formatMya([from, from])} bis heute`;
  const a = myaPart(from);
  const b = myaPart(to);
  if (from === to) return `vor ${a.value}${a.millions ? ' Mio.' : ''} Jahren`;
  if (a.millions === b.millions) return `vor ${a.value}–${b.value}${a.millions ? ' Mio.' : ''} Jahren`;
  return `vor ${a.value} Mio. bis ${b.value} Jahren`;
}

/** Body length in metres: 1 → "ca. 1 m", 0.45 → "ca. 0,45 m". */
export function formatLength(lengthM: number): string {
  return `ca. ${formatNumberDe(lengthM, lengthM < 1 ? 2 : 1)} m`;
}

// ---------------------------------------------------------------------------
// Cards
// ---------------------------------------------------------------------------

export interface CardView {
  /** Name with "+" suffix when upgraded. */
  name: string;
  cost: number;
  /** Generated German rules text (describeCard). */
  text: string;
  exhaust: boolean;
  typeLabel: string;
  rarityLabel: string;
  eraLabel: string;
}

export function getCardView(def: CardDef, upgraded: boolean): CardView {
  const resolved = resolveCard(def, upgraded);
  return {
    name: upgraded ? `${def.name}+` : def.name,
    cost: resolved.cost,
    text: describeCard(def, upgraded),
    exhaust: resolved.exhaust,
    typeLabel: CARD_TYPE_LABELS[def.type],
    rarityLabel: RARITY_LABELS[def.rarity],
    eraLabel: ERA_LABELS[def.era],
  };
}

type DamageEffect = Extract<CardEffect, { type: 'damage' }>;

/** First damage effect in resolution order; `topLevel` is false inside a conditional. */
export function findFirstDamage(effects: readonly CardEffect[]): { effect: DamageEffect; topLevel: boolean } | null {
  for (const effect of effects) {
    if (effect.type === 'damage') return { effect, topLevel: true };
    if (effect.type === 'conditional') {
      const nested = findFirstDamage(effect.then) ?? findFirstDamage(effect.else ?? []);
      if (nested) return { effect: nested.effect, topLevel: false };
    }
  }
  return null;
}

/** How a card should show `previewDamage` (the engine's per-hit damage). */
export type DamagePreview =
  | { mode: 'none' }
  /** The number is replaced inside the rules text: `before` + value + `after`. */
  | { mode: 'inline'; before: string; after: string; value: number; base: number; hits: number }
  /** Shown as a separate badge (scaled or conditional damage). */
  | { mode: 'badge'; value: number; base: number | null; hits: number };

/** -1 lower than printed, 0 equal, 1 higher. */
export function previewTrend(preview: DamagePreview): -1 | 0 | 1 {
  if (preview.mode === 'none' || preview.base === null) return 0;
  return preview.value > preview.base ? 1 : preview.value < preview.base ? -1 : 0;
}

// A number that never appears in generated text, used to locate the amount.
const SENTINEL = 7_654_321;

/**
 * Plans the damage preview. Unscaled damage that is the card's first top-level
 * damage effect is replaced inline; everything else gets a badge.
 */
export function planDamagePreview(def: CardDef, upgraded: boolean, previewDamage: number | null | undefined): DamagePreview {
  if (previewDamage === null || previewDamage === undefined) return { mode: 'none' };
  const resolved = resolveCard(def, upgraded);
  const first = findFirstDamage(resolved.effects);
  if (!first) return { mode: 'badge', value: previewDamage, base: null, hits: 1 };
  const hits = first.effect.hits ?? 1;
  const base = first.effect.amount;
  if (first.topLevel && !first.effect.scaling) {
    const index = resolved.effects.indexOf(first.effect);
    const effects = resolved.effects.map((effect, i) => (i === index ? { ...first.effect, amount: SENTINEL } : effect));
    const probe: CardDef = {
      ...def,
      cost: resolved.cost,
      effects,
      exhaust: resolved.exhaust,
      upgrade: {},
    };
    const parts = describeCard(probe, false).split(String(SENTINEL));
    if (parts.length === 2) {
      return { mode: 'inline', before: parts[0] ?? '', after: parts[1] ?? '', value: previewDamage, base, hits };
    }
  }
  return { mode: 'badge', value: previewDamage, base: first.effect.scaling ? null : base, hits };
}

export interface CardLabelOptions {
  previewDamage?: number | null;
  unaffordable?: boolean;
  /** Overrides the displayed cost (e.g. temporary cost changes). */
  cost?: number;
}

/** Screen-reader label: name, cost, type/rarity/era, rules text, preview. */
export function cardAccessibilityLabel(def: CardDef, upgraded: boolean, options: CardLabelOptions = {}): string {
  const view = getCardView(def, upgraded);
  const cost = options.cost ?? view.cost;
  const parts = [
    upgraded ? `${def.name}, ${UI_STRINGS.upgraded}` : def.name,
    `Kosten ${cost} ${UI_STRINGS.energy}`,
    `${view.typeLabel}, ${view.rarityLabel}, ${view.eraLabel}`,
    view.text.replace(/\.$/, ''),
  ];
  if (options.previewDamage !== null && options.previewDamage !== undefined) {
    parts.push(`Voraussichtlicher Schaden ${options.previewDamage}`);
  }
  if (options.unaffordable) parts.push(UI_STRINGS.notEnoughEnergy);
  return `${parts.join('. ')}.`;
}

export interface GlossaryEntry {
  key: string;
  emoji?: string;
  name: string;
  description: string;
}

function collectStatuses(effects: readonly CardEffect[], into: Set<StatusId>): boolean {
  let pierce = false;
  for (const effect of effects) {
    switch (effect.type) {
      case 'status':
        into.add(effect.status);
        break;
      case 'damage':
        if (effect.pierce) pierce = true;
        break;
      case 'conditional':
        if (effect.condition.kind === 'enemyHasStatus') into.add(effect.condition.status);
        if (collectStatuses(effect.then, into)) pierce = true;
        if (effect.else && collectStatuses(effect.else, into)) pierce = true;
        break;
      default:
        break;
    }
  }
  return pierce;
}

/** Keywords and statuses mentioned by a card, for the detail view. */
export function cardGlossary(def: CardDef, upgraded: boolean): GlossaryEntry[] {
  const resolved = resolveCard(def, upgraded);
  const statuses = new Set<StatusId>();
  const pierce = collectStatuses(resolved.effects, statuses);
  const entries: GlossaryEntry[] = [];
  for (const id of Object.keys(STATUS_INFO) as StatusId[]) {
    if (!statuses.has(id)) continue;
    const info = STATUS_INFO[id];
    entries.push({ key: id, emoji: info.emoji, name: info.name, description: info.description });
  }
  if (pierce) entries.push({ key: 'pierce', ...KEYWORD_LABELS.pierce });
  if (resolved.exhaust) entries.push({ key: 'exhaust', ...KEYWORD_LABELS.exhaust });
  return entries;
}

// ---------------------------------------------------------------------------
// Enemy intent
// ---------------------------------------------------------------------------

export interface IntentSegment {
  kind: IntentKind;
  icon: string;
  /** Number shown next to the icon, e.g. "12×2"; empty when there is none. */
  value: string;
  selfHit: boolean;
}

export interface IntentDisplay {
  segments: IntentSegment[];
  /** Compact text, e.g. "⚔️ 12×2 🛡️ 5". */
  text: string;
  /** First (most important) kind, for the badge colour. */
  primary: IntentKind;
  selfHit: boolean;
  accessibilityLabel: string;
}

function attackValue(intent: IntentView): string {
  if (intent.damage === undefined) return '';
  const hits = intent.hits ?? 1;
  return hits > 1 ? `${intent.damage}×${hits}` : `${intent.damage}`;
}

function intentSentence(kind: IntentKind, intent: IntentView): string {
  switch (kind) {
    case 'attack': {
      if (intent.damage === undefined) return INTENT_LABELS.attack;
      const hits = intent.hits ?? 1;
      const times = hits > 1 ? `, ${hits}-mal` : '';
      if (intent.selfHit) return `Verwirrt: trifft sich selbst mit ${intent.damage} Schaden${times}`;
      return `Angriff mit ${intent.damage} Schaden${times}`;
    }
    case 'defend':
      return intent.block !== undefined ? `Verteidigt sich mit ${intent.block} Block` : INTENT_LABELS.defend;
    default:
      return INTENT_LABELS[kind];
  }
}

/** Icons, numbers and a German screen-reader label for an enemy intent. */
export function formatIntent(intent: IntentView): IntentDisplay {
  const kinds: IntentKind[] = intent.kinds.length > 0 ? intent.kinds : ['unknown'];
  const selfHit = intent.selfHit === true;
  const segments = kinds.map((kind): IntentSegment => {
    const isSelfHit = kind === 'attack' && selfHit;
    let value = '';
    if (kind === 'attack') value = attackValue(intent);
    if (kind === 'defend' && intent.block !== undefined) value = `${intent.block}`;
    return { kind, icon: isSelfHit ? SELF_HIT_ICON : INTENT_ICONS[kind], value, selfHit: isSelfHit };
  });
  const text = segments.map((s) => (s.value ? `${s.icon} ${s.value}` : s.icon)).join(' ');
  const sentences = kinds.map((kind) => intentSentence(kind, intent));
  const name = intent.moveName ? `${UI_STRINGS.intent}: ${intent.moveName}` : UI_STRINGS.intent;
  return {
    segments,
    text,
    primary: kinds[0] ?? 'unknown',
    selfHit,
    accessibilityLabel: `${name}. ${sentences.join('. ')}.`,
  };
}

// ---------------------------------------------------------------------------
// Combat stats
// ---------------------------------------------------------------------------

/** "LP 45 von 60, 8 Block" */
export function statAccessibilityLabel(label: string, value: number, max: number, block: number = 0): string {
  const base = `${label} ${value} von ${max}`;
  return block > 0 ? `${base}, ${block} ${UI_STRINGS.block}` : base;
}

// ---------------------------------------------------------------------------
// Floating numbers
// ---------------------------------------------------------------------------

export type FloatingNumberKind = 'damage' | 'block' | 'heal';

export interface FloatingNumberItem {
  id: number | string;
  value: number;
  kind: FloatingNumberKind;
}

/** Text shown for a floating number: "−12", "Geblockt", "+5 🛡️", "+6 💚". */
export function floatingNumberText(item: Pick<FloatingNumberItem, 'kind' | 'value'>): string {
  switch (item.kind) {
    case 'damage':
      return item.value > 0 ? `−${item.value}` : UI_STRINGS.blocked;
    case 'block':
      return `+${item.value} 🛡️`;
    case 'heal':
      return `+${item.value} 💚`;
  }
}

/**
 * Floating numbers for one side from the events of a combat action: HP lost
 * (or "Geblockt" when fully absorbed), block gained and healing.
 */
export function floatingNumbersFromEvents(
  events: readonly CombatEvent[],
  target: Side,
): Omit<FloatingNumberItem, 'id'>[] {
  const result: Omit<FloatingNumberItem, 'id'>[] = [];
  for (const event of events) {
    switch (event.type) {
      case 'damage':
        if (event.target === target && (event.amount > 0 || event.blocked > 0)) {
          result.push({ kind: 'damage', value: event.amount });
        }
        break;
      case 'block':
        if (event.target === target && event.amount > 0) result.push({ kind: 'block', value: event.amount });
        break;
      case 'heal':
        if (event.target === target && event.amount > 0) result.push({ kind: 'heal', value: event.amount });
        break;
      default:
        break;
    }
  }
  return result;
}
