import { router } from 'expo-router';
import { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';

import { ROUTES } from '@/features/navigation';
import { Button, EmptyState, Screen } from '@/ui';

export default function NotFoundScreen() {
  // Pops back to home when it is below, otherwise replaces this screen.
  const onHome = useCallback(() => router.dismissTo(ROUTES.home), []);

  return (
    <Screen
      footer={
        <Button
          label="Zurück zum Lager"
          icon="🏕️"
          size="lg"
          fullWidth
          onPress={onHome}
          testID="not-found-home"
        />
      }
    >
      <View style={styles.body}>
        <EmptyState
          icon="🦕"
          title="Hier gibt es nichts auszugraben"
          message="Diese Seite gibt es nicht – vielleicht liegt sie noch tief im Gestein verborgen."
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, justifyContent: 'center' },
});
