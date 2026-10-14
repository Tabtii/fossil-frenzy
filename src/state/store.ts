import AsyncStorage from '@react-native-async-storage/async-storage';
import { create, type StoreApi } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { CONTENT } from '@/data';
import {
  ACT_COUNT,
  chooseCardReward as engineChooseCardReward,
  chooseDig as engineChooseDig,
  chooseRest as engineChooseRest,
  createRun,
  currentNode,
  deckFossils,
  enterNode as engineEnterNode,
  resolveCombat as engineResolveCombat,
  runEndTurn,
  runPlayCard,
  startNextAct as engineStartNextAct,
} from '@/engine/run';
import type {
  CardInstance,
  CombatState,
  ContentDB,
  MapNode,
  MetaState,
  RunScreen,
  RunState,
  RunStats,
} from '@/engine/types';
import {
  discoverFossils,
  initialMeta,
  markCardsSeen,
  recordRunFinished,
  recordRunProgress,
  recordRunStarted,
  resetMeta,
  sanitizeMeta,
  updateSettings as updateMetaSettings,
} from './meta';
import type { GameStore } from './types';

// App state: the current run (driven by the pure engine in src/engine/run.ts)
// plus the meta progression, persisted to AsyncStorage. Store actions never
// throw: invalid actions are no-ops and unexpected engine errors are logged.

export const STORAGE_KEY = 'fossil-frenzy/v2';
/** Bump when the persisted shape changes and extend `migratePersisted`. */
export const STORAGE_VERSION = 1;

export type PersistedGame = Pick<GameStore, 'run' | 'meta'>;

/** Time-based run seed (the engine itself never reads the clock). */
export function makeSeed(): number {
  return Date.now() >>> 0;
}

function nowIso(): string {
  return new Date().toISOString();
}

function reportError(action: string, error: unknown): void {
  console.error(`[store] action "${action}" failed:`, error);
}

/** Fossil find + "cards seen" for one card def gained during a run. */
function discoverCard(meta: MetaState, defId: string): MetaState {
  const def = CONTENT.cards[defId];
  const withFossil = def ? discoverFossils(meta, [def.fossilId], nowIso()) : meta;
  return markCardsSeen(withFossil, [defId]);
}

// ---------------------------------------------------------------------------
// Persistence: sanitising and migration
// ---------------------------------------------------------------------------

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

const NODE_TYPES = new Set(['fight', 'elite', 'rest', 'dig', 'boss']);
const PHASES = new Set(['player', 'won', 'lost']);

function isCardList(value: unknown, db: ContentDB): value is CardInstance[] {
  return (
    Array.isArray(value) &&
    value.every(
      (card) =>
        isRecord(card) &&
        typeof card.uid === 'string' &&
        typeof card.defId === 'string' &&
        typeof card.upgraded === 'boolean' &&
        db.cards[card.defId] !== undefined,
    )
  );
}

function isCardChoices(value: unknown, db: ContentDB): value is string[] {
  return isStringArray(value) && value.every((id) => db.cards[id] !== undefined);
}

function isMap(value: unknown, db: ContentDB): value is MapNode[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every(
      (node) =>
        isRecord(node) &&
        typeof node.id === 'string' &&
        isNumber(node.floor) &&
        isNumber(node.lane) &&
        typeof node.type === 'string' &&
        NODE_TYPES.has(node.type) &&
        isStringArray(node.next) &&
        (node.enemyId === undefined ||
          (typeof node.enemyId === 'string' && db.enemies[node.enemyId] !== undefined)),
    )
  );
}

function isCombatant(value: unknown): boolean {
  return (
    isRecord(value) &&
    isNumber(value.hp) &&
    isNumber(value.maxHp) &&
    isNumber(value.block) &&
    isRecord(value.statuses)
  );
}

function isCombat(value: unknown, db: ContentDB): value is CombatState {
  if (!isRecord(value)) return false;
  const { enemy } = value;
  return (
    isCombatant(value.player) &&
    isCombatant(enemy) &&
    isRecord(enemy) &&
    typeof enemy.defId === 'string' &&
    db.enemies[enemy.defId] !== undefined &&
    typeof enemy.nextMoveId === 'string' &&
    isStringArray(enemy.history) &&
    isCardList(value.drawPile, db) &&
    isCardList(value.hand, db) &&
    isCardList(value.discardPile, db) &&
    isCardList(value.exhaustPile, db) &&
    isNumber(value.energy) &&
    isNumber(value.maxEnergy) &&
    isNumber(value.turn) &&
    isNumber(value.cardsPlayedThisTurn) &&
    isNumber(value.attacksPlayedThisTurn) &&
    typeof value.phase === 'string' &&
    PHASES.has(value.phase) &&
    isNumber(value.rngState) &&
    Array.isArray(value.events)
  );
}

