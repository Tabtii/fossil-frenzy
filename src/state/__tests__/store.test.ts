import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { CONTENT } from '@/data';
import { canPlay } from '@/engine/combat';
import { availableNodes, createRun, currentNode, deckFossils, enterNode as engineEnterNode } from '@/engine/run';
import type { RunState } from '@/engine/types';
import { initialMeta } from '../meta';
import { useSaveStatus } from '../saveStatus';
import { selectCombat } from '../selectors';
import {
  STORAGE_KEY,
  STORAGE_VERSION,
  sanitizePersisted,
  sanitizeRun,
  useGameStore,
  resetStorageGuard,
  waitForHydration,
  retrySave,
} from '../store';

// Store tests run against the real engine and the real CONTENT registry. They
// only rely on rules, never on specific cards or enemies.

const SEED = 4242;

const store = () => useGameStore.getState();

function requireRun(): RunState {
  const { run } = store();
  if (!run) throw new Error('expected an active run');
  return run;
}

async function readStorage(): Promise<{ state: Record<string, unknown>; version: number } | null> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  return raw === null ? null : JSON.parse(raw);
}

/** Plays the active combat with a greedy policy until it is resolved. */
function playCombatToEnd(): void {
  for (let i = 0; i < 1000; i++) {
    const combat = selectCombat(store());
    if (!combat) return;
    if (combat.phase !== 'player') {
      store().resolveCombat();
      return;
    }
    const playable = combat.hand.find((card) => canPlay(CONTENT, combat, card.uid).ok);
    if (playable) store().playCard(playable.uid);
    else store().endTurn();
  }
  throw new Error('combat did not finish');
}

/** Enters the first reachable node. */
function enterFirstNode(): string {
  const node = availableNodes(requireRun())[0];
  if (!node) throw new Error('no reachable node');
  store().enterNode(node.id);
  return node.id;
}

