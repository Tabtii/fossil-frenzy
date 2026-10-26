import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import { CONTENT } from '@/data';
import { ROUTES, routeForScreen } from '@/features/navigation';
import { confirmAction } from '@/features/shell/confirm';
import { ContinueButton } from '@/features/shell/ContinueButton';
import { ExpeditionSetupSheet, type ExpeditionSetupMode } from '@/features/shell/ExpeditionSetupSheet';
import { FieldGuideSheet } from '@/features/shell/FieldGuideSheet';
import { usePressGuard } from '@/features/shell/hooks';
import { MenuTile } from '@/features/shell/MenuTile';
import {
  cardProgress,
  fossilProgress,
  homeStatsAccessibilityLabel,
  homeStatsText,
  progressText,
  runOverview,
  runOverviewAccessibilityLabel,
  runOverviewCaption,
} from '@/features/shell/model';
import * as haptics from '@/lib/haptics';
import { useGameActions, useHydrated, useMeta } from '@/state/selectors';
import { useGameStore } from '@/state/store';
import { AppText, Button, colors, ERA_ICONS, IconButton, radii, Screen, spacing, useLayout } from '@/ui';

export default function HomeScreen() {
  const hydrated = useHydrated();
  const meta = useMeta();
  const overview = useGameStore(useShallow((state) => runOverview(state.run)));
  const { newRun, finishRun } = useGameActions();
  const { isCompact, fontScale: systemFontScale } = useLayout();
  // Two tiles side by side truncate their titles on small phones or large text.
  const stackTiles = isCompact || systemFontScale >= 1.3;
  const guard = usePressGuard();
  const [setupMode, setSetupMode] = useState<ExpeditionSetupMode>(null);
  const [guideOpen, setGuideOpen] = useState(false);

  const fossils = fossilProgress(meta.fossils, CONTENT);
  const cards = cardProgress(meta.cardsSeen, CONTENT);
  const activeRun = overview?.status === 'active';

  const startRun = useCallback((seed?: number) => {
    const previous = useGameStore.getState().run;
    // A finished but not yet closed run (e.g. app closed on the summary) still counts.
    if (previous && (previous.screen.type === 'victory' || previous.screen.type === 'defeat')) finishRun();
    newRun(seed);
    const run = useGameStore.getState().run;
    if (!run || run === previous) return;
    haptics.selection();
    router.push(routeForScreen(run.screen));
  }, [finishRun, newRun]);

  const requestRun = useCallback((seed?: number) => {
    const start = () => {
      setSetupMode(null);
      startRun(seed);
    };
    if (!activeRun || !overview) {
      guard(start);
      return;
    }
    confirmAction({
      title: 'Neue Expedition starten?',
      message: `Deine laufende Expedition (${runOverviewCaption(overview)}) wird abgebrochen und kann nicht fortgesetzt werden.`,
      confirmLabel: 'Neu starten',
      onConfirm: () => guard(start),
    });
  }, [activeRun, overview, guard, startRun]);
  const onNewRun = useCallback(() => requestRun(), [requestRun]);

  const onContinue = useCallback(() => {
    guard(() => {
      const run = useGameStore.getState().run;
      if (!run) return;
      haptics.tapLight();
      router.push(routeForScreen(run.screen));
    });
  }, [guard]);

  const open = useCallback(
    (route: typeof ROUTES.fossils | typeof ROUTES.collection | typeof ROUTES.settings) => {
      guard(() => {
        haptics.tapLight();
        router.push(route);
      });
    },
    [guard],
  );
  const onFossils = useCallback(() => open(ROUTES.fossils), [open]);
  const onCollection = useCallback(() => open(ROUTES.collection), [open]);
  const onSettings = useCallback(() => open(ROUTES.settings), [open]);

  const footer = (
    <>
      {overview ? (
        <ContinueButton
          title={activeRun ? 'Weiterspielen' : 'Ergebnis ansehen'}
          caption={runOverviewCaption(overview)}
          icon={activeRun ? ERA_ICONS[overview.era] : overview.status === 'victory' ? '🏆' : '🦴'}
          onPress={onContinue}
          disabled={!hydrated}
          accessibilityLabel={`${activeRun ? 'Weiterspielen' : 'Ergebnis ansehen'}: ${runOverviewAccessibilityLabel(overview)}`}
          testID="home-continue"
        />
      ) : null}
      <Button
        label="Neue Expedition"
        icon="🧭"
        size="lg"
        variant={activeRun ? 'secondary' : 'primary'}
        fullWidth
        disabled={!hydrated}
        onPress={onNewRun}
        accessibilityHint={activeRun ? 'Bricht die laufende Expedition nach einer Rückfrage ab.' : undefined}
        testID="home-new-run"
      />
    </>
  );

  return (
    <Screen scroll
      header={
        <View style={styles.masthead}>
          <View style={styles.brand}>
            <AppText variant="overline" tone="muted">DEIN EXPEDITIONSLAGER</AppText>
            <AppText variant="title" accessibilityRole="header"><AppText variant="title" tone="accent">Fossil</AppText> Frenzy</AppText>
          </View>
          <IconButton icon="⚙️" accessibilityLabel="Einstellungen" onPress={onSettings} testID="home-settings" />
        </View>
      }
      contentStyle={styles.body}
      footer={footer}
    >
      <View style={styles.hero}>
        <Image source={require('../../assets/art/expedition-valley.webp')} resizeMode="cover" style={[StyleSheet.absoluteFill, styles.heroImage]} accessible={false} />
        <View style={styles.heroCaption}>
          <AppText variant="overline" tone="accent">EIN DECK. MILLIONEN JAHRE.</AppText>
          <AppText variant="heading">Die Urzeit wartet auf dich.</AppText>
          <AppText variant="caption" tone="secondary">4 Zeitalter · {Object.keys(CONTENT.cards).length} Karten · dein Weg</AppText>
        </View>
      </View>
      <AppText variant="label" tone="muted" accessibilityLabel={homeStatsAccessibilityLabel(meta)}>
        {homeStatsText(meta)}
      </AppText>
      <View style={styles.sectionHeading}>
        <AppText variant="subheading">Deine Entdeckungen</AppText>
        <AppText variant="overline" tone="accent">FELDARCHIV</AppText>
      </View>
      <View style={stackTiles ? styles.tilesStacked : styles.tiles}>
        <MenuTile
          icon="📖"
          title="Dino-Wiki"
          caption={`${fossils.total} Steckbriefe · ${fossils.found} Funde`}
          onPress={onFossils}
          vertical={!stackTiles}
          style={stackTiles ? styles.tileStacked : undefined}
          testID="home-fossils"
        />
        <MenuTile
          icon="🃏"
          title="Sammlung"
          caption={progressText(cards, 'Karten')}
          onPress={onCollection}
          vertical={!stackTiles}
          style={stackTiles ? styles.tileStacked : undefined}
          testID="home-collection"
        />
      </View>
      <View style={styles.expeditions}>
        <AppText variant="overline" tone="accent">NEUE SPUREN</AppText>
        <AppText variant="subheading">Ein neuer Tag. Eine neue Expedition.</AppText>
        <AppText variant="caption" tone="secondary">Erkunde die Tageswelt oder folge einem Expeditionscode.</AppText>
        <View style={stackTiles ? styles.tilesStacked : styles.tiles}>
          <Button label="Heute spielen" variant="secondary" disabled={!hydrated} onPress={() => setSetupMode('daily')} style={styles.flex} testID="home-daily" />
          <Button label="Mit Code" variant="ghost" accessibilityLabel="Expeditionscode eingeben" disabled={!hydrated} onPress={() => setSetupMode('code')} style={styles.flex} testID="home-code" />
        </View>
      </View>
      <Button label="So spielst du Fossil Frenzy" icon="📒" variant="ghost" onPress={() => setGuideOpen(true)} fullWidth testID="home-guide" />
      <ExpeditionSetupSheet mode={setupMode} onClose={() => setSetupMode(null)} onStart={requestRun} reducedMotion={meta.settings.reducedMotion} />
      <FieldGuideSheet visible={guideOpen} onClose={() => setGuideOpen(false)} reducedMotion={meta.settings.reducedMotion} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  masthead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.xl, paddingVertical: spacing.lg },
  brand: { flex: 1, gap: spacing.xxs },
  body: { gap: spacing.lg, paddingTop: spacing.xs },
  hero: { aspectRatio: 1.42, borderRadius: radii.xl, overflow: 'hidden', borderWidth: 1, borderColor: colors.borderStrong, justifyContent: 'flex-end', backgroundColor: colors.surface },
  heroImage: { width: '100%', height: '100%' },
  heroCaption: { padding: spacing.lg, gap: spacing.xs, backgroundColor: colors.artCaption },
  sectionHeading: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.xs },
  expeditions: { gap: spacing.sm, padding: spacing.lg, borderRadius: radii.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  flex: { flex: 1 },
  tiles: { flexDirection: 'row', gap: spacing.sm },
  tilesStacked: { gap: spacing.sm },
  tileStacked: { flex: 0 },
});