function isScreen(value: unknown, db: ContentDB, nodeIds: Set<string>): value is RunScreen {
  if (!isRecord(value)) return false;
  const hasNode = typeof value.nodeId === 'string' && nodeIds.has(value.nodeId);
  switch (value.type) {
    case 'map':
    case 'victory':
      return true;
    case 'actComplete':
      return isNumber(value.act);
    case 'rest':
    case 'defeat':
      return hasNode;
    case 'combat':
      return hasNode && isCombat(value.combat, db);
    case 'dig':
      return hasNode && isCardChoices(value.choices, db);
    case 'reward': {
      const { reward } = value;
      return (
        hasNode &&
        isRecord(reward) &&
        isCardChoices(reward.choices, db) &&
        isStringArray(reward.fossilsFound) &&
        isNumber(reward.maxHpGain)
      );
    }
    default:
      return false;
  }
}

function sanitizeStats(raw: unknown): RunStats {
  const stats = isRecord(raw) ? raw : {};
  const read = (key: keyof RunStats): number => {
    const value = stats[key];
    return isNumber(value) && value > 0 ? Math.floor(value) : 0;
  };
  return {
    enemiesDefeated: read('enemiesDefeated'),
    elitesDefeated: read('elitesDefeated'),
    bossesDefeated: read('bossesDefeated'),
    cardsPlayed: read('cardsPlayed'),
    damageDealt: read('damageDealt'),
    floorsCleared: read('floorsCleared'),
  };
}

/**
 * Validates a run loaded from storage. Returns null when the run is broken or
 * references content that no longer exists (e.g. a removed card), so a
 * content update can never crash the app on launch.
 */
export function sanitizeRun(raw: unknown, db: ContentDB = CONTENT): RunState | null {
  if (!isRecord(raw)) return null;
  const { seed, rngState, act, hp, maxHp, nextUid, map, currentNodeId, visited, deck, screen } = raw;
  if (!isNumber(seed) || !isNumber(rngState) || !isNumber(nextUid)) return null;
  if (!isNumber(act) || act < 0 || act >= ACT_COUNT) return null;
  if (!isNumber(hp) || !isNumber(maxHp) || maxHp <= 0) return null;
  if (!isMap(map, db) || !isStringArray(visited) || !isCardList(deck, db)) return null;
  const nodeIds = new Set(map.map((node) => node.id));
  if (currentNodeId !== null && !(typeof currentNodeId === 'string' && nodeIds.has(currentNodeId))) {
    return null;
  }
  if (!isScreen(screen, db, nodeIds)) return null;
  return {
    seed,
    rngState,
    act,
    map,
    currentNodeId,
    visited,
    deck,
    hp,
    maxHp,
    nextUid,
    screen,
    stats: sanitizeStats(raw.stats),
  };
}

/** Turns anything loaded from storage into a valid persisted state. */
export function sanitizePersisted(raw: unknown, db: ContentDB = CONTENT): PersistedGame {
  if (!isRecord(raw)) return { run: null, meta: initialMeta() };
  return { run: sanitizeRun(raw.run, db), meta: sanitizeMeta(raw.meta) };
}

/**
 * Migrates a persisted state written with an older (or unknown) version.
 * Version 1 is the first v2 save format, so every older shape is simply
 * sanitised (keeping whatever is still valid).
 */
