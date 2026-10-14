import { describe, expect, it } from '@jest/globals';

import { CONTENT } from '@/data';
import { availableNodes, createRun, enterNode, startNextAct } from '@/engine/run';
import { ERAS, type FossilRecord, type RunState } from '@/engine/types';

import {
  actHealAmount,
  actLabel,
  bestProgressText,
  cardProgress,
  currentEnemy,
  ERA_DESTINATIONS,
  ERA_INTROS,
  ERA_LOCATIVES,
  eraTransition,
  floorLabel,
  fossilProgress,
  homeStatsAccessibilityLabel,
  homeStatsText,
  progressText,
  runFossilFinds,
  runOverview,
  runOverviewAccessibilityLabel,
  runOverviewCaption,
  summaryHeadline,
  summaryStats,
  timeJumpText,
} from '../model';

const SEED = 4242;

function record(timesFound: number): FossilRecord {
  return { discoveredAt: '2026-01-01T00:00:00.000Z', timesFound };
}

/** A run that just won its first fight (floor 0) and is back on the map. */
function runAfterFirstFight(): { run: RunState; enemyFossil: string; nodeId: string } {
  const start = createRun(CONTENT, SEED);
  const node = availableNodes(start)[0];
  if (!node?.enemyId) throw new Error('floor 0 should be a fight');
  const enemy = CONTENT.enemies[node.enemyId];
  if (!enemy) throw new Error('enemy missing');
  return {
    run: { ...start, currentNodeId: node.id, visited: [node.id], screen: { type: 'map' } },
    enemyFossil: enemy.fossilId,
    nodeId: node.id,
  };
}

describe('progress labels', () => {
  it('shows acts and floors 1-based', () => {
    expect(actLabel(0)).toBe('Akt 1');
    expect(actLabel(3)).toBe('Akt 4');
    expect(floorLabel(0)).toBe('Etage 1');
    expect(floorLabel(5)).toBe('Etage 6 (Boss)');
  });

  it('formats the best progress', () => {
    expect(bestProgressText(null)).toBeNull();
    expect(bestProgressText({ act: 1, floor: 3 })).toBe('Akt 2, Etage 4');
  });

  it('builds the home statistics line', () => {
    expect(homeStatsText({ runsStarted: 0, runsWon: 0, best: null })).toBe('Deine erste Expedition wartet!');
    expect(homeStatsText({ runsStarted: 1, runsWon: 1, best: { act: 3, floor: 5 } })).toBe(
      '1 Expedition · 1 Sieg · Rekord: Akt 4, Etage 6 (Boss)',
    );
    expect(homeStatsText({ runsStarted: 1200, runsWon: 0, best: { act: 0, floor: 2 } })).toBe(
      '1.200 Expeditionen · 0 Siege · Rekord: Akt 1, Etage 3',
    );
    expect(homeStatsAccessibilityLabel({ runsStarted: 2, runsWon: 0, best: null })).toBe(
      '2 Expeditionen gestartet, 0 Siege',
    );
  });
});

describe('runOverview', () => {
  it('is null without a run', () => {
    expect(runOverview(null)).toBeNull();
  });

  it('summarises a fresh run', () => {
    const overview = runOverview(createRun(CONTENT, SEED));
    expect(overview).toEqual({ status: 'active', act: 0, era: 'trias', hp: 60, maxHp: 60 });
    if (!overview) throw new Error('unreachable');
    expect(runOverviewCaption(overview)).toBe('Akt 1 · Trias · ❤️ 60/60 LP');
    expect(runOverviewAccessibilityLabel(overview)).toBe('Akt 1, Trias, 60 von 60 Lebenspunkten');
  });

  it('reads the live HP during a fight (run.hp is only synced afterwards)', () => {
    const run = createRun(CONTENT, SEED);
    const node = availableNodes(run)[0];
    if (!node) throw new Error('no node');
    const fighting = enterNode(CONTENT, run, node.id);
    if (fighting.screen.type !== 'combat') throw new Error('expected combat');
    const hurt: RunState = {
      ...fighting,
      screen: {
        ...fighting.screen,
        combat: { ...fighting.screen.combat, player: { ...fighting.screen.combat.player, hp: 42 } },
      },
    };
    expect(runOverview(hurt)?.hp).toBe(42);
  });

  it('marks finished runs', () => {
    const run = createRun(CONTENT, SEED);
    const won = runOverview({ ...run, act: 3, screen: { type: 'victory' } });
    expect(won?.status).toBe('victory');
    expect(won && runOverviewCaption(won)).toBe('Sieg! · Akt 4 · Eiszeit');
    const lost = runOverview({ ...run, hp: 0, screen: { type: 'defeat', nodeId: 'x' } });
    expect(lost?.status).toBe('defeat');
    expect(lost && runOverviewCaption(lost)).toBe('Gescheitert · Akt 1 · Trias');
  });
});

describe('collection progress', () => {
  it('counts only existing fossils', () => {
    const total = Object.keys(CONTENT.fossils).length;
    const known = Object.keys(CONTENT.fossils)[0] ?? '';
    const progress = fossilProgress({ [known]: record(1), 'removed-fossil': record(2) }, CONTENT);
    expect(progress).toEqual({ found: 1, total });
    expect(progressText(progress, 'entdeckt')).toBe(`1/${total} entdeckt`);
  });

  it('counts seen cards without duplicates', () => {
    const total = Object.keys(CONTENT.cards).length;
    expect(cardProgress(['eoraptor', 'eoraptor', 'nope'], CONTENT)).toEqual({ found: 1, total });
  });
});

