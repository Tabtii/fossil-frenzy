import { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

import { CONTENT } from '@/data';
import { canPlay } from '@/engine/combat';
import type { CardDef, CombatEvent, CombatState, EnemyDef } from '@/engine/types';
import { playCombatHaptics } from '@/lib/feedback';
import * as haptics from '@/lib/haptics';
import { selectCombat, useGameActions } from '@/state/selectors';
import { useGameStore } from '@/state/store';
import { type FloatingNumberItem, getCardView, useFloatingNumberQueue } from '@/ui';

import { type ActionFeedback, planActionFeedback } from '../feedback';
import { cardPlayAnnouncement, enemyTurnAnnouncement, enemyTurnLogLine, logLineFromEvents } from '../log';
import { BATTLE_TEXT, turnLabel } from '../strings';
import { type BattleTimings, battleTimings, resolveDelay } from '../timing';
import { useTimers } from './useTimers';
import { type MessageTone, type TransientMessage, useTransientMessage } from './useTransientMessage';

// Interaction and presentation state of one combat. The engine resolves every
// action synchronously; this hook paces the presentation (enemy turn, combat
// end) and turns combat.events into feedback. It reads the live combat from
// the store inside handlers, so callbacks stay stable and never act on a
// stale render.

/** 'discard': hand leaves after "Zug beenden"; 'enemy': enemy action is shown. */
export type BattleStage = 'player' | 'discard' | 'enemy';

export interface TurnBannerState {
  id: number;
  text: string;
  tone: 'player' | 'enemy';
  /** Stays until replaced (the enemy turn); otherwise fades out by itself. */
  persistent: boolean;
}

/** Trigger for a one-shot effect: a new id starts it, after `delay` ms. */
export interface FxToken {
  id: number;
  delay: number;
}

export interface ShakeState {
  uid: string | null;
  id: number;
}

export interface FlightState {
  id: number;
  def: CardDef;
  upgraded: boolean;
  /** Horizontal start offset from the arena centre (dp). */
  offsetX: number;
  towardEnemy: boolean;
}

export interface BattleController {
  timings: BattleTimings;
  /** Selected hand card (null when it left the hand or input is blocked). */
  selectedUid: string | null;
  stage: BattleStage;
  /** No card plays or turn ends possible right now. */
  locked: boolean;
  banner: TurnBannerState | null;
  logLine: string | null;
  hint: TransientMessage | null;
  enemyNumbers: FloatingNumberItem[];
  playerNumbers: FloatingNumberItem[];
  removeEnemyNumber: (id: FloatingNumberItem['id']) => void;
  removePlayerNumber: (id: FloatingNumberItem['id']) => void;
  enemyHit: FxToken;
  enemyLunge: number;
  playerHit: FxToken;
  shake: ShakeState;
  flight: FlightState | null;
  selectCard: (uid: string) => void;
  deselect: () => void;
  /** Plays a hand card (or rejects it with shake, haptics and a hint). */
  tryPlay: (uid: string, offsetX?: number) => void;
  playSelected: () => void;
  endTurn: () => void;
  finishFlight: (id: number) => void;
  showHint: (text: string, tone: MessageTone, long?: boolean) => void;
}

interface Options {
  combat: CombatState;
  /** The store has already left this combat (screen is transitioning away). */
  frozen: boolean;
  enemyDef: EnemyDef | undefined;
  reduceMotion: boolean;
}

const NO_FX: FxToken = { id: 0, delay: 0 };

function announce(text: string): void {
  if (text.length > 0) AccessibilityInfo.announceForAccessibility(text);
}

function liveCombat(): CombatState | null {
  return selectCombat(useGameStore.getState());
}

function initialBanner(combat: CombatState): TurnBannerState | null {
  const fresh = combat.phase === 'player' && combat.events.some((event) => event.type === 'turnStart');
  return fresh ? { id: 1, text: turnLabel(combat.turn), tone: 'player', persistent: false } : null;
}

export function useBattleController({ combat, frozen, enemyDef, reduceMotion }: Options): BattleController {
  const actions = useGameActions();
  const timings = battleTimings(reduceMotion);
  const timers = useTimers();
  const hint = useTransientMessage();
  const enemyQueue = useFloatingNumberQueue();
  const playerQueue = useFloatingNumberQueue();
  const { pushMany: pushEnemyNumbers, remove: removeEnemyNumber } = enemyQueue;
  const { pushMany: pushPlayerNumbers, remove: removePlayerNumber } = playerQueue;
  const { show: showMessage } = hint;

  const [selectedUid, setSelectedUid] = useState<string | null>(null);
  const [stage, setStageState] = useState<BattleStage>('player');
  const [banner, setBanner] = useState<TurnBannerState | null>(() => initialBanner(combat));
  const [logLine, setLogLine] = useState<string | null>(() => logLineFromEvents(enemyDef, combat.events));
  const [enemyHit, setEnemyHit] = useState<FxToken>(NO_FX);
  const [enemyLunge, setEnemyLunge] = useState(0);
  const [playerHit, setPlayerHit] = useState<FxToken>(NO_FX);
  const [shake, setShake] = useState<ShakeState>({ uid: null, id: 0 });
  const [flight, setFlight] = useState<FlightState | null>(null);

  // Written only in handlers; read only in handlers.
  const stageRef = useRef<BattleStage>('player');
  const selectedRef = useRef<string | null>(null);
  const nextId = useRef(2);
  const resolvedRef = useRef(false);

  const takeId = useCallback(() => {
    const id = nextId.current;
    nextId.current += 1;
    return id;
  }, []);

  const setStage = useCallback((next: BattleStage) => {
    stageRef.current = next;
    setStageState(next);
  }, []);

  const setSelection = useCallback((uid: string | null) => {
    selectedRef.current = uid;
    setSelectedUid(uid);
  }, []);

  const showHint = useCallback(
    (text: string, tone: MessageTone, long = false) => {
      showMessage(text, tone, long ? timings.longHint : timings.hint);
    },
    [showMessage, timings],
  );

  /** Floating numbers, hit effects, haptics, log and announcements for one action. */
  const applyFeedback = useCallback(
    (events: readonly CombatEvent[], feedback: ActionFeedback, source: 'card' | 'enemy', cardName = '') => {
      const delay = source === 'enemy' && feedback.enemyAttacked ? timings.enemyHitDelay : 0;

      pushEnemyNumbers(feedback.enemyNumbers);
      if (feedback.enemyHit) setEnemyHit((token) => ({ id: token.id + 1, delay: 0 }));
      if (feedback.enemyAttacked && !feedback.selfHit) setEnemyLunge((count) => count + 1);
      if (feedback.playerHit) setPlayerHit((token) => ({ id: token.id + 1, delay }));
      if (delay > 0) {
        timers.schedule(delay, () => {
          pushPlayerNumbers(feedback.playerNumbers);
          playCombatHaptics(events);
        });
      } else {
        pushPlayerNumbers(feedback.playerNumbers);
        playCombatHaptics(events);
      }

      if (source === 'enemy') {
        const line = enemyTurnLogLine(enemyDef, feedback);
        if (line !== null) setLogLine(line);
        announce(enemyTurnAnnouncement(enemyDef, feedback));
      } else {
        announce(cardPlayAnnouncement(cardName, feedback));
      }
    },
    [enemyDef, pushEnemyNumbers, pushPlayerNumbers, timers, timings],
  );

  const reject = useCallback(
    (uid: string) => {
      setShake((current) => ({ uid, id: current.id + 1 }));
      haptics.error();
      showHint(BATTLE_TEXT.notEnoughEnergy, 'danger');
      announce(BATTLE_TEXT.notEnoughEnergy);
    },
    [showHint],
  );

  const selectCard = useCallback(
    (uid: string) => {
      if (stageRef.current !== 'player' || selectedRef.current === uid) return;
      const current = liveCombat();
      if (!current || current.phase !== 'player' || !current.hand.some((card) => card.uid === uid)) return;
      setSelection(uid);
      haptics.selection();
    },
    [setSelection],
  );

  const deselect = useCallback(() => {
    if (selectedRef.current !== null) setSelection(null);
  }, [setSelection]);

  const tryPlay = useCallback(
    (uid: string, offsetX = 0) => {
      if (stageRef.current !== 'player') return;
      const before = liveCombat();
      if (!before) return;
      const check = canPlay(CONTENT, before, uid);
      if (!check.ok) {
        if (check.reason === 'notEnoughEnergy') reject(uid);
        return;
      }
      const card = before.hand.find((c) => c.uid === uid);
      actions.playCard(uid);
      const after = liveCombat();
      setSelection(null);
      if (!after || after === before) return;

      const def = card ? CONTENT.cards[card.defId] : undefined;
      const feedback = planActionFeedback(after.events);
      if (def && card && timings.flight > 0) {
        setFlight({ id: takeId(), def, upgraded: card.upgraded, offsetX, towardEnemy: feedback.targetsEnemy });
      }
      applyFeedback(after.events, feedback, 'card', def && card ? getCardView(def, card.upgraded).name : '');
    },
    [actions, applyFeedback, reject, setSelection, takeId, timings],
  );

  const playSelected = useCallback(() => {
    const uid = selectedRef.current;
    if (uid !== null) tryPlay(uid);
  }, [tryPlay]);

  const endTurn = useCallback(() => {
    if (stageRef.current !== 'player') return;
    const current = liveCombat();
    if (!current || current.phase !== 'player') return;
    haptics.tapLight();
    setSelection(null);
    setStage('discard');
    setBanner({ id: takeId(), text: BATTLE_TEXT.enemyTurn, tone: 'enemy', persistent: true });

    timers.schedule(timings.discard, () => {
      const before = liveCombat();
      if (!before || before.phase !== 'player') {
        setStage('player');
        setBanner(null);
        return;
      }
      actions.endTurn();
      const after = liveCombat();
      if (!after || after === before) {
        setStage('player');
        setBanner(null);
        return;
      }
      setStage('enemy');
      applyFeedback(after.events, planActionFeedback(after.events), 'enemy');
      // Victory/defeat: the outcome effect below takes over; input stays blocked.
      if (after.phase !== 'player') {
        setBanner(null);
        return;
      }
      timers.schedule(timings.enemyAct, () => {
        setStage('player');
        setBanner({ id: takeId(), text: turnLabel(after.turn), tone: 'player', persistent: false });
      });
    });
  }, [actions, applyFeedback, setSelection, setStage, takeId, timers, timings]);

  const finishFlight = useCallback((id: number) => {
    setFlight((current) => (current?.id === id ? null : current));
  }, []);

  // Combat end: show the result, then resolve exactly once. Also covers a
  // restored save that is already won/lost. The timer is re-created by
  // StrictMode's effect replay, the ref guard and the live-store check make a
  // second call impossible.
  const phase = combat.phase;
  useEffect(() => {
    if (phase === 'player') return;
    const id = setTimeout(() => {
      const current = liveCombat();
      if (!current || current.phase === 'player' || resolvedRef.current) return;
      resolvedRef.current = true;
      actions.resolveCombat();
    }, resolveDelay(timings, phase));
    return () => clearTimeout(id);
  }, [phase, actions, timings]);

  const locked = frozen || stage !== 'player' || phase !== 'player';
  const selectionValid =
    !locked && selectedUid !== null && combat.hand.some((card) => card.uid === selectedUid);

  return {
    timings,
    selectedUid: selectionValid ? selectedUid : null,
    stage,
    locked,
    banner,
    logLine,
    hint: hint.message,
    enemyNumbers: enemyQueue.items,
    playerNumbers: playerQueue.items,
    removeEnemyNumber,
    removePlayerNumber,
    enemyHit,
    enemyLunge,
    playerHit,
    shake,
    flight,
    selectCard,
    deselect,
    tryPlay,
    playSelected,
    endTurn,
    finishFlight,
    showHint,
  };
}
