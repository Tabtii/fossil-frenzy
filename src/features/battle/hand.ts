import { previewDamage } from '@/engine/combat';
import { resolveCard } from '@/engine/describe';
import type { CardDef, CombatState, ContentDB } from '@/engine/types';

// View model of the hand. Every entry only holds primitives plus the shared
// (content-owned) CardDef, so memoised hand cards re-render only when their
// own values change.

export interface HandEntry {
  uid: string;
  def: CardDef;
  upgraded: boolean;
  cost: number;
  /** Enough energy to play the card right now. */
  affordable: boolean;
  /** Engine damage preview per hit (null for cards without damage). */
  previewDamage: number | null;
}

export function buildHandEntries(db: ContentDB, combat: CombatState): HandEntry[] {
  const entries: HandEntry[] = [];
  for (const card of combat.hand) {
    const def = db.cards[card.defId];
    if (!def) continue;
    const cost = resolveCard(def, card.upgraded).cost;
    entries.push({
      uid: card.uid,
      def,
      upgraded: card.upgraded,
      cost,
      affordable: cost <= combat.energy,
      previewDamage: previewDamage(db, combat, card.uid),
    });
  }
  return entries;
}

export function findHandEntry(entries: readonly HandEntry[], uid: string | null): HandEntry | null {
  if (uid === null) return null;
  return entries.find((entry) => entry.uid === uid) ?? null;
}

/** True when at least one hand card can be paid for. */
export function hasAffordableCard(entries: readonly HandEntry[]): boolean {
  return entries.some((entry) => entry.affordable);
}

/** Upward release speed (dp/s) that counts as a flick. */
export const SWIPE_FLICK_VELOCITY = -900;

/**
 * Whether releasing a dragged hand card plays it: dragged up at least
 * `threshold` dp, or flicked up quickly after a third of that distance.
 * Runs on the UI thread inside the pan gesture.
 */
export function shouldPlayOnRelease(translationY: number, velocityY: number, threshold: number): boolean {
  'worklet';
  if (translationY <= -threshold) return true;
  return translationY <= -threshold / 3 && velocityY <= SWIPE_FLICK_VELOCITY;
}
