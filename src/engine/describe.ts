import type { CardDef, CardEffect, EnemyDef, StatusId } from './types';

// CONTRACT STUB — card text is always generated from effects so text and rules never drift.

/** Effects/cost/exhaust after applying the upgrade if `upgraded`. */
export function resolveCard(def: CardDef, upgraded: boolean): { cost: number; effects: CardEffect[]; exhaust: boolean } {
  throw new Error('not implemented');
}

/** German rules text, e.g. "Verursache 6 Schaden. Ziehe 1 Karte." */
export function describeCard(def: CardDef, upgraded: boolean): string {
  throw new Error('not implemented');
}

export const STATUS_INFO: Record<StatusId, { name: string; emoji: string; description: string }> = {
  strength: { name: 'Stärke', emoji: '💪', description: '+1 Schaden pro Treffer je Stapel.' },
  vulnerable: { name: 'Verwundbar', emoji: '🎯', description: 'Erleidet 50 % mehr Angriffsschaden.' },
  weak: { name: 'Geschwächt', emoji: '🥀', description: 'Verursacht 25 % weniger Angriffsschaden.' },
  bleed: { name: 'Blutung', emoji: '🩸', description: 'Verliert zu Zugbeginn so viele LP, danach −1.' },
  confused: { name: 'Verwirrt', emoji: '💫', description: 'Der nächste Angriff trifft sich selbst.' },
};

export function describeEnemy(def: EnemyDef): string {
  throw new Error('not implemented');
}
