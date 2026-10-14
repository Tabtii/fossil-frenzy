import { describe, expect, it } from '@jest/globals';

import { CONTENT } from '@/data';
import { createRun } from '@/engine/run';
import type { RunScreen } from '@/engine/types';
import { ROUTES } from '@/features/navigation';
import type { ScreenType } from '@/state/selectors';

import {
  decideRunSync,
  hardwareBackAction,
  isRunPath,
  runSyncRequestKey,
  selectRunRoute,
} from '../runSync';

const base = { hydrated: true, exiting: false } as const;

describe('isRunPath', () => {
  it('matches the run group only', () => {
    expect(isRunPath('/run')).toBe(true);
    expect(isRunPath('/run/map')).toBe(true);
    expect(isRunPath('/run/act-complete')).toBe(true);
    expect(isRunPath('/')).toBe(false);
    expect(isRunPath('/settings')).toBe(false);
    expect(isRunPath('/runner')).toBe(false);
    expect(isRunPath('/fossils/run')).toBe(false);
  });
});

describe('selectRunRoute', () => {
  it('is null without a run', () => {
    expect(selectRunRoute({ run: null })).toBeNull();
  });

  it('maps the run screen to its route', () => {
    const run = createRun(CONTENT, 7);
    expect(selectRunRoute({ run })).toBe(ROUTES.map);
    const screens: [RunScreen, string][] = [
      [{ type: 'actComplete', act: 0 }, ROUTES.actComplete],
      [{ type: 'victory' }, ROUTES.summary],
      [{ type: 'defeat', nodeId: 'x' }, ROUTES.summary],
      [{ type: 'rest', nodeId: 'x' }, ROUTES.rest],
    ];
    for (const [screen, route] of screens) {
      expect(selectRunRoute({ run: { ...run, screen } })).toBe(route);
    }
  });
});

describe('decideRunSync', () => {
  it('waits for hydration', () => {
    expect(decideRunSync({ ...base, hydrated: false, pathname: '/run/map', target: null })).toEqual({ type: 'none' });
  });

  it('never acts while a non-run route is visible', () => {
    // E.g. settings pushed on top, or the pop animation back home.
    expect(decideRunSync({ ...base, pathname: '/', target: ROUTES.map })).toEqual({ type: 'none' });
    expect(decideRunSync({ ...base, pathname: '/settings', target: null })).toEqual({ type: 'none' });
  });

  it('goes home when the run is gone', () => {
    expect(decideRunSync({ ...base, pathname: '/run/summary', target: null })).toEqual({ type: 'home' });
  });

  it('does not navigate twice when a screen already leaves the run', () => {
    expect(decideRunSync({ ...base, exiting: true, pathname: '/run/summary', target: null })).toEqual({
      type: 'none',
    });
  });

  it('keeps a matching route and replaces a stale one', () => {
    expect(decideRunSync({ ...base, pathname: '/run/map', target: ROUTES.map })).toEqual({ type: 'none' });
    expect(decideRunSync({ ...base, pathname: '/run/map', target: ROUTES.battle })).toEqual({
      type: 'replace',
      href: ROUTES.battle,
    });
    expect(decideRunSync({ ...base, pathname: '/run', target: ROUTES.map })).toEqual({
      type: 'replace',
      href: ROUTES.map,
    });
  });
});

describe('runSyncRequestKey', () => {
  it('identifies requests by start route and destination', () => {
    expect(runSyncRequestKey('/run/map', { type: 'none' })).toBeNull();
    expect(runSyncRequestKey('/run/summary', { type: 'home' })).toBe('/run/summary->/');
    expect(runSyncRequestKey('/run/map', { type: 'replace', href: ROUTES.battle })).toBe('/run/map->/run/battle');
  });
});

describe('hardwareBackAction', () => {
  it('leaves to home from the map (or without a run)', () => {
    expect(hardwareBackAction('map')).toBe('home');
    expect(hardwareBackAction(null)).toBe('home');
  });

  it('is ignored during every other run step', () => {
    const blocked: ScreenType[] = ['combat', 'reward', 'rest', 'dig', 'actComplete', 'victory', 'defeat'];
    for (const type of blocked) expect(hardwareBackAction(type)).toBe('block');
  });
});
