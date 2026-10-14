import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

import { pickCombatHaptic, playCombatHaptics } from '@/lib/feedback';
import * as haptics from '@/lib/haptics';
import type { CombatEvent } from '@/engine/types';
import { initialMeta } from '../meta';
import { useGameStore } from '../store';

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy', Soft: 'soft', Rigid: 'rigid' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

const impact = jest.mocked(Haptics.impactAsync);
const notification = jest.mocked(Haptics.notificationAsync);
const selectionMock = jest.mocked(Haptics.selectionAsync);

function totalCalls(): number {
  return impact.mock.calls.length + notification.mock.calls.length + selectionMock.mock.calls.length;
}

const ALL = [
  haptics.tapLight,
  haptics.selection,
  haptics.cardPlayed,
  haptics.hitDealt,
  haptics.hitTaken,
  haptics.victory,
  haptics.defeat,
  haptics.error,
];

beforeEach(() => {
  jest.clearAllMocks();
  useGameStore.setState({ meta: initialMeta() });
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('haptics', () => {
  it('maps semantic events to native feedback', () => {
    haptics.tapLight();
    haptics.cardPlayed();
    haptics.hitDealt();
    haptics.hitTaken();
    expect(impact.mock.calls).toEqual([['light'], ['medium'], ['rigid'], ['heavy']]);

    haptics.victory();
    haptics.defeat();
    haptics.error();
    expect(notification.mock.calls).toEqual([['success'], ['error'], ['warning']]);

    haptics.selection();
    expect(selectionMock).toHaveBeenCalledTimes(1);
  });

  it('respects the haptics setting at call time', () => {
    useGameStore.getState().updateSettings({ haptics: false });
    for (const fn of ALL) fn();
    expect(totalCalls()).toBe(0);

    useGameStore.getState().updateSettings({ haptics: true });
    haptics.tapLight();
    expect(totalCalls()).toBe(1);
  });

  it('is a no-op on web', () => {
    jest.replaceProperty(Platform, 'OS', 'web');
    for (const fn of ALL) fn();
    expect(totalCalls()).toBe(0);
  });

  it('swallows rejected promises and synchronous native errors', async () => {
    impact.mockRejectedValueOnce(new Error('kein Motor'));
    notification.mockImplementationOnce(() => {
      throw new Error('Modul fehlt');
    });
    expect(() => haptics.hitTaken()).not.toThrow();
    expect(() => haptics.victory()).not.toThrow();
    // Let the rejected promise settle; an unhandled rejection would fail the test run.
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
});

describe('combat feedback', () => {
  const dmg = (target: 'player' | 'enemy', amount: number, blocked = 0): CombatEvent => ({
    type: 'damage',
    target,
    amount,
    blocked,
    source: target === 'player' ? 'enemy' : 'player',
  });

  it('picks the most important haptic of an action', () => {
    expect(pickCombatHaptic([])).toBeNull();
    expect(pickCombatHaptic([{ type: 'draw', count: 2 }, { type: 'turnStart', turn: 2 }])).toBeNull();
    expect(pickCombatHaptic([{ type: 'cardPlayed', uid: 'c1', defId: 'x' }])).toBe('cardPlayed');
    expect(pickCombatHaptic([{ type: 'cardPlayed', uid: 'c1', defId: 'x' }, dmg('enemy', 6)])).toBe('hitDealt');
    expect(pickCombatHaptic([dmg('enemy', 0, 6)])).toBe('hitDealt');
    expect(pickCombatHaptic([dmg('player', 0, 5)])).toBe('blocked');
    expect(pickCombatHaptic([dmg('player', 0, 5), dmg('player', 3, 0)])).toBe('hitTaken');
    expect(pickCombatHaptic([dmg('enemy', 4), dmg('player', 3)])).toBe('hitTaken');
    expect(pickCombatHaptic([dmg('enemy', 9), { type: 'victory' }])).toBe('victory');
    expect(pickCombatHaptic([dmg('player', 9), { type: 'defeat' }])).toBe('defeat');
    expect(pickCombatHaptic([{ type: 'confusedHit' }])).toBe('hitDealt');
    expect(pickCombatHaptic([{ type: 'execute' }])).toBe('hitDealt');
  });

  it('plays exactly one pulse per action', () => {
    expect(playCombatHaptics([dmg('enemy', 3), dmg('enemy', 3), dmg('enemy', 3)])).toBe('hitDealt');
    expect(impact.mock.calls).toEqual([['rigid']]);
    expect(playCombatHaptics([{ type: 'shuffle' }])).toBeNull();
    expect(totalCalls()).toBe(1);
  });

  it('still reports the chosen haptic when haptics are off', () => {
    useGameStore.getState().updateSettings({ haptics: false });
    expect(playCombatHaptics([{ type: 'victory' }])).toBe('victory');
    expect(totalCalls()).toBe(0);
  });
});
