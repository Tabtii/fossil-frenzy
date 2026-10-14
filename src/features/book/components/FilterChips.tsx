import { memo, useCallback } from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { colors, fontScale, opacity, radii, spacing, TOUCH_TARGET } from '@/ui';

export interface FilterChipOption<T extends string> {
  value: T;
  label: string;
  /** Spoken label; defaults to `label`. */
  accessibilityLabel?: string;
  /** Accent colour of the chip (theme token value); default accent. */
  color?: string;
  /** Tinted background for the selected state (theme token value). */
  softColor?: string;
}

export interface FilterChipsProps<T extends string> {
  options: readonly FilterChipOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Spoken name of the group, e.g. "Nach Ära filtern". */
  accessibilityLabel: string;
  testID?: string;
}

const CHIP_HEIGHT = 40;
const CHIP_SLOP = (TOUCH_TARGET - CHIP_HEIGHT) / 2;
const HIT_SLOP = { top: CHIP_SLOP, bottom: CHIP_SLOP, left: 0, right: 0 };

interface ChipProps {
  option: FilterChipOption<string>;
  selected: boolean;
  onSelect: (value: string) => void;
  testID?: string;
}

const Chip = memo(function Chip({ option, selected, onSelect, testID }: ChipProps) {
  const onPress = useCallback(() => onSelect(option.value), [onSelect, option.value]);
  const main = option.color ?? colors.accent;
  const soft = option.softColor ?? colors.accentSoft;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={option.accessibilityLabel ?? option.label}
      accessibilityState={{ selected }}
      onPress={onPress}
      hitSlop={HIT_SLOP}
      testID={testID}
      style={({ pressed }) => [
        styles.chip,
        selected ? { backgroundColor: soft, borderColor: main } : styles.idle,
        pressed && styles.pressed,
      ]}
    >
      <Text
        style={[styles.text, { color: selected ? main : colors.textSecondary }]}
        maxFontSizeMultiplier={fontScale.badge}
        numberOfLines={1}
      >
        {option.label}
      </Text>
    </Pressable>
  );
});

/**
 * Single-select row of filter chips. Scrolls horizontally inside its own row
 * when the chips do not fit (the page itself never scrolls sideways).
 */
function FilterChipsInner<T extends string>({
  options,
  value,
  onChange,
  accessibilityLabel,
  testID,
}: FilterChipsProps<T>) {
  const onSelect = useCallback(
    (next: string) => {
      const option = options.find((candidate) => candidate.value === next);
      if (option && option.value !== value) onChange(option.value);
    },
    [options, value, onChange],
  );
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      accessibilityLabel={accessibilityLabel}
      contentContainerStyle={styles.row}
      style={styles.scroll}
      testID={testID}
    >
      {options.map((option) => (
        <Chip
          key={option.value}
          option={option}
          selected={option.value === value}
          onSelect={onSelect}
          testID={testID ? `${testID}-${option.value}` : undefined}
        />
      ))}
    </ScrollView>
  );
}

export const FilterChips = memo(FilterChipsInner) as typeof FilterChipsInner;

const styles = StyleSheet.create({
  scroll: { flexGrow: 0 },
  row: { gap: spacing.sm, paddingVertical: spacing.xs, alignItems: 'center' },
  chip: {
    minHeight: CHIP_HEIGHT,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  idle: { backgroundColor: colors.surfaceRaised, borderColor: colors.border },
  pressed: { opacity: opacity.pressed },
  text: { fontSize: 14, lineHeight: 18, fontWeight: '700' },
});