beforeEach(async () => {
  await waitForHydration();
  resetStorageGuard();
  useGameStore.setState({ run: null, meta: initialMeta(), hydrated: true });
  await AsyncStorage.clear();
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('hydration', () => {
  it('contains failed writes, keeps the active run and retries the latest snapshot', async () => {
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    jest.mocked(AsyncStorage.setItem).mockRejectedValueOnce(new Error('storage full'));
    store().newRun(42);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(store().run?.seed).toBe(42);
    expect(useSaveStatus.getState().issue).toBe('write');
    expect(await retrySave()).toBe(true);
    expect(useSaveStatus.getState().issue).toBeNull();
    expect((await readStorage())?.state.run).toEqual(store().run);
  });

  it('never retries a write over a save that could not be read', async () => {
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    jest.mocked(AsyncStorage.getItem).mockRejectedValueOnce(new Error('disk unavailable'));
    await useGameStore.persist.rehydrate();
    const writes = jest.mocked(AsyncStorage.setItem).mock.calls.length;
    expect(useSaveStatus.getState().issue).toBe('read');
    expect(await retrySave()).toBe(false);
    expect(jest.mocked(AsyncStorage.setItem).mock.calls.length).toBe(writes);
  });

  it('does not hide a newer save failure when an older write finishes late', async () => {
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    let finishOldWrite!: () => void;
    jest.mocked(AsyncStorage.setItem)
      .mockImplementationOnce(() => new Promise<void>((resolve) => { finishOldWrite = resolve; }))
      .mockRejectedValueOnce(new Error('latest snapshot failed'));
    store().newRun(42);
    store().updateSettings({ haptics: false });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(useSaveStatus.getState().issue).toBe('write');
    finishOldWrite();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(useSaveStatus.getState().issue).toBe('write');
    expect(await retrySave()).toBe(true);
  });

  it('is hydrated after loading (empty) storage', async () => {
    await waitForHydration();
    expect(store().hydrated).toBe(true);
  });

  it('restores run and meta from storage', async () => {
    // Note: every setState persists, so reset the flag before writing storage.
    useGameStore.setState({ hydrated: false });
    const run = createRun(CONTENT, SEED);
    const meta = { ...initialMeta(), runsStarted: 3, settings: { haptics: false, reducedMotion: true } };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ state: { run, meta }, version: STORAGE_VERSION }));

    await useGameStore.persist.rehydrate();

    expect(store().hydrated).toBe(true);
    expect(store().run).toEqual(run);
    expect(store().meta).toEqual(meta);
    expect(useSaveStatus.getState().recovery).toBeNull();
  });

  it('survives corrupt JSON and still flags hydrated', async () => {
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    useGameStore.setState({ hydrated: false });
    await AsyncStorage.setItem(STORAGE_KEY, '{kaputt');

    await useGameStore.persist.rehydrate();

    expect(store().hydrated).toBe(true);
    expect(store().run).toBeNull();
    expect(store().meta).toEqual(initialMeta());
    expect(useSaveStatus.getState().recovery).toBe('file');
  });

  it('survives a storage read error', async () => {
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    jest.mocked(AsyncStorage.getItem).mockRejectedValueOnce(new Error('disk'));
    useGameStore.setState({ hydrated: false });

    await useGameStore.persist.rehydrate();

    expect(store().hydrated).toBe(true);
  });

  it('never overwrites a save it could not read', async () => {
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    useGameStore.setState({ hydrated: false });
    const saved = JSON.stringify({ state: { run: null, meta: { ...initialMeta(), runsStarted: 42 } }, version: STORAGE_VERSION });
    await AsyncStorage.setItem(STORAGE_KEY, saved);
    jest.mocked(AsyncStorage.getItem).mockRejectedValueOnce(new Error('disk'));

    await useGameStore.persist.rehydrate();
    store().newRun(SEED);
    await Promise.resolve();

    expect(await AsyncStorage.getItem(STORAGE_KEY)).toBe(saved);
  });

  it('backs up corrupt JSON before writing defaults', async () => {
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    useGameStore.setState({ hydrated: false });
    await AsyncStorage.setItem(STORAGE_KEY, '{kaputt');

    await useGameStore.persist.rehydrate();

    expect(await AsyncStorage.getItem(`${STORAGE_KEY}/corrupt`)).toBe('{kaputt');
  });

  it('backs up valid JSON with a broken envelope and explains the recovery', async () => {
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    await AsyncStorage.setItem(STORAGE_KEY, '[1,2,3]');
    await useGameStore.persist.rehydrate();
    expect(await AsyncStorage.getItem(`${STORAGE_KEY}/corrupt`)).toBe('[1,2,3]');
    expect(useSaveStatus.getState().recovery).toBe('file');
    expect(useSaveStatus.getState().issue).toBeNull();
  });

  it('protects an incompatible run when its backup cannot be written', async () => {
    const broken = { ...createRun(CONTENT, SEED), hp: -1 };
    const meta = { ...initialMeta(), runsStarted: 7 };
    const saved = JSON.stringify({ state: { run: broken, meta }, version: STORAGE_VERSION });
    await AsyncStorage.setItem(STORAGE_KEY, saved);
    jest.mocked(AsyncStorage.setItem).mockRejectedValueOnce(new Error('backup full'));
    await useGameStore.persist.rehydrate();
    expect(store().run).toBeNull();
    expect(store().meta).toEqual(meta);
    expect(useSaveStatus.getState().issue).toBe('read');
    expect(useSaveStatus.getState().recovery).toBeNull();
    store().newRun(SEED);
    expect(await AsyncStorage.getItem(STORAGE_KEY)).toBe(saved);
  });

  it('ignores actions before the save has loaded', () => {
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    useGameStore.setState({ hydrated: false });
    store().newRun(SEED);
    store().updateSettings({ haptics: false });
    expect(store().run).toBeNull();
    expect(store().meta.settings.haptics).toBe(true);
    useGameStore.setState({ hydrated: true });
  });

  it('migrates older versions and drops runs that reference missing content', async () => {
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const run = createRun(CONTENT, SEED);
    const broken = { ...run, deck: [...run.deck, { uid: 'x1', defId: 'gibt-es-nicht', upgraded: false }] };
    const meta = { ...initialMeta(), runsStarted: 5, runsWon: 1 };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ state: { run: broken, meta }, version: 0 }));

    await useGameStore.persist.rehydrate();

    expect(store().run).toBeNull();
    expect(store().meta).toEqual(meta);
    // The migrated state is written back with the current version.
    expect((await readStorage())?.version).toBe(STORAGE_VERSION);
    expect(JSON.parse((await AsyncStorage.getItem(`${STORAGE_KEY}/corrupt`))!).state.run).toEqual(broken);
    expect(useSaveStatus.getState().recovery).toBe('run');
  });
});

