import type {
  CardDef,
  CardEffect,
  CardTag,
  Condition,
  EnemyDef,
  EnemyEffect,
  EnemyMove,
  Scaling,
  StatusId,
  Zone,
} from './types';

// Card text is always generated from effects so text and rules never drift.

/** Effects/cost/exhaust after applying the upgrade if `upgraded`. */
export function resolveCard(def: CardDef, upgraded: boolean): { cost: number; effects: CardEffect[]; exhaust: boolean } {
  if (!upgraded) {
    return { cost: def.cost, effects: def.effects, exhaust: def.exhaust ?? false };
  }
  return {
    cost: def.upgrade.cost ?? def.cost,
    effects: def.upgrade.effects ?? def.effects,
    exhaust: def.upgrade.exhaust ?? def.exhaust ?? false,
  };
}

export const STATUS_INFO: Record<StatusId, { name: string; emoji: string; description: string }> = {
  strength: { name: 'Stärke', emoji: '💪', description: '+1 Schaden pro Treffer je Stapel. Hält den ganzen Kampf.' },
  vulnerable: { name: 'Verwundbar', emoji: '🎯', description: 'Erleidet 50 % mehr Angriffsschaden. Sinkt jede Runde um 1.' },
  weak: { name: 'Geschwächt', emoji: '🥀', description: 'Verursacht 25 % weniger Angriffsschaden. Sinkt jede Runde um 1.' },
  bleed: { name: 'Blutung', emoji: '🩸', description: 'Verliert zu Zugbeginn so viele LP (ignoriert Block), danach −1.' },
  confused: { name: 'Verwirrt', emoji: '💫', description: 'Der nächste Angriffszug trifft sich selbst, danach −1.' },
};

/** Card keywords that appear in generated text, for glossary/detail views. */
export const KEYWORD_INFO = {
  pierce: { name: 'Durchschlagend', description: 'Ignoriert Block.' },
  exhaust: { name: 'Verbannen', description: 'Wird nach dem Ausspielen für den Rest des Kampfes entfernt.' },
} as const;

/** German names used in "je …-Karte" phrases. */
export const TAG_NAMES: Record<CardTag, string> = {
  carnivore: 'Fleischfresser',
  herbivore: 'Pflanzenfresser',
  flyer: 'Flieger',
  marine: 'Meeresbewohner',
  plant: 'Pflanzen',
  mammal: 'Säugetier',
  invertebrate: 'Wirbellosen',
  pack: 'Rudel',
};

const ZONE_PHRASES: Record<Zone, string> = {
  hand: 'auf der Hand',
  drawPile: 'im Nachziehstapel',
  discardPile: 'im Ablagestapel',
  deck: 'im Deck',
};

/** "Falls der Gegner …" phrasing per status. */
const ENEMY_STATUS_PHRASES: Record<StatusId, string> = {
  strength: 'Stärke hat',
  vulnerable: 'verwundbar ist',
  weak: 'geschwächt ist',
  bleed: 'blutet',
  confused: 'verwirrt ist',
};

function plural(count: number, singular: string, pluralForm: string): string {
  return Math.abs(count) === 1 ? singular : pluralForm;
}

function signed(value: number): string {
  return value >= 0 ? `+${value}` : `−${Math.abs(value)}`;
}

/** "je Pflanzenfresser-Karte im Ablagestapel" etc. */
function scalingPer(scaling: Scaling): string {
  switch (scaling.per) {
    case 'tagInZone':
      return `je ${TAG_NAMES[scaling.tag]}-Karte ${ZONE_PHRASES[scaling.zone]}`;
    case 'cardsPlayedThisTurn':
      return 'je zuvor in diesem Zug gespielte Karte';
    case 'playerBlock':
      return 'je Punkt deines Blocks';
  }
}

/**
 * Amount phrase of a damage/block effect, `extra` (e.g. " 2-mal") is placed
 * right after the unit:
 * - "6 Schaden 2-mal"
 * - "4 Schaden, +2 je Pflanzenfresser-Karte im Ablagestapel (max. +6)"
 * - base 0: "2 Block je Pflanzen-Karte auf der Hand (max. 6)" or
 *   "Schaden in Höhe deines Blocks"
 */
function amountPhrase(base: number, unit: string, scaling: Scaling | undefined, extra: string): string {
  if (!scaling) return `${base} ${unit}${extra}`;
  if (base === 0) {
    if (scaling.per === 'playerBlock' && scaling.amount === 1 && scaling.max === undefined) {
      return `${unit} in Höhe deines Blocks${extra}`;
    }
    const max = scaling.max !== undefined ? ` (max. ${scaling.max})` : '';
    return `${scaling.amount} ${unit} ${scalingPer(scaling)}${max}${extra}`;
  }
  const max = scaling.max !== undefined ? ` (max. ${signed(scaling.max)})` : '';
  return `${base} ${unit}${extra}, ${signed(scaling.amount)} ${scalingPer(scaling)}${max}`;
}

