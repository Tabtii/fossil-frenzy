import { memo } from 'react';
import { Pressable, type StyleProp, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { STATUS_INFO } from '@/engine/describe';
import type { StatusId, Statuses } from '@/engine/types';

import { colors, fontScale, hitSlopFor, radii, spacing, statusColors } from '../theme';

/** Display order of status chips. */
export const STATUS_ORDER: readonly StatusId[] = ['strength', 'vulnerable', 'weak', 'bleed', 'confused'];

export type StatusChipSize = 'sm' | 'md';

export interface StatusChipsProps {
  statuses: Statuses;
  /** Makes chips tappable, e.g. to show the status description. */
  onPressStatus?: (status: StatusId) => void;
  size?: StatusChipSize;
  /** Show the status name next to the number (default false). */
  showNames?: boolean;
  /** Text when no status is active; nothing is rendered when omitted. */
  emptyText?: string;
  style?: StyleProp<ViewStyle>;
}

/** Active statuses (value > 0) in a fixed order. */
export function activeStatuses(statuses: Statuses): { id: StatusId; value: number }[] {
  const result: { id: StatusId; value: number }[] = [];
  for (const id of STATUS_ORDER) {
    const value = statuses[id] ?? 0;
    if (value > 0) result.push({ id, value });
  }
  return result;
}

const CHIP_HEIGHT: Record<StatusChipSize, number> = { sm: 24, md: 30 };

/** Row of status chips ("💪 2", "🩸 3"). Each chip has a spoken description. */
export const StatusChips = memo(function StatusChips({
  statuses,
  onPressStatus,
  size = 'sm',
  showNames = false,
  emptyText,
  style,
}: StatusChipsProps) {
  const active = activeStatuses(statuses);
  if (active.length === 0) {
    return emptyText ? (
      <View style={[styles.row, style]}>
        <Text style={styles.empty} maxFontSizeMultiplier={fontScale.body}>
          {emptyText}
        </Text>
      </View>
    ) : null;
  }

  const height = CHIP_HEIGHT[size];
  return (
    <View style={[styles.row, style]}>
      {active.map(({ id, value }) => {
        const info = STATUS_INFO[id];
        const color = statusColors[id];
        const label = `${info.name} ${value}: ${info.description}`;
        const content = (
          <>
            <Text style={size === 'md' ? styles.emojiMd : styles.emojiSm} maxFontSizeMultiplier={fontScale.badge}>
              {info.emoji}
            </Text>
            <Text
              style={[size === 'md' ? styles.valueMd : styles.valueSm, { color }]}
              maxFontSizeMultiplier={fontScale.badge}
              numberOfLines={1}
            >
              {showNames ? `${info.name} ${value}` : value}
            </Text>
          </>
        );
        const chipStyle = [styles.chip, { minHeight: height, borderColor: color }];
        return onPressStatus ? (
          <Pressable
            key={id}
            accessibilityRole="button"
            accessibilityLabel={label}
            onPress={() => onPressStatus(id)}
            hitSlop={hitSlopFor(height * 1.6, height)}
            style={({ pressed }) => [chipStyle, pressed && styles.pressed]}
          >
            {content}
          </Pressable>
        ) : (
          <View key={id} accessible accessibilityLabel={label} style={chipStyle}>
            {content}
          </View>
        );
      })}
    </View>
  );
});

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.xs },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: 1,
    backgroundColor: colors.surfaceRaised,
  },
  pressed: { backgroundColor: colors.surfacePressed },
  emojiSm: { fontSize: 12, lineHeight: 16 },
  emojiMd: { fontSize: 15, lineHeight: 20 },
  valueSm: { fontSize: 12, lineHeight: 16, fontWeight: '800', fontVariant: ['tabular-nums'] },
  valueMd: { fontSize: 14, lineHeight: 18, fontWeight: '800', fontVariant: ['tabular-nums'] },
  empty: { color: colors.textMuted, fontSize: 12, lineHeight: 16 },
});