describe('sanitizing', () => {
  function combatRun(): RunState {
    const run = createRun(CONTENT, SEED);
    return engineEnterNode(CONTENT, run, availableNodes(run)[0]!.id);
  }

  it('restores a real in-progress battle without replaying animation events', () => {
    const run = combatRun();
    const restored = sanitizeRun(JSON.parse(JSON.stringify(run)));
    expect(restored).not.toBeNull();
    if (run.screen.type !== 'combat' || restored?.screen.type !== 'combat') throw new Error('expected combat');
    expect(restored.screen.combat).toEqual({ ...run.screen.combat, events: [] });
  });

  it.each([{ hp: -1 }, { hp: 61 }, { maxHp: 0 }, { act: 0.5 }, { seed: -1 }, { rngState: 0x100000000 }, { nextUid: 1.5 }])('rejects invalid saved numeric state %j', (patch) => {
    expect(sanitizeRun({ ...createRun(CONTENT, SEED), ...patch })).toBeNull();
  });

  it('rejects broken map links, duplicate card identities and inherited content names', () => {
    const run = createRun(CONTENT, SEED);
    expect(sanitizeRun({ ...run, map: run.map.map((node, i) => i === 0 ? { ...node, next: ['missing-node'] } : node) })).toBeNull();
    expect(sanitizeRun({ ...run, deck: [...run.deck, run.deck[0]] })).toBeNull();
    expect(sanitizeRun({ ...run, deck: [{ uid: 'fake', defId: 'constructor', upgraded: false }] })).toBeNull();
    expect(sanitizeRun({ ...run, visited: ['missing-node'] })).toBeNull();
  });

  it('rejects invalid enemy moves, status amounts and duplicated combat piles', () => {
    const run = combatRun();
    if (run.screen.type !== 'combat') throw new Error('expected combat');
    const { combat } = run.screen;
    const withCombat = (patch: object) => ({ ...run, screen: { ...run.screen, combat: { ...combat, ...patch } } });
    expect(sanitizeRun(withCombat({ enemy: { ...combat.enemy, nextMoveId: 'removed-move' } }))).toBeNull();
    expect(sanitizeRun(withCombat({ player: { ...combat.player, statuses: { bleed: 'many' } } }))).toBeNull();
    expect(sanitizeRun(withCombat({ player: { ...combat.player, block: -10 } }))).toBeNull();
    expect(sanitizeRun(withCombat({ discardPile: [combat.hand[0]!] }))).toBeNull();
    expect(sanitizeRun(withCombat({ hand: [] }))).toBeNull();
  });

  it('preserves the fossil book when a broken expedition must be discarded', () => {
    const meta = { ...initialMeta(), runsStarted: 12, runsWon: 3 };
    const result = sanitizePersisted({ run: { ...createRun(CONTENT, SEED), hp: -1 }, meta });
    expect(result.run).toBeNull();
    expect(result.meta).toEqual(meta);
  });

  it('keeps a valid run intact (JSON round trip)', () => {
    const run = createRun(CONTENT, SEED);
    expect(sanitizeRun(JSON.parse(JSON.stringify(run)))).toEqual(run);
  });

  it('rejects malformed runs', () => {
    const run = createRun(CONTENT, SEED);
    expect(sanitizeRun(null)).toBeNull();
    expect(sanitizeRun({ ...run, act: 9 })).toBeNull();
    expect(sanitizeRun({ ...run, screen: { type: 'combat', nodeId: 'nope' } })).toBeNull();
    expect(sanitizeRun({ ...run, currentNodeId: 'nope' })).toBeNull();
  });

  it('fills missing stats instead of dropping the run', () => {
    const run = createRun(CONTENT, SEED);
    const { stats, ...withoutStats } = run;
    expect(sanitizeRun(withoutStats)).toEqual({ ...withoutStats, stats });
  });

  it('turns garbage into the empty state', () => {
    expect(sanitizePersisted(42)).toEqual({ run: null, meta: initialMeta() });
  });
});

describe('newRun', () => {
  it('creates a run from the seed and syncs meta', () => {
    store().newRun(SEED);
    const run = requireRun();
    const { meta } = store();

    expect(run).toEqual(createRun(CONTENT, SEED));
    expect(meta.runsStarted).toBe(1);
    expect(meta.cardsSeen).toEqual([...new Set(CONTENT.starterDeck)]);
    for (const fossilId of deckFossils(CONTENT, run)) {
      expect(meta.fossils[fossilId]?.timesFound).toBe(1);
    }
  });

  it('uses a time-based seed when none is given', () => {
    jest.spyOn(Date, 'now').mockReturnValue(1_700_000_123_456);
    store().newRun();
    expect(requireRun().seed).toBe(1_700_000_123_456 >>> 0);
  });

  it('replaces the current run and counts every start', () => {
    store().newRun(1);
    store().newRun(2);
    expect(requireRun().seed).toBe(2);
    expect(store().meta.runsStarted).toBe(2);
  });

  it('persists only run and meta', async () => {
    store().newRun(SEED);
    const saved = await readStorage();
    expect(saved?.version).toBe(STORAGE_VERSION);
    expect(Object.keys(saved?.state ?? {}).sort()).toEqual(['meta', 'run']);
    expect(saved?.state.run).toEqual(requireRun());
  });
});

