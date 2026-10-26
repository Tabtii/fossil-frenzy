import { ERA_MYA, ERA_NAMES } from '@/data/fossils';
import { ACT_COUNT, ACT_HEAL_PERCENT, BOSS_FLOOR, currentNode, eraForAct, getNode } from '@/engine/run';
import {
  type ContentDB,
  type EnemyDef,
  type Era,
  ERAS,
  type FossilEntry,
  type FossilRecord,
  type MetaState,
  type RunState,
  type RunStats,
} from '@/engine/types';
import { formatNumberDe } from '@/ui/format';

// Pure view models for the app shell (home, settings, run summary, act
// transition). No React, no store access: everything here is unit-tested.

// ---------------------------------------------------------------------------
// Progress labels (the engine and meta are 0-based, the UI shows 1-based)
// ---------------------------------------------------------------------------

/** "Akt 2" for the 0-based act index 1. */
export function actLabel(act: number): string {
  return `Akt ${act + 1}`;
}

/** "Etage 3" for the 0-based floor 2; the boss floor is marked. */
export function floorLabel(floor: number): string {
  return floor >= BOSS_FLOOR ? `Etage ${floor + 1} (Boss)` : `Etage ${floor + 1}`;
}

/** Furthest progress, e.g. "Akt 2, Etage 4"; null before the first expedition. */
export function bestProgressText(best: MetaState['best']): string | null {
  if (best === null) return null;
  return `${actLabel(best.act)}, ${floorLabel(best.floor)}`;
}

function plural(count: number, one: string, many: string): string {
  return `${formatNumberDe(count, 0)} ${count === 1 ? one : many}`;
}

/** Small statistics line on the home screen. */
export function homeStatsText(meta: Pick<MetaState, 'runsStarted' | 'runsWon' | 'best'>): string {
  if (meta.runsStarted <= 0) return 'Deine erste Expedition wartet!';
  const parts = [plural(meta.runsStarted, 'Expedition', 'Expeditionen'), plural(meta.runsWon, 'Sieg', 'Siege')];
  const best = bestProgressText(meta.best);
  if (best !== null) parts.push(`Rekord: ${best}`);
  return parts.join(' · ');
}

/** Spoken version of `homeStatsText`. */
export function homeStatsAccessibilityLabel(meta: Pick<MetaState, 'runsStarted' | 'runsWon' | 'best'>): string {
  if (meta.runsStarted <= 0) return 'Noch keine Expedition gestartet.';
  const best = bestProgressText(meta.best);
  return [
    `${meta.runsStarted} ${meta.runsStarted === 1 ? 'Expedition gestartet' : 'Expeditionen gestartet'}`,
    `${meta.runsWon} ${meta.runsWon === 1 ? 'Sieg' : 'Siege'}`,
    best !== null ? `weiteste Strecke ${best}` : null,
  ]
    .filter((part): part is string => part !== null)
    .join(', ');
}

// ---------------------------------------------------------------------------
// Home: run overview and collection progress
// ---------------------------------------------------------------------------

export type RunStatus = 'active' | 'victory' | 'defeat';

/**
 * Primitive-only snapshot of the current run for the home screen. Safe to
 * select with `useShallow`: it keeps its fields while the run only changes in
 * ways the home screen does not show.
 */
export interface RunOverview {
  status: RunStatus;
  /** 0-based act. */
  act: number;
  era: Era;
  hp: number;
  maxHp: number;
}

export function runOverview(run: RunState | null): RunOverview | null {
  if (run === null) return null;
  const { screen } = run;
  const status: RunStatus = screen.type === 'victory' || screen.type === 'defeat' ? screen.type : 'active';
  // During a fight `run.hp` is only synced when the combat is resolved.
  const player = screen.type === 'combat' ? screen.combat.player : null;
  return {
    status,
    act: run.act,
    era: eraForAct(run.act),
    hp: Math.max(0, player ? player.hp : run.hp),
    maxHp: player ? player.maxHp : run.maxHp,
  };
}

/** "Akt 2 · Jura · ❤️ 45/60 LP" (or "Sieg! · Akt 4 · Eiszeit" for a finished run). */
export function runOverviewCaption(overview: RunOverview): string {
  if (overview.status === 'victory') return `Sieg! · ${actLabel(overview.act)} · ${ERA_NAMES[overview.era]}`;
  if (overview.status === 'defeat') return `Gescheitert · ${actLabel(overview.act)} · ${ERA_NAMES[overview.era]}`;
  return `${actLabel(overview.act)} · ${ERA_NAMES[overview.era]} · ❤️ ${overview.hp}/${overview.maxHp} LP`;
}

