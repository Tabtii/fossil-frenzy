import { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import type { Era, MapNode } from '@/engine/types';
import { colors, radii } from '@/ui';

import { type EdgePlacement, type MapLayout, segmentDots } from '../mapLayout';
import { edgeState, type EdgeState, type MapState, nodeState } from '../mapModel';
import { MapNodeButton } from './MapNodeButton';

export interface ExpeditionMapProps {
  nodes: readonly MapNode[];
  layout: MapLayout;
  mapState: MapState;
  era: Era;
  reduceMotion: boolean;
  onNodePress: (node: MapNode) => void;
}

const DOT_SIZE = 5;
const DOT_SPACING = 11;

/** Solid line for travelled/available edges, dotted path for the rest. */
const Edge = memo(function Edge({ edge, state }: { edge: EdgePlacement; state: EdgeState }) {
  if (state === 'travelled' || state === 'available') {
    return (
      <View
        style={[
          styles.line,
          state === 'travelled' ? styles.lineTravelled : styles.lineAvailable,
          {
            left: edge.left,
            top: edge.top,
            width: edge.width,
            height: edge.height,
            borderRadius: edge.height / 2,
            transform: [{ rotate: `${edge.angle}deg` }],
          },
        ]}
      />
    );
  }
  const dots = segmentDots(edge, DOT_SPACING);
  return (
    <>
      {dots.map((dot, index) => (
        <View
          // Dots of one edge never reorder, the index is a stable key.
          key={index}
          style={[
            styles.dot,
            state === 'open' ? styles.dotOpen : styles.dotClosed,
            { left: dot.x - DOT_SIZE / 2, top: dot.y - DOT_SIZE / 2 },
          ]}
        />
      ))}
    </>
  );
});

/** The act map: edges below, nodes on top. Purely presentational. */
export const ExpeditionMap = memo(function ExpeditionMap({
  nodes,
  layout,
  mapState,
  era,
  reduceMotion,
  onNodePress,
}: ExpeditionMapProps) {
  const edges = useMemo(
    () => layout.edges.map((edge) => ({ edge, state: edgeState(mapState, edge.from, edge.to) })),
    [layout.edges, mapState],
  );

  return (
    <View style={[styles.root, { width: layout.width, height: layout.height }]}>
      <View
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
        accessible={false}
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden
      >
        {edges.map(({ edge, state }) => (
          <Edge key={edge.key} edge={edge} state={state} />
        ))}
      </View>
      {nodes.map((node) => {
        const placement = layout.byId[node.id];
        if (!placement) return null;
        return (
          <MapNodeButton
            key={node.id}
            node={node}
            state={nodeState(mapState, node.id)}
            x={placement.x}
            y={placement.y}
            size={placement.size}
            era={era}
            reduceMotion={reduceMotion}
            onPress={onNodePress}
          />
        );
      })}
    </View>
  );
});

const styles = StyleSheet.create({
  root: { alignSelf: 'center' },
  line: { position: 'absolute' },
  lineTravelled: { backgroundColor: colors.accent },
  lineAvailable: { backgroundColor: colors.accentBorder },
  dot: { position: 'absolute', width: DOT_SIZE, height: DOT_SIZE, borderRadius: radii.pill },
  dotOpen: { backgroundColor: colors.textMuted },
  dotClosed: { backgroundColor: colors.border },
});