describe('map and combat actions', () => {
  it('ignores unknown node ids without touching state', () => {
    store().newRun(SEED);
    const before = store();
    store().enterNode('gibt-es-nicht');
    expect(store()).toBe(before);
  });

  it('enters a floor-0 fight and records progress', () => {
    store().newRun(SEED);
    enterFirstNode();
    const run = requireRun();
    expect(run.screen.type).toBe('combat');
    expect(currentNode(run)?.floor).toBe(0);
    expect(store().meta.best).toEqual({ act: 0, floor: 0 });
  });

  it('plays cards and ends turns through the engine', () => {
    store().newRun(SEED);
    enterFirstNode();
    const combat = selectCombat(store());
    if (!combat) throw new Error('expected combat');

    const playable = combat.hand.find((card) => canPlay(CONTENT, combat, card.uid).ok);
    if (!playable) throw new Error('expected a playable starter card');
    store().playCard(playable.uid);
    expect(requireRun().stats.cardsPlayed).toBe(1);
    expect(selectCombat(store())?.hand.some((card) => card.uid === playable.uid)).toBe(false);

    const beforeInvalid = store().run;
    store().playCard('gibt-es-nicht');
    expect(store().run).toBe(beforeInvalid);

    if (selectCombat(store())?.phase === 'player') {
      const turn = selectCombat(store())?.turn ?? 0;
      store().endTurn();
      const after = selectCombat(store());
      if (after?.phase === 'player') expect(after.turn).toBe(turn + 1);
    }
  });

  it('resolveCombat is a no-op while the combat is running', () => {
    store().newRun(SEED);
    enterFirstNode();
    const before = store().run;
    store().resolveCombat();
    expect(store().run).toBe(before);
  });

  it('discovers fossils of a won fight and of the chosen reward card', () => {
    // Try a few seeds: the greedy bot should win at least one opening fight.
    for (let seed = 1; seed <= 20; seed++) {
      useGameStore.setState({ run: null, meta: initialMeta() });
      store().newRun(seed);
      enterFirstNode();
      playCombatToEnd();
      const screen = requireRun().screen;
      if (screen.type !== 'reward') continue;

      for (const fossilId of screen.reward.fossilsFound) {
        expect(store().meta.fossils[fossilId]).toBeDefined();
      }
      const choice = screen.reward.choices[0];
      if (choice === undefined) continue;
      store().chooseCardReward(choice);
      const card = CONTENT.cards[choice];
      expect(requireRun().deck.some((c) => c.defId === choice)).toBe(true);
      expect(store().meta.cardsSeen).toContain(choice);
      expect(card && store().meta.fossils[card.fossilId]).toBeTruthy();
      return;
    }
    throw new Error('the bot never won an opening fight');
  });

  it('skipping a reward adds nothing', () => {
    for (let seed = 1; seed <= 20; seed++) {
      useGameStore.setState({ run: null, meta: initialMeta() });
      store().newRun(seed);
      enterFirstNode();
      playCombatToEnd();
      if (requireRun().screen.type !== 'reward') continue;
      const { deck } = requireRun();
      const seen = store().meta.cardsSeen;
      store().chooseCardReward(null);
      expect(requireRun().screen.type).toBe('map');
      expect(requireRun().deck).toEqual(deck);
      expect(store().meta.cardsSeen).toBe(seen);
      return;
    }
    throw new Error('the bot never won an opening fight');
  });
});