describe('act transition', () => {
  it('heals half of the missing HP, rounded up', () => {
    expect(actHealAmount(30, 60)).toBe(15);
    expect(actHealAmount(31, 60)).toBe(15);
    expect(actHealAmount(59, 60)).toBe(1);
    expect(actHealAmount(60, 60)).toBe(0);
    expect(actHealAmount(-3, 60)).toBe(30);
  });

  it('matches the engine heal in startNextAct', () => {
    const base = createRun(CONTENT, SEED);
    for (const hp of [1, 17, 23, 44, 60]) {
      const run: RunState = { ...base, hp, maxHp: 64, screen: { type: 'actComplete', act: 0 } };
      const next = startNextAct(CONTENT, run);
      expect(next.act).toBe(1);
      expect(next.hp).toBe(hp + actHealAmount(hp, 64));
    }
  });

  it('describes the era change', () => {
    expect(eraTransition(0)).toEqual({ from: 'trias', to: 'jura', nextAct: 1, gapMya: 0 });
    expect(eraTransition(1)).toEqual({ from: 'jura', to: 'kreide', nextAct: 2, gapMya: 0 });
    const ice = eraTransition(2);
    expect(ice?.from).toBe('kreide');
    expect(ice?.to).toBe('eiszeit');
    expect(ice?.gapMya).toBeCloseTo(63.4, 5);
    expect(eraTransition(3)).toBeNull();
    expect(eraTransition(-1)).toBeNull();
  });

  it('mentions time jumps between eras that do not touch', () => {
    expect(timeJumpText(0)).toBeNull();
    expect(timeJumpText(63.4)).toBe('Zeitsprung: rund 63 Mio. Jahre');
  });

  it('has German texts for every era', () => {
    for (const era of ERAS) {
      expect(ERA_DESTINATIONS[era]).toMatch(/^in (die|den) /);
      expect(ERA_LOCATIVES[era]).toMatch(/^(im|in der) /);
      expect(ERA_INTROS[era].length).toBeGreaterThan(40);
    }
    expect(ERA_DESTINATIONS.jura).toBe('in den Jura');
  });

  it('finds the enemy of the current node', () => {
    const { run, enemyFossil } = runAfterFirstFight();
    expect(currentEnemy(CONTENT, run)?.fossilId).toBe(enemyFossil);
    expect(currentEnemy(CONTENT, { ...run, currentNodeId: null })).toBeNull();
  });
});

describe('summary', () => {
  it('lists all six run statistics in German format', () => {
    const run = createRun(CONTENT, SEED);
    const stats = summaryStats({ ...run.stats, damageDealt: 12345, enemiesDefeated: 9 });
    expect(stats.map((stat) => stat.label)).toEqual([
      'Gegner besiegt',
      'Elites',
      'Bosse',
      'Karten gespielt',
      'Schaden',
      'Etagen',
    ]);
    expect(stats.find((stat) => stat.key === 'damageDealt')?.value).toBe('12.345');
    expect(stats.find((stat) => stat.key === 'enemiesDefeated')?.value).toBe('9');
  });

  it('builds victory and defeat headlines', () => {
    const { run, nodeId } = runAfterFirstFight();
    expect(summaryHeadline(CONTENT, run)).toBeNull();
    expect(summaryHeadline(CONTENT, { ...run, screen: { type: 'victory' } })?.title).toBe('Sieg!');
    const defeat = summaryHeadline(CONTENT, { ...run, screen: { type: 'defeat', nodeId } });
    expect(defeat?.title).toBe('Expedition gescheitert');
    const enemy = currentEnemy(CONTENT, run);
    expect(defeat?.message).toContain(enemy?.name ?? '???');
    expect(defeat?.message).toContain('Akt 1, Etage 1');
  });

  it('finds deck and defeated enemy fossils, new ones first', () => {
    const { run, enemyFossil, nodeId } = runAfterFirstFight();
    const starterFossils = [...new Set(run.deck.map((card) => CONTENT.cards[card.defId]?.fossilId))];
    const records: Record<string, FossilRecord> = {};
    for (const id of starterFossils) if (id) records[id] = record(3);
    records[enemyFossil] = record(1);

    const finds = runFossilFinds(CONTENT, run, records);
    const ids = finds.map((find) => find.entry.id);
    expect(ids).toEqual(expect.arrayContaining([...starterFossils, enemyFossil]));
    expect(new Set(ids).size).toBe(ids.length);
    expect(finds[0]).toMatchObject({ entry: { id: enemyFossil }, isNew: true });
    expect(finds.filter((find) => find.isNew)).toHaveLength(1);

    // The enemy that won the fight was not found.
    const lost = runFossilFinds(CONTENT, { ...run, screen: { type: 'defeat', nodeId } }, records);
    const lostIds = lost.map((find) => find.entry.id);
    if (!starterFossils.includes(enemyFossil)) expect(lostIds).not.toContain(enemyFossil);
  });
});
