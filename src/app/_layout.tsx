import { Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import {
  HOME_SCREEN_OPTIONS,
  NAVIGATION_THEME,
  NOT_FOUND_OPTIONS,
  ROOT_STACK_OPTIONS,
  RUN_GROUP_OPTIONS,
} from '@/features/shell/navigationOptions';
import { keepSplashScreen, useHideSplashWhenReady } from '@/features/shell/splash';
import { useHydrated } from '@/state/selectors';
import { colors } from '@/ui';

export { RootErrorBoundary as ErrorBoundary } from '@/features/shell/ErrorScreen';

// Keep the native splash until the saved game is loaded (must run before the first render).
keepSplashScreen();

export const unstable_settings = {
  // Deep links (e.g. /settings or /run/map) always have the home screen below them.
  initialRouteName: 'index',
};

export default function RootLayout() {
  const hydrated = useHydrated();
  useHideSplashWhenReady(hydrated);

  return (
    <GestureHandlerRootView style={styles.root}>
      <ThemeProvider value={NAVIGATION_THEME}>
        <StatusBar style="light" />
        <Stack screenOptions={ROOT_STACK_OPTIONS}>
          <Stack.Screen name="index" options={HOME_SCREEN_OPTIONS} />
          <Stack.Screen name="settings" />
          <Stack.Screen name="run" options={RUN_GROUP_OPTIONS} />
          <Stack.Screen name="+not-found" options={NOT_FOUND_OPTIONS} />
        </Stack>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
});
