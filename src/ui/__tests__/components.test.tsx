import { describe, expect, it, jest } from '@jest/globals';
import type { ReactElement } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

import type { CardDef, FossilEntry } from '@/engine/types';

import {
  BottomSheet,
  Button,
  CardDetailSheet,
  EmptyState,
  EnergyOrb,
  EraBadge,
  FloatingNumbers,
  GameCard,
  Header,
  IconButton,
  IntentBadge,
  ListRow,
  Pill,
  ProgressDots,
  Screen,
  StatBar,
  StatusChips,
  ToggleRow,
} from '..';

// Reanimated/worklets/gesture-handler have no native modules under Jest; use
// the libraries' own mocks (jest.mock calls are hoisted above the imports).
jest.mock('react-native-worklets', () => jest.requireActual('react-native-worklets/src/mock'));
jest.mock('react-native-reanimated', () => ({
  ...jest.requireActual<object>('react-native-reanimated/mock'),
  useReducedMotion: () => false,
}));
jest.mock('react-native-gesture-handler/lib/commonjs/RNGestureHandlerModule', () =>
  jest.requireActual('react-native-gesture-handler/lib/commonjs/mocks/mocks'),
);
jest.mock('react-native-gesture-handler/src/RNGestureHandlerModule', () =>
  jest.requireActual('react-native-gesture-handler/src/mocks/mocks'),
);

const METRICS = {
  frame: { x: 0, y: 0, width: 360, height: 780 },
  insets: { top: 24, left: 0, right: 0, bottom: 16 },
};

const card: CardDef = {
  id: 'tanystropheus',
  name: 'Tanystropheus',
  emoji: '🦎',
  era: 'trias',
  type: 'attack',
  rarity: 'common',
  cost: 2,
  tags: ['marine'],
  effects: [
    { type: 'damage', amount: 8 },
    { type: 'status', status: 'vulnerable', amount: 2, target: 'enemy' },
  ],
  upgrade: { effects: [{ type: 'damage', amount: 11 }] },
  fossilId: 'tanystropheus',
};

const fossil: FossilEntry = {
  id: 'tanystropheus',
  name: 'Tanystropheus',
  scientificName: 'Tanystropheus longobardicus',
  emoji: '🦎',
  era: 'trias',
  kind: 'reptile',
  mya: [242, 237],
  diet: 'carnivore',
  lengthM: 6,
  foundIn: 'Europa',
  facts: ['Sein Hals war länger als Körper und Schwanz zusammen.'],
};

function render(element: ReactElement): ReactTestRenderer {
  let renderer: ReactTestRenderer | undefined;
  act(() => {
    renderer = create(<SafeAreaProvider initialMetrics={METRICS}>{element}</SafeAreaProvider>);
  });
  return renderer!;
}

function labels(root: ReactTestInstance): string[] {
  return root
    .findAll((node) => typeof node.props.accessibilityLabel === 'string' && typeof node.type === 'string')
    .map((node) => node.props.accessibilityLabel as string);
}

function texts(root: ReactTestInstance): string {
  return root
    .findAll((node) => (node.type as unknown) === 'Text')
    .map((node) => (Array.isArray(node.props.children) ? node.props.children.join('') : String(node.props.children)))
    .join(' | ');
}

