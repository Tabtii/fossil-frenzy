import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import { CONTENT } from '@/data';
import { ROUTES } from '@/features/navigation';
import { confirmAction } from '@/features/shell/confirm';
import {
  cardProgress,
  fossilProgress,
  homeStatsText,
  progressText,
  runOverview,
  runOverviewCaption,
} from '@/features/shell/model';
import { SectionTitle } from '@/features/shell/SectionTitle';
import * as haptics from '@/lib/haptics';
import { useGameActions, useMeta } from '@/state/selectors';
import { useGameStore } from '@/state/store';
import { AppText, Button, Divider, Header, Screen, spacing, Surface, ToggleRow } from '@/ui';

const APP_VERSION = Constants.expoConfig?.version ?? '–';

const ABOUT_POINTS: readonly { icon: string; text: string }[] = [
  {
    icon: '🦴',
    text: 'Jede Karte und jeder Gegner beruht auf einem echten Fossilfund. Im Fossilienbuch findest du Alter, Fundort und kurze Fakten zu allen Entdeckungen.',
  },
  {
    icon: '🔬',
    text: 'Die Fakten sind für Kinder und Jugendliche vereinfacht. Wo die Forschung unsicher ist, steht „vermutlich“.',
  },
  {
    icon: '🎨',
    text: 'Die Grafik besteht aus Emoji-Kunst – Saurier, Pflanzen und Fossilien in den Farben ihrer Erdzeitalter.',
  },
  {
    icon: '🔒',
    text: 'Keine Werbung, kein Konto, kein Tracking: Dein Spielstand bleibt auf diesem Gerät.',
  },
];

export default function SettingsScreen() {
  const meta = useMeta();
  const { settings } = meta;
  const overview = useGameStore(useShallow((state) => runOverview(state.run)));
  const { updateSettings, abandonRun, resetProgress } = useGameActions();
  const activeRun = overview?.status === 'active';

  const onBack = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace(ROUTES.home);
  }, []);

  const onHaptics = useCallback(
    (value: boolean) => {
      updateSettings({ haptics: value });
      // Fires only when switched on: a short confirmation that it works.
      haptics.selection();
    },
    [updateSettings],
  );

  const onReducedMotion = useCallback(
    (value: boolean) => {
      updateSettings({ reducedMotion: value });
      haptics.selection();
    },
    [updateSettings],
  );

  const onAbandon = useCallback(() => {
    confirmAction({
      title: 'Expedition abbrechen?',
      message:
        'Die laufende Expedition endet sofort und kann nicht fortgesetzt werden. Gefundene Fossilien bleiben im Fossilienbuch.',
      cancelLabel: 'Weiterspielen',
      confirmLabel: 'Expedition abbrechen',
      onConfirm: () => {
        abandonRun();
        haptics.error();
      },
    });
  }, [abandonRun]);

  const onReset = useCallback(() => {
    confirmAction({
      title: 'Fortschritt zurücksetzen?',
      message:
        'Fossilienbuch, Sammlung, Statistiken und eine laufende Expedition werden gelöscht. Deine Einstellungen bleiben erhalten.',
      confirmLabel: 'Weiter',
      onConfirm: () =>
        confirmAction({
          title: 'Wirklich alles löschen?',
          message: 'Das kann nicht rückgängig gemacht werden.',
          confirmLabel: 'Endgültig löschen',
          onConfirm: () => {
            resetProgress();
            haptics.error();
          },
        }),
    });
  }, [resetProgress]);

  const fossils = fossilProgress(meta.fossils, CONTENT);
  const cards = cardProgress(meta.cardsSeen, CONTENT);

  return (
    <Screen scroll header={<Header title="Einstellungen" onBack={onBack} divider />}>
      <SectionTitle>Spiel</SectionTitle>
      <Surface padding="none" style={styles.group}>
        <ToggleRow
          label="Haptik"
          description="Vibration bei Karten, Treffern und Siegen."
          value={settings.haptics}
          onValueChange={onHaptics}
          testID="settings-haptics"
        />
        <Divider spacing="none" />
        <ToggleRow
          label="Reduzierte Bewegung"
          description="Weniger Animationen. „Bewegung reduzieren“ in den Systemeinstellungen wird immer beachtet."
          value={settings.reducedMotion}
          onValueChange={onReducedMotion}
          testID="settings-reduced-motion"
        />
      </Surface>

      {activeRun && overview ? (
        <>
          <SectionTitle>Expedition</SectionTitle>
          <Surface style={styles.card}>
            <AppText variant="bodyStrong">Laufende Expedition</AppText>
            <AppText variant="body" tone="secondary">
              {runOverviewCaption(overview)}
            </AppText>
            <Button
              label="Expedition abbrechen"
              icon="🏳️"
              variant="secondary"
              fullWidth
              onPress={onAbandon}
              accessibilityHint="Beendet die laufende Expedition nach einer Rückfrage."
              testID="settings-abandon"
            />
          </Surface>
        </>
      ) : null}

      <SectionTitle>Fortschritt</SectionTitle>
      <Surface style={styles.card}>
        <AppText variant="body" tone="secondary">
          {progressText(fossils, 'Fossilien entdeckt')} · {progressText(cards, 'Karten gesammelt')}
        </AppText>
        <AppText variant="body" tone="secondary">
          {homeStatsText(meta)}
        </AppText>
        <Button
          label="Fortschritt zurücksetzen"
          icon="🗑️"
          variant="danger"
          fullWidth
          onPress={onReset}
          accessibilityHint="Löscht nach zwei Rückfragen Fossilienbuch, Sammlung und Statistiken."
          testID="settings-reset"
        />
      </Surface>

      <SectionTitle>Über das Spiel</SectionTitle>
      <Surface style={styles.card}>
        <AppText variant="body">
          Fossil Frenzy ist ein Roguelike-Deckbuilder: Du sammelst Fossilienkarten und kämpfst dich durch Trias, Jura,
          Kreidezeit und Eiszeit.
        </AppText>
        {ABOUT_POINTS.map((point) => (
          <View key={point.icon} style={styles.point}>
            <AppText variant="body" accessible={false} importantForAccessibility="no">
              {point.icon}
            </AppText>
            <AppText variant="body" tone="secondary" style={styles.pointText}>
              {point.text}
            </AppText>
          </View>
        ))}
        <Divider />
        <AppText variant="label" tone="muted" align="center" testID="settings-version">
          Fossil Frenzy {APP_VERSION}
        </AppText>
      </Surface>
    </Screen>
  );
}

const styles = StyleSheet.create({
  group: { overflow: 'hidden' },
  card: { gap: spacing.md },
  point: { flexDirection: 'row', gap: spacing.sm },
  pointText: { flex: 1, minWidth: 0 },
});