function describeCondition(condition: Condition): string {
  switch (condition.kind) {
    case 'enemyHpAtMost':
      return `Falls der Gegner höchstens ${condition.value} LP hat`;
    case 'playerBlockAtLeast':
      return `Falls du mindestens ${condition.value} Block hast`;
    case 'firstAttackThisTurn':
      return 'Falls erster Angriff in diesem Zug';
    case 'enemyHasStatus':
      return `Falls der Gegner ${ENEMY_STATUS_PHRASES[condition.status]}`;
    case 'chance':
      return `Mit ${condition.percent} % Chance`;
  }
}

/** Conditions after which "ihn" unambiguously refers to the enemy. */
function conditionNamesEnemy(condition: Condition): boolean {
  return condition.kind === 'enemyHpAtMost' || condition.kind === 'enemyHasStatus';
}

function describeEffect(effect: CardEffect, enemyInContext: boolean): string {
  switch (effect.type) {
    case 'damage': {
      const hits = effect.hits ?? 1;
      const times = hits !== 1 ? ` ${hits}-mal` : '';
      const pierce = effect.pierce ? ` (${KEYWORD_INFO.pierce.name})` : '';
      return `Verursache ${amountPhrase(effect.amount, 'Schaden', effect.scaling, `${times}${pierce}`)}.`;
    }
    case 'block':
      return `Erhalte ${amountPhrase(effect.amount, 'Block', effect.scaling, '')}.`;
    case 'heal':
      return `Heile ${effect.amount} LP.`;
    case 'draw':
      return `Ziehe ${effect.amount} ${plural(effect.amount, 'Karte', 'Karten')}.`;
    case 'energy':
      return `${signed(effect.amount)} Energie.`;
    case 'status': {
      const name = STATUS_INFO[effect.status].name;
      return effect.target === 'enemy' ? `Verleihe ${effect.amount} ${name}.` : `Erhalte ${effect.amount} ${name}.`;
    }
    case 'execute':
      return enemyInContext ? 'Töte ihn sofort.' : 'Töte den Gegner sofort.';
    case 'conditional': {
      const namesEnemy = conditionNamesEnemy(effect.condition);
      const then = describeEffectList(effect.then, namesEnemy);
      let text = `${describeCondition(effect.condition)}: ${then}`;
      if (effect.else && effect.else.length > 0) {
        text += ` Sonst: ${describeEffectList(effect.else, false)}`;
      }
      return text;
    }
  }
}

function describeEffectList(effects: readonly CardEffect[], enemyInContext: boolean): string {
  return effects.map((effect) => describeEffect(effect, enemyInContext)).join(' ');
}

/** German rules text for a list of card effects (without the exhaust keyword). */
export function describeEffects(effects: readonly CardEffect[]): string {
  return describeEffectList(effects, false);
}

/** German rules text, e.g. "Verursache 6 Schaden. Ziehe 1 Karte." */
export function describeCard(def: CardDef, upgraded: boolean): string {
  const resolved = resolveCard(def, upgraded);
  const parts: string[] = [];
  const effectsText = describeEffectList(resolved.effects, false);
  if (effectsText) parts.push(effectsText);
  if (resolved.exhaust) parts.push(`${KEYWORD_INFO.exhaust.name}.`);
  return parts.join(' ');
}

function describeEnemyEffect(effect: EnemyEffect): string {
  switch (effect.type) {
    case 'attack': {
      const hits = effect.hits ?? 1;
      return hits !== 1 ? `${effect.amount} Schaden ${hits}-mal` : `${effect.amount} Schaden`;
    }
    case 'block':
      return `${effect.amount} Block`;
    case 'heal':
      return `heilt ${effect.amount} LP`;
    case 'status': {
      const name = STATUS_INFO[effect.status].name;
      return effect.target === 'self' ? `erhält ${effect.amount} ${name}` : `verleiht ${effect.amount} ${name}`;
    }
  }
}

/** Short German summary of one move, e.g. "Biss: 6 Schaden, verleiht 1 Geschwächt". */
export function describeMove(move: EnemyMove): string {
  const effects = move.effects.map(describeEnemyEffect).join(', ');
  return effects ? `${move.name}: ${effects}` : move.name;
}

/** Short German summary of all moves, e.g. "Biss: 6 Schaden · Panzer: 5 Block". */
export function describeEnemy(def: EnemyDef): string {
  return def.moves.map(describeMove).join(' · ');
}
