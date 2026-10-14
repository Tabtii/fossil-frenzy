import { Alert, Platform } from 'react-native';

// Native confirmation dialogs (Alert) for destructive shell actions.

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  /** Red confirm button on iOS (default true). */
  destructive?: boolean;
  onConfirm: () => void;
}

export const CANCEL_LABEL = 'Abbrechen';

/** Shows a two-button dialog; `onConfirm` only runs for the confirm button. */
export function confirmAction({
  title,
  message,
  confirmLabel,
  cancelLabel = CANCEL_LABEL,
  destructive = true,
  onConfirm,
}: ConfirmOptions): void {
  if (Platform.OS === 'web') {
    // react-native-web's Alert is a no-op; fall back to the browser dialog.
    const browserConfirm = (globalThis as { confirm?: (text: string) => boolean }).confirm;
    if (browserConfirm?.(`${title}\n\n${message}`)) onConfirm();
    return;
  }
  Alert.alert(
    title,
    message,
    [
      { text: cancelLabel, style: 'cancel' },
      { text: confirmLabel, style: destructive ? 'destructive' : 'default', onPress: onConfirm },
    ],
    { cancelable: true },
  );
}
