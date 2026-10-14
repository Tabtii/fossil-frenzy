import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { StrictMode } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

import { availableNodes } from '@/engine/run';
import type { CombatState } from '@/engine/types';
import { initialMeta } from '@/state/meta';
import { selectCombat } from '@/state/selectors';
import { useGameStore, waitForHydration } from '@/state/store';

import { BattleScreen } from '../BattleScreen';
import { battleTimings } from '../timing';

// Integration test: the real store, engine and content with the battle screen.

const METRICS = {
  frame: { x: 0, y: 0, width: 360, height: 780 },
  insets: { top: 24, left: 0, right: 0, bottom: 16 },
};
const TIMINGS = battleTimings(false);

function combat(): CombatState {
  const current = selectCombat(useGameStore.getState());
  if (!current) throw new Error('expected an active combat');
  return current;
}

function startCombat(seed = 7): void {
  useGameStore.getState().newRun(seed);
  const run = useGameStore.getState().run;
  const node = run ? availableNodes(run)[0] : undefined;
  if (!node) throw new Error('no reachable node');
  useGameStore.getState().enterNode(node.id);
}

function patchCombat(patch: (current: CombatState) => CombatState): void {
  const run = useGameStore.getState().run;
  if (!run || run.screen.type !== 'combat') throw new Error('expected a combat screen');
  useGameStore.setState({ run: { ...run, screen: { ...run.screen, combat: patch(run.screen.combat) } } });
}

const mounted: ReactTestRenderer[] = [];

function render({ strict = false } = {}): ReactTestRenderer {
  const screen = (
    <SafeAreaProvider initialMetrics={METRICS}>
      <BattleScreen />
    </SafeAreaProvider>
  );
  let renderer: ReactTestRenderer | undefined;
  act(() => {
    renderer = create(strict ? <StrictMode>{screen}</StrictMode> : screen);
  });
  if (!renderer) throw new Error('render failed');
  mounted.push(renderer);
  return renderer;
}

/** Host elements only (composite wrappers repeat the same props). */
function hostAll(root: ReactTestInstance, predicate: (node: ReactTestInstance) => boolean): ReactTestInstance[] {
  return root.findAll((node) => typeof node.type === 'string' && predicate(node));
}

function byTestId(root: ReactTestInstance, testID: string): ReactTestInstance | undefined {
  return hostAll(root, (node) => node.props.testID === testID)[0];
}

function pressable(root: ReactTestInstance, testID: string): ReactTestInstance {
  const node = root.findAll((n) => n.props.testID === testID && typeof n.props.onPress === 'function')[0];
  if (!node) throw new Error(`no pressable ${testID}`);
  return node;
}

function handCards(root: ReactTestInstance): ReactTestInstance[] {
  return hostAll(
    root,
    (node) => typeof node.props.testID === 'string' && node.props.testID.startsWith('hand-card-') && !!node.props.onAccessibilityAction,
  );
}

function accessibilityAction(node: ReactTestInstance, actionName: string): void {
  act(() => {
    node.props.onAccessibilityAction({ nativeEvent: { actionName } });
  });
}

function allText(root: ReactTestInstance): string {
  return root
    .findAll((node) => (node.type as unknown) === 'Text')
    .map((node) => {
      const children: unknown = node.props.children;
      return Array.isArray(children) ? children.join('') : String(children);
    })
    .join(' | ');
}

function modalVisible(root: ReactTestInstance, testID: string): boolean {
  const modal = root.findAll((node) => node.props.testID === testID && 'visible' in node.props)[0];
  return modal?.props.visible === true;
}

beforeEach(async () => {
  await waitForHydration();
  useGameStore.setState({ run: null, meta: initialMeta(), hydrated: true });
  jest.useFakeTimers();
});

