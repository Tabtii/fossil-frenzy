import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { ReactElement } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

import DigRoute from '@/app/run/dig';
import RestRoute from '@/app/run/rest';
import RewardRoute from '@/app/run/reward';
import { CONTENT } from '@/data';
import { createRun } from '@/engine/run';
import type { CardDef, EnemyDef, RunState } from '@/engine/types';
import { initialMeta } from '@/state/meta';
import { useGameStore, waitForHydration } from '@/state/store';
import { BottomSheet } from '@/ui';

// Render smoke tests for the reward, dig and rest screens.

jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    dismissTo: jest.fn(),
    canGoBack: jest.fn(() => true),
  },
  useIsFocused: () => true,
  usePathname: () => '/run/reward',
  useFocusEffect: () => undefined,
}));

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

function textOf(root: ReactTestInstance): string {
  return root
    .findAll((node) => (node.type as unknown) === 'Text')
    .map((node) => {
      const { children } = node.props as { children?: unknown };
      return Array.isArray(children) ? children.filter((c) => typeof c !== 'object').join('') : String(children);
    })
    .join(' | ');
}

function byTestId(root: ReactTestInstance, testID: string): ReactTestInstance {
  return root.find((n) => n.props.testID === testID && typeof n.props.onPress === 'function');
}

async function press(root: ReactTestInstance, testID: string): Promise<void> {
  const node = byTestId(root, testID);
  await act(async () => {
    (node.props.onPress as () => void)();
  });
}

function currentRun(): RunState {
  const run = useGameStore.getState().run;
  if (!run) throw new Error('no run');
  return run;
}

const base = createRun(CONTENT, 1234);
const firstNode = base.map[0];
if (!firstNode) throw new Error('empty map');
const choices = Object.values(CONTENT.cards)
  .filter((card: CardDef) => card.rarity !== 'starter')
  .slice(0, 3)
  .map((card) => card.id);
const enemy = Object.values(CONTENT.enemies).find((def: EnemyDef) => def.tier === 'elite');
if (!enemy) throw new Error('no elite');

function setRun(screen: RunState['screen'], patch: Partial<RunState> = {}): void {
  useGameStore.setState({ hydrated: true, run: { ...base, ...patch, screen }, meta: initialMeta() });
}

beforeEach(() => {
  useGameStore.setState({ hydrated: true, run: null, meta: initialMeta() });
});

describe('reward screen', () => {
  const map = base.map.map((node) =>
    node.id === firstNode.id ? { ...node, type: 'elite' as const, enemyId: enemy.id } : node,
  );
  const rewardScreen: RunState['screen'] = {
    type: 'reward',
    nodeId: firstNode.id,
    reward: { choices, fossilsFound: [enemy.fossilId], maxHpGain: 4 },
  };

  it('shows the win, a new fossil, the max-HP bonus and takes the selected card', async () => {
    setRun(rewardScreen, { map, currentNodeId: firstNode.id, maxHp: 64 });
    useGameStore.setState({
      meta: {
        ...initialMeta(),
        fossils: { [enemy.fossilId]: { discoveredAt: '2026-01-01T00:00:00.000Z', timesFound: 1 } },
      },
    });
    const r = render(<RewardRoute />);
    const shown = textOf(r.root);
    expect(shown).toContain('Sieg!');
    expect(shown).toContain('Neu im Fossilienbuch!');
    expect(shown).toContain('+4 Max-LP');
    expect(r.root.findAll((n) => n.props.testID === 'reward-max-hp').length).toBeGreaterThan(0);

    const take = byTestId(r.root, 'choice-take');
    expect(take.props.disabled).toBe(true);
    const pick = choices[1] ?? '';
    await press(r.root, `choice-card-${pick}`);
    await press(r.root, 'choice-take');
    expect(currentRun().screen.type).toBe('map');
    expect(currentRun().deck.at(-1)?.defId).toBe(pick);
  });

  it('skips the reward', async () => {
    setRun(rewardScreen, { map, currentNodeId: firstNode.id });
    const r = render(<RewardRoute />);
    await press(r.root, 'choice-skip');
    expect(currentRun().screen.type).toBe('map');
    expect(currentRun().deck).toHaveLength(base.deck.length);
  });

  it('opens the selected card with the visible details button and takes it from the sheet', async () => {
    setRun(rewardScreen, { map, currentNodeId: firstNode.id });
    const r = render(<RewardRoute />);
    expect(byTestId(r.root, 'choice-details').props.disabled).toBe(true);
    const pick = choices[0]!;
    await press(r.root, `choice-card-${pick}`);
    await press(r.root, 'choice-details');
    const detail = r.root.find((node) => node.props.testID === 'choice-detail' && node.props.primaryAction);
    expect(detail.props.def.id).toBe(pick);
    expect(detail.props.visible).toBe(true);
    await act(async () => { detail.props.primaryAction.onPress(); });
    expect(currentRun().screen.type).toBe('map');
    expect(currentRun().deck).toHaveLength(base.deck.length + 1);
    expect(currentRun().deck.at(-1)?.defId).toBe(pick);
  });

  it('keeps the selected reward and run intact while inspecting the current deck', async () => {
    setRun(rewardScreen, { map, currentNodeId: firstNode.id });
    const before = currentRun();
    const r = render(<RewardRoute />);
    const pick = choices[1]!;
    await press(r.root, `choice-card-${pick}`);
    await press(r.root, 'choice-deck');
    const sheet = r.root.findAllByType(BottomSheet).find((node) => node.props.testID === 'choice-deck-sheet');
    expect(sheet?.props.visible).toBe(true);
    expect(textOf(r.root)).toContain(`Dein Deck (${base.deck.length} Karten)`);
    expect(currentRun()).toBe(before);
    await act(async () => { sheet?.props.onClose(); });
    expect(sheet?.props.visible).toBe(false);
    expect(byTestId(r.root, 'choice-take').props.accessibilityLabel).toBe(`${CONTENT.cards[pick]!.name} nehmen`);
    await press(r.root, 'choice-take');
    expect(currentRun().deck).toHaveLength(base.deck.length + 1);
    expect(currentRun().deck.at(-1)?.defId).toBe(pick);
  });
});

