import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

import { useGameStore } from '@/state/store';

// Semantic haptic feedback. Every function is fire-and-forget: it respects the
// player's setting (meta.settings.haptics), does nothing on web and never
// throws or leaves an unhandled promise rejection.

function hapticsEnabled(): boolean {
  if (Platform.OS === 'web') return false;
  try {
    return useGameStore.getState().meta.settings.haptics;
  } catch {
    return false;
  }
}

function fire(trigger: () => Promise<void>): void {
  if (!hapticsEnabled()) return;
  try {
    trigger().catch(() => undefined);
  } catch {
    // Native module missing or unavailable: haptics are optional.
  }
}

/** Light tap, e.g. lifting a card or pressing a secondary button. */
export function tapLight(): void {
  fire(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
}

/** Selection changed, e.g. choosing a map node or a reward option. */
export function selection(): void {
  fire(() => Haptics.selectionAsync());
}

/** A card was played. */
export function cardPlayed(): void {
  fire(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
}

/** The player dealt damage to the enemy. */
export function hitDealt(): void {
  fire(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid));
}

/** The player lost HP. */
export function hitTaken(): void {
  fire(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy));
}

/** Combat or run won. */
export function victory(): void {
  fire(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
}

/** Combat or run lost. */
export function defeat(): void {
  fire(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error));
}

/** A rejected action, e.g. not enough energy for a card. */
export function error(): void {
  fire(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));
}
