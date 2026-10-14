import { shuffle, type RngResult } from '../rng';
import type { CardDef, ContentDB, EnemyTier, Era, Rarity } from '../types';
import { byId, pickOne, weightedPick } from './random';

export type RewardRarity = Exclude<Rarity, 'starter'>;

/** Rarity odds in percent per encounter tier (digs use the normal odds). */
export const RARITY_ODDS: Record<EnemyTier, Record<RewardRarity, number>> = {
  normal: { common: 60, uncommon: 33, rare: 7 },
  elite: { common: 40, uncommon: 45, rare: 15 },
  boss: { common: 0, uncommon: 0, rare: 100 },
};

/** Max HP gained when the encounter is won. */
export const MAX_HP_GAIN: Record<EnemyTier, number> = { normal: 0, elite: 4, boss: 8 };

export const REWARD_CHOICES = 3;
/** At least this many choices come from the current era (if available). */
export const MIN_ERA_CHOICES = 2;

/** Rarities tried in order when the rolled rarity has no cards left. */
const FALLBACK: Record<RewardRarity, RewardRarity[]> = {
  common: ['common', 'uncommon', 'rare'],
  uncommon: ['uncommon', 'common', 'rare'],
  rare: ['rare', 'uncommon', 'common'],
};

/** Cards that may appear as rewards: never starters (by rarity or starter deck). */
export function rewardPool(db: ContentDB): CardDef[] {
  const starters = new Set(db.starterDeck);
  return Object.values(db.cards)
    .filter((card) => card.rarity !== 'starter' && !starters.has(card.id))
    .sort(byId);
}

/**
 * Rolls `count` distinct card choices for a reward or dig site.
 *
 * Each slot rolls a rarity by `RARITY_ODDS[tier]`. The first MIN_ERA_CHOICES
 * slots prefer the current era, the rest draw from every era. Bosses keep
 * their rarity over the era preference; normal fights and elites keep the era
 * and fall back to neighbouring rarities first. Fewer choices are returned
 * only when the content runs out of cards.
 */
export function rollCardChoices(
  db: ContentDB,
  era: Era,
  tier: EnemyTier,
  state: number,
  count: number = REWARD_CHOICES,
): RngResult<string[]> {
  let rng = state;
  const pool = rewardPool(db);
  const chosen: string[] = [];

  for (let slot = 0; slot < count; slot++) {
    const roll = weightedPick(rng, Object.entries(RARITY_ODDS[tier]) as [RewardRarity, number][]);
    rng = roll.state;
    const rarities = FALLBACK[roll.value ?? 'common'];
    const wantsEra = slot < MIN_ERA_CHOICES;

    const available = pool.filter((card) => !chosen.includes(card.id));
    const attempts: CardDef[][] = [];
    const forRarity = (rarity: RewardRarity, eraOnly: boolean) =>
      available.filter((card) => card.rarity === rarity && (!eraOnly || card.era === era));
    if (!wantsEra) {
      for (const rarity of rarities) attempts.push(forRarity(rarity, false));
    } else if (tier === 'boss') {
      for (const rarity of rarities) attempts.push(forRarity(rarity, true), forRarity(rarity, false));
    } else {
      for (const rarity of rarities) attempts.push(forRarity(rarity, true));
      for (const rarity of rarities) attempts.push(forRarity(rarity, false));
    }

    const candidates = attempts.find((attempt) => attempt.length > 0);
    if (!candidates) break;
    const pick = pickOne(rng, candidates);
    rng = pick.state;
    if (pick.value) chosen.push(pick.value.id);
  }

  // Era cards are picked first; shuffle so their position gives nothing away.
  const shuffled = shuffle(rng, chosen);
  return { value: shuffled.value, state: shuffled.state };
}
