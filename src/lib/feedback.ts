import type { CombatEvent } from '@/engine/types';
import * as haptics from './haptics';

// Maps the events of one combat action to a single haptic pulse. Firing one
// pulse per action (the most important one) feels clearer than a buzz per
// event, e.g. for multi-hit attacks or an enemy turn with several effects.

export type CombatHaptic = 'victory' | 'defeat' | 'hitTaken' | 'hitDealt' | 'blocked' | 'cardPlayed';

/** Highest priority first. */
const PRIORITY: readonly CombatHaptic[] = ['victory', 'defeat', 'hitTaken', 'hitDealt', 'blocked', 'cardPlayed'];

function hapticOf(event: CombatEvent): CombatHaptic | null {
  switch (event.type) {
    case 'victory':
      return 'victory';
    case 'defeat':
      return 'defeat';
    case 'damage':
      if (event.target === 'player') {
        if (event.amount > 0) return 'hitTaken';
        return event.blocked > 0 ? 'blocked' : null;
      }
      return event.amount > 0 || event.blocked > 0 ? 'hitDealt' : null;
    case 'confusedHit':
    case 'execute':
      return 'hitDealt';
    case 'cardPlayed':
      return 'cardPlayed';
    default:
      return null;
  }
}

/** The single most important haptic for an action's events, or null. */
export function pickCombatHaptic(events: readonly CombatEvent[]): CombatHaptic | null {
  let best: CombatHaptic | null = null;
  for (const event of events) {
    const haptic = hapticOf(event);
    if (haptic !== null && (best === null || PRIORITY.indexOf(haptic) < PRIORITY.indexOf(best))) {
      best = haptic;
    }
  }
  return best;
}

const PLAY: Record<CombatHaptic, () => void> = {
  victory: () => haptics.victory(),
  defeat: () => haptics.defeat(),
  hitTaken: () => haptics.hitTaken(),
  hitDealt: () => haptics.hitDealt(),
  blocked: () => haptics.tapLight(),
  cardPlayed: () => haptics.cardPlayed(),
};

/**
 * Plays the haptic for a combat action, e.g. after `playCard`/`endTurn`:
 * `playCombatHaptics(combat.events)`. Returns the haptic that was chosen.
 */
export function playCombatHaptics(events: readonly CombatEvent[]): CombatHaptic | null {
  const haptic = pickCombatHaptic(events);
  if (haptic !== null) PLAY[haptic]();
  return haptic;
}
