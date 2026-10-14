import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { ReactElement } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

import { CONTENT } from '@/data';
import { initialMeta } from '@/state/meta';
import { useGameStore, waitForHydration } from '@/state/store';

import { CollectionScreen } from '../CollectionScreen';
import { FossilBookScreen } from '../FossilBookScreen';
import { FossilDetailScreen } from '../FossilDetailScreen';

// Smoke tests for the fossil book and collection with a mocked expo-router.

jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    dismissTo: jest.fn(),
    canGoBack: jest.fn(() => true),
  },
}));

type RouterMock = Record<'push' | 'replace' | 'back' | 'dismissTo' | 'canGoBack', jest.Mock>;
const { router: mockRouter } = jest.requireMock<{ router: RouterMock }>('expo-router');

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
  useGameStore.setState({ hydrated: true, run: null, meta: initialMeta() });
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

function discover(ids: string[]): void {
  const fossils = Object.fromEntries(
    ids.map((id) => [id, { discoveredAt: '2026-01-02T12:00:00.000Z', timesFound: 2 }]),
  );
  useGameStore.setState({ meta: { ...initialMeta(), fossils, cardsSeen: ids } });
}

const TOTAL_FOSSILS = Object.keys(CONTENT.fossils).length;

describe('fossil book', () => {
  it('shows an empty state before the first find', () => {
    const r = render(<FossilBookScreen />);
    const shown = textOf(r.root);
    expect(shown).toContain(`0 von ${TOTAL_FOSSILS} entdeckt`);
    expect(shown).toContain('Noch nichts entdeckt');
  });

  it('shows discovered tiles, hides undiscovered names and opens entries', () => {
    discover(['eoraptor']);
    const r = render(<FossilBookScreen />);
    const shown = textOf(r.root);
    expect(shown).toContain('Eoraptor');
    expect(shown).toContain('Unentdeckt');
    expect(shown).not.toContain(CONTENT.fossils.proganochelys?.name ?? '???');

    press(r.root, 'fossil-tile-eoraptor');
    expect(mockRouter.push).toHaveBeenCalledWith({ pathname: '/fossils/[id]', params: { id: 'eoraptor' } });
  });

  it('filters by era', () => {
    discover(['eoraptor']);
    const r = render(<FossilBookScreen />);
    press(r.root, 'fossil-book-filter-jura');
    expect(textOf(r.root)).toContain('Noch nichts entdeckt');
    expect(textOf(r.root)).toContain('im Jura');
  });
});

describe('fossil detail', () => {
  it('shows facts, find count and the related card', () => {
    discover(['eoraptor']);
    const r = render(<FossilDetailScreen id="eoraptor" />);
    const shown = textOf(r.root);
    const entry = CONTENT.fossils.eoraptor!;
    expect(shown).toContain(entry.scientificName);
    expect(shown).toContain(entry.facts[0]!);
    expect(shown).toContain('Gefunden: 2×');
    expect(shown).toContain('Januar 2026');
    expect(r.root.findAll((n) => n.props.testID === 'related-card-eoraptor').length).toBeGreaterThan(0);
  });

  it('shows a locked hint without the name', () => {
    const r = render(<FossilDetailScreen id="eoraptor" />);
    const shown = textOf(r.root);
    expect(shown).toContain('Noch nicht entdeckt');
    expect(shown).toContain('Akt 1');
    expect(shown).not.toContain(CONTENT.fossils.eoraptor!.scientificName);
  });

  it('handles unknown ids', () => {
    const r = render(<FossilDetailScreen id={['gibtsnicht', 'x']} />);
    expect(textOf(r.root)).toContain('Kein Fossil gefunden');
    press(r.root, 'fossil-detail-to-book');
    expect(mockRouter.dismissTo).toHaveBeenCalledWith('/fossils');
  });
});

describe('collection', () => {
  it('counts seen cards and opens the detail sheet', () => {
    discover(['eoraptor']);
    const r = render(<CollectionScreen />);
    const total = Object.keys(CONTENT.cards).length;
    expect(textOf(r.root)).toContain(`1/${total} Karten entdeckt`);
    expect(r.root.findAll((n) => n.props.testID === 'collection-card-eoraptor').length).toBeGreaterThan(0);

    press(r.root, 'collection-card-eoraptor');
    expect(textOf(r.root)).toContain('Verbessert ansehen');
  });

  it('toggles the upgraded view in the sheet', () => {
    discover(['eoraptor']);
    const r = render(<CollectionScreen />);
    press(r.root, 'collection-card-eoraptor');
    const toggle = r.root.find(
      (n) => n.props.accessibilityLabel === undefined && n.props.label === 'Verbessert ansehen' && n.props.onPress,
    );
    act(() => (toggle.props.onPress as () => void)());
    expect(textOf(r.root)).toContain('Original ansehen');
    expect(textOf(r.root)).toContain(`${CONTENT.cards.eoraptor!.name}+`);
  });

  it('filters by era', () => {
    const r = render(<CollectionScreen />);
    expect(textOf(r.root)).toContain('Trias · 0/');
    press(r.root, 'collection-era-filter-jura');
    const shown = textOf(r.root);
    expect(shown).toContain('Jura · 0/');
    expect(shown).not.toContain('Trias · 0/');
  });
});
