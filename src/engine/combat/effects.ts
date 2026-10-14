import { chance } from '../rng';
import type { CardEffect, CardInstance, CombatState, Condition, ContentDB, Scaling, Statuses, Zone } from '../types';
import { addStatus, computeHitDamage, statusOf } from './damage';
import { checkCombatEnd, dealDamage, drawCards, getCardDef, type Draft } from './draft';

// Resolution of card effects for playCard, plus the side-effect free preview.

/** Facts about the play that are fixed before the card's effects resolve. */
export interface PlayContext {
  db: ContentDB;
  /** No attack card was played earlier this turn (before this card). */
  firstAttack: boolean;
  /** Cards played earlier this turn, not counting this card. */
  cardsPlayedBefore: number;
}

/** What scaling can look at. The played card is in none of the piles. */
interface ScalingView {
  db: ContentDB;
  hand: readonly CardInstance[];
  drawPile: readonly CardInstance[];
  discardPile: readonly CardInstance[];
  exhaustPile: readonly CardInstance[];
  playerBlock: number;
  cardsPlayedBefore: number;
}

/** 'deck' means every card in this combat: draw, hand, discard and exhaust piles. */
function cardsInZone(view: ScalingView, zone: Zone): readonly CardInstance[] {
  switch (zone) {
    case 'hand':
      return view.hand;
    case 'drawPile':
      return view.drawPile;
    case 'discardPile':
      return view.discardPile;
    case 'deck':
      return [...view.drawPile, ...view.hand, ...view.discardPile, ...view.exhaustPile];
  }
}

/** Bonus added to an effect's base amount; capped at `max` when given. */
function scalingBonus(view: ScalingView, scaling: Scaling | undefined): number {
  if (!scaling) return 0;
  let count: number;
  switch (scaling.per) {
    case 'tagInZone':
      count = cardsInZone(view, scaling.zone).filter((card) =>
        getCardDef(view.db, card.defId).tags.includes(scaling.tag),
      ).length;
      break;
    case 'cardsPlayedThisTurn':
      count = view.cardsPlayedBefore;
      break;
    case 'playerBlock':
      count = view.playerBlock;
      break;
  }
  const bonus = count * scaling.amount;
  return scaling.max !== undefined ? Math.min(bonus, scaling.max) : bonus;
}

function draftView(d: Draft, ctx: PlayContext): ScalingView {
  return {
    db: ctx.db,
    hand: d.hand,
    drawPile: d.drawPile,
    discardPile: d.discardPile,
    exhaustPile: d.exhaustPile,
    playerBlock: d.player.block,
    cardsPlayedBefore: ctx.cardsPlayedBefore,
  };
}

/** Evaluates a condition against the draft; 'chance' consumes one RNG roll. */
function evaluateCondition(d: Draft, ctx: PlayContext, condition: Condition): boolean {
  switch (condition.kind) {
    case 'enemyHpAtMost':
      return d.enemy.hp <= condition.value;
    case 'playerBlockAtLeast':
      return d.player.block >= condition.value;
    case 'firstAttackThisTurn':
      return ctx.firstAttack;
    case 'enemyHasStatus':
      return statusOf(d.enemy.statuses, condition.status) > 0;
    case 'chance': {
      const roll = chance(d.rngState, condition.percent);
      d.rngState = roll.state;
      return roll.value;
    }
  }
}

/**
 * Resolves card effects in order on the draft. Stops immediately (even
 * between two hits of one effect) once the combat is over.
 */
