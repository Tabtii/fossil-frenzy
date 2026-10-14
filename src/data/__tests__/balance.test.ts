import { describe, expect, it } from '@jest/globals';
import { CONTENT } from '@/data';
import { canPlay, endTurn, getIntent, playCard, startCombat } from '@/engine/combat';
import { resolveCard } from '@/engine/describe';
import {
  availableNodes,
  chooseCardReward,
  chooseDig,
  chooseRest,
  createRun,
  enterNode,
  resolveCombat,
  runEndTurn,
  runPlayCard,
  startNextAct,
} from '@/engine/run';
import type { CardInstance, CombatState, ContentDB, NodeType, Rarity, RunState, Statuses } from '@/engine/types';

// Balance smoke tests: a simple greedy bot plays the real content with the
// real engine. Bounds are loose on purpose; they catch content that is
// impossible, trivial or broken (e.g. a boss nobody can beat), not small
// tuning changes. Humans play better than this bot, so its win rate is low.

const db: ContentDB = CONTENT;

const statusOf = (statuses: Statuses, id: keyof Statuses): number => statuses[id] ?? 0;
const triangle = (n: number): number => (n * (n + 1)) / 2;

/** Attack damage the enemy will deal next turn (0 when it hits itself). */
function incomingDamage(state: CombatState): number {
  const intent = getIntent(db, state);
  if (!intent.kinds.includes('attack') || intent.selfHit) return 0;
  return (intent.damage ?? 0) * (intent.hits ?? 1);
}

/** Heuristic value of the transition before → after, per energy spent. */
function playValue(before: CombatState, after: CombatState, cost: number): number {
  if (after.phase === 'won') return Number.POSITIVE_INFINITY;
  // Blocking matters more in long fights (big enemies), damage in short ones.
  const blockWeight = 1 + Math.min(1, before.enemy.hp / 100);
  const need = Math.max(0, incomingDamage(before) - before.player.block);
  const blockGain = after.player.block - before.player.block;
  const enemyBefore = before.enemy.statuses;
  const enemyAfter = after.enemy.statuses;
  let value = before.enemy.hp - after.enemy.hp;
  value += Math.min(blockGain, need) * blockWeight + Math.max(0, blockGain - need) * 0.15;
  value += (statusOf(enemyAfter, 'vulnerable') - statusOf(enemyBefore, 'vulnerable')) * 3;
  value += (statusOf(enemyAfter, 'weak') - statusOf(enemyBefore, 'weak')) * 2.5;
  value += (triangle(statusOf(enemyAfter, 'bleed')) - triangle(statusOf(enemyBefore, 'bleed'))) * 0.8;
  value += (statusOf(enemyAfter, 'confused') - statusOf(enemyBefore, 'confused')) * Math.max(6, incomingDamage(before));
  value += (statusOf(after.player.statuses, 'strength') - statusOf(before.player.statuses, 'strength')) * 4;
  value += after.player.hp - before.player.hp;
  value += (after.hand.length - before.hand.length + 1) * 3;
  value += (after.energy - before.energy + cost) * 5;
  return value / Math.max(cost, 0.5);
}

/** Best card to play now, or null to end the turn. */
function chooseCard(state: CombatState): string | null {
  let best: string | null = null;
  let bestValue = 0;
  for (const card of state.hand) {
    if (!canPlay(db, state, card.uid).ok) continue;
    const def = db.cards[card.defId];
    if (!def) continue;
    const value = playValue(state, playCard(db, state, card.uid), resolveCard(def, card.upgraded).cost);
    if (value > bestValue) {
      bestValue = value;
      best = card.uid;
    }
  }
  return best;
}

function deckOf(ids: readonly string[], upgradedCount = 0): CardInstance[] {
  return ids.map((defId, index) => ({ uid: `c${index}`, defId, upgraded: index < upgradedCount }));
}

interface FightSummary {
  winRate: number;
  avgHpLost: number;
  avgTurns: number;
}

function fightMany(
  deckIds: readonly string[],
  enemyId: string,
  opts: { hp?: number; upgraded?: number; seeds?: number } = {},
): FightSummary {
  const hp = opts.hp ?? 60;
  const seeds = opts.seeds ?? 40;
  let wins = 0;
  let hpLost = 0;
  let turns = 0;
  for (let i = 0; i < seeds; i++) {
    let state = startCombat(db, {
      deck: deckOf(deckIds, opts.upgraded),
      playerHp: hp,
      playerMaxHp: Math.max(hp, 60),
      enemyId,
      seed: 1000 + i * 7919,
    });
    for (let step = 0; state.phase === 'player' && step < 1000; step++) {
      const uid = chooseCard(state);
      state = uid ? playCard(db, state, uid) : endTurn(db, state);
    }
    if (state.phase === 'won') wins++;
    hpLost += hp - state.player.hp;
    turns += state.turn;
  }
  return { winRate: wins / seeds, avgHpLost: hpLost / seeds, avgTurns: turns / seeds };
}

const RARITY_RANK: Record<Rarity, number> = { starter: 0, common: 1, uncommon: 2, rare: 3 };
const MAX_DECK = 22;

function pickCard(run: RunState, choices: readonly string[]): string | null {
  if (run.deck.length >= MAX_DECK) return null;
  const rank = (id: string) => RARITY_RANK[db.cards[id]?.rarity ?? 'starter'];
  return [...choices].sort((a, b) => rank(b) - rank(a))[0] ?? null;
}

