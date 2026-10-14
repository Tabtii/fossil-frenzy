import { memo } from 'react';
import { type StyleProp, StyleSheet, type TextStyle } from 'react-native';

import { AppText, spacing } from '@/ui';

export interface SectionTitleProps {
  children: string;
  style?: StyleProp<TextStyle>;
}

/** Small uppercase section heading (exposed as a header to screen readers). */
export const SectionTitle = memo(function SectionTitle({ children, style }: SectionTitleProps) {
  return (
    <AppText variant="overline" tone="muted" accessibilityRole="header" style={[styles.title, style]}>
      {children}
    </AppText>
  );
});

const styles = StyleSheet.create({
  title: { marginTop: spacing.xl, marginBottom: spacing.sm, marginHorizontal: spacing.xs },
});
