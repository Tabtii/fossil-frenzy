import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { reduceMotionOption, useReduceMotion } from '../hooks';
import { UI_STRINGS } from '../labels';
import { useLayout } from '../layout';
import { colors, durations, elevation, fill, radii, sizes, spacing, springs, zIndex } from '../theme';
import { AppText } from './AppText';
import { IconButton } from './IconButton';

export interface BottomSheetProps {
  visible: boolean;
  /** Called on backdrop tap, swipe down, the close button and Android back. */
  onClose: () => void;
  title?: string;
  children?: ReactNode;
  /** Fixed actions at the bottom (thumb zone), above the safe-area inset. */
  footer?: ReactNode;
  /** Wrap the body in a ScrollView (default true). */
  scrollable?: boolean;
  /** Max. height relative to the window (default 0.9). */
  maxHeightRatio?: number;
  /** Allow closing by backdrop/swipe/back (default true). */
  dismissible?: boolean;
  /** Show the ✕ button in the header (default true when dismissible). */
  showCloseButton?: boolean;
  /** App setting; the OS setting is respected automatically. */
  reducedMotion?: boolean;
  /** Spoken name of the sheet (defaults to the title). */
  accessibilityLabel?: string;
  testID?: string;
}

/** Distance (dp) or speed (dp/s) of a downward swipe that closes the sheet. */
const CLOSE_DISTANCE = 110;
const CLOSE_VELOCITY = 900;

/**
 * Modal bottom sheet: slides up, swipe the handle/header down or tap the
 * backdrop to close. Stays mounted until the closing animation has finished.
 * Respects safe areas and is centred with max. 560 dp on tablets.
 */
export function BottomSheet({
  visible,
  onClose,
  title,
  children,
  footer,
  scrollable = true,
  maxHeightRatio = 0.9,
  dismissible = true,
  showCloseButton,
  reducedMotion = false,
  accessibilityLabel,
  testID,
}: BottomSheetProps) {
  const { height: windowHeight } = useWindowDimensions();
  const { insets } = useLayout();
  const reduce = useReduceMotion(reducedMotion);

  // Keep the modal mounted while the closing animation runs.
  const [mounted, setMounted] = useState(visible);
  if (visible && !mounted) setMounted(true);

  const translateY = useSharedValue(windowHeight);
  const sheetHeight = useSharedValue(windowHeight);

  const unmount = useCallback(() => setMounted(false), []);
  const requestClose = useCallback(() => {
    if (dismissible) onClose();
  }, [dismissible, onClose]);

  useEffect(() => {
    if (!mounted) return;
    const reduceMotion = reduceMotionOption(reduce);
    if (visible) {
      translateY.set(withTiming(0, { duration: durations.slow, easing: Easing.out(Easing.cubic), reduceMotion }));
    } else {
      translateY.set(
        withTiming(
          Math.max(sheetHeight.get(), 1) + spacing.xxl,
          { duration: durations.normal, easing: Easing.in(Easing.cubic), reduceMotion },
          (finished) => {
            if (finished) scheduleOnRN(unmount);
          },
        ),
      );
    }
  }, [visible, mounted, reduce, translateY, sheetHeight, unmount]);

  // Plain values only inside gesture worklets (no JS function calls on the UI thread).
  const springBack = useMemo(() => ({ ...springs.snappy, reduceMotion: reduceMotionOption(reduce) }), [reduce]);
  const pan = useMemo(
    () =>
      Gesture.Pan()
        .enabled(dismissible)
        .activeOffsetY(8)
        .failOffsetX([-24, 24])
        .onUpdate((event) => {
          translateY.set(Math.max(0, event.translationY));
        })
        .onEnd((event) => {
          if (event.translationY > CLOSE_DISTANCE || event.velocityY > CLOSE_VELOCITY) {
            scheduleOnRN(onClose);
          } else {
            translateY.set(withSpring(0, springBack));
          }
        }),
    [dismissible, onClose, springBack, translateY],
  );

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.get() }] }));
  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateY.get(), [0, Math.max(1, sheetHeight.get())], [1, 0], Extrapolation.CLAMP),
  }));

  const maxHeight = Math.min(windowHeight * maxHeightRatio, windowHeight - insets.top - spacing.lg);
  const bottomPadding = insets.bottom + spacing.md;
  const closeButton = showCloseButton ?? dismissible;

  return (
    <Modal
      visible={mounted}
      transparent
      animationType="none"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={requestClose}
      testID={testID}
    >
      <GestureHandlerRootView style={styles.root}>
        <Animated.View style={[styles.backdrop, backdropStyle]}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={requestClose}
            accessibilityRole="button"
            accessibilityLabel={UI_STRINGS.close}
            importantForAccessibility={dismissible ? 'yes' : 'no-hide-descendants'}
            accessibilityElementsHidden={!dismissible}
          />
        </Animated.View>
        <View style={styles.anchor} pointerEvents="box-none">
          <Animated.View
            style={[styles.sheet, { maxHeight }, sheetStyle]}
            onLayout={(event) => sheetHeight.set(event.nativeEvent.layout.height)}
            accessibilityViewIsModal
            accessibilityLabel={accessibilityLabel ?? title}
          >
            <GestureDetector gesture={pan}>
              <View style={styles.grabArea}>
                <View style={styles.handle} />
                {title || closeButton ? (
                  <View style={styles.titleRow}>
                    <View style={styles.titleText}>
                      {title ? (
                        <AppText variant="heading" accessibilityRole="header" numberOfLines={2}>
                          {title}
                        </AppText>
                      ) : null}
                    </View>
                    {closeButton ? (
                      <IconButton icon="✕" accessibilityLabel={UI_STRINGS.close} onPress={requestClose} variant="filled" size={40} />
                    ) : null}
                  </View>
                ) : null}
              </View>
            </GestureDetector>
            {scrollable ? (
              <ScrollView
                style={styles.body}
                contentContainerStyle={[styles.bodyContent, !footer && { paddingBottom: bottomPadding }]}
                showsVerticalScrollIndicator={false}
                bounces={false}
              >
                {children}
              </ScrollView>
            ) : (
              <View style={[styles.body, styles.bodyContent, !footer && { paddingBottom: bottomPadding }]}>{children}</View>
            )}
            {footer ? <View style={[styles.footer, { paddingBottom: bottomPadding }]}>{footer}</View> : null}
          </Animated.View>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  backdrop: { ...fill, backgroundColor: colors.backdrop },
  anchor: { flex: 1, justifyContent: 'flex-end', alignItems: 'center' },
  sheet: {
    width: '100%',
    maxWidth: sizes.maxContentWidth,
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.xxl,
    borderTopRightRadius: radii.xxl,
    borderWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: 0,
    borderColor: colors.borderStrong,
    zIndex: zIndex.sheet,
    ...elevation(4),
  },
  grabArea: { paddingTop: spacing.sm, paddingHorizontal: spacing.lg, paddingBottom: spacing.xs, minHeight: sizes.touchTarget },
  handle: {
    alignSelf: 'center',
    width: sizes.sheetHandle.width,
    height: sizes.sheetHandle.height,
    borderRadius: radii.pill,
    backgroundColor: colors.borderStrong,
    marginBottom: spacing.sm,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 40 },
  titleText: { flex: 1, minWidth: 0 },
  body: { flexGrow: 0, flexShrink: 1 },
  bodyContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, gap: spacing.md },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
  },
});