/** Spoken version of `runOverviewCaption`. */
export function runOverviewAccessibilityLabel(overview: RunOverview): string {
  const where = `${actLabel(overview.act)}, ${ERA_NAMES[overview.era]}`;
  if (overview.status === 'victory') return `Sieg, ${where}`;
  if (overview.status === 'defeat') return `Gescheitert, ${where}`;
  return `${where}, ${overview.hp} von ${overview.maxHp} Lebenspunkten`;
}

export interface CollectionProgress {
  found: number;
  total: number;
}

/** Discovered fossil book entries (ignores ids that no longer exist in the content). */
export function fossilProgress(fossils: MetaState['fossils'], db: ContentDB): CollectionProgress {
  const ids = Object.keys(db.fossils);
  return { found: ids.filter((id) => fossils[id] !== undefined).length, total: ids.length };
}

/** Card defs the player has owned at least once. */
export function cardProgress(cardsSeen: readonly string[], db: ContentDB): CollectionProgress {
  const seen = new Set(cardsSeen);
  const ids = Object.keys(db.cards);
  return { found: ids.filter((id) => seen.has(id)).length, total: ids.length };
}

/** "12/50 entdeckt" */
export function progressText(progress: CollectionProgress, noun: string): string {
  return `${progress.found}/${progress.total} ${noun}`;
}

// ---------------------------------------------------------------------------
// Act transition
// ---------------------------------------------------------------------------

/** HP healed when the next act starts (ACT_HEAL_PERCENT of the missing HP, rounded up). */
export function actHealAmount(hp: number, maxHp: number): number {
  const missing = Math.max(0, maxHp - Math.max(0, hp));
  return Math.min(missing, Math.ceil((missing * ACT_HEAL_PERCENT) / 100));
}

export interface EraTransition {
  from: Era;
  to: Era;
  /** Act number of the next act (0-based). */
  nextAct: number;
  /** Millions of years skipped between the end of `from` and the start of `to` (0 if adjacent). */
  gapMya: number;
}

/** Era change after finishing the 0-based `act`; null after the last act. */
export function eraTransition(act: number): EraTransition | null {
  if (act < 0 || act + 1 >= ACT_COUNT) return null;
  const from = ERAS[act];
  const to = ERAS[act + 1];
  if (from === undefined || to === undefined) return null;
  const gap = ERA_MYA[from][1] - ERA_MYA[to][0];
  return { from, to, nextAct: act + 1, gapMya: gap >= 1 ? gap : 0 };
}

/** "Zeitsprung: rund 63 Mio. Jahre" for eras that do not touch. */
export function timeJumpText(gapMya: number): string | null {
  if (gapMya < 1) return null;
  return `Zeitsprung: rund ${formatNumberDe(Math.round(gapMya), 0)} Mio. Jahre`;
}

/** German phrase for travelling into an era ("in den Jura", "in die Kreidezeit"). */
export const ERA_DESTINATIONS: Record<Era, string> = {
  trias: 'in die Trias',
  jura: 'in den Jura',
  kreide: 'in die Kreidezeit',
  eiszeit: 'in die Eiszeit',
};

/** German phrase for being in an era ("im Jura", "in der Kreidezeit"). */
export const ERA_LOCATIVES: Record<Era, string> = {
  trias: 'in der Trias',
  jura: 'im Jura',
  kreide: 'in der Kreidezeit',
  eiszeit: 'in der Eiszeit',
};

/** Short, educational introduction shown when an era begins. */
export const ERA_INTROS: Record<Era, string> = {
  trias:
    'Nach dem größten Massenaussterben der Erdgeschichte erobern Reptilien den heißen, trockenen Superkontinent Pangäa – und die ersten Dinosaurier tauchen auf.',
  jura:
    'Pangäa bricht auseinander, das Klima wird feuchter. Riesige Sauropoden ziehen durch Farn- und Nadelwälder, und mit Archaeopteryx flattern frühe Vögel durch die Luft.',
  kreide:
    'Die ersten Blütenpflanzen breiten sich aus. Am Ende der Kreidezeit leben Tyrannosaurus und Triceratops – bis vor 66 Millionen Jahren ein Asteroideneinschlag die Nicht-Vogel-Dinosaurier auslöscht.',
  eiszeit:
    'Die großen Dinosaurier sind längst verschwunden. In den Kaltzeiten bedecken Eisschilde weite Teile Nordeuropas; Mammuts, Wollnashörner und Höhlenlöwen trotzen der Kälte – und Menschen sind schon dabei.',
};

