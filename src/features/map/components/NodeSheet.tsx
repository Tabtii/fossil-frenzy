import { memo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { CONTENT } from '@/data';
import type { MapNode } from '@/engine/types';
import { AppText, BottomSheet, Button, colors, Pill, radii, spacing } from '@/ui';

import { nodeSheetInfo, type NodeState } from '../mapModel';

export interface NodeSheetProps {
  /** Tapped node; null closes the sheet. */
  node: MapNode | null;
  state: NodeState;
  onClose: () => void;
  onEnter: (node: MapNode) => void;
  reducedMotion: boolean;
}

/** Small confirm sheet: node type, enemy preview for fights and "Betreten". */
export const NodeSheet = memo(function NodeSheet({ node, state, onClose, onEnter, reducedMotion }: NodeSheetProps) {
  // Keep the last node visible while the sheet slides closed.
  const [shown, setShown] = useState<{ node: MapNode; state: NodeState } | null>(null);
  if (node !== null && (shown === null || shown.node !== node || shown.state !== state)) {
    setShown({ node, state });
  }
  const info = shown ? nodeSheetInfo(CONTENT, shown.node, shown.state) : null;
  const canEnter = shown !== null && shown.state === 'available';

  const footer =
    shown !== null && canEnter ? (
      <Button
        label="Betreten"
        icon="🧭"
        size="lg"
        fullWidth
        onPress={() => onEnter(shown.node)}
        accessibilityHint={info ? `Betritt den Ort ${info.label}.` : undefined}
        testID="map-node-enter"
      />
    ) : undefined;

  return (
    <BottomSheet
      visible={node !== null}
      onClose={onClose}
      title={info?.title}
      footer={footer}
      reducedMotion={reducedMotion}
      testID="map-node-sheet"
    >
      {info ? (
        <>
          <AppText variant="caption" tone="secondary">
            {info.floorText}
          </AppText>
          {info.enemy ? (
            <View
              style={styles.enemy}
              accessible
              accessibilityLabel={`Gegner: ${info.enemy.name}, ${info.enemy.tierLabel}, ${info.enemy.hpText}`}
            >
              <Text style={styles.enemyEmoji} allowFontScaling={false}>
                {info.enemy.emoji}
              </Text>
              <View style={styles.enemyText}>
                <AppText variant="subheading" numberOfLines={2}>
                  {info.enemy.name}
                </AppText>
                <View style={styles.pills}>
                  <Pill
                    size="sm"
                    label={info.enemy.tierLabel}
                    tone={shown?.node.type === 'fight' ? 'neutral' : 'danger'}
                  />
                  <Pill size="sm" label={info.enemy.hpText} icon="❤️" />
                </View>
              </View>
            </View>
          ) : null}
          <AppText variant="body" tone="secondary">
            {info.hint}
          </AppText>
          {info.maxHpGain > 0 ? <Pill label={`Sieg: +${info.maxHpGain} Max-LP`} icon="❤️" tone="success" /> : null}
          {info.lockedReason ? (
            <AppText variant="bodyStrong" tone="muted">
              {info.lockedReason}
            </AppText>
          ) : null}
        </>
      ) : null}
    </BottomSheet>
  );
});

const styles = StyleSheet.create({
  enemy: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceRaised,
  },
  enemyEmoji: { fontSize: 44, lineHeight: 54 },
  enemyText: { flex: 1, minWidth: 0, gap: spacing.xs },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
});