afterEach(() => {
  act(() => {
    for (const renderer of mounted.splice(0)) renderer.unmount();
  });
  jest.clearAllTimers();
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('BattleScreen', () => {
  it('renders the arena, the hand and the piles with accessible labels', () => {
    startCombat();
    const { root } = render();
    const cards = handCards(root);
    expect(cards).toHaveLength(combat().hand.length);
    for (const card of cards) {
      expect(card.props.accessibilityRole).toBe('button');
      expect(card.props.accessibilityLabel).toContain('Kosten');
      expect(card.props.accessibilityHint).toBe('Doppeltippen zum Auswählen');
      expect(card.props.accessibilityActions.map((a: { name: string }) => a.name)).toEqual(['activate', 'play', 'longpress']);
    }
    expect(pressable(root, 'enemy-target').props.accessibilityHint).toBe('Doppeltippen für Infos zum Gegner');
    const draw = pressable(root, 'pile-draw');
    expect(draw.props.accessibilityLabel).toBe(`Nachziehstapel: ${combat().drawPile.length} Karten`);
    expect(byTestId(root, 'end-turn')).toBeDefined();
    expect(allText(root)).toContain('Zug 1');
  });

  it('selects a card with the first activation and plays it with the second', () => {
    startCombat();
    const { root } = render();
    const before = combat();
    const first = handCards(root)[0];
    if (!first) throw new Error('empty hand');
    const uid = String(first.props.testID).replace('hand-card-', '');

    accessibilityAction(first, 'activate');
    const selected = handCards(root).find((card) => card.props.testID === `hand-card-${uid}`);
    expect(selected?.props.accessibilityState).toMatchObject({ selected: true });
    expect(selected?.props.accessibilityHint).toBe('Doppeltippen zum Ausspielen');
    expect(pressable(root, 'play-selected')).toBeDefined();
    expect(combat()).toBe(before);

    accessibilityAction(selected as ReactTestInstance, 'activate');
    expect(combat().hand.some((card) => card.uid === uid)).toBe(false);
    expect(combat().energy).toBeLessThan(before.energy);
    expect(handCards(root)).toHaveLength(before.hand.length - 1);
  });

  it('plays the selected card by tapping the enemy', () => {
    startCombat();
    const { root } = render();
    const handSize = combat().hand.length;
    const first = handCards(root)[0];
    if (!first) throw new Error('empty hand');
    accessibilityAction(first, 'activate');
    expect(pressable(root, 'enemy-target').props.accessibilityHint).toMatch(/^Doppeltippen, um .+ auf den Gegner zu spielen$/);
    act(() => {
      pressable(root, 'enemy-target').props.onPress();
    });
    expect(combat().hand).toHaveLength(handSize - 1);
  });

  it('rejects unaffordable cards with a hint and keeps the state', () => {
    startCombat();
    act(() => patchCombat((current) => ({ ...current, energy: 0 })));
    const { root } = render();
    const before = combat();
    const first = handCards(root)[0];
    if (!first) throw new Error('empty hand');
    expect(first.props.accessibilityLabel).toContain('Nicht genug Energie');
    accessibilityAction(first, 'play');
    expect(combat()).toBe(before);
    expect(allText(root)).toContain('Nicht genug Energie');
  });

  it('paces the enemy turn and blocks input meanwhile', () => {
    startCombat();
    const { root } = render();
    act(() => {
      pressable(root, 'end-turn').props.onPress();
    });
    expect(allText(root)).toContain('Gegnerzug…');
    expect(pressable(root, 'end-turn').props.disabled).toBe(true);
    expect(combat().turn).toBe(1);

    act(() => {
      jest.advanceTimersByTime(TIMINGS.discard);
    });
    expect(combat().turn).toBe(2);
    expect(handCards(root)).toHaveLength(0);

    act(() => {
      jest.advanceTimersByTime(TIMINGS.enemyAct);
    });
    expect(handCards(root)).toHaveLength(combat().hand.length);
    expect(allText(root)).toContain('Zug 2');
    expect(pressable(root, 'end-turn').props.disabled).toBe(false);
    expect(allText(root)).toMatch(/: \d+ Schaden|Block|Stärke|Verwundbar|Geschwächt|Blutung|Verwirrt|heilt/);
  });

  it('opens the card details with a long press and the pile list', () => {
    startCombat();
    const { root } = render();
    const first = handCards(root)[0];
    if (!first) throw new Error('empty hand');
    accessibilityAction(first, 'longpress');
    expect(modalVisible(root, 'card-detail')).toBe(true);

    act(() => {
      pressable(root, 'pile-draw').props.onPress();
    });
    expect(modalVisible(root, 'pile-sheet')).toBe(true);
    expect(allText(root)).toContain('Sortiert angezeigt');
  });

  it('opens the enemy info without a selected card', () => {
    startCombat();
    const { root } = render();
    act(() => {
      pressable(root, 'enemy-target').props.onPress();
    });
    expect(modalVisible(root, 'enemy-sheet')).toBe(true);
    expect(allText(root)).toContain('Wusstest du?');
  });

  it('resolves a restored, already won combat exactly once (StrictMode)', () => {
    startCombat();
    act(() =>
      patchCombat((current) => ({
        ...current,
        phase: 'won',
        enemy: { ...current.enemy, hp: 0 },
        events: [{ type: 'victory' }],
      })),
    );
    const original = useGameStore.getState().resolveCombat;
    const spy = jest.fn(() => original());
    useGameStore.setState({ resolveCombat: spy });
    // Gesture Handler's detector still uses findNodeHandle (dev-only StrictMode warning).
    const consoleError = console.error;
    jest.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
      const message = args.map(String).join(' ');
      if (message.includes('findNodeHandle') && message.includes('deprecated in StrictMode')) return;
      consoleError(...args);
    });

    const { root } = render({ strict: true });
    expect(byTestId(root, 'combat-outcome')).toBeDefined();
    act(() => {
      jest.advanceTimersByTime(TIMINGS.resolveVictory - 1);
    });
    expect(spy).not.toHaveBeenCalled();
    act(() => {
      jest.advanceTimersByTime(5000);
    });
    expect(spy).toHaveBeenCalledTimes(1);
    expect(useGameStore.getState().run?.screen.type).toBe('reward');
    // The final state stays visible during the route transition.
    expect(byTestId(root, 'combat-outcome')).toBeDefined();
    expect(handCards(root).every((card) => card.props.accessibilityState.disabled === true)).toBe(true);
  });

  it('resolves a defeat after the defeat effect', () => {
    startCombat();
    act(() => patchCombat((current) => ({ ...current, phase: 'lost', player: { ...current.player, hp: 0 } })));
    render();
    act(() => {
      jest.advanceTimersByTime(TIMINGS.resolveDefeat + 10);
    });
    expect(useGameStore.getState().run?.screen.type).toBe('defeat');
  });
});
