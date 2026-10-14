// Pacing of the combat screen in ms. With reduced motion the movement is
// dropped and most steps get shorter, but the enemy turn still pauses briefly
// so the player can see what happened.

export interface BattleTimings {
  /** Hand slides out after "Zug beenden" before the engine resolves the turn. */
  discard: number;
  /** Time the enemy's action stays on screen before the new hand is dealt. */
  enemyAct: number;
  /** Delay of the player's hit flash after the enemy's lunge starts. */
  enemyHitDelay: number;
  /** How long the "Zug n" banner stays visible. */
  turnBanner: number;
  /** Delay before the victory/defeat overlay appears (final hit stays visible). */
  outcomeDelay: number;
  /** Time from victory/defeat until resolveCombat() is called. */
  resolveVictory: number;
  resolveDefeat: number;
  /** Duration of short hints ("Nicht genug Energie"). */
  hint: number;
  /** Duration of longer hints (status descriptions). */
  longHint: number;
  /** Flight of a played card towards its target (0 = no flight). */
  flight: number;
}

const NORMAL: BattleTimings = {
  discard: 240,
  enemyAct: 460,
  enemyHitDelay: 150,
  turnBanner: 850,
  outcomeDelay: 320,
  resolveVictory: 1150,
  resolveDefeat: 1500,
  hint: 1600,
  longHint: 3600,
  flight: 320,
};

const REDUCED: BattleTimings = {
  discard: 60,
  enemyAct: 380,
  enemyHitDelay: 0,
  turnBanner: 800,
  outcomeDelay: 0,
  resolveVictory: 850,
  resolveDefeat: 1100,
  hint: 1600,
  longHint: 3600,
  flight: 0,
};

/** Shared constant objects: the identity only changes with the setting. */
export function battleTimings(reducedMotion: boolean): BattleTimings {
  return reducedMotion ? REDUCED : NORMAL;
}

/** Time from "Zug beenden" until the player can act again. */
export function enemyTurnDuration(timings: BattleTimings): number {
  return timings.discard + timings.enemyAct;
}

/** Time from the end of the combat until it is resolved. */
export function resolveDelay(timings: BattleTimings, phase: 'won' | 'lost'): number {
  return phase === 'won' ? timings.resolveVictory : timings.resolveDefeat;
}
