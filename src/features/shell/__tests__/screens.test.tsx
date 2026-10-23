import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { ReactElement } from 'react';
import { Alert, type AlertButton } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

import ActCompleteScreen from '@/app/run/act-complete';
import SummaryScreen from '@/app/run/summary';
import HomeScreen from '@/app/index';
import SettingsScreen from '@/app/settings';
import { CONTENT } from '@/data';
import { createRun } from '@/engine/run';
import { dailyExpedition } from '../expedition';
import type { RunState } from '@/engine/types';
import { initialMeta } from '@/state/meta';
import { useGameStore, waitForHydration } from '@/state/store';

import { RunShell } from '../RunShell';

// Smoke tests for the shell screens with a mocked expo-router.

jest.mock('expo-router', () => {
  const pathname = { current: '/' };
  return {
    router: {
      push: jest.fn(),
      replace: jest.fn(),
      back: jest.fn(),
      dismissTo: jest.fn(),
      canGoBack: jest.fn(() => true),
    },
    useIsFocused: () => true,
    usePathname: () => pathname.current,
    useFocusEffect: () => undefined,
    mockPathname: pathname,
  };
});

type RouterMock = Record<'push' | 'replace' | 'back' | 'dismissTo' | 'canGoBack', jest.Mock>;
const { router: mockRouter, mockPathname } = jest.requireMock<{
  router: RouterMock;
  mockPathname: { current: string };
}>('expo-router');

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

beforeEach(() => {
  for (const fn of Object.values(mockRouter)) fn.mockClear();
  mockPathname.current = '/';
  useGameStore.setState({ hydrated: true, run: null, meta: initialMeta() });
});

const mounted: ReactTestRenderer[] = [];

