import { isRunningInExpoGo } from 'expo';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

// Native splash screen handling. `keepSplashScreen()` must run at module level
// of the root layout (before the first render); the hook hides the splash once
// the saved game is loaded.

/** Last resort: never keep the splash longer than this, even if loading hangs. */
export const SPLASH_TIMEOUT_MS = 4000;

/** Hides the native splash now (safe to call repeatedly). */
export function hideSplash(): void {
  SplashScreen.hideAsync().catch(() => undefined);
}

/** Keeps the native splash visible until `useHideSplashWhenReady` hides it. */
export function keepSplashScreen(): void {
  SplashScreen.preventAutoHideAsync().catch(() => undefined);
  // Expo Go ignores (and warns about) custom splash options.
  if (isRunningInExpoGo()) return;
  try {
    SplashScreen.setOptions({ duration: 250, fade: true });
  } catch {
    // Options are cosmetic; older native builds may not support them.
  }
}

/** Hides the splash once `ready` is true (and after SPLASH_TIMEOUT_MS at the latest). */
export function useHideSplashWhenReady(ready: boolean): void {
  useEffect(() => {
    if (ready) hideSplash();
  }, [ready]);

  useEffect(() => {
    const timer = setTimeout(hideSplash, SPLASH_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, []);
}
