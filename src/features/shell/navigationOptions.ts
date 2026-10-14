import { DarkTheme, type NativeStackNavigationOptions, type Theme } from 'expo-router';

import { colors } from '@/ui';

// Navigator configuration shared by the root and run layouts.

/** React Navigation theme in the app's colours (no white flashes between screens). */
export const NAVIGATION_THEME: Theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: colors.accent,
    background: colors.background,
    card: colors.surface,
    text: colors.text,
    border: colors.border,
    notification: colors.danger,
  },
};

const CONTENT_STYLE = { backgroundColor: colors.background } as const;

/** Root stack: no native header (screens draw their own), native slide animation. */
export const ROOT_STACK_OPTIONS: NativeStackNavigationOptions = {
  headerShown: false,
  animation: 'slide_from_right',
  contentStyle: CONTENT_STYLE,
};

/** Home fades in (e.g. when an expedition ends and the stack is popped/replaced). */
export const HOME_SCREEN_OPTIONS: NativeStackNavigationOptions = {
  animation: 'fade',
};

/**
 * The run group: no swipe-back on iOS (a fight must not be left by an edge
 * swipe); Android back is handled by the run layout itself.
 */
export const RUN_GROUP_OPTIONS: NativeStackNavigationOptions = {
  animation: 'fade',
  gestureEnabled: false,
  fullScreenGestureEnabled: false,
};

export const NOT_FOUND_OPTIONS: NativeStackNavigationOptions = {
  animation: 'fade',
};

/** Steps inside a run cross-fade and can never be swiped back. */
export const RUN_STACK_OPTIONS: NativeStackNavigationOptions = {
  headerShown: false,
  animation: 'fade',
  gestureEnabled: false,
  fullScreenGestureEnabled: false,
  contentStyle: CONTENT_STYLE,
};
