import { StatusBar } from 'expo-status-bar';
import { memo, useCallback, useMemo, useState } from 'react';
import { type LayoutChangeEvent, StyleSheet, View } from 'react-native';

import { CONTENT } from '@/data';
import { STATUS_INFO } from '@/engine/describe';
import { getIntent } from '@/engine/combat';
import type { CardInstance, CombatState, StatusId } from '@/engine/types';
import * as haptics from '@/lib/haptics';
import { useCurrentNode, useHydrated, useSettings } from '@/state/selectors';
import { useGameStore } from '@/state/store';
import type { GameStore } from '@/state/types';
import {
  AppText,
  colors,
  getCardView,
  HAND_SIDE_PADDING,
  MAX_CONTENT_WIDTH,
  spacing,
  useLayout,
  useReduceMotion,
  zIndex,
} from '@/ui';

import { enemyEmojiSize, HAND_TOP_SPACE, handCardWidthFor, isCompactArena, previewCardWidth } from './battleLayout';
import { BattleBottomBar } from './components/BattleBottomBar';
import { BattleCardDetail } from './components/BattleCardDetail';
import { BattleTopBar } from './components/BattleTopBar';
import { CardFlight } from './components/CardFlight';
import { CardPreview } from './components/CardPreview';
import { EnemyInfoSheet } from './components/EnemyInfoSheet';
import { EnemyZone } from './components/EnemyZone';
import { Hand } from './components/Hand';
import { HintToast } from './components/HintToast';
import { OutcomeOverlay } from './components/OutcomeOverlay';
import { PileSheet } from './components/PileSheet';
import { PlayerZone } from './components/PlayerZone';
import { TurnBanner } from './components/TurnBanner';
import { buildHandEntries, findHandEntry, hasAffordableCard } from './hand';
import { useBattleController } from './hooks/useBattleController';
import { type PileId, pileCards, pileCounts } from './piles';
import { BATTLE_TEXT } from './strings';

// The combat screen. Layout (portrait): top bar with act/floor and piles,
// arena (enemy + intent, player status), fanned hand and the thumb-zone
// actions. All game logic stays in the engine; this screen calls store
// actions and presents combat.events.

interface ShownCombat {
  nodeId: string;
  combat: CombatState;
  /** False once the store left this combat (route transition in progress). */
  live: boolean;
}

/**
 * The active combat, or the last one while the run moves on to the next
 * screen: the battle keeps showing its final state (and the outcome overlay)
 * during the route transition instead of flashing an empty screen.
 */
function useShownCombat(): ShownCombat | null {
  const [selector] = useState(() => {
    let last: ShownCombat | null = null;
    return (state: GameStore): ShownCombat | null => {
      const screen = state.run?.screen;
      if (screen?.type === 'combat') {
        if (last === null || !last.live || last.combat !== screen.combat || last.nodeId !== screen.nodeId) {
          last = { nodeId: screen.nodeId, combat: screen.combat, live: true };
        }
      } else if (last !== null && last.live) {
        last = { ...last, live: false };
      }
      return last;
    };
  });
  return useGameStore(selector);
}

const EMPTY_DECK: CardInstance[] = [];
const selectAct = (state: GameStore): number => state.run?.act ?? 0;
const selectDeck = (state: GameStore): CardInstance[] => state.run?.deck ?? EMPTY_DECK;

const claimResponder = () => true;

function statusHint(status: StatusId): string {
  const info = STATUS_INFO[status];
  return `${info.emoji} ${info.name}: ${info.description}`;
}

/** Route component of /run/battle. Waits for the saved game before acting. */
export function BattleScreen() {
  const hydrated = useHydrated();
  const shown = useShownCombat();
  if (!hydrated || shown === null) return <BattleLoading />;
  return <CombatView key={shown.nodeId} combat={shown.combat} frozen={!shown.live} />;
}

function BattleLoading() {
  return (
    <View style={styles.loading}>
      <StatusBar style="light" />
      <AppText variant="body" tone="muted">
        {BATTLE_TEXT.loading}
      </AppText>
    </View>
  );
}

