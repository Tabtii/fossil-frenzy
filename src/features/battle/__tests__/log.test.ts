import { describe, expect, it } from '@jest/globals';

import { endTurn, playCard } from '@/engine/combat';
import { inst, makeState, TEST_DB } from '@/engine/combat/__fixtures__/content';

import { planActionFeedback } from '../feedback';
import { cardPlayAnnouncement, enemyTurnAnnouncement, enemyTurnLogLine, logLineFromEvents } from '../log';

const dummy = TEST_DB.enemies.dummy;

describe('enemyTurnLogLine', () => {
  it('describes the move and what got through the block', () => {
    const after = endTurn(TEST_DB, makeState({ player: { block: 2 } }));
    expect(enemyTurnLogLine(dummy, planActionFeedback(after.events))).toBe('🦖 Biss: 6 Schaden → −4 LP (2 geblockt)');
  });

  it('says when an attack was fully blocked', () => {
    const after = endTurn(TEST_DB, makeState({ player: { block: 9 } }));
    expect(enemyTurnLogLine(dummy, planActionFeedback(after.events))).toBe('🦖 Biss: 6 Schaden → komplett geblockt');
  });

  it('describes non-attack moves without a result', () => {
    const after = endTurn(TEST_DB, makeState({ enemy: { nextMoveId: 'guard' } }));
    expect(enemyTurnLogLine(dummy, planActionFeedback(after.events))).toBe('🦖 Panzer: 5 Block');
  });

  it('describes a confused self-hit and bleed ticks', () => {
    const after = endTurn(
      TEST_DB,
      makeState({ enemy: { statuses: { confused: 1, bleed: 2 } }, player: { statuses: { bleed: 1 } } }),
    );
    expect(enemyTurnLogLine(dummy, planActionFeedback(after.events))).toBe(
      '🩸 dummy blutet: −2 LP · 💫 Verwirrt! Biss trifft dummy selbst: −6 LP · 🩸 Blutung: −1 LP',
    );
  });

  it('is null without an enemy definition or without an enemy action', () => {
    const after = endTurn(TEST_DB, makeState());
    expect(enemyTurnLogLine(undefined, planActionFeedback(after.events))).toBeNull();
    expect(enemyTurnLogLine(dummy, planActionFeedback([]))).toBeNull();
  });

  it('restores the line only from enemy-turn events', () => {
    const card = inst('strike');
    const played = playCard(TEST_DB, makeState({ hand: [card] }), card.uid);
    expect(logLineFromEvents(dummy, played.events)).toBeNull();
    const ended = endTurn(TEST_DB, makeState());
    expect(logLineFromEvents(dummy, ended.events)).toBe('🦖 Biss: 6 Schaden → −6 LP');
  });
});

describe('announcements', () => {
  it('announces the enemy turn and the next turn number', () => {
    const after = endTurn(TEST_DB, makeState({ player: { block: 2 } }));
    expect(enemyTurnAnnouncement(dummy, planActionFeedback(after.events))).toBe(
      'dummy: Biss: 6 Schaden. Du verlierst 4 LP. 2 Schaden geblockt. Zug 2.',
    );
  });

  it('announces a defeat instead of the next turn', () => {
    const after = endTurn(TEST_DB, makeState({ player: { hp: 3 } }));
    expect(enemyTurnAnnouncement(dummy, planActionFeedback(after.events))).toBe(
      'dummy: Biss: 6 Schaden. Du verlierst 6 LP. Niederlage.',
    );
  });

  it('announces a played card with its result', () => {
    const card = inst('strike');
    const after = playCard(TEST_DB, makeState({ hand: [card] }), card.uid);
    expect(cardPlayAnnouncement('Schlag', planActionFeedback(after.events))).toBe('Schlag gespielt. Gegner verliert 6 LP.');

    const block = inst('defend');
    const blocked = playCard(TEST_DB, makeState({ hand: [block] }), block.uid);
    expect(cardPlayAnnouncement('Abwehr', planActionFeedback(blocked.events))).toBe('Abwehr gespielt. Du erhältst 5 Block.');

    const finisher = inst('boulder');
    const won = playCard(TEST_DB, makeState({ hand: [finisher] }), finisher.uid);
    expect(cardPlayAnnouncement('Felsbrocken', planActionFeedback(won.events))).toBe(
      'Felsbrocken gespielt. Gegner verliert 20 LP. Sieg!',
    );
  });
});