export function migratePersisted(persisted: unknown, version: number): PersistedGame {
  if (version !== STORAGE_VERSION) {
    console.warn(`[store] migrating saved state from version ${version} to ${STORAGE_VERSION}`);
  }
  return sanitizePersisted(persisted);
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

type MetaSync = (meta: MetaState, next: RunState) => MetaState;

let storeApi: StoreApi<GameStore> | null = null;

export const useGameStore = create<GameStore>()(
  persist(
    (set, get, api) => {
      storeApi = api;

      /** Runs one engine step on the current run; no-op without a run or change. */
      const applyRun = (action: string, step: (run: RunState) => RunState, sync?: MetaSync): void => {
        const { run, meta } = get();
        if (!run) return;
        let next: RunState;
        try {
          next = step(run);
        } catch (error) {
          reportError(action, error);
          return;
        }
        if (next === run) return;
        set({ run: next, meta: sync ? sync(meta, next) : meta });
      };

      return {
        hydrated: false,
        run: null,
        meta: initialMeta(),

        newRun: (seed) => {
          let run: RunState;
          try {
            run = createRun(CONTENT, seed ?? makeSeed());
          } catch (error) {
            reportError('newRun', error);
            return;
          }
          let meta = recordRunStarted(get().meta);
          meta = discoverFossils(meta, deckFossils(CONTENT, run), nowIso());
          meta = markCardsSeen(meta, run.deck.map((card) => card.defId));
          set({ run, meta });
        },

        abandonRun: () => {
          if (get().run !== null) set({ run: null });
        },

        enterNode: (nodeId) =>
          applyRun(
            'enterNode',
            (run) => engineEnterNode(CONTENT, run, nodeId),
            (meta, next) => {
              const node = currentNode(next);
              return node ? recordRunProgress(meta, next.act, node.floor) : meta;
            },
          ),

        playCard: (uid) => applyRun('playCard', (run) => runPlayCard(CONTENT, run, uid)),

        endTurn: () => applyRun('endTurn', (run) => runEndTurn(CONTENT, run)),

        resolveCombat: () =>
          applyRun(
            'resolveCombat',
            (run) => engineResolveCombat(CONTENT, run),
            (meta, next) =>
              next.screen.type === 'reward'
                ? discoverFossils(meta, next.screen.reward.fossilsFound, nowIso())
                : meta,
          ),

        chooseCardReward: (defId) =>
          applyRun(
            'chooseCardReward',
            (run) => engineChooseCardReward(CONTENT, run, defId),
            (meta) => (defId === null ? meta : discoverCard(meta, defId)),
          ),

        chooseDig: (defId) =>
          applyRun(
            'chooseDig',
            (run) => engineChooseDig(CONTENT, run, defId),
            (meta) => (defId === null ? meta : discoverCard(meta, defId)),
          ),

        chooseRest: (choice) => applyRun('chooseRest', (run) => engineChooseRest(CONTENT, run, choice)),

        startNextAct: () => applyRun('startNextAct', (run) => engineStartNextAct(CONTENT, run)),

        finishRun: () => {
          const { run, meta } = get();
          if (!run) return;
          const { type } = run.screen;
          if (type !== 'victory' && type !== 'defeat') return;
          set({ run: null, meta: recordRunFinished(meta, type === 'victory') });
        },

        updateSettings: (patch) => {
          const { meta } = get();
          const next = updateMetaSettings(meta, patch);
          if (next !== meta) set({ meta: next });
        },

        resetProgress: () => {
          set({ run: null, meta: resetMeta(get().meta) });
        },
      };
    },
    {
      name: STORAGE_KEY,
      version: STORAGE_VERSION,
      storage: createJSONStorage<PersistedGame>(() => AsyncStorage),
      partialize: (state): PersistedGame => ({ run: state.run, meta: state.meta }),
      migrate: migratePersisted,
      merge: (persisted, current): GameStore =>
        persisted === undefined
          ? { ...current, hydrated: true }
          : { ...current, ...sanitizePersisted(persisted), hydrated: true },
      onRehydrateStorage: () => (_state, error) => {
        if (error !== undefined) {
          console.warn('[store] could not load saved state:', error);
        }
        // `merge` already flags success; this covers read/parse errors.
        if (storeApi && !storeApi.getState().hydrated) {
          storeApi.setState({ hydrated: true });
        }
      },
    },
  ),
);

// Without a usable storage the persist middleware never hydrates (and does not
// attach `persist`); flag hydration anyway so the UI does not wait forever.
if ((useGameStore as { persist?: unknown }).persist === undefined) {
  useGameStore.setState({ hydrated: true });
}

/** Resolves once persisted state has been loaded (immediately if it already was). */
export function waitForHydration(): Promise<void> {
  if (useGameStore.getState().hydrated) return Promise.resolve();
  return new Promise((resolve) => {
    const unsubscribe = useGameStore.subscribe((state) => {
      if (state.hydrated) {
        unsubscribe();
        resolve();
      }
    });
  });
}