const CombatView = memo(function CombatView({ combat, frozen }: { combat: CombatState; frozen: boolean }) {
  const layout = useLayout();
  const settings = useSettings();
  const reduce = useReduceMotion(settings.reducedMotion);
  const enemyDef = CONTENT.enemies[combat.enemy.defId];
  const controller = useBattleController({ combat, frozen, enemyDef, reduceMotion: reduce });
  const { selectCard, tryPlay, deselect, showHint } = controller;

  const act = useGameStore(selectAct);
  const deck = useGameStore(selectDeck);
  const node = useCurrentNode();

  const entries = useMemo(() => buildHandEntries(CONTENT, combat), [combat]);
  const intent = useMemo(() => (combat.phase === 'player' ? getIntent(CONTENT, combat) : null), [combat]);
  const counts = useMemo(() => pileCounts(combat, deck.length), [combat, deck.length]);
  const selected = findHandEntry(entries, controller.selectedUid);
  const selectedName = selected ? getCardView(selected.def, selected.upgraded).name : null;

  // Arena measurements for the enemy size and the card preview.
  const [arena, setArena] = useState({ height: 0, targetBottom: 0 });
  const onArenaLayout = useCallback((event: LayoutChangeEvent) => {
    const height = Math.round(event.nativeEvent.layout.height);
    setArena((current) => (current.height === height ? current : { ...current, height }));
  }, []);
  const onTargetLayout = useCallback((bottom: number) => {
    const targetBottom = Math.round(bottom);
    setArena((current) => (current.targetBottom === targetBottom ? current : { ...current, targetBottom }));
  }, []);

  // Sheets.
  const [detailUid, setDetailUid] = useState<string | null>(null);
  const [enemySheet, setEnemySheet] = useState(false);
  const [openPile, setOpenPile] = useState<PileId | null>(null);
  const detailEntry = findHandEntry(entries, detailUid);

  const onDetails = useCallback((uid: string) => {
    haptics.tapLight();
    setDetailUid(uid);
  }, []);
  const closeDetails = useCallback(() => setDetailUid(null), []);
  const playFromDetails = useCallback(
    (uid: string) => {
      setDetailUid(null);
      tryPlay(uid);
    },
    [tryPlay],
  );
  const playFromPreview = useCallback((uid: string) => tryPlay(uid), [tryPlay]);
  const selectedUid = controller.selectedUid;
  const onEnemyPress = useCallback(() => {
    if (selectedUid !== null) {
      tryPlay(selectedUid);
      return;
    }
    haptics.tapLight();
    setEnemySheet(true);
  }, [selectedUid, tryPlay]);
  const openEnemySheet = useCallback(() => {
    haptics.tapLight();
    setEnemySheet(true);
  }, []);
  const closeEnemySheet = useCallback(() => setEnemySheet(false), []);
  const onOpenPile = useCallback((pile: PileId) => {
    haptics.tapLight();
    setOpenPile(pile);
  }, []);
  const closePile = useCallback(() => setOpenPile(null), []);
  const onStatusPress = useCallback((status: StatusId) => showHint(statusHint(status), 'info', true), [showHint]);

  const { stage, locked, timings } = controller;
  const phase = combat.phase;
  const outcome = phase === 'won' ? 'victory' : phase === 'lost' ? 'defeat' : null;
  const gutter = layout.gutter;
  const arenaHeight = arena.height > 0 ? arena.height : Math.round(layout.height * 0.45);
  const compactArena = isCompactArena(arenaHeight);
  const previewWidth = previewCardWidth(arena.height, arena.targetBottom, layout.innerWidth);
  const flightWidth = handCardWidthFor(entries.length + 1, layout.handWidth, layout.height);
  const showPreview = selected !== null && previewWidth !== null && stage === 'player';
  const enemyName = enemyDef?.name ?? BATTLE_TEXT.unknownEnemy;

  const { top, left, right } = layout.insets;
  const frameStyle = useMemo(
    () => [styles.frame, { paddingTop: top, paddingLeft: left, paddingRight: right }],
    [top, left, right],
  );
  const gutterStyle = useMemo(() => ({ paddingHorizontal: gutter }), [gutter]);
  const arenaStyle = useMemo(() => [styles.arena, gutterStyle], [gutterStyle]);

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <View
        style={frameStyle}
        // Tap outside the cards and controls deselects the lifted card.
        onStartShouldSetResponder={selected ? claimResponder : undefined}
        onResponderRelease={deselect}
      >
        <View style={styles.column}>
          <View style={gutterStyle}>
            <BattleTopBar
              act={act}
              floor={node?.floor ?? null}
              nodeType={node?.type ?? null}
              counts={counts}
              compact={layout.isCompact}
              onOpenPile={onOpenPile}
            />
          </View>

          <View style={arenaStyle} onLayout={onArenaLayout} pointerEvents="box-none">
            <EnemyZone
              enemy={combat.enemy}
              def={enemyDef}
              intent={stage === 'player' ? intent : null}
              numbers={controller.enemyNumbers}
              onNumberDone={controller.removeEnemyNumber}
              hit={controller.enemyHit}
              lungeId={controller.enemyLunge}
              defeated={phase === 'won'}
              targetCardName={selectedName}
              targeting={selected?.affordable ?? false}
              emojiSize={enemyEmojiSize(arenaHeight)}
              compact={compactArena}
              reducedMotion={settings.reducedMotion}
              onPress={onEnemyPress}
              onIntentPress={openEnemySheet}
              onPressStatus={onStatusPress}
              onTargetLayout={onTargetLayout}
            />
            <PlayerZone
              player={combat.player}
              energy={combat.energy}
              maxEnergy={combat.maxEnergy}
              numbers={controller.playerNumbers}
              onNumberDone={controller.removePlayerNumber}
              hit={controller.playerHit}
              defeated={phase === 'lost'}
              compact={compactArena}
              reducedMotion={settings.reducedMotion}
              onPressStatus={onStatusPress}
            />

            {showPreview && selected && previewWidth !== null ? (
              <View style={styles.overlaySlot} pointerEvents="box-none">
                <CardPreview
                  key={selected.uid}
                  entry={selected}
                  width={previewWidth}
                  shakeId={controller.shake.uid === selected.uid ? controller.shake.id : 0}
                  reduce={reduce}
                  onPlay={playFromPreview}
                  onDetails={onDetails}
                />
              </View>
            ) : null}
            {controller.flight ? (
              <View style={styles.overlaySlot} pointerEvents="none">
                <CardFlight
                  key={controller.flight.id}
                  flight={controller.flight}
                  width={flightWidth}
                  distance={Math.max(120, arenaHeight * 0.55)}
                  duration={timings.flight}
                  onDone={controller.finishFlight}
                />
              </View>
            ) : null}
            <TurnBanner banner={controller.banner} hold={timings.turnBanner} reduce={reduce} />
            <HintToast message={controller.hint} bottom={HAND_TOP_SPACE + spacing.sm} />
          </View>

          <Hand
            entries={entries}
            width={layout.handWidth}
            windowHeight={layout.height}
            selectedUid={controller.selectedUid}
            locked={locked}
            leaving={stage === 'discard' || phase !== 'player'}
            hidden={stage === 'enemy'}
            shake={controller.shake}
            reduce={reduce}
            onSelect={selectCard}
            onPlay={tryPlay}
            onDetails={onDetails}
          />

          <BattleBottomBar
            selected={selected}
            logLine={controller.logLine}
            locked={locked}
            nudgeEndTurn={!hasAffordableCard(entries)}
            stacked={layout.isCompact && layout.fontScale >= 1.3}
            gutter={gutter}
            bottomInset={layout.insets.bottom}
            onPlaySelected={controller.playSelected}
            onEndTurn={controller.endTurn}
          />
        </View>
      </View>

      {outcome ? (
        <OutcomeOverlay outcome={outcome} enemyName={enemyName} delay={timings.outcomeDelay} reduce={reduce} />
      ) : null}

      <EnemyInfoSheet
        visible={enemySheet}
        onClose={closeEnemySheet}
        enemy={combat.enemy}
        def={enemyDef}
        intent={intent}
        reducedMotion={settings.reducedMotion}
      />
      <PileSheet
        pile={openPile}
        cards={openPile ? pileCards(openPile, combat, deck) : EMPTY_DECK}
        onClose={closePile}
        reducedMotion={settings.reducedMotion}
      />
      <BattleCardDetail
        entry={detailEntry}
        locked={locked}
        reducedMotion={settings.reducedMotion}
        onClose={closeDetails}
        onPlay={playFromDetails}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  frame: { flex: 1 },
  column: { flex: 1, width: '100%', maxWidth: MAX_CONTENT_WIDTH, alignSelf: 'center' },
  arena: { flex: 1, zIndex: zIndex.base },
  overlaySlot: {
    position: 'absolute',
    left: 0,
    right: 0,
    // Above the hand's lift space, so the lifted card never covers it.
    bottom: HAND_TOP_SPACE,
    alignItems: 'center',
    zIndex: zIndex.raised,
    paddingHorizontal: HAND_SIDE_PADDING,
  },
});
