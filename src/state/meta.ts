import type { FossilRecord, MetaState, Settings } from '@/engine/types';

// Pure helpers for the meta progression (fossil book, statistics, settings)
// that survives across runs. Every helper returns the SAME object when nothing
// changes, so zustand selectors and React memoisation stay cheap.

export const DEFAULT_SETTINGS: Readonly<Settings> = Object.freeze({
  haptics: true,
  reducedMotion: false,
});

export function initialMeta(): MetaState {
  return {
    fossils: {},
    cardsSeen: [],
    runsStarted: 0,
    runsWon: 0,
    best: null,
    settings: { ...DEFAULT_SETTINGS },
  };
}

/**
 * Records a find for every fossil id. New fossils get `discoveredAt = nowIso`
 * and `timesFound = 1`; known fossils count up. Duplicate ids within one call
 * count as a single find.
 */
export function discoverFossils(
  meta: MetaState,
  fossilIds: readonly string[],
  nowIso: string,
): MetaState {
  const unique = [...new Set(fossilIds)].filter((id) => id.length > 0);
  if (unique.length === 0) return meta;
  const fossils: Record<string, FossilRecord> = { ...meta.fossils };
  for (const id of unique) {
    const known = fossils[id];
    fossils[id] = known
      ? { ...known, timesFound: known.timesFound + 1 }
      : { discoveredAt: nowIso, timesFound: 1 };
  }
  return { ...meta, fossils };
}

/** Adds card def ids to `cardsSeen` (keeps first-seen order, no duplicates). */
export function markCardsSeen(meta: MetaState, defIds: readonly string[]): MetaState {
  const seen = new Set(meta.cardsSeen);
  const added: string[] = [];
  for (const id of defIds) {
    if (id.length === 0 || seen.has(id)) continue;
    seen.add(id);
    added.push(id);
  }
  if (added.length === 0) return meta;
  return { ...meta, cardsSeen: [...meta.cardsSeen, ...added] };
}

/** True when (act, floor) lies beyond `best` (act first, then floor). */
export function isFurther(
  best: MetaState['best'],
  act: number,
  floor: number,
): boolean {
  if (best === null) return true;
  return act > best.act || (act === best.act && floor > best.floor);
}

/**
 * Keeps the furthest progress ever reached. `act` is 0-based like
 * `RunState.act`, `floor` is the 0-based floor within the act.
 */
export function recordRunProgress(meta: MetaState, act: number, floor: number): MetaState {
  if (!Number.isFinite(act) || !Number.isFinite(floor)) return meta;
  if (!isFurther(meta.best, act, floor)) return meta;
  return { ...meta, best: { act, floor } };
}

export function recordRunStarted(meta: MetaState): MetaState {
  return { ...meta, runsStarted: meta.runsStarted + 1 };
}

/** Counts a won run; a lost run changes nothing (runs are counted on start). */
export function recordRunFinished(meta: MetaState, won: boolean): MetaState {
  if (!won) return meta;
  return { ...meta, runsWon: meta.runsWon + 1 };
}

export function updateSettings(meta: MetaState, patch: Partial<Settings>): MetaState {
  const next: Settings = { ...meta.settings };
  let changed = false;
  for (const key of Object.keys(DEFAULT_SETTINGS) as (keyof Settings)[]) {
    const value = patch[key];
    if (typeof value === 'boolean' && value !== next[key]) {
      next[key] = value;
      changed = true;
    }
  }
  return changed ? { ...meta, settings: next } : meta;
}

/** Wipes all progress but keeps the player's settings. */
export function resetMeta(meta: MetaState): MetaState {
  return { ...initialMeta(), settings: { ...meta.settings } };
}

// ---------------------------------------------------------------------------
// Persistence sanitising
// ---------------------------------------------------------------------------

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function count(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
}

function sanitizeFossils(raw: unknown): Record<string, FossilRecord> {
  const fossils: Record<string, FossilRecord> = {};
  if (!isRecord(raw)) return fossils;
  for (const [id, entry] of Object.entries(raw)) {
    if (!isRecord(entry) || typeof entry.discoveredAt !== 'string') continue;
    fossils[id] = { discoveredAt: entry.discoveredAt, timesFound: Math.max(1, count(entry.timesFound)) };
  }
  return fossils;
}

function sanitizeBest(raw: unknown): MetaState['best'] {
  if (!isRecord(raw)) return null;
  const { act, floor } = raw;
  if (typeof act !== 'number' || typeof floor !== 'number') return null;
  if (!Number.isFinite(act) || !Number.isFinite(floor) || act < 0 || floor < 0) return null;
  return { act: Math.floor(act), floor: Math.floor(floor) };
}

function sanitizeSettings(raw: unknown): Settings {
  const settings: Settings = { ...DEFAULT_SETTINGS };
  if (!isRecord(raw)) return settings;
  if (typeof raw.haptics === 'boolean') settings.haptics = raw.haptics;
  if (typeof raw.reducedMotion === 'boolean') settings.reducedMotion = raw.reducedMotion;
  return settings;
}

/**
 * Turns anything loaded from storage into a valid MetaState. Missing or broken
 * fields fall back to their defaults instead of throwing.
 */
export function sanitizeMeta(raw: unknown): MetaState {
  if (!isRecord(raw)) return initialMeta();
  const cardsSeen = Array.isArray(raw.cardsSeen)
    ? [...new Set(raw.cardsSeen.filter((id): id is string => typeof id === 'string' && id.length > 0))]
    : [];
  return {
    fossils: sanitizeFossils(raw.fossils),
    cardsSeen,
    runsStarted: count(raw.runsStarted),
    runsWon: count(raw.runsWon),
    best: sanitizeBest(raw.best),
    settings: sanitizeSettings(raw.settings),
  };
}
