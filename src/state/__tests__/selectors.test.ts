import { afterAll, beforeAll, beforeEach, describe, expect, it } from '@jest/globals';
import { createElement } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import { CONTENT } from '@/data';
import { availableNodes, createRun } from '@/engine/run';
import { initialMeta } from '../meta';
import {
  selectAvailableNodes,
  selectCombat,
  selectCurrentNode,
  selectDiscoveredFossilCount,
  selectFossilRecord,
  selectHasActiveRun,
  selectScreen,
  selectScreenType,
  useAvailableNodes,
  useCombat,
  useGameActions,
  useMeta,
  useRun,
  useScreen,
  useSettings,
} from '../selectors';
import { useGameStore, waitForHydration } from '../store';

const SEED = 99;
const store = () => useGameStore.getState();

// Lets react-test-renderer know it runs inside act().
const actEnv = globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean };
let previousActEnv: boolean | undefined;
beforeAll(() => {
  previousActEnv = actEnv.IS_REACT_ACT_ENVIRONMENT;
  actEnv.IS_REACT_ACT_ENVIRONMENT = true;
});
afterAll(() => {
  actEnv.IS_REACT_ACT_ENVIRONMENT = previousActEnv;
});

beforeEach(async () => {
  await waitForHydration();
  useGameStore.setState({ run: null, meta: initialMeta(), hydrated: true });
});

describe('plain selectors', () => {
  it('handle the no-run state', () => {
    const state = store();
    expect(selectScreen(state)).toBeNull();
    expect(selectScreenType(state)).toBeNull();
    expect(selectCombat(state)).toBeNull();
    expect(selectAvailableNodes(state)).toEqual([]);
    expect(selectCurrentNode(state)).toBeNull();
    expect(selectHasActiveRun(state)).toBe(false);
    expect(selectDiscoveredFossilCount(state)).toBe(0);
    expect(selectFossilRecord(state, 'trex')).toBeNull();
  });

  it('read the run, screen and combat', () => {
    store().newRun(SEED);
    let state = store();
    expect(selectScreenType(state)).toBe('map');
    expect(selectHasActiveRun(state)).toBe(true);
    expect(selectAvailableNodes(state)).toEqual(availableNodes(createRun(CONTENT, SEED)));

    const first = selectAvailableNodes(state)[0];
    if (!first) throw new Error('expected a reachable node');
    store().enterNode(first.id);
    state = store();
    expect(selectCurrentNode(state)?.id).toBe(first.id);
    if (state.run?.screen.type === 'combat') {
      expect(selectCombat(state)).toBe(state.run.screen.combat);
    }
    expect(selectAvailableNodes(state)).toEqual([]);

    useGameStore.setState({ run: state.run && { ...state.run, screen: { type: 'victory' } } });
    expect(selectHasActiveRun(store())).toBe(false);
  });

  it('count discovered fossils', () => {
    store().newRun(SEED);
    expect(selectDiscoveredFossilCount(store())).toBe(Object.keys(store().meta.fossils).length);
  });
});

describe('hooks', () => {
  interface Snapshot {
    renders: number;
    values: Record<string, unknown>;
  }

  function mountProbe(): { snapshot: Snapshot; renderer: ReactTestRenderer } {
    const snapshot: Snapshot = { renders: 0, values: {} };
    function Probe() {
      snapshot.renders += 1;
      snapshot.values = {
        run: useRun(),
        screen: useScreen(),
        combat: useCombat(),
        meta: useMeta(),
        settings: useSettings(),
        actions: useGameActions(),
        nodes: useAvailableNodes(),
      };
      return null;
    }
    let renderer: ReactTestRenderer | undefined;
    act(() => {
      renderer = create(createElement(Probe));
    });
    if (!renderer) throw new Error('render failed');
    return { snapshot, renderer };
  }

  it('render without update loops and keep stable references', () => {
    const { snapshot, renderer } = mountProbe();
    expect(snapshot.renders).toBe(1);
    expect(snapshot.values.run).toBeNull();
    expect(snapshot.values.combat).toBeNull();
    expect(snapshot.values.settings).toEqual({ haptics: true, reducedMotion: false });
    const actions = snapshot.values.actions;
    const nodes = snapshot.values.nodes;

    // Unrelated state changes must not re-render.
    act(() => {
      useGameStore.setState({ hydrated: true });
    });
    expect(snapshot.renders).toBe(1);

    act(() => {
      store().newRun(SEED);
    });
    expect(snapshot.renders).toBe(2);
    expect(snapshot.values.run).toBe(store().run);
    expect(snapshot.values.actions).toBe(actions);
    expect(snapshot.values.nodes).not.toBe(nodes);
    expect((snapshot.values.nodes as unknown[]).length).toBeGreaterThan(0);

    act(() => {
      renderer.unmount();
    });
  });

  it('expose the combat while fighting', () => {
    const { snapshot, renderer } = mountProbe();
    act(() => {
      store().newRun(SEED);
    });
    const node = availableNodes(store().run ?? createRun(CONTENT, SEED))[0];
    act(() => {
      if (node) store().enterNode(node.id);
    });
    const { run } = store();
    if (run?.screen.type === 'combat') {
      expect(snapshot.values.combat).toBe(run.screen.combat);
      expect(snapshot.values.nodes).toEqual([]);
    }
    act(() => {
      renderer.unmount();
    });
  });
});
