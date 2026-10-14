import type { StatusId, Statuses } from '../types';

// Damage formula and status bookkeeping shared by the combat engine.

export const WEAK_MULTIPLIER = 0.75;
export const VULNERABLE_MULTIPLIER = 1.5;

export function statusOf(statuses: Statuses, id: StatusId): number {
  return statuses[id] ?? 0;
}

/**
 * Per-hit attack damage (docs/ARCHITECTURE.md "Kampfregeln"):
 * (base + strength) × 0.75 if the attacker is weak (floored)
 * × 1.5 if the target is vulnerable (floored), never below 0.
 * Block is handled separately when the damage is applied.
 */
export function computeHitDamage(base: number, attacker: Statuses, target: Statuses): number {
  let damage = base + statusOf(attacker, 'strength');
  if (statusOf(attacker, 'weak') > 0) damage = Math.floor(damage * WEAK_MULTIPLIER);
  if (statusOf(target, 'vulnerable') > 0) damage = Math.floor(damage * VULNERABLE_MULTIPLIER);
  return Math.max(0, damage);
}

/**
 * Adds stacks to a status on a (draft) statuses record. Stacks add up; a
 * status that reaches exactly 0 is removed so the UI only sees active ones.
 */
export function addStatus(statuses: Statuses, id: StatusId, amount: number): void {
  const value = statusOf(statuses, id) + amount;
  if (value === 0) delete statuses[id];
  else statuses[id] = value;
}

/** Reduces a positive status by one (removing it at 0). */
export function decrementStatus(statuses: Statuses, id: StatusId): void {
  const value = statusOf(statuses, id);
  if (value <= 0) return;
  if (value === 1) delete statuses[id];
  else statuses[id] = value - 1;
}