describe('dig screen', () => {
  it('takes a card for free', async () => {
    setRun({ type: 'dig', nodeId: firstNode.id, choices });
    const r = render(<DigRoute />);
    expect(textOf(r.root)).toContain('Ausgrabung');
    await press(r.root, 'choice-deck');
    const sheet = r.root.findAllByType(BottomSheet).find((node) => node.props.testID === 'choice-deck-sheet');
    expect(sheet?.props.visible).toBe(true);
    await act(async () => { sheet?.props.onClose(); });
    expect(byTestId(r.root, 'choice-take').props.disabled).toBe(true);
    const pick = choices[0] ?? '';
    await press(r.root, `choice-card-${pick}`);
    await press(r.root, 'choice-take');
    expect(currentRun().screen.type).toBe('map');
    expect(currentRun().deck.at(-1)?.defId).toBe(pick);
  });
});

describe('rest screen', () => {
  it('heals 30 % of max HP', async () => {
    setRun({ type: 'rest', nodeId: firstNode.id }, { hp: 20, maxHp: 60 });
    const r = render(<RestRoute />);
    expect(textOf(r.root)).toContain('+18 LP');
    await press(r.root, 'rest-heal');
    expect(currentRun().hp).toBe(38);
    expect(currentRun().screen.type).toBe('map');
  });

  it('upgrades a card after the comparison', async () => {
    setRun({ type: 'rest', nodeId: firstNode.id });
    const r = render(<RestRoute />);
    await press(r.root, 'rest-upgrade');
    const defId = base.deck[0]?.defId ?? '';
    await press(r.root, `upgrade-pick-${defId}`);
    expect(textOf(r.root)).toContain('Vorher');
    expect(textOf(r.root)).toContain('Nachher');
    await press(r.root, 'upgrade-confirm');
    const upgraded = currentRun().deck.filter((card) => card.upgraded);
    expect(upgraded).toHaveLength(1);
    expect(upgraded[0]?.defId).toBe(defId);
    expect(currentRun().screen.type).toBe('map');
  });

  it('disables upgrading when every card is upgraded', () => {
    setRun({ type: 'rest', nodeId: firstNode.id }, { deck: base.deck.map((card) => ({ ...card, upgraded: true })) });
    const r = render(<RestRoute />);
    expect(byTestId(r.root, 'rest-upgrade').props.disabled).toBe(true);
    expect(textOf(r.root)).toContain('schon verbessert');
  });
});
