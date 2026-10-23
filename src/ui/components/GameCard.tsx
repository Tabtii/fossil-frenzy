import { memo, useMemo } from 'react';
import { type GestureResponderEvent, Pressable, type StyleProp, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import type { CardDef, CardType, Rarity } from '@/engine/types';

import { cardAccessibilityLabel, type DamagePreview, getCardView, planDamagePreview, previewTrend } from '../format';
import { CARD_TYPE_ICONS } from '../labels';
import { cardHeightFor } from '../layout';
import {
  cardTypeColors,
  colors,
  eraColors,
  fontScale,
  glow,
  opacity,
  radii,
  rarityColors,
} from '../theme';
import { EraBadge } from './EraBadge';
import { FossilArtwork } from './FossilArtwork';

export type GameCardSize = 'hand' | 'full' | 'mini';

/** Default widths per size (hand cards usually get `useLayout().cardWidth`). */
export const GAME_CARD_WIDTH: Record<GameCardSize, number> = { mini: 64, hand: 88, full: 240 };

export interface GameCardProps {
  def: CardDef;
  upgraded?: boolean;
  size?: GameCardSize;
  /** Card width in dp; height follows the 5:7 card aspect. */
  width?: number;
  /** Engine preview (per-hit damage right now). Replaces the printed number or shows a badge. */
  previewDamage?: number | null;
  /** Overrides the printed cost. */
  costOverride?: number;
  /** Greyed out and not pressable. */
  disabled?: boolean;
  /** Highlighted (e.g. lifted hand card). */
  selected?: boolean;
  /** Not enough energy: red cost gem, slightly dimmed. */
  unaffordable?: boolean;
  onPress?: (event: GestureResponderEvent) => void;
  onLongPress?: (event: GestureResponderEvent) => void;
  /**
   * Expose the card as one accessibility element (default true). Set false when
   * a parent (e.g. a gesture wrapper) provides the label via `cardAccessibilityLabel`.
   */
  accessible?: boolean;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

interface SizeSpec {
  designWidth: number;
  border: number;
  radius: number;
  pad: number;
  artRatio: number;
  emoji: number;
  gem: number;
  cost: number;
  name: number;
  text: number;
  nameLines: number;
  /** 0 hides the rules text. */
  textLines: number;
  footer: boolean;
  eraBadge: boolean;
  maxFontScale: number;
}

const SPECS: Record<GameCardSize, SizeSpec> = {
  mini: {
    designWidth: 64,
    border: 1.5,
    radius: 8,
    pad: 3,
    artRatio: 0.52,
    emoji: 26,
    gem: 18,
    cost: 11,
    name: 9.5,
    text: 0,
    nameLines: 2,
    textLines: 0,
    footer: false,
    eraBadge: false,
    maxFontScale: fontScale.cardCompact,
  },
  hand: {
    designWidth: 88,
    border: 2,
    radius: 10,
    pad: 4,
    artRatio: 0.3,
    emoji: 28,
    gem: 22,
    cost: 13,
    name: 10.5,
    text: 9.5,
    nameLines: 1,
    textLines: 5,
    footer: false,
    eraBadge: false,
    maxFontScale: fontScale.cardCompact,
  },
  full: {
    designWidth: 240,
    border: 3,
    radius: 18,
    pad: 12,
    artRatio: 0.34,
    emoji: 72,
    gem: 44,
    cost: 24,
    name: 20,
    text: 15,
    nameLines: 2,
    textLines: 8,
    footer: true,
    eraBadge: true,
    maxFontScale: fontScale.card,
  },
};

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function buildMetrics(size: GameCardSize, width: number) {
  const spec = SPECS[size];
  const k = width / spec.designWidth;
  const height = cardHeightFor(width);
  const pad = round1(spec.pad * k);
  const gem = Math.round(spec.gem * k);
  const nameSize = round1(spec.name * k);
  const textSize = round1(spec.text * k);
  const eraDot = Math.max(6, Math.round(9 * k));
  const radius = round1(spec.radius * k);
  // No overflow clipping on the frame (it would also clip the selection glow
  // on iOS); the art area gets matching inner corner radii instead.
  const innerRadius = Math.max(0, radius - spec.border);
  return {
    spec,
    width,
    height,
    styles: StyleSheet.create({
      root: {
        width,
        height,
        borderRadius: radius,
        borderWidth: spec.border,
        backgroundColor: colors.card,
      },
      art: {
        overflow: 'hidden',
        height: Math.round(height * spec.artRatio),
        alignItems: 'center',
        justifyContent: 'center',
        borderTopLeftRadius: innerRadius,
        borderTopRightRadius: innerRadius,
      },
      emoji: { fontSize: round1(spec.emoji * k), lineHeight: Math.round(spec.emoji * k * 1.2), textAlign: 'center', color: colors.text },
      gem: {
        position: 'absolute',
        top: pad,
        left: pad,
        width: gem,
        height: gem,
        borderRadius: gem / 2,
        borderWidth: Math.max(1, round1(1.5 * k)),
        borderColor: colors.energyDeep,
        backgroundColor: colors.energy,
        alignItems: 'center',
        justifyContent: 'center',
      },
      gemText: {
        color: colors.onEnergy,
        fontSize: round1(spec.cost * k),
        lineHeight: Math.round(spec.cost * k * 1.2),
        fontWeight: '900',
        textAlign: 'center',
        includeFontPadding: false,
      },
      eraDot: {
        position: 'absolute',
        top: pad + (gem - eraDot) / 2,
        right: pad,
        width: eraDot,
        height: eraDot,
        borderRadius: eraDot / 2,
        borderWidth: 1,
        borderColor: colors.card,
      },
      eraBadge: { position: 'absolute', top: pad, right: pad },
      previewBadge: {
        position: 'absolute',
        bottom: Math.max(2, round1(3 * k)),
        right: pad,
        borderRadius: radii.pill,
        paddingHorizontal: Math.max(3, round1(5 * k)),
        backgroundColor: colors.background,
        borderWidth: 1,
      },
      previewText: { fontSize: round1(Math.max(spec.text, 9) * k), fontWeight: '900', fontVariant: ['tabular-nums'] },
      nameRow: { paddingHorizontal: pad, paddingTop: round1(pad * 0.75) },
      name: {
        color: colors.text,
        fontSize: nameSize,
        lineHeight: Math.round(nameSize * 1.25),
        fontWeight: '800',
        textAlign: 'center',
      },
      rule: {
        height: Math.max(1.5, round1(2 * k)),
        marginHorizontal: pad * 2,
        marginTop: round1(pad * 0.6),
        borderRadius: 2,
      },
      textBox: { flex: 1, paddingHorizontal: pad, paddingVertical: round1(pad * 0.75), justifyContent: 'center' },
      text: {
        color: colors.text,
        fontSize: textSize,
        lineHeight: Math.round(textSize * 1.3),
        textAlign: 'center',
        flexShrink: 1,
      },
      footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: pad,
        paddingBottom: round1(pad * 0.75),
      },
      footerText: { color: colors.textMuted, fontSize: round1(11 * k * 0.9), fontWeight: '700' },
    }),
  };
}

type CardMetrics = ReturnType<typeof buildMetrics>;

// Hand cards share one width, so styles are cached per size/width instead of
// being rebuilt for every card on every render.
const metricsCache = new Map<string, CardMetrics>();

function getMetrics(size: GameCardSize, width: number): CardMetrics {
  const key = `${size}:${width}`;
  let metrics = metricsCache.get(key);
  if (!metrics) {
    if (metricsCache.size > 64) metricsCache.clear();
    metrics = buildMetrics(size, width);
    metricsCache.set(key, metrics);
  }
  return metrics;
}

function trendColor(preview: DamagePreview): string {
  const trend = previewTrend(preview);
  return trend > 0 ? colors.success : trend < 0 ? colors.danger : colors.text;
}

function frameColor(rarity: Rarity, selected: boolean): string {
  // Not the accent: rare cards already use it, and the glow is missing on Android < 9.
  return selected ? colors.focus : rarityColors[rarity];
}

function typeTint(type: CardType): { backgroundColor: string } {
  return typeTintStyles[type];
}

const typeTintStyles = StyleSheet.create({
  attack: { backgroundColor: cardTypeColors.attack.soft },
  defense: { backgroundColor: cardTypeColors.defense.soft },
  support: { backgroundColor: cardTypeColors.support.soft },
});

const typeRuleStyles = StyleSheet.create({
  attack: { backgroundColor: cardTypeColors.attack.main },
  defense: { backgroundColor: cardTypeColors.defense.main },
  support: { backgroundColor: cardTypeColors.support.main },
});

function RulesText({
  text,
  preview,
  metrics,
}: {
  text: string;
  preview: DamagePreview;
  metrics: CardMetrics;
}) {
  const { spec, styles: s } = metrics;
  const common = {
    style: s.text,
    numberOfLines: spec.textLines,
    adjustsFontSizeToFit: true,
    minimumFontScale: 0.7,
    maxFontSizeMultiplier: spec.maxFontScale,
  } as const;
  if (preview.mode === 'inline') {
    const color = trendColor(preview);
    return (
      <Text {...common}>
        {preview.before}
        <Text style={[styles.previewInline, { color }]}>{preview.value}</Text>
        {preview.after}
      </Text>
    );
  }
  return <Text {...common}>{text}</Text>;
}

/**
 * A card in three sizes: 'mini' (lists), 'hand' (combat hand) and 'full'
 * (detail view). Frame colour = rarity, art tint and rule = card type,
 * rules text generated from the effects.
 */
export const GameCard = memo(function GameCard({
  def,
  upgraded = false,
  size = 'hand',
  width,
  previewDamage,
  costOverride,
  disabled = false,
  selected = false,
  unaffordable = false,
  onPress,
  onLongPress,
  accessible = true,
  accessibilityHint,
  style,
  testID,
}: GameCardProps) {
  const cardWidth = Math.round(width ?? GAME_CARD_WIDTH[size]);
  const metrics = getMetrics(size, cardWidth);
  const { spec, styles: s } = metrics;

  const view = useMemo(() => getCardView(def, upgraded), [def, upgraded]);
  const preview = useMemo(
    () => (spec.textLines > 0 ? planDamagePreview(def, upgraded, previewDamage) : ({ mode: 'none' } as const)),
    [def, upgraded, previewDamage, spec.textLines],
  );
  const cost = costOverride ?? view.cost;
  const label = useMemo(
    () => cardAccessibilityLabel(def, upgraded, { previewDamage, unaffordable, cost }),
    [def, upgraded, previewDamage, unaffordable, cost],
  );

  const interactive = onPress !== undefined || onLongPress !== undefined;

  const content = (
    <>
      <View style={[s.art, typeTint(def.type)]}>
        <FossilArtwork fossilId={def.fossilId} emoji={def.emoji} emojiStyle={s.emoji} frame={{ width: cardWidth - 2 * spec.border, height: Math.round(metrics.height * spec.artRatio) }} />
        {preview.mode === 'badge' ? (
          <View style={[s.previewBadge, { borderColor: trendColor(preview) }]}>
            <Text
              style={[s.previewText, { color: trendColor(preview) }]}
              maxFontSizeMultiplier={spec.maxFontScale}
              numberOfLines={1}
            >
              {CARD_TYPE_ICONS.attack} {preview.hits > 1 ? `${preview.value}×${preview.hits}` : preview.value}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={[s.gem, unaffordable && styles.gemUnaffordable]}>
        <Text
          style={[s.gemText, unaffordable && styles.gemTextUnaffordable]}
          maxFontSizeMultiplier={spec.maxFontScale}
          numberOfLines={1}
        >
          {cost}
        </Text>
      </View>

      {spec.eraBadge ? (
        <EraBadge era={def.era} size="sm" style={s.eraBadge} />
      ) : (
        <View style={[s.eraDot, { backgroundColor: eraColors[def.era].main }]} />
      )}

      <View style={s.nameRow}>
        <Text
          style={[s.name, upgraded && styles.nameUpgraded]}
          numberOfLines={spec.nameLines}
          adjustsFontSizeToFit
          minimumFontScale={0.7}
          maxFontSizeMultiplier={spec.maxFontScale}
        >
          {view.name}
        </Text>
      </View>
      <View style={[s.rule, typeRuleStyles[def.type]]} />

      {spec.textLines > 0 ? (
        <View style={s.textBox}>
          <RulesText text={view.text} preview={preview} metrics={metrics} />
        </View>
      ) : null}

      {spec.footer ? (
        <View style={s.footer}>
          <Text style={s.footerText} maxFontSizeMultiplier={spec.maxFontScale} numberOfLines={1}>
            {CARD_TYPE_ICONS[def.type]} {view.typeLabel}
          </Text>
          <Text
            style={[s.footerText, { color: rarityColors[def.rarity] }]}
            maxFontSizeMultiplier={spec.maxFontScale}
            numberOfLines={1}
          >
            {view.rarityLabel}
          </Text>
        </View>
      ) : null}
    </>
  );

  const frame = [
    s.root,
    { borderColor: frameColor(def.rarity, selected) },
    selected && styles.selected,
    unaffordable && !disabled && styles.unaffordable,
    disabled && styles.disabled,
  ];

  if (interactive) {
    return (
      <Pressable
        accessible={accessible}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint={accessibilityHint}
        accessibilityState={{ disabled, selected }}
        disabled={disabled}
        onPress={onPress}
        onLongPress={onLongPress}
        delayLongPress={350}
        testID={testID}
        style={({ pressed }) => [frame, pressed && styles.pressed, style]}
      >
        {content}
      </Pressable>
    );
  }

  return (
    <View
      accessible={accessible}
      accessibilityLabel={accessible ? label : undefined}
      accessibilityHint={accessibilityHint}
      accessibilityState={accessible ? { disabled, selected } : undefined}
      testID={testID}
      style={[frame, style]}
    >
      {content}
    </View>
  );
});

/** Height of a GameCard of the given width (5:7). */
export function gameCardHeight(width: number): number {
  return cardHeightFor(Math.round(width));
}

const styles = StyleSheet.create({
  selected: glow(colors.accent, 14),
  unaffordable: { opacity: opacity.unaffordable },
  disabled: { opacity: opacity.disabled },
  pressed: { transform: [{ scale: 0.97 }] },
  gemUnaffordable: { backgroundColor: colors.dangerFill, borderColor: colors.danger },
  gemTextUnaffordable: { color: colors.onDangerFill },
  nameUpgraded: { color: colors.success },
  previewInline: { fontWeight: '900' },
});
