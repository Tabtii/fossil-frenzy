import { memo } from 'react';
import { Platform, Pressable, type StyleProp, StyleSheet, Switch, View, type ViewStyle } from 'react-native';

import { colors, opacity, sizes, spacing } from '../theme';
import { AppText } from './AppText';

export interface ToggleRowProps {
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

const TRACK = { false: colors.surfacePressed, true: colors.accent } as const;

/** Settings row with a switch; the whole row toggles and is one a11y element. */
export const ToggleRow = memo(function ToggleRow({
  label,
  description,
  value,
  onValueChange,
  disabled = false,
  style,
  testID,
}: ToggleRowProps) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityHint={description}
      accessibilityState={{ checked: value, disabled }}
      disabled={disabled}
      onPress={() => onValueChange(!value)}
      testID={testID}
      style={({ pressed }) => [styles.row, pressed && styles.pressed, disabled && styles.disabled, style]}
    >
      <View style={styles.texts}>
        <AppText variant="bodyStrong">{label}</AppText>
        {description ? (
          <AppText variant="caption" tone="secondary">
            {description}
          </AppText>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={TRACK}
        thumbColor={Platform.OS === 'android' ? (value ? colors.text : colors.textSecondary) : undefined}
        ios_backgroundColor={colors.surfacePressed}
        accessible={false}
        importantForAccessibility="no-hide-descendants"
      />
    </Pressable>
  );
});

const styles = StyleSheet.create({
  row: {
    minHeight: sizes.listRowMinHeight,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
  },
  pressed: { backgroundColor: colors.surfacePressed },
  disabled: { opacity: opacity.disabled },
  texts: { flex: 1, minWidth: 0, gap: spacing.xxs },
});