/** Enemy of the node the player is on (e.g. the boss just beaten). */
export function currentEnemy(db: ContentDB, run: RunState): EnemyDef | null {
  const node = currentNode(run);
  return node?.enemyId !== undefined ? (db.enemies[node.enemyId] ?? null) : null;
}

// ---------------------------------------------------------------------------
// Run summary
// ---------------------------------------------------------------------------

export interface StatEntry {
  key: keyof RunStats;
  icon: string;
  label: string;
  value: string;
}

const STAT_ROWS: readonly { key: keyof RunStats; icon: string; label: string }[] = [
  { key: 'enemiesDefeated', icon: '⚔️', label: 'Gegner besiegt' },
  { key: 'elitesDefeated', icon: '⭐', label: 'Elites' },
  { key: 'bossesDefeated', icon: '👑', label: 'Bosse' },
  { key: 'cardsPlayed', icon: '🃏', label: 'Karten gespielt' },
  { key: 'damageDealt', icon: '💥', label: 'Schaden' },
  { key: 'floorsCleared', icon: '🗺️', label: 'Etagen' },
];

export function summaryStats(stats: RunStats): StatEntry[] {
  return STAT_ROWS.map((row) => ({ ...row, value: formatNumberDe(stats[row.key], 0) }));
}

export interface SummaryHeadline {
  icon: string;
  title: string;
  message: string;
}

/** Headline of the victory/defeat screen; null while the run is still going. */
export function summaryHeadline(db: ContentDB, run: RunState): SummaryHeadline | null {
  const { screen } = run;
  if (screen.type === 'victory') {
    return {
      icon: '🏆',
      title: 'Sieg!',
      message: 'Du hast alle vier Erdzeitalter durchquert – von der Trias bis zur Eiszeit.',
    };
  }
  if (screen.type !== 'defeat') return null;
  const node = getNode(run, screen.nodeId);
  const enemy = node?.enemyId !== undefined ? db.enemies[node.enemyId] : undefined;
  const where = node ? `${actLabel(run.act)}, ${floorLabel(node.floor)}` : actLabel(run.act);
  return {
    icon: '🦴',
    title: 'Expedition gescheitert',
    message: enemy ? `${enemy.emoji} ${enemy.name} hat dich in ${where} besiegt.` : `Du bist in ${where} gescheitert.`,
  };
}

export interface FossilFind {
  entry: FossilEntry;
  /** First ever find of this fossil (it was found during this run). */
  isNew: boolean;
}

/**
 * Every first discovery tracked by this expedition, plus the deck and enemies
 * defeated on the current map. First discoveries survive repeat finds and act
 * changes. Legacy runs without a discovery list retain the count-based fallback;
 * their earlier acts' enemies cannot be reconstructed from the replaced map.
 */
export function runFossilFinds(
  db: ContentDB,
  run: RunState,
  records: Readonly<Record<string, FossilRecord>>,
): FossilFind[] {
  const newIds = run.newFossils === undefined ? null : new Set(run.newFossils);
  const ids = new Set<string>(run.newFossils ?? []);
  for (const card of run.deck) {
    const def = db.cards[card.defId];
    if (def) ids.add(def.fossilId);
  }
  const { screen } = run;
  // The enemy of a lost or still running fight was not defeated.
  const unbeaten = screen.type === 'defeat' || screen.type === 'combat' ? screen.nodeId : null;
  for (const nodeId of run.visited) {
    if (nodeId === unbeaten) continue;
    const enemyId = getNode(run, nodeId)?.enemyId;
    const enemy = enemyId !== undefined ? db.enemies[enemyId] : undefined;
    if (enemy) ids.add(enemy.fossilId);
  }

  const finds: FossilFind[] = [];
  for (const id of ids) {
    const entry = db.fossils[id];
    if (entry) finds.push({ entry, isNew: newIds === null ? records[id]?.timesFound === 1 : newIds.has(id) });
  }
  // New finds first, then oldest era first; stable otherwise.
  return finds
    .map((find, index) => ({ find, index }))
    .sort(
      (a, b) =>
        Number(b.find.isNew) - Number(a.find.isNew) ||
        ERAS.indexOf(a.find.entry.era) - ERAS.indexOf(b.find.entry.era) ||
        a.index - b.index,
    )
    .map(({ find }) => find);
}
