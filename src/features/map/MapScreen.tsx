import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { type LayoutChangeEvent, ScrollView, StyleSheet, View } from 'react-native';

import { eraForAct } from '@/engine/run';
import type { MapNode } from '@/engine/types';
import { usePressGuard } from '@/features/shell/hooks';
import { useLeaveRun } from '@/features/shell/RunShell';
import * as haptics from '@/lib/haptics';
import { useAvailableNodes, useGameActions, useMeta, useRun, useSettings } from '@/state/selectors';
import { AppText, eraColors, radii, Screen, spacing, useLayout, useReduceMotion } from '@/ui';

import { DeckSheet } from './components/DeckSheet';
import { ExpeditionMap } from './components/ExpeditionMap';
import { MapHeader } from './components/MapHeader';
import { MapLegend } from './components/MapLegend';
import { NodeSheet } from './components/NodeSheet';
import { computeMapLayout, mapWidth, scrollOffsetForFloor } from './mapLayout';
import { deriveMapState, floorProgressText, focusFloor, nodeState } from './mapModel';

const NO_NODES: readonly MapNode[] = [];
const NO_VISITED: readonly string[] = [];

/**
 * Expedition map of the current act: climb from floor 0 (bottom) to the boss
 * (top). Tapping a node opens a confirm sheet; "Betreten" calls enterNode and
 * the run layout follows `run.screen` to the next step.
 */
export function MapScreen() {
  const run = useRun();
  const settings = useSettings();
  const { fossils } = useMeta();
  const available = useAvailableNodes();
  const { enterNode } = useGameActions();
  const leaveRun = useLeaveRun();
  const reduceMotion = useReduceMotion(settings.reducedMotion);
  const { contentWidth, gutter } = useLayout();
  const guard = usePressGuard();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [deckOpen, setDeckOpen] = useState(false);

  const nodes = run?.map ?? NO_NODES;
  const visited = run?.visited ?? NO_VISITED;
  const currentNodeId = run?.currentNodeId ?? null;
  const act = run?.act ?? 0;
  const era = eraForAct(act);

  const width = mapWidth(contentWidth - 2 * gutter);
  const layout = useMemo(() => computeMapLayout(nodes, width), [nodes, width]);
  const mapState = useMemo(
    () =>
      deriveMapState(
        { map: nodes, visited, currentNodeId },
        available.map((node) => node.id),
      ),
    [nodes, visited, currentNodeId, available],
  );
  const focus = focusFloor({ map: nodes, currentNodeId });

  // Auto-scroll: centre the next floor to enter (instantly on first layout).
  const scrollRef = useRef<ScrollView>(null);
  const viewportRef = useRef(0);
  const onViewportLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const height = event.nativeEvent.layout.height;
      const first = viewportRef.current === 0;
      viewportRef.current = height;
      if (first) scrollRef.current?.scrollTo({ y: scrollOffsetForFloor(layout, focus, height), animated: false });
    },
    [layout, focus],
  );
  useEffect(() => {
    const height = viewportRef.current;
    if (height <= 0) return;
    scrollRef.current?.scrollTo({ y: scrollOffsetForFloor(layout, focus, height), animated: !reduceMotion });
  }, [layout, focus, reduceMotion]);

  const onNodePress = useCallback((node: MapNode) => {
    haptics.selection();
    setSelectedId(node.id);
  }, []);
  const closeNode = useCallback(() => setSelectedId(null), []);
  const onEnter = useCallback(
    (node: MapNode) => {
      guard(() => {
        haptics.tapLight();
        setSelectedId(null);
        enterNode(node.id);
      });
    },
    [guard, enterNode],
  );
  const openDeck = useCallback(() => {
    haptics.tapLight();
    setDeckOpen(true);
  }, []);
  const closeDeck = useCallback(() => setDeckOpen(false), []);
  const onHome = useCallback(() => {
    haptics.tapLight();
    leaveRun();
  }, [leaveRun]);

  if (run === null) return <Screen />;

  const selectedNode = selectedId !== null ? (nodes.find((node) => node.id === selectedId) ?? null) : null;
  const selectedState = selectedNode ? nodeState(mapState, selectedNode.id) : 'unreachable';
  const hint = available.length > 0 ? 'Tippe auf einen leuchtenden Ort, um weiterzuziehen.' : 'Gleich geht es weiter …';

  return (
    <Screen
      padded={false}
      header={
        <View style={{ paddingHorizontal: gutter }}>
          <MapHeader
            act={run.act}
            era={era}
            floorText={floorProgressText(run)}
            hp={run.hp}
            maxHp={run.maxHp}
            deckSize={run.deck.length}
            reducedMotion={reduceMotion}
            onHome={onHome}
            onDeck={openDeck}
          />
        </View>
      }
      footer={
        <View style={[styles.footer, { paddingHorizontal: gutter }]}>
          <AppText variant="caption" tone="secondary" align="center" accessibilityLiveRegion="polite">
            {hint}
          </AppText>
          <MapLegend />
        </View>
      }
      testID="map-screen"
    >
      <ScrollView
        ref={scrollRef}
        style={styles.flex}
        contentContainerStyle={[styles.scrollContent, { paddingHorizontal: gutter }]}
        onLayout={onViewportLayout}
        showsVerticalScrollIndicator={false}
        accessibilityLabel="Expeditionskarte"
      >
        <View style={[styles.panel, { backgroundColor: eraColors[era].soft }]}>
          <ExpeditionMap
            nodes={nodes}
            layout={layout}
            mapState={mapState}
            era={era}
            reduceMotion={reduceMotion}
            onNodePress={onNodePress}
          />
        </View>
      </ScrollView>

      <NodeSheet
        node={selectedNode}
        state={selectedState}
        onClose={closeNode}
        onEnter={onEnter}
        reducedMotion={settings.reducedMotion}
      />
      <DeckSheet
        visible={deckOpen}
        deck={run.deck}
        fossils={fossils}
        onClose={closeDeck}
        reducedMotion={settings.reducedMotion}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: 'center' },
  panel: { borderRadius: radii.xl, alignItems: 'center' },
  footer: { gap: spacing.sm },
});
