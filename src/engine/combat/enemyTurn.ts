import type { ContentDB, EnemyEffect } from '../types';
import { chooseNextMove, findMove, pushHistory } from './ai';
import { addStatus, computeHitDamage, decrementStatus, statusOf } from './damage';
import { checkCombatEnd, dealDamage, getEnemyDef, tickBleed, type Draft } from './draft';

// Step 2 of the turn order (docs/ARCHITECTURE.md "Zugablauf").

/** True when the enemy is confused and the move contains an attack. */
export function isSelfHitMove(confused: number, effects: readonly EnemyEffect[]): boolean {
  return confused > 0 && effects.some((effect) => effect.type === 'attack');
}

/**
 * Applies one enemy effect. While `selfHit`, attacks hit the enemy itself:
 * enemy strength/weak as attacker, the enemy's own vulnerable and block as
 * target; the player's statuses are ignored.
 */
function applyEnemyEffect(d: Draft, effect: EnemyEffect, selfHit: boolean): void {
  switch (effect.type) {
    case 'attack': {
      const hits = effect.hits ?? 1;
      for (let hit = 0; hit < hits; hit++) {
        if (selfHit) {
          const damage = computeHitDamage(effect.amount, d.enemy.statuses, d.enemy.statuses);
          dealDamage(d, 'enemy', damage, 'enemy', false);
        } else {
          const damage = computeHitDamage(effect.amount, d.enemy.statuses, d.player.statuses);
          dealDamage(d, 'player', damage, 'enemy', false);
        }
        if (checkCombatEnd(d)) return;
      }
      break;
    }
    case 'block':
      d.enemy.block += Math.max(0, effect.amount);
      d.events.push({ type: 'block', target: 'enemy', amount: Math.max(0, effect.amount) });
      break;
    case 'heal': {
      const healed = Math.max(0, Math.min(effect.amount, d.enemy.maxHp - d.enemy.hp));
      d.enemy.hp += healed;
      if (healed > 0) d.events.push({ type: 'heal', target: 'enemy', amount: healed });
      break;
    }
    case 'status': {
      const target = effect.target === 'self' ? 'enemy' : 'player';
      addStatus(target === 'enemy' ? d.enemy.statuses : d.player.statuses, effect.status, effect.amount);
      d.events.push({ type: 'status', target, status: effect.status, amount: effect.amount });
      break;
    }
  }
}

/**
 * Enemy block → 0, enemy bleed ticks, enemy executes `nextMoveId`, enemy
 * weak/vulnerable −1, next move is chosen. Stops as soon as the combat ends.
 */
export function runEnemyTurn(db: ContentDB, d: Draft): void {
  const def = getEnemyDef(db, d.enemy.defId);
  d.enemy.block = 0;
  tickBleed(d, 'enemy');
  if (checkCombatEnd(d)) return;

  const move = findMove(def, d.enemy.nextMoveId);
  if (move) {
    d.events.push({ type: 'enemyMove', moveId: move.id });
    const selfHit = isSelfHitMove(statusOf(d.enemy.statuses, 'confused'), move.effects);
    if (selfHit) d.events.push({ type: 'confusedHit' });
    for (const effect of move.effects) {
      applyEnemyEffect(d, effect, selfHit);
      if (checkCombatEnd(d)) return;
    }
    if (selfHit) decrementStatus(d.enemy.statuses, 'confused');
  }

  decrementStatus(d.enemy.statuses, 'weak');
  decrementStatus(d.enemy.statuses, 'vulnerable');
  d.enemy.history = pushHistory(d.enemy.history, d.enemy.nextMoveId);
  const next = chooseNextMove(def, d.enemy.history, d.rngState);
  d.enemy.nextMoveId = next.moveId;
  d.rngState = next.rngState;
}
