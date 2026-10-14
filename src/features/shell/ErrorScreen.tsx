import type { ErrorBoundaryProps } from 'expo-router';
import { router } from 'expo-router';
import { useCallback, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';

import { ROUTES } from '@/features/navigation';
import { AppText, Button, EmptyState, Screen, spacing } from '@/ui';

import { hideSplash } from './splash';

// Friendly German error screens for expo-router's per-route ErrorBoundary.

interface ErrorScreenProps extends ErrorBoundaryProps {
  /** Offer a way back to the home screen (only where a navigator exists). */
  showHome: boolean;
}

function ErrorScreen({ error, retry, showHome }: ErrorScreenProps) {
  const onRetry = useCallback(() => {
    retry().catch(() => undefined);
  }, [retry]);
  const onHome = useCallback(() => router.dismissTo(ROUTES.home), []);

  // A crash before the store loaded would otherwise stay hidden behind the splash.
  useEffect(() => {
    hideSplash();
  }, []);

  return (
    <Screen
      footer={
        <>
          <Button label="Erneut versuchen" icon="🔄" size="lg" fullWidth onPress={onRetry} />
          {showHome ? (
            <Button label="Zurück zum Lager" icon="🏕️" variant="secondary" fullWidth onPress={onHome} />
          ) : null}
        </>
      }
    >
      <View style={styles.body}>
        <EmptyState
          icon="🦴"
          title="Ups – ein Fossil ist zerbrochen"
          message="Hier ist etwas schiefgelaufen. Dein Spielstand bleibt erhalten."
        />
        {__DEV__ ? (
          <AppText variant="caption" tone="muted" align="center" selectable>
            {error.message}
          </AppText>
        ) : null}
      </View>
    </Screen>
  );
}

/** Root layout: no navigator to go "home" with, so only retry. */
export function RootErrorBoundary(props: ErrorBoundaryProps) {
  return <ErrorScreen {...props} showHome={false} />;
}

/** Run layout: retry or leave the run (it stays saved). */
export function RunErrorBoundary(props: ErrorBoundaryProps) {
  return <ErrorScreen {...props} showHome />;
}

const styles = StyleSheet.create({
  body: { flex: 1, justifyContent: 'center', gap: spacing.md },
});