afterEach(() => {
  // Unmount so earlier screens stop reacting to store changes of later tests.
  act(() => {
    for (const renderer of mounted.splice(0)) renderer.unmount();
  });
  jest.restoreAllMocks();
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

function textOf(root: ReactTestInstance): string {
  return root
    .findAll((node) => (node.type as unknown) === 'Text')
    .map((node) => {
      const { children } = node.props as { children?: unknown };
      return Array.isArray(children) ? children.filter((c) => typeof c === 'string').join('') : String(children);
    })
    .join(' | ');
}

function press(root: ReactTestInstance, testID: string): void {
  const node = root.find((n) => n.props.testID === testID && typeof n.props.onPress === 'function');
  act(() => {
    (node.props.onPress as () => void)();
  });
}

function runAt(screen: RunState['screen'], patch: Partial<RunState> = {}): RunState {
  return { ...createRun(CONTENT, 1234), ...patch, screen };
}

/** Captures Alert.alert calls; returns the buttons of each call. */
function spyAlerts(): AlertButton[][] {
  const calls: AlertButton[][] = [];
  jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => {
    calls.push(buttons ?? []);
  });
  return calls;
}

function confirmButton(buttons: AlertButton[] | undefined): AlertButton {
  const button = buttons?.find((b) => b.style === 'destructive');
  if (!button?.onPress) throw new Error('no confirm button');
  return button;
}

describe('home screen', () => {
  it('starts the displayed daily code even when UTC midnight passes before the tap', () => {
    jest.useFakeTimers();
    try {
      jest.setSystemTime(new Date('2026-10-23T23:59:59Z'));
      const expected = dailyExpedition(new Date()).seed;
      const r = render(<HomeScreen />);
      press(r.root, 'home-daily');
      // Moving the clock does not run the modal's refresh interval.
      jest.setSystemTime(new Date('2026-10-24T00:00:01Z'));
      press(r.root, 'expedition-code-start');
      expect(useGameStore.getState().run?.seed).toBe(expected);
    } finally {
      jest.clearAllTimers();
      jest.useRealTimers();
    }
  });

  it('starts a daily expedition from the existing rules and opens the field guide', () => {
    const r = render(<HomeScreen />);
    press(r.root, 'home-guide');
    expect(textOf(r.root)).toContain('Drei Energie. Fünf Karten.');
    press(r.root, 'home-daily');
    expect(textOf(r.root)).toContain('Gleiche Welt. Dein eigener Weg.');
    press(r.root, 'expedition-code-start');
    expect(useGameStore.getState().run?.seed).toBe(dailyExpedition(new Date()).seed);
  });

  it('validates an expedition code and protects the current run before replacing it', () => {
    const previous = createRun(CONTENT, 17);
    useGameStore.setState({ run: previous });
    const alerts = spyAlerts();
    const r = render(<HomeScreen />);
    press(r.root, 'home-code');
    press(r.root, 'expedition-code-start');
    expect(textOf(r.root)).toContain('Bitte gib einen vollständigen Code');
    expect(useGameStore.getState().run).toBe(previous);
    const input = r.root.find((n) => n.props.testID === 'expedition-code-input' && n.props.onChangeText);
    act(() => (input.props.onChangeText as (value: string) => void)('FF-0000002A'));
    press(r.root, 'expedition-code-start');
    expect(alerts).toHaveLength(1);
    expect(useGameStore.getState().run).toBe(previous);
    act(() => confirmButton(alerts[0]).onPress?.());
    expect(useGameStore.getState().run?.seed).toBe(42);
  });

  it('starts a first expedition without a dialog', () => {
    const r = render(<HomeScreen />);
    const shown = textOf(r.root);
    expect(shown).toContain('Fossil');
    expect(shown).toContain('Frenzy');
    expect(shown).toContain('Deine erste Expedition wartet!');
    expect(shown).not.toContain('Weiterspielen');
    expect(shown).toContain(`0/${Object.keys(CONTENT.fossils).length} entdeckt`);

    press(r.root, 'home-new-run');
    expect(useGameStore.getState().run?.screen.type).toBe('map');
    expect(useGameStore.getState().meta.runsStarted).toBe(1);
    expect(mockRouter.push).toHaveBeenCalledWith('/run/map');
  });

  it('continues an active run', () => {
    useGameStore.setState({ run: runAt({ type: 'map' }, { act: 1, hp: 45, maxHp: 64 }) });
    const r = render(<HomeScreen />);
    expect(textOf(r.root)).toContain('Akt 2 · Jura · ❤️ 45/64 LP');

    press(r.root, 'home-continue');
    expect(mockRouter.push).toHaveBeenLastCalledWith('/run/map');
  });

  it('asks before replacing an active run', () => {
    const run = runAt({ type: 'map' }, { act: 1, hp: 45, maxHp: 64 });
    useGameStore.setState({ run });
    const alerts = spyAlerts();
    const r = render(<HomeScreen />);
    press(r.root, 'home-new-run');
    expect(alerts).toHaveLength(1);
    expect(useGameStore.getState().run).toBe(run);
    act(() => confirmButton(alerts[0]).onPress?.());
    expect(useGameStore.getState().run).not.toBe(run);
    expect(useGameStore.getState().run?.act).toBe(0);
  });

  it('closes a finished run before starting a new one', () => {
    useGameStore.setState({ run: runAt({ type: 'victory' }, { act: 3 }) });
    const alerts = spyAlerts();
    const r = render(<HomeScreen />);
    expect(textOf(r.root)).toContain('Ergebnis ansehen');
    press(r.root, 'home-new-run');
    expect(alerts).toHaveLength(0);
    expect(useGameStore.getState().meta.runsWon).toBe(1);
    expect(useGameStore.getState().run?.screen.type).toBe('map');
  });
});

describe('settings screen', () => {
  it('toggles settings and resets progress only after two confirmations', () => {
    useGameStore.setState({ run: runAt({ type: 'map' }) });
    const alerts = spyAlerts();
    const r = render(<SettingsScreen />);
    const shown = textOf(r.root);
    expect(shown).toContain('Haptik');
    expect(shown).toContain('Reduzierte Bewegung');
    expect(shown).toContain('Fossil Frenzy');

    const toggle = r.root.find((n) => n.props.testID === 'settings-reduced-motion' && n.props.onValueChange);
    act(() => (toggle.props.onValueChange as (value: boolean) => void)(true));
    expect(useGameStore.getState().meta.settings.reducedMotion).toBe(true);

    press(r.root, 'settings-reset');
    expect(alerts).toHaveLength(1);
    act(() => confirmButton(alerts[0]).onPress?.());
    expect(alerts).toHaveLength(2);
    expect(useGameStore.getState().run).not.toBeNull();
    act(() => confirmButton(alerts[1]).onPress?.());
    expect(useGameStore.getState().run).toBeNull();
    // Settings survive a reset.
    expect(useGameStore.getState().meta.settings.reducedMotion).toBe(true);
  });

  it('abandons an active run after a confirmation', () => {
    useGameStore.setState({ run: runAt({ type: 'map' }) });
    const alerts = spyAlerts();
    const r = render(<SettingsScreen />);
    press(r.root, 'settings-abandon');
    act(() => confirmButton(alerts[0]).onPress?.());
    expect(useGameStore.getState().run).toBeNull();
  });
});

describe('run shell', () => {
  it('replaces a stale run route once', () => {
    useGameStore.setState({ run: runAt({ type: 'map' }) });
    mockPathname.current = '/run/battle';
    const r = render(<RunShell>{null}</RunShell>);
    expect(mockRouter.replace).toHaveBeenCalledTimes(1);
    expect(mockRouter.replace).toHaveBeenCalledWith('/run/map');
    act(() => r.update(<SafeAreaProvider initialMetrics={METRICS}><RunShell>{null}</RunShell></SafeAreaProvider>));
    expect(mockRouter.replace).toHaveBeenCalledTimes(1);
  });

  it('goes home when the run disappears', () => {
    useGameStore.setState({ run: runAt({ type: 'map' }) });
    mockPathname.current = '/run/map';
    render(<RunShell>{null}</RunShell>);
    expect(mockRouter.dismissTo).not.toHaveBeenCalled();
    act(() => useGameStore.getState().abandonRun());
    expect(mockRouter.dismissTo).toHaveBeenCalledTimes(1);
    expect(mockRouter.dismissTo).toHaveBeenCalledWith('/');
  });
});

describe('summary screen', () => {
  it('replays the same seed from the beginning and counts the finished victory once', () => {
    const previous = runAt({ type: 'victory' }, { act: 3, seed: 42 });
    useGameStore.setState({ run: previous });
    mockPathname.current = '/run/summary';
    const r = render(<RunShell><SummaryScreen /></RunShell>);
    press(r.root, 'summary-replay');
    const next = useGameStore.getState().run;
    expect(next?.seed).toBe(42);
    expect(next?.act).toBe(0);
    expect(next?.map).toEqual(createRun(CONTENT, 42).map);
    expect(useGameStore.getState().meta.runsWon).toBe(1);
    expect(mockRouter.replace).toHaveBeenCalledWith('/run/map');
  });

  it('shows the result and leaves exactly once', () => {
    const run = runAt(
      { type: 'victory' },
      { act: 3, stats: { enemiesDefeated: 20, elitesDefeated: 3, bossesDefeated: 4, cardsPlayed: 250, damageDealt: 4321, floorsCleared: 24 } },
    );
    useGameStore.setState({ run });
    mockPathname.current = '/run/summary';
    const r = render(
      <RunShell>
        <SummaryScreen />
      </RunShell>,
    );
    const shown = textOf(r.root);
    expect(shown).toContain('Sieg!');
    expect(shown).toContain('Gegner besiegt');
    expect(shown).toContain('4.321');
    expect(shown).toContain('Dein Deck (10 Karten)');

    press(r.root, 'summary-home');
    expect(useGameStore.getState().run).toBeNull();
    expect(useGameStore.getState().meta.runsWon).toBe(1);
    expect(mockRouter.dismissTo).toHaveBeenCalledTimes(1);
    expect(mockRouter.replace).not.toHaveBeenCalled();
    // Still shows the finished run while the screen animates out.
    expect(textOf(r.root)).toContain('Sieg!');
  });

  it('starts a new expedition straight to the map', () => {
    useGameStore.setState({ run: runAt({ type: 'defeat', nodeId: 'missing' }, { hp: 0 }) });
    mockPathname.current = '/run/summary';
    const r = render(
      <RunShell>
        <SummaryScreen />
      </RunShell>,
    );
    expect(textOf(r.root)).toContain('Expedition gescheitert');
    press(r.root, 'summary-new-run');
    expect(useGameStore.getState().run?.screen.type).toBe('map');
    expect(mockRouter.dismissTo).not.toHaveBeenCalled();
    expect(mockRouter.replace).toHaveBeenCalledWith('/run/map');
  });
});

describe('act complete screen', () => {
  it('shows the era change and starts the next act', () => {
    useGameStore.setState({ run: runAt({ type: 'actComplete', act: 0 }, { hp: 30, maxHp: 64 }) });
    const r = render(<ActCompleteScreen />);
    const shown = textOf(r.root);
    expect(shown).toContain('Akt 1 geschafft!');
    expect(shown).toContain('Weiter in den Jura');
    expect(shown).toContain('+17 LP');

    press(r.root, 'act-complete-continue');
    const next = useGameStore.getState().run;
    expect(next?.act).toBe(1);
    expect(next?.hp).toBe(47);
    // Keeps showing the finished act during the transition.
    expect(textOf(r.root)).toContain('Akt 1 geschafft!');
  });
});