describe('design system components', () => {
  it('renders a hand card with cost, text, preview and a combined label', () => {
    const onPress = jest.fn();
    const r = render(<GameCard def={card} size="hand" width={80} previewDamage={12} unaffordable onPress={onPress} />);
    const all = labels(r.root);
    const label = all.find((l) => l.startsWith('Tanystropheus'));
    expect(label).toContain('Kosten 2 Energie');
    expect(label).toContain('Verursache 8 Schaden');
    expect(label).toContain('Voraussichtlicher Schaden 12');
    expect(label).toContain('Nicht genug Energie');
    const shown = texts(r.root);
    expect(shown).toContain('12');
    expect(shown).toContain('Verwundbar');
    const button = r.root.find((node) => node.props.accessibilityRole === 'button' && typeof node.props.onPress === 'function');
    act(() => button.props.onPress());
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('renders full and mini cards', () => {
    const full = render(<GameCard def={card} upgraded size="full" />);
    expect(texts(full.root)).toContain('Tanystropheus+');
    expect(texts(full.root)).toContain('Gewöhnlich');
    const mini = render(<GameCard def={card} size="mini" />);
    expect(texts(mini.root)).not.toContain('Verursache');
  });

  it('renders combat widgets', () => {
    const r = render(
      <>
        <StatBar value={45} max={60} block={8} />
        <EnergyOrb current={2} max={3} />
        <StatusChips statuses={{ strength: 2, weak: 0, bleed: 3 }} />
        <IntentBadge intent={{ kinds: ['attack'], moveName: 'Biss', damage: 12, hits: 2 }} />
        <FloatingNumbers items={[{ id: 1, kind: 'damage', value: 7 }]} onDone={() => undefined} />
      </>,
    );
    const all = labels(r.root);
    expect(all).toContain('LP 45 von 60, 8 Block');
    expect(all).toContain('Energie 2 von 3');
    expect(all.some((l) => l.startsWith('Stärke 2'))).toBe(true);
    expect(all.some((l) => l.startsWith('Blutung 3'))).toBe(true);
    expect(all.some((l) => l.startsWith('Geschwächt'))).toBe(false);
    expect(all).toContain('Absicht: Biss. Angriff mit 12 Schaden, 2-mal.');
    const shown = texts(r.root);
    expect(shown).toContain('45/60');
    expect(shown).toContain('12×2');
    expect(shown).toContain('−7');
  });

  it('renders screen chrome and controls with accessible labels', () => {
    const onBack = jest.fn();
    const onToggle = jest.fn();
    const r = render(
      <Screen header={<Header title="Fossilienbuch" onBack={onBack} />} footer={<Button label="Los geht's" />} scroll>
        <ListRow title="Eoraptor" subtitle="Trias" left="🦎" onPress={() => undefined} />
        <ToggleRow label="Haptik" value onValueChange={onToggle} />
        <Pill label="Neu" tone="accent" />
        <EraBadge era="eiszeit" />
        <ProgressDots count={6} current={2} />
        <IconButton icon="⚙️" accessibilityLabel="Einstellungen" onPress={() => undefined} size={40} />
        <EmptyState icon="🦴" title="Noch nichts gefunden" />
        <Button label="Abbrechen" variant="danger" loading />
      </Screen>,
    );
    const all = labels(r.root);
    expect(all).toEqual(
      expect.arrayContaining(['Zurück', "Los geht's", 'Eoraptor, Trias', 'Haptik', 'Neu', 'Ära: Eiszeit', 'Schritt 3 von 6', 'Einstellungen']),
    );
    const back = r.root.find((node) => node.props.accessibilityLabel === 'Zurück' && typeof node.props.onPress === 'function');
    act(() => back.props.onPress());
    expect(onBack).toHaveBeenCalled();
    const toggle = r.root.find((node) => node.props.accessibilityRole === 'switch' && typeof node.props.onPress === 'function');
    act(() => toggle.props.onPress());
    expect(onToggle).toHaveBeenCalledWith(false);
  });

  it('renders the card detail sheet with fossil facts and action', () => {
    const onTake = jest.fn();
    const r = render(
      <CardDetailSheet
        def={card}
        upgraded={false}
        fossil={fossil}
        visible
        onClose={() => undefined}
        primaryAction={{ label: 'Karte nehmen', onPress: onTake }}
      />,
    );
    const shown = texts(r.root);
    expect(shown).toContain('Tanystropheus longobardicus');
    expect(shown).toContain('Sein Hals war länger');
    expect(shown).toContain('Verwundbar');
    expect(shown).toContain('vor 242–237 Mio. Jahren');
    const action = r.root.find((node) => node.props.accessibilityLabel === 'Karte nehmen' && typeof node.props.onPress === 'function');
    act(() => action.props.onPress());
    expect(onTake).toHaveBeenCalled();
  });

  it('renders nothing visible for a hidden bottom sheet', () => {
    const r = render(
      <BottomSheet visible={false} onClose={() => undefined} title="Test">
        <Button label="Innen" />
      </BottomSheet>,
    );
    expect(labels(r.root)).not.toContain('Innen');
  });
});
