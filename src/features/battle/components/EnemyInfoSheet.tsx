import { memo, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { CONTENT } from '@/data';
import { describeEnemy, describeMove, STATUS_INFO } from '@/engine/describe';
import type { EnemyDef, EnemyState, IntentView } from '@/engine/types';
import { useFossilRecord } from '@/state/selectors';
import {
  activeStatuses,
  AppText,
  BottomSheet,
  colors,
  EraBadge,
  IntentBadge,
  Pill,
  radii,
  spacing,
  StatBar,
  UI_STRINGS,
} from '@/ui';

import { BATTLE_TEXT } from '../strings';
import { FossilFacts } from './FossilFacts';

export interface EnemyInfoSheetProps {
  visible: boolean;
  onClose: () => void;
  enemy: EnemyState;
  def: EnemyDef | undefined;
  /** Next move (null once the combat is over). */
  intent: IntentView | null;
  reducedMotion: boolean;
}

function Section({ title, children, accessibilityLabel }: { title: string; children: ReactNode; accessibilityLabel?: string }) {
  return (
    <View style={styles.section}>
      <AppText variant="overline" tone="secondary" accessibilityRole="header">
        {title}
      </AppText>
      <View style={styles.sectionBody} accessible={accessibilityLabel !== undefined} accessibilityLabel={accessibilityLabel}>
        {children}
      </View>
    </View>
  );
}

/** Enemy details: stats, next move, statuses, move list and fossil facts. */
export const EnemyInfoSheet = memo(function EnemyInfoSheet({
  visible,
  onClose,
  enemy,
  def,
  intent,
  reducedMotion,
}: EnemyInfoSheetProps) {
  const record = useFossilRecord(def?.fossilId ?? '');
  const fossil = def ? CONTENT.fossils[def.fossilId] : undefined;
  const nextMove = def?.moves.find((move) => move.id === enemy.nextMoveId);
  const statuses = activeStatuses(enemy.statuses);
  const tier = def?.tier === 'boss' ? BATTLE_TEXT.boss : def?.tier === 'elite' ? BATTLE_TEXT.elite : null;

  return (
    <BottomSheet
      visible={visible && def !== undefined}
      onClose={onClose}
      title={def?.name ?? ''}
      reducedMotion={reducedMotion}
      testID="enemy-sheet"
    >
      {def ? (
        <>
          <View style={styles.header}>
            <Text style={styles.emoji} allowFontScaling={false} accessible={false}>
              {def.emoji}
            </Text>
            <View style={styles.headerBody}>
              <View style={styles.pills}>
                <EraBadge era={def.era} size="sm" />
                {tier ? <Pill size="sm" label={tier} tone={def.tier === 'boss' ? 'danger' : 'accent'} /> : null}
              </View>
              <StatBar
                value={enemy.hp}
                max={enemy.maxHp}
                block={enemy.block}
                size="md"
                label={`${def.name}: ${UI_STRINGS.hp}`}
                reducedMotion={reducedMotion}
              />
            </View>
          </View>

          {intent && enemy.hp > 0 ? (
            <Section title={BATTLE_TEXT.nextMove}>
              <View style={styles.intentRow}>
                <IntentBadge intent={intent} showMoveName={false} reducedMotion={reducedMotion} />
                <AppText variant="body" style={styles.flex}>
                  {nextMove ? describeMove(nextMove) : intent.moveName}
                </AppText>
              </View>
            </Section>
          ) : null}

          <Section title={BATTLE_TEXT.statuses}>
            {statuses.length === 0 ? (
              <AppText variant="body" tone="muted">
                {BATTLE_TEXT.noStatuses}
              </AppText>
            ) : (
              statuses.map(({ id, value }) => (
                <View key={id} style={styles.status} accessible>
                  <AppText variant="bodyStrong">
                    {STATUS_INFO[id].emoji} {STATUS_INFO[id].name} {value}
                  </AppText>
                  <AppText variant="caption" tone="secondary">
                    {STATUS_INFO[id].description}
                  </AppText>
                </View>
              ))
            )}
          </Section>

          <Section title={BATTLE_TEXT.moves} accessibilityLabel={describeEnemy(def)}>
            {def.moves.map((move) => (
              <AppText key={move.id} variant="body">
                • {describeMove(move)}
              </AppText>
            ))}
            <AppText variant="caption" tone="muted">
              {def.pattern.type === 'cycle' ? BATTLE_TEXT.patternCycle : BATTLE_TEXT.patternWeighted}
            </AppText>
          </Section>

          {fossil ? <FossilFacts fossil={fossil} discovered={record !== null} /> : null}
        </>
      ) : null}
    </BottomSheet>
  );
});

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  emoji: { fontSize: 56, lineHeight: 66, color: colors.text },
  headerBody: { flex: 1, minWidth: 0, gap: spacing.sm },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  section: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceRaised,
  },
  sectionBody: { gap: spacing.xs },
  intentRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  flex: { flex: 1 },
  status: { gap: spacing.xxs },
});
