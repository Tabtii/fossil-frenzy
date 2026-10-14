import { router, useIsFocused } from 'expo-router';
import { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import { CONTENT } from '@/data';
import { ROUTES, routeForScreen } from '@/features/navigation';
import { confirmAction } from '@/features/shell/confirm';
import { ContinueButton } from '@/features/shell/ContinueButton';
import { EraParade } from '@/features/shell/EraParade';
import { FossilSky } from '@/features/shell/FossilSky';
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
import { AppText, Button, colors, ERA_ICONS, fontScale, Screen, spacing, useLayout, useReduceMotion } from '@/ui';

const TITLE_MAX_SIZE = 46;

export default function HomeScreen() {
  const hydrated = useHydrated();
  const meta = useMeta();
  const overview = useGameStore(useShallow((state) => runOverview(state.run)));
  const { newRun, finishRun } = useGameActions();
  const { innerWidth } = useLayout();
  const focused = useIsFocused();
  const reduceMotion = useReduceMotion(meta.settings.reducedMotion);
  const animate = focused && !reduceMotion;
  const guard = usePressGuard();

  const fossils = fossilProgress(meta.fossils, CONTENT);
  const cards = cardProgress(meta.cardsSeen, CONTENT);
  const activeRun = overview?.status === 'active';

  const startRun = useCallback(() => {
    const previous = useGameStore.getState().run;
    // A finished but not yet closed run (e.g. app closed on the summary) still counts.
    if (previous && (previous.screen.type === 'victory' || previous.screen.type === 'defeat')) finishRun();
    newRun();
    const run = useGameStore.getState().run;
    if (!run || run === previous) return;
    haptics.selection();
    router.push(routeForScreen(run.screen));
  }, [finishRun, newRun]);

  const onNewRun = useCallback(() => {
    if (!activeRun || !overview) {
      guard(startRun);
      return;
    }
    confirmAction({
      title: 'Neue Expedition starten?',
      message: `Deine laufende Expedition (${runOverviewCaption(overview)}) wird abgebrochen und kann nicht fortgesetzt werden.`,
      confirmLabel: 'Neu starten',
      onConfirm: () => guard(startRun),
    });
  }, [activeRun, overview, guard, startRun]);

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

  // Font size ≈ column width / 7.8 keeps the bold "Fossil Frenzy" on one line from 320 dp up.
  const titleSize = Math.min(TITLE_MAX_SIZE, Math.floor(innerWidth / 7.8));
  const titleStyle = { fontSize: titleSize, lineHeight: Math.round(titleSize * 1.18) };

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
      <View style={styles.tiles}>
        <MenuTile
          icon="📖"
          title="Fossilienbuch"
          caption={progressText(fossils, 'entdeckt')}
          onPress={onFossils}
          testID="home-fossils"
        />
        <MenuTile
          icon="🃏"
          title="Sammlung"
          caption={progressText(cards, 'Karten')}
          onPress={onCollection}
          testID="home-collection"
        />
      </View>
      <Button label="Einstellungen" icon="⚙️" variant="ghost" fullWidth onPress={onSettings} testID="home-settings" />
    </>
  );

  return (
    <View style={styles.root}>
      <FossilSky active={animate} />
      <Screen scroll backgroundColor={colors.transparent} contentStyle={styles.body} footer={footer}>
        <View style={styles.hero}>
          <EraParade width={innerWidth} active={animate} />
          <AppText
            variant="display"
            align="center"
            accessibilityRole="header"
            style={titleStyle}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.6}
            maxFontSizeMultiplier={fontScale.badge}
          >
            <AppText variant="display" tone="accent" style={titleStyle} maxFontSizeMultiplier={fontScale.badge}>
              Fossil
            </AppText>{' '}
            Frenzy
          </AppText>
          <AppText variant="subheading" tone="secondary" align="center">
            Grabe dich durch über 250 Millionen Jahre Erdgeschichte – von der Trias bis zur Eiszeit.
          </AppText>
        </View>
        <AppText
          variant="label"
          tone="muted"
          align="center"
          accessibilityLabel={homeStatsAccessibilityLabel(meta)}
          style={styles.stats}
        >
          {homeStatsText(meta)}
        </AppText>
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  body: { justifyContent: 'center', gap: spacing.xl, paddingTop: spacing.xl },
  hero: { alignItems: 'center', gap: spacing.md },
  stats: { paddingHorizontal: spacing.sm },
  tiles: { flexDirection: 'row', gap: spacing.sm },
});
