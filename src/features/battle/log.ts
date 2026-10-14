import { describeMove } from '@/engine/describe';
import type { CombatEvent, EnemyDef, EnemyMove } from '@/engine/types';

import { type ActionFeedback, planActionFeedback } from './feedback';
import { BATTLE_TEXT, turnLabel } from './strings';

// Short German texts about what just happened: the combat log line under the
// arena and screen-reader announcements. Pure functions.

function findMove(enemy: EnemyDef | undefined, moveId: string | null): EnemyMove | undefined {
  if (!enemy || moveId === null) return undefined;
  return enemy.moves.find((move) => move.id === moveId);
}

/** "→ −4 LP (2 geblockt)" for an attack on the player. */
function attackResult(feedback: ActionFeedback): string {
  if (!feedback.enemyAttacked) return '';
  if (feedback.playerHpLost > 0) {
    const blocked = feedback.playerBlocked > 0 ? ` (${feedback.playerBlocked} geblockt)` : '';
    return ` → −${feedback.playerHpLost} LP${blocked}`;
  }
  return ' → komplett geblockt';
}

/**
 * One-line summary of the enemy turn, e.g. "🦖 Biss: 8 Schaden → −5 LP (3 geblockt)".
 * Covers bleed ticks and confused self-hits. Null when the enemy did nothing visible.
 */
export function enemyTurnLogLine(enemy: EnemyDef | undefined, feedback: ActionFeedback): string | null {
  if (!enemy) return null;
  const parts: string[] = [];
  if (feedback.enemyBleed > 0) parts.push(`🩸 ${enemy.name} blutet: −${feedback.enemyBleed} LP`);
  const move = findMove(enemy, feedback.enemyMoveId);
  if (move) {
    if (feedback.selfHit) {
      parts.push(`💫 Verwirrt! ${move.name} trifft ${enemy.name} selbst: −${feedback.selfHitHpLost} LP`);
    } else {
      parts.push(`${enemy.emoji} ${describeMove(move)}${attackResult(feedback)}`);
    }
  }
  if (feedback.playerBleed > 0) parts.push(`🩸 Blutung: −${feedback.playerBleed} LP`);
  return parts.length > 0 ? parts.join(' · ') : null;
}

/** Log line restored from the last action's events (e.g. after reopening the app). */
export function logLineFromEvents(enemy: EnemyDef | undefined, events: readonly CombatEvent[]): string | null {
  const feedback = planActionFeedback(events);
  return feedback.enemyMoveId === null && feedback.enemyBleed === 0 ? null : enemyTurnLogLine(enemy, feedback);
}

function outcomeSentence(feedback: ActionFeedback): string | null {
  if (feedback.outcome === 'victory') return BATTLE_TEXT.victory;
  if (feedback.outcome === 'defeat') return `${BATTLE_TEXT.defeat}.`;
  return null;
}

/** Screen-reader summary of the enemy turn, ending with the new turn number. */
export function enemyTurnAnnouncement(enemy: EnemyDef | undefined, feedback: ActionFeedback): string {
  const sentences: string[] = [];
  const name = enemy?.name ?? 'Der Gegner';
  if (feedback.enemyBleed > 0) sentences.push(`${name} verliert ${feedback.enemyBleed} LP durch Blutung.`);
  const move = findMove(enemy, feedback.enemyMoveId);
  if (move) {
    if (feedback.selfHit) {
      sentences.push(`${name} ist verwirrt und trifft sich selbst: ${feedback.selfHitHpLost} Schaden.`);
    } else {
      sentences.push(`${name}: ${describeMove(move)}.`);
    }
  }
  if (feedback.playerHpLost > 0) sentences.push(`Du verlierst ${feedback.playerHpLost} LP.`);
  if (feedback.playerBlocked > 0) sentences.push(`${feedback.playerBlocked} Schaden geblockt.`);
  if (feedback.playerBleed > 0) sentences.push(`Blutung: Du verlierst ${feedback.playerBleed} LP.`);
  const outcome = outcomeSentence(feedback);
  if (outcome) sentences.push(outcome);
  else if (feedback.turnStart !== null) sentences.push(`${turnLabel(feedback.turnStart)}.`);
  return sentences.join(' ');
}

/** Screen-reader summary of a played card, e.g. "Eoraptor gespielt. Gegner verliert 6 LP." */
export function cardPlayAnnouncement(cardName: string, feedback: ActionFeedback): string {
  const sentences = [`${cardName} gespielt.`];
  if (feedback.executed) sentences.push('Der Gegner wird sofort besiegt.');
  else if (feedback.enemyHpLost > 0) sentences.push(`Gegner verliert ${feedback.enemyHpLost} LP.`);
  if (feedback.enemyBlocked > 0) sentences.push(`${feedback.enemyBlocked} Schaden geblockt.`);
  if (feedback.playerBlockGained > 0) sentences.push(`Du erhältst ${feedback.playerBlockGained} Block.`);
  if (feedback.playerHealed > 0) sentences.push(`Du heilst ${feedback.playerHealed} LP.`);
  const outcome = outcomeSentence(feedback);
  if (outcome) sentences.push(outcome);
  return sentences.join(' ');
}