export function resolveCardEffects(d: Draft, ctx: PlayContext, effects: readonly CardEffect[]): void {
  for (const effect of effects) {
    if (d.phase !== 'player') return;
    switch (effect.type) {
      case 'damage': {
        const base = effect.amount + scalingBonus(draftView(d, ctx), effect.scaling);
        const hits = effect.hits ?? 1;
        for (let hit = 0; hit < hits; hit++) {
          const damage = computeHitDamage(base, d.player.statuses, d.enemy.statuses);
          dealDamage(d, 'enemy', damage, 'player', effect.pierce ?? false);
          if (checkCombatEnd(d)) return;
        }
        break;
      }
      case 'block': {
        const gain = Math.max(0, effect.amount + scalingBonus(draftView(d, ctx), effect.scaling));
        d.player.block += gain;
        d.events.push({ type: 'block', target: 'player', amount: gain });
        break;
      }
      case 'heal': {
        const healed = Math.max(0, Math.min(effect.amount, d.player.maxHp - d.player.hp));
        d.player.hp += healed;
        if (healed > 0) d.events.push({ type: 'heal', target: 'player', amount: healed });
        break;
      }
      case 'draw':
        drawCards(d, effect.amount);
        break;
      case 'energy':
        d.energy = Math.max(0, d.energy + effect.amount);
        d.events.push({ type: 'energy', amount: effect.amount });
        break;
      case 'status': {
        const target = effect.target === 'self' ? 'player' : 'enemy';
        addStatus(target === 'player' ? d.player.statuses : d.enemy.statuses, effect.status, effect.amount);
        d.events.push({ type: 'status', target, status: effect.status, amount: effect.amount });
        break;
      }
      case 'execute':
        d.enemy.hp = 0;
        d.events.push({ type: 'execute' });
        break;
      case 'conditional': {
        const branch = evaluateCondition(d, ctx, effect.condition) ? effect.then : (effect.else ?? []);
        resolveCardEffects(d, ctx, branch);
        break;
      }
    }
    if (checkCombatEnd(d)) return;
  }
}

/** Mutable copy of what earlier effects of a card can change before its damage. */
interface PreviewSim {
  player: Statuses;
  enemy: Statuses;
  playerBlock: number;
}

interface PreviewView extends ScalingView {
  enemyHp: number;
  firstAttack: boolean;
}

/** Deterministic conditions are evaluated; a chance is assumed to succeed. */
function previewCondition(view: PreviewView, sim: PreviewSim, condition: Condition): boolean {
  switch (condition.kind) {
    case 'enemyHpAtMost':
      return view.enemyHp <= condition.value;
    case 'playerBlockAtLeast':
      return sim.playerBlock >= condition.value;
    case 'firstAttackThisTurn':
      return view.firstAttack;
    case 'enemyHasStatus':
      return statusOf(sim.enemy, condition.status) > 0;
    case 'chance':
      return condition.percent > 0;
  }
}

function findPreviewDamage(view: PreviewView, sim: PreviewSim, effects: readonly CardEffect[]): number | null {
  for (const effect of effects) {
    switch (effect.type) {
      case 'damage': {
        const base = effect.amount + scalingBonus({ ...view, playerBlock: sim.playerBlock }, effect.scaling);
        return computeHitDamage(base, sim.player, sim.enemy);
      }
      case 'block':
        sim.playerBlock += Math.max(
          0,
          effect.amount + scalingBonus({ ...view, playerBlock: sim.playerBlock }, effect.scaling),
        );
        break;
      case 'status':
        addStatus(effect.target === 'self' ? sim.player : sim.enemy, effect.status, effect.amount);
        break;
      case 'conditional': {
        const branch = previewCondition(view, sim, effect.condition) ? effect.then : (effect.else ?? []);
        const found = findPreviewDamage(view, sim, branch);
        if (found !== null) return found;
        break;
      }
      default:
        // draw/energy/heal/execute do not change the damage of a later hit.
        break;
    }
  }
  return null;
}

/**
 * Per-hit damage of the first damage effect that would resolve if `card` were
 * played from `state` right now: strength/weak/vulnerable, scaling without the
 * card itself, status/block effects that precede the damage on the same card,
 * and deterministic conditions (a 'chance' is assumed to succeed). Returns
 * null when no damage would be dealt (e.g. the execute branch of a finisher).
 */
export function previewCardDamage(
  db: ContentDB,
  state: CombatState,
  card: CardInstance,
  effects: readonly CardEffect[],
): number | null {
  const view: PreviewView = {
    db,
    hand: state.hand.filter((c) => c.uid !== card.uid),
    drawPile: state.drawPile,
    discardPile: state.discardPile,
    exhaustPile: state.exhaustPile,
    playerBlock: state.player.block,
    cardsPlayedBefore: state.cardsPlayedThisTurn,
    enemyHp: state.enemy.hp,
    firstAttack: state.attacksPlayedThisTurn === 0,
  };
  const sim: PreviewSim = {
    player: { ...state.player.statuses },
    enemy: { ...state.enemy.statuses },
    playerBlock: state.player.block,
  };
  return findPreviewDamage(view, sim, effects);
}
