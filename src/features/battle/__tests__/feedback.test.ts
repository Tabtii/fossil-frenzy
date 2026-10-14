import { describe, expect, it } from '@jest/globals';

import { endTurn, playCard } from '@/engine/combat';
import { inst, makeState, TEST_DB } from '@/engine/combat/__fixtures__/content';
import type { CombatEvent } from '@/engine/types';

import { planActionFeedback } from '../feedback';

describe('planActionFeedback', () => {
  it('is empty for no events', () => {
    const plan = planActionFeedback([]);
    expect(plan.enemyNumbers).toEqual([]);
    expect(plan.playerNumbers).toEqual([]);
    expect(plan.enemyHit || plan.playerHit || plan.enemyAttacked || plan.selfHit).toBe(false);
    expect(plan.outcome).toBeNull();
    expect(plan.turnStart).toBeNull();
  });

  it('plans a played attack card', () => {
    const card = inst('twin');
    const before = makeState({ hand: [card], enemy: { block: 2 } });
    const after = playCard(TEST_DB, before, card.uid);
    const plan = planActionFeedback(after.events);
    expect(plan.cardPlayed).toEqual({ uid: card.uid, defId: 'twin' });
    expect(plan.enemyHit).toBe(true);
    expect(plan.targetsEnemy).toBe(true);
    expect(plan.enemyBlocked).toBe(2);
    expect(plan.enemyHpLost).toBe(4);
    expect(plan.enemyNumbers).toEqual([
      { kind: 'damage', value: 1 },
      { kind: 'damage', value: 3 },
    ]);
    expect(plan.playerHit).toBe(false);
    expect(plan.outcome).toBeNull();
  });

  it('plans a block card on the player without targeting the enemy', () => {
    const card = inst('defend');
    const after = playCard(TEST_DB, makeState({ hand: [card] }), card.uid);
    const plan = planActionFeedback(after.events);
    expect(plan.targetsEnemy).toBe(false);
    expect(plan.enemyHit).toBe(false);
    expect(plan.playerBlockGained).toBe(5);
    expect(plan.playerNumbers).toEqual([{ kind: 'block', value: 5 }]);
  });

  it('marks enemy debuffs from cards as targeting the enemy', () => {
    const card = inst('weaken');
    const after = playCard(TEST_DB, makeState({ hand: [card] }), card.uid);
    expect(planActionFeedback(after.events).targetsEnemy).toBe(true);
  });

  it('plans the enemy turn: attack, partial block, next turn', () => {
    const after = endTurn(TEST_DB, makeState({ player: { block: 2 }, drawPile: [inst('strike')] }));
    const plan = planActionFeedback(after.events);
    expect(plan.enemyMoveId).toBe('bite');
    expect(plan.enemyAttacked).toBe(true);
    expect(plan.selfHit).toBe(false);
    expect(plan.playerHpLost).toBe(4);
    expect(plan.playerBlocked).toBe(2);
    expect(plan.playerHit).toBe(true);
    expect(plan.playerNumbers).toEqual([{ kind: 'damage', value: 4 }]);
    expect(plan.turnStart).toBe(2);
    expect(plan.outcome).toBeNull();
  });

  it('shows a fully blocked attack as "blocked", not as a hit', () => {
    const after = endTurn(TEST_DB, makeState({ player: { block: 10 } }));
    const plan = planActionFeedback(after.events);
    expect(plan.enemyAttacked).toBe(true);
    expect(plan.playerHit).toBe(false);
    expect(plan.playerBlocked).toBe(6);
    expect(plan.playerNumbers).toEqual([{ kind: 'damage', value: 0 }]);
  });

  it('recognises a confused self-hit', () => {
    const after = endTurn(TEST_DB, makeState({ enemy: { statuses: { confused: 1 } } }));
    const plan = planActionFeedback(after.events);
    expect(plan.selfHit).toBe(true);
    expect(plan.selfHitHpLost).toBe(6);
    expect(plan.enemyHit).toBe(true);
    expect(plan.playerHit).toBe(false);
    expect(plan.enemyAttacked).toBe(false);
    expect(plan.targetsEnemy).toBe(false);
  });

  it('separates bleed from attacks and detects the outcome', () => {
    const won = endTurn(TEST_DB, makeState({ enemy: { hp: 3, statuses: { bleed: 5 } } }));
    const wonPlan = planActionFeedback(won.events);
    expect(wonPlan.enemyBleed).toBe(5);
    expect(wonPlan.selfHitHpLost).toBe(0);
    expect(wonPlan.outcome).toBe('victory');
    expect(wonPlan.enemyMoveId).toBeNull();

    const lost = endTurn(TEST_DB, makeState({ player: { hp: 4 } }));
    expect(planActionFeedback(lost.events).outcome).toBe('defeat');

    const events: CombatEvent[] = [{ type: 'damage', target: 'player', amount: 3, blocked: 0, source: 'bleed' }];
    const bleedPlan = planActionFeedback(events);
    expect(bleedPlan.playerBleed).toBe(3);
    expect(bleedPlan.playerHpLost).toBe(0);
    expect(bleedPlan.playerHit).toBe(true);
    expect(bleedPlan.enemyAttacked).toBe(false);
  });

  it('marks execute as a hit on the enemy', () => {
    const plan = planActionFeedback([{ type: 'cardPlayed', uid: 'c1', defId: 'finisher' }, { type: 'execute' }, { type: 'victory' }]);
    expect(plan.executed).toBe(true);
    expect(plan.enemyHit).toBe(true);
    expect(plan.targetsEnemy).toBe(true);
    expect(plan.outcome).toBe('victory');
  });
});
