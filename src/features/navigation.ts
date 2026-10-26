import type { Href } from 'expo-router';
import type { RunScreen } from '@/engine/types';

// Route map for the run flow. The run layout keeps the visible route in sync
// with `run.screen`; screens only call store actions and never navigate
// between run steps themselves.

export const ROUTES = {
  home: '/',
  settings: '/settings',
  fossils: '/fossils',
  collection: '/collection',
  map: '/run/map',
  battle: '/run/battle',
  reward: '/run/reward',
  rest: '/run/rest',
  dig: '/run/dig',
  actComplete: '/run/act-complete',
  summary: '/run/summary',
} as const;

export function fossilRoute(id: string, wiki = false): Href {
  return { pathname: '/fossils/[id]', params: wiki ? { id, wiki: '1' } : { id } };
}

export function routeForScreen(screen: RunScreen): (typeof ROUTES)[keyof typeof ROUTES] {
  switch (screen.type) {
    case 'map':
      return ROUTES.map;
    case 'combat':
      return ROUTES.battle;
    case 'reward':
      return ROUTES.reward;
    case 'rest':
      return ROUTES.rest;
    case 'dig':
      return ROUTES.dig;
    case 'actComplete':
      return ROUTES.actComplete;
    case 'victory':
    case 'defeat':
      return ROUTES.summary;
  }
}
