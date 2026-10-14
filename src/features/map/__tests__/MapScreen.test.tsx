import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { ReactElement } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

import MapRoute from '@/app/run/map';
import { CONTENT } from '@/data';
import { availableNodes, createRun } from '@/engine/run';
import type { RunState } from '@/engine/types';
import { initialMeta } from '@/state/meta';
import { useGameStore, waitForHydration } from '@/state/store';

// Render smoke tests for the map screen with a mocked expo-router.

jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    dismissTo: jest.fn(),
    canGoBack: jest.fn(() => true),
  },
  useIsFocused: () => true,
  usePathname: () => '/run/map',
  useFocusEffect: () => undefined,
}));

const { router: mockRouter } = jest.requireMock<{ router: Record<'dismissTo', jest.Mock> }>('expo-router');

const METRICS = {
  frame: { x: 0, y: 0, width: 320, height: 640 },
  insets: { top: 24, left: 0, right: 0, bottom: 16 },
};

const actEnv = globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean };
let previousActEnv: boolean | undefined;
beforeAll(async () => {
  previousActEnv = actEnv.IS_REACT_ACT_ENVIRONMENT;
  actEnv.IS_REACT_ACT_ENVIRONMENT = true;
  await waitForHydration();
});
afterAll(() => {
  actEnv.IS_REACT_ACT_ENVIRONMENT = previousActEnv;
});

const mounted: ReactTestRenderer[] = [];
beforeEach(() => {
  mockRouter.dismissTo.mockClear();
  useGameStore.setState({ hydrated: true, run: createRun(CONTENT, 1234), meta: initialMeta() });
});
afterEach(() => {
  act(() => {
    for (const renderer of mounted.splice(0)) renderer.unmount();
  });
});

function render(element: ReactElement): ReactTestRenderer {
  let renderer: ReactTestRenderer | undefined;
  act(() => {
    renderer = create(<SafeAreaProvider initialMetrics={METRICS}>{element}</SafeAreaProvider>);
  });
  if (!renderer) throw new Error('render failed');
  mounted.push(renderer);
  return renderer;
}

function byTestId(root: ReactTestInstance, testID: string): ReactTestInstance {
  return root.find((n) => n.props.testID === testID && typeof n.props.onPress === 'function');
}

/** Presses and flushes microtasks (sheet close callbacks are queued by the worklets mock). */
async function press(root: ReactTestInstance, testID: string): Promise<void> {
  const node = byTestId(root, testID);
  await act(async () => {
    (node.props.onPress as () => void)();
  });
}

function run(): RunState {
  const current = useGameStore.getState().run;
  if (!current) throw new Error('no run');
  return current;
}

describe('map screen', () => {
  it('renders every node with a German label', () => {
    const r = render(<MapRoute />);
    for (const node of run().map) {
      const button = byTestId(r.root, `map-node-${node.id}`);
      expect(button.props.accessibilityRole).toBe('button');
      expect(String(button.props.accessibilityLabel)).toMatch(/Etage \d/);
    }
  });

  it('enters an available node after confirming in the sheet', async () => {
    const r = render(<MapRoute />);
    const target = availableNodes(run())[0];
    if (!target) throw new Error('no available node');
    await press(r.root, `map-node-${target.id}`);
    await press(r.root, 'map-node-enter');
    expect(run().currentNodeId).toBe(target.id);
    expect(run().screen.type).toBe('combat');
  });

  it('shows locked nodes without an enter button', async () => {
    const r = render(<MapRoute />);
    const boss = run().map.find((node) => node.type === 'boss');
    if (!boss) throw new Error('no boss');
    await press(r.root, `map-node-${boss.id}`);
    expect(r.root.findAll((n) => n.props.testID === 'map-node-enter')).toHaveLength(0);
    expect(run().screen.type).toBe('map');
  });

  it('opens the deck and goes home without ending the run', async () => {
    const r = render(<MapRoute />);
    await press(r.root, 'map-deck');
    expect(r.root.findAll((n) => n.props.testID === 'map-deck-sheet').length).toBeGreaterThan(0);
    await press(r.root, 'map-home');
    expect(mockRouter.dismissTo).toHaveBeenCalledWith('/');
    expect(useGameStore.getState().run).not.toBeNull();
  });
});
