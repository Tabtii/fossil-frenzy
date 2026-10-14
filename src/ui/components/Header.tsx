import { memo, type ReactNode } from 'react';
import { type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';

import { UI_STRINGS } from '../labels';
import { colors, fontScale, sizes, spacing, TOUCH_TARGET } from '../theme';
import { AppText } from './AppText';
import { IconButton } from './IconButton';

export interface HeaderProps {
  title: string;
  subtitle?: string;
  /** Shows a 48 dp back button ("Zurück") when set. */
  onBack?: () => void;
  backLabel?: string;
  /** Right-hand slot, e.g. an IconButton or a counter. */
  right?: ReactNode;
  /** Draw a bottom divider (default false). */
  divider?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** Screen header: back button, title (role header), optional right slot. */
export const Header = memo(function Header({
  title,
  subtitle,
  onBack,
  backLabel = UI_STRINGS.back,
  right,
  divider = false,
  style,
}: HeaderProps) {
  return (
    <View style={[styles.root, divider && styles.divider, style]}>
      {onBack ? (
        <IconButton icon="←" iconColor={colors.text} accessibilityLabel={backLabel} onPress={onBack} size={TOUCH_TARGET} />
      ) : (
        <View style={styles.sideSpacer} />
      )}
      <View style={styles.titles}>
        <AppText
          variant="heading"
          accessibilityRole="header"
          numberOfLines={1}
          maxFontSizeMultiplier={fontScale.title}
        >
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="caption" tone="secondary" numberOfLines={1}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      <View style={styles.right}>{right}</View>
    </View>
  );
});

const styles = StyleSheet.create({
  root: {
    minHeight: sizes.headerHeight,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
    gap: spacing.xs,
  },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.divider },
  sideSpacer: { width: spacing.md },
  titles: { flex: 1, minWidth: 0 },
  right: { minWidth: spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: spacing.xs },
});