function upgradeTarget(run: RunState): CardInstance | undefined {
  const notUpgraded = run.deck.filter((card) => !card.upgraded);
  const rank = (card: CardInstance) => RARITY_RANK[db.cards[card.defId]?.rarity ?? 'starter'];
  return [...notUpgraded].sort((a, b) => rank(b) - rank(a))[0];
}

interface RunSummary {
  outcome: 'victory' | 'defeat';
  bossesDefeated: string[];
  diedTo?: string;
}

function playRun(seed: number): RunSummary {
  let run = createRun(db, seed);
  const bossesDefeated: string[] = [];
  let diedTo: string | undefined;
  for (let step = 0; step < 50000; step++) {
    const screen = run.screen;
    if (screen.type === 'victory' || screen.type === 'defeat') break;
    let next: RunState = run;
    switch (screen.type) {
      case 'map': {
        const healthy = run.hp > run.maxHp * 0.7;
        const order: NodeType[] = healthy
          ? ['elite', 'fight', 'dig', 'rest', 'boss']
          : ['rest', 'dig', 'fight', 'elite', 'boss'];
        const target = [...availableNodes(run)].sort((a, b) => order.indexOf(a.type) - order.indexOf(b.type))[0];
        if (target) next = enterNode(db, run, target.id);
        break;
      }
      case 'combat': {
        const { combat } = screen;
        if (combat.phase !== 'player') {
          const tier = db.enemies[combat.enemy.defId]?.tier;
          if (combat.phase === 'won' && tier === 'boss') bossesDefeated.push(combat.enemy.defId);
          if (combat.phase === 'lost') diedTo = combat.enemy.defId;
          next = resolveCombat(db, run);
          break;
        }
        const uid = chooseCard(combat);
        next = uid ? runPlayCard(db, run, uid) : runEndTurn(db, run);
        break;
      }
      case 'reward':
        next = chooseCardReward(db, run, pickCard(run, screen.reward.choices));
        break;
      case 'dig':
        next = chooseDig(db, run, pickCard(run, screen.choices));
        break;
      case 'rest': {
        const node = run.map.find((n) => n.id === run.currentNodeId);
        const healBelow = node && node.floor >= 4 ? 0.75 : 0.5;
        const target = upgradeTarget(run);
        next =
          run.hp < run.maxHp * healBelow || !target
            ? chooseRest(db, run, { type: 'heal' })
            : chooseRest(db, run, { type: 'upgrade', uid: target.uid });
        break;
      }
      case 'actComplete':
        next = startNextAct(db, run);
        break;
    }
    if (next === run) throw new Error(`seed ${seed}: no progress on ${screen.type}`);
    run = next;
  }
  if (run.screen.type !== 'victory' && run.screen.type !== 'defeat')
    throw new Error(`seed ${seed}: run did not finish`);
  const summary: RunSummary = { outcome: run.screen.type, bossesDefeated };
  if (diedTo !== undefined) summary.diedTo = diedTo;
  return summary;
}

const enemiesOf = (era: string, tier: string) =>
  Object.values(db.enemies).filter((e) => e.era === era && e.tier === tier);

describe('act 1 fights (greedy bot)', () => {
  it.each(enemiesOf('trias', 'normal').map((e) => e.id))('starter deck beats %s with moderate HP loss', (enemyId) => {
    const result = fightMany(db.starterDeck, enemyId);
    expect(result.winRate).toBe(1);
    expect(result.avgHpLost).toBeGreaterThanOrEqual(2);
    expect(result.avgHpLost).toBeLessThanOrEqual(12);
  });

  it.each(enemiesOf('trias', 'elite').map((e) => e.id))('starter deck + 3 cards beats elite %s', (enemyId) => {
    const deck = [...db.starterDeck, 'coelophysis', 'nothosaurus', 'herrerasaurus'];
    const result = fightMany(deck, enemyId, { hp: 55 });
    expect(result.winRate).toBeGreaterThanOrEqual(0.9);
    expect(result.avgHpLost).toBeLessThanOrEqual(25);
  });

  it('a modest deck beats the act-1 boss in a long fight', () => {
    const deck = [
      ...db.starterDeck,
      'coelophysis',
      'nothosaurus',
      'herrerasaurus',
      'placodus',
      'equisetites',
      'shonisaurus',
    ];
    const [boss] = enemiesOf('trias', 'boss');
    const result = fightMany(deck, boss?.id ?? '', { hp: 50, upgraded: 2 });
    expect(result.winRate).toBeGreaterThanOrEqual(0.8);
    expect(result.avgTurns).toBeGreaterThanOrEqual(4);
  });
});

describe('full runs (greedy bot)', () => {
  const runs = Array.from({ length: 120 }, (_, i) => playRun(5000 + i * 104729));

  it('is neither impossible nor trivial', () => {
    const winRate = runs.filter((r) => r.outcome === 'victory').length / runs.length;
    expect(winRate).toBeGreaterThanOrEqual(0.05);
    expect(winRate).toBeLessThanOrEqual(0.8);
  });

  it('lets the bot beat every boss at least sometimes', () => {
    const beaten = new Set(runs.flatMap((r) => r.bossesDefeated));
    for (const boss of Object.values(db.enemies).filter((e) => e.tier === 'boss')) {
      expect({ boss: boss.id, beaten: beaten.has(boss.id) }).toEqual({ boss: boss.id, beaten: true });
    }
  });

  it('does not let normal enemies end most runs', () => {
    const deaths = runs.filter((r) => r.diedTo !== undefined);
    const toNormals = deaths.filter((r) => db.enemies[r.diedTo ?? '']?.tier === 'normal').length;
    expect(toNormals / Math.max(1, deaths.length)).toBeLessThanOrEqual(0.25);
  });
});