describe('full run', () => {
  it('plays a whole expedition, keeps meta in sync and finishes the run', () => {
    store().newRun(SEED);
    let furthest = { act: -1, floor: -1 };

    for (let step = 0; step < 500; step++) {
      const run = requireRun();
      const { screen } = run;
      if (screen.type === 'victory' || screen.type === 'defeat') break;

      switch (screen.type) {
        case 'map': {
          enterFirstNode();
          const after = requireRun();
          const node = currentNode(after);
          if (!node) throw new Error('entered node missing');
          if (after.act > furthest.act || (after.act === furthest.act && node.floor > furthest.floor)) {
            furthest = { act: after.act, floor: node.floor };
          }
          expect(store().meta.best).toEqual(furthest);
          break;
        }
        case 'combat':
          playCombatToEnd();
          break;
        case 'reward': {
          for (const fossilId of screen.reward.fossilsFound) {
            expect(store().meta.fossils[fossilId]).toBeDefined();
          }
          const choice = screen.reward.choices[0] ?? null;
          store().chooseCardReward(choice);
          if (choice !== null) expect(store().meta.cardsSeen).toContain(choice);
          break;
        }
        case 'dig': {
          const choice = screen.choices[0] ?? null;
          store().chooseDig(choice);
          if (choice !== null) {
            expect(store().meta.cardsSeen).toContain(choice);
            const fossilId = CONTENT.cards[choice]?.fossilId;
            if (fossilId) expect(store().meta.fossils[fossilId]).toBeDefined();
          }
          break;
        }
        case 'rest':
          store().chooseRest({ type: 'heal' });
          break;
        case 'actComplete':
          store().startNextAct();
          expect(requireRun().act).toBe(screen.act + 1);
          break;
      }
      expect(requireRun()).not.toBe(run);
    }

    const final = requireRun().screen.type;
    expect(['victory', 'defeat']).toContain(final);
    for (const card of requireRun().deck) expect(store().meta.cardsSeen).toContain(card.defId);

    store().finishRun();
    expect(store().run).toBeNull();
    expect(store().meta.runsStarted).toBe(1);
    expect(store().meta.runsWon).toBe(final === 'victory' ? 1 : 0);
  });
});

describe('finishRun / abandonRun', () => {
  it('counts an unclosed victory when a new run starts', () => {
    store().newRun(SEED);
    useGameStore.setState({ run: { ...requireRun(), screen: { type: 'victory' } } });
    store().newRun(SEED + 1);
    expect(store().meta.runsWon).toBe(1);
    expect(store().meta.runsStarted).toBe(2);
  });

  it('counts a victory and clears the run', () => {
    store().newRun(SEED);
    useGameStore.setState({ run: { ...requireRun(), screen: { type: 'victory' } } });
    store().finishRun();
    expect(store().run).toBeNull();
    expect(store().meta.runsWon).toBe(1);
  });

  it('records a defeat without counting a win', () => {
    store().newRun(SEED);
    const run = requireRun();
    const nodeId = run.map[0]?.id ?? '';
    useGameStore.setState({ run: { ...run, screen: { type: 'defeat', nodeId } } });
    store().finishRun();
    expect(store().run).toBeNull();
    expect(store().meta.runsWon).toBe(0);
    expect(store().meta.runsStarted).toBe(1);
  });

  it('does nothing while the run is still going', () => {
    store().newRun(SEED);
    const before = store();
    store().finishRun();
    expect(store()).toBe(before);
  });

  it('abandonRun drops the run without counting a win', () => {
    store().newRun(SEED);
    store().abandonRun();
    expect(store().run).toBeNull();
    expect(store().meta.runsStarted).toBe(1);
    expect(store().meta.runsWon).toBe(0);
  });

  it('actions without a run are no-ops', () => {
    const before = store();
    store().enterNode('a0f0n0');
    store().playCard('c0');
    store().endTurn();
    store().resolveCombat();
    store().chooseCardReward(null);
    store().chooseDig(null);
    store().chooseRest({ type: 'heal' });
    store().startNextAct();
    store().finishRun();
    store().abandonRun();
    expect(store()).toBe(before);
  });
});

describe('settings and reset', () => {
  it('updates settings and persists them', async () => {
    store().updateSettings({ haptics: false });
    expect(store().meta.settings).toEqual({ haptics: false, reducedMotion: false });
    const saved = await readStorage();
    expect((saved?.state.meta as { settings: unknown }).settings).toEqual({
      haptics: false,
      reducedMotion: false,
    });
  });

  it('ignores patches that change nothing', () => {
    const before = store().meta;
    store().updateSettings({ haptics: true });
    store().updateSettings({});
    expect(store().meta).toBe(before);
  });

  it('resetProgress wipes progress and the run but keeps settings', () => {
    store().updateSettings({ reducedMotion: true });
    store().newRun(SEED);
    enterFirstNode();
    store().resetProgress();
    expect(store().run).toBeNull();
    expect(store().meta).toEqual({ ...initialMeta(), settings: { haptics: true, reducedMotion: true } });
  });
});
