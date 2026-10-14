import type { CombatEvent } from '@/engine/types';
import { type FloatingNumberItem, floatingNumbersFromEvents } from '@/ui';

// Turns the events of ONE combat action (combat.events after playCard or
// endTurn) into a plan for the screen: floating numbers, hit/attack effects,
// the enemy move and the outcome. Pure, so it is unit-tested without React.

export type FloatingEntry = Omit<FloatingNumberItem, 'id'>;
export type CombatOutcome = 'victory' | 'defeat';

export interface ActionFeedback {
  enemyNumbers: FloatingEntry[];
  playerNumbers: FloatingEntry[];
  /** HP the enemy lost from every source (attacks, bleed, self-hits). Includes overkill. */
  enemyHpLost: number;
  /** Damage absorbed by the enemy's block. */
  enemyBlocked: number;
  /** HP the enemy lost by hitting itself while confused. */
  selfHitHpLost: number;
  /** HP the player lost to enemy attacks (not bleed). */
  playerHpLost: number;
  /** Enemy attack damage absorbed by the player's block. */
  playerBlocked: number;
  /** HP lost to bleed at the start of the side's turn. */
  enemyBleed: number;
  playerBleed: number;
  playerBlockGained: number;
  playerHealed: number;
  enemyBlockGained: number;
  enemyHealed: number;
  /** The enemy was hit (HP or block) → shake. */
  enemyHit: boolean;
  /** The player lost HP (attack or bleed) → flash. */
  playerHit: boolean;
  /** The enemy attacked the player (lunge animation), blocked or not. */
  enemyAttacked: boolean;
  /** The confused enemy hit itself this action. */
  selfHit: boolean;
  /** The enemy was killed outright by an execute effect. */
  executed: boolean;
  /** The action affected the enemy (damage, status or execute): played cards fly to it. */
  targetsEnemy: boolean;
  enemyMoveId: string | null;
  cardPlayed: { uid: string; defId: string } | null;
  /** Number of the player turn that started with this action. */
  turnStart: number | null;
  outcome: CombatOutcome | null;
}

export function planActionFeedback(events: readonly CombatEvent[]): ActionFeedback {
  const plan: ActionFeedback = {
    enemyNumbers: floatingNumbersFromEvents(events, 'enemy'),
    playerNumbers: floatingNumbersFromEvents(events, 'player'),
    enemyHpLost: 0,
    enemyBlocked: 0,
    selfHitHpLost: 0,
    playerHpLost: 0,
    playerBlocked: 0,
    enemyBleed: 0,
    playerBleed: 0,
    playerBlockGained: 0,
    playerHealed: 0,
    enemyBlockGained: 0,
    enemyHealed: 0,
    enemyHit: false,
    playerHit: false,
    enemyAttacked: false,
    selfHit: false,
    executed: false,
    targetsEnemy: false,
    enemyMoveId: null,
    cardPlayed: null,
    turnStart: null,
    outcome: null,
  };

  for (const event of events) {
    switch (event.type) {
      case 'damage':
        if (event.target === 'enemy') {
          plan.enemyHpLost += event.amount;
          plan.enemyBlocked += event.blocked;
          if (event.amount > 0 || event.blocked > 0) plan.enemyHit = true;
          if (event.source === 'bleed') plan.enemyBleed += event.amount;
          else if (event.source === 'enemy') plan.selfHitHpLost += event.amount;
          else plan.targetsEnemy = true;
        } else {
          if (event.amount > 0) plan.playerHit = true;
          if (event.source === 'bleed') {
            plan.playerBleed += event.amount;
          } else {
            plan.playerHpLost += event.amount;
            plan.playerBlocked += event.blocked;
            if (event.source === 'enemy') plan.enemyAttacked = true;
          }
        }
        break;
      case 'block':
        if (event.target === 'player') plan.playerBlockGained += event.amount;
        else plan.enemyBlockGained += event.amount;
        break;
      case 'heal':
        if (event.target === 'player') plan.playerHealed += event.amount;
        else plan.enemyHealed += event.amount;
        break;
      case 'status':
        // Statuses from a played card on the enemy (enemy self-buffs happen in its own turn).
        if (event.target === 'enemy' && plan.cardPlayed !== null) plan.targetsEnemy = true;
        break;
      case 'confusedHit':
        plan.selfHit = true;
        break;
      case 'execute':
        plan.executed = true;
        plan.enemyHit = true;
        plan.targetsEnemy = true;
        break;
      case 'enemyMove':
        plan.enemyMoveId = event.moveId;
        break;
      case 'cardPlayed':
        plan.cardPlayed = { uid: event.uid, defId: event.defId };
        break;
      case 'turnStart':
        plan.turnStart = event.turn;
        break;
      case 'victory':
        plan.outcome = 'victory';
        break;
      case 'defeat':
        plan.outcome = 'defeat';
        break;
      default:
        break;
    }
  }
  return plan;
}
