import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { AppText, colors, durations, elevation, radii, spacing } from '@/ui';

import type { TransientMessage } from '../hooks/useTransientMessage';

export interface HintToastProps {
  message: TransientMessage | null;
  /** Distance from the bottom of the arena (dp). */
  bottom: number;
}

/**
 * Short hint above the hand, e.g. "Nicht genug Energie" or a status
 * description. The screen announces it to screen readers separately.
 */
export const HintToast = memo(function HintToast({ message, bottom }: HintToastProps) {
  return (
    <View style={[styles.root, { bottom }]} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {message ? (
        <Animated.View
          key={message.id}
          entering={FadeIn.duration(durations.fast)}
          exiting={FadeOut.duration(durations.normal)}
          style={[styles.toast, message.tone === 'danger' ? styles.danger : styles.info]}
        >
          <AppText variant="label" tone={message.tone === 'danger' ? 'danger' : 'primary'} align="center" numberOfLines={3}>
            {message.text}
          </AppText>
        </Animated.View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  root: { position: 'absolute', left: spacing.sm, right: spacing.sm, alignItems: 'center' },
  toast: {
    maxWidth: 420,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.lg,
    borderWidth: 1,
    backgroundColor: colors.surfaceHigh,
    ...elevation(3),
  },
  danger: { borderColor: colors.danger },
  info: { borderColor: colors.borderStrong },
});
