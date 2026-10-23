import { memo } from 'react';
import { type StyleProp, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { colors, spacing } from '../theme';
import { AppText } from './AppText';
import { Button } from './Button';

export interface EmptyStateProps {
  /** Large emoji, e.g. "🦴". */
  icon?: string;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
}

/** Centred placeholder for empty lists ("Noch keine Fossilien gefunden"). */
export const EmptyState = memo(function EmptyState({ icon, title, message, actionLabel, onAction, style }: EmptyStateProps) {
  return (
    <View style={[styles.root, style]}>
      {icon ? (
        <Text style={styles.icon} allowFontScaling={false} accessible={false}>
          {icon}
        </Text>
      ) : null}
      <AppText variant="subheading" align="center">
        {title}
      </AppText>
      {message ? (
        <AppText variant="body" tone="secondary" align="center">
          {message}
        </AppText>
      ) : null}
      {actionLabel && onAction ? (
        <Button label={actionLabel} onPress={onAction} variant="secondary" style={styles.action} />
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  root: { alignItems: 'center', justifyContent: 'center', padding: spacing.xxl, gap: spacing.sm },
  icon: { fontSize: 48, lineHeight: 58, marginBottom: spacing.xs, color: colors.textSecondary },
  action: { alignSelf: 'center', marginTop: spacing.md },
});
