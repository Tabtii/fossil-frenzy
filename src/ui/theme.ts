import type { TextStyle, ViewStyle } from 'react-native';

import type { CardType, Era, IntentKind, Rarity, StatusId } from '@/engine/types';

// Design tokens for the dark "fossil night" theme. Screens and components must
// take every colour, spacing, radius and font size from here.
//
// Contrast (WCAG 2.1, checked against background/surface/surfaceRaised/surfaceHigh):
//   text ≥ 11.9:1, textSecondary ≥ 7.7:1, textMuted ≥ 5.0:1, accent ≥ 7.2:1,
//   danger ≥ 4.3:1 (≥ 4.9:1 up to surfaceRaised), onAccent on accent 10:1,
//   onDangerFill on dangerFill 5.4:1, white on hpFill 5.1:1, onEnergy on energy 11.3:1.
// textDisabled (3.8:1) is only for disabled controls, which WCAG exempts.

// ---------------------------------------------------------------------------
// Colours
// ---------------------------------------------------------------------------

export const colors = {
  // Backgrounds and surfaces (deep night blue/violet, lightest last).
  background: '#14121F',
  backgroundDeep: '#0E0C17',
  surface: '#1D1A2C',
  surfaceRaised: '#26223A',
  surfaceHigh: '#312C4A',
  surfacePressed: '#3A3456',
  card: '#221E33',
  cardText: '#2A2540',

  border: '#3B3556',
  borderStrong: '#544C78',
  divider: 'rgba(255, 255, 255, 0.08)',
  backdrop: 'rgba(7, 6, 14, 0.74)',
  scrim: 'rgba(7, 6, 14, 0.45)',
  shadow: '#000000',
  transparent: 'transparent',

  // Text
  text: '#F5F2FA',
  textSecondary: '#C9C3DB',
  textMuted: '#A39CBA',
  textDisabled: '#7A7393',
  textInverse: '#14121F',
  textShadow: 'rgba(0, 0, 0, 0.75)',

  // Brand accent: fossil amber.
  accent: '#F2B544',
  accentPressed: '#D99A2B',
  accentSoft: 'rgba(242, 181, 68, 0.16)',
  accentBorder: 'rgba(242, 181, 68, 0.55)',
  onAccent: '#1B1405',
  focus: '#FFE08A',

  // Feedback
  success: '#4CC38A',
  successSoft: 'rgba(76, 195, 138, 0.16)',
  onSuccess: '#06170E',
  danger: '#F2646A',
  dangerFill: '#C2353C',
  dangerPressed: '#A82D33',
  dangerSoft: 'rgba(242, 100, 106, 0.16)',
  onDangerFill: '#FFFFFF',
  warning: '#F5A524',
  info: '#5FA8F5',

  // Combat stats
  hp: '#F05A5F',
  hpFill: '#C8383E',
  hpTrail: 'rgba(247, 168, 171, 0.55)',
  hpTrack: '#3A1F2C',
  onHpFill: '#FFFFFF',
  block: '#8DB4DE',
  blockFill: '#4F79A6',
  blockSoft: 'rgba(141, 180, 222, 0.22)',
  onBlock: '#0F1A26',
  energy: '#FFD23F',
  energyDeep: '#C98F00',
  energyEmpty: '#4A4260',
  onEnergy: '#2A1E00',
  heal: '#4CC38A',
} as const;

export type ColorToken = keyof typeof colors;

export interface ToneColors {
  /** Strong colour: borders, icons, text on dark surfaces (AA on all surfaces). */
  main: string;
  /** Translucent tint for backgrounds. */
  soft: string;
  /** Readable text/icon colour on top of `main`. */
  onMain: string;
}

/** Era identity colours (trias = volcanic desert, jura = fern, kreide = blossom, eiszeit = ice). */
export const eraColors: Record<Era, ToneColors> = {
  trias: { main: '#F08A5D', soft: 'rgba(240, 138, 93, 0.16)', onMain: '#14121F' },
  jura: { main: '#6CC27A', soft: 'rgba(108, 194, 122, 0.16)', onMain: '#14121F' },
  kreide: { main: '#B99AF5', soft: 'rgba(185, 154, 245, 0.16)', onMain: '#14121F' },
  eiszeit: { main: '#9ADCF5', soft: 'rgba(154, 220, 245, 0.16)', onMain: '#14121F' },
};

/** Card type colours (frame stripe, art tint). */
export const cardTypeColors: Record<CardType, ToneColors> = {
  attack: { main: '#F06A5F', soft: 'rgba(240, 106, 95, 0.20)', onMain: '#14121F' },
  defense: { main: '#5FA8F5', soft: 'rgba(95, 168, 245, 0.20)', onMain: '#14121F' },
  support: { main: '#62C98F', soft: 'rgba(98, 201, 143, 0.20)', onMain: '#14121F' },
};

/** Card rarity colours (card border). */
export const rarityColors: Record<Rarity, string> = {
  starter: '#968FAE',
  common: '#B5AFC8',
  uncommon: '#4DC3D6',
  rare: '#F2B544',
};

/** Status chip colours (all ≥ 4.6:1 on surfaceRaised). */
export const statusColors: Record<StatusId, string> = {
  strength: '#F59E3B',
  vulnerable: '#F06A9B',
  weak: '#A598D6',
  bleed: '#F05A5F',
  confused: '#B98BFF',
};

/** Enemy intent colours. */
export const intentColors: Record<IntentKind, string> = {
  attack: colors.hp,
  defend: colors.block,
  buff: '#F59E3B',
  debuff: '#B98BFF',
  heal: colors.success,
  unknown: colors.textMuted,
};

/** Highlight for a confused enemy that will hit itself. */
export const selfHitColor = statusColors.confused;

// ---------------------------------------------------------------------------
// Spacing, radii, sizes
// ---------------------------------------------------------------------------

/** 4-pt spacing scale (xxs is a half step for hairline gaps). */
export const spacing = {
  none: 0,
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 48,
} as const;

export type SpacingToken = keyof typeof spacing;

/** `space(3)` → 12. Multiples of the 4-pt grid. */
export function space(steps: number): number {
  return steps * 4;
}

export const radii = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  pill: 999,
} as const;

/** Minimum touch target in dp (Material/HIG). */
export const TOUCH_TARGET = 48;

/** Hit slop that grows a smaller visual element to the minimum touch target. */
export function hitSlopFor(width: number, height: number = width): {
  top: number;
  bottom: number;
  left: number;
  right: number;
} {
  const h = Math.max(0, Math.ceil((TOUCH_TARGET - width) / 2));
  const v = Math.max(0, Math.ceil((TOUCH_TARGET - height) / 2));
  return { top: v, bottom: v, left: h, right: h };
}

export const sizes = {
  touchTarget: TOUCH_TARGET,
  headerHeight: 56,
  listRowMinHeight: 56,
  buttonHeight: { sm: 40, md: 48, lg: 56 },
  iconButton: 48,
  sheetHandle: { width: 40, height: 5 },
  maxContentWidth: 560,
  hairline: 1,
} as const;

// ---------------------------------------------------------------------------
// Typography
// ---------------------------------------------------------------------------

/**
 * Upper bounds for the system font scale (`maxFontSizeMultiplier`). The system
 * setting is always respected, only capped where fixed-size layouts (cards,
 * badges) would otherwise overflow.
 */
export const fontScale = {
  /** Card rules text on full-size cards (guideline ≈ 1.3). */
  card: 1.3,
  /** Text on small hand/mini cards. */
  cardCompact: 1.15,
  /** Running text in lists and sheets. */
  body: 1.6,
  /** Titles and headings. */
  title: 1.4,
  /** Badges, chips, orbs and bar labels. */
  badge: 1.2,
} as const;

export type TextVariant =
  | 'display'
  | 'title'
  | 'heading'
  | 'subheading'
  | 'body'
  | 'bodyStrong'
  | 'label'
  | 'caption'
  | 'overline'
  | 'number';

export const typography: Record<TextVariant, TextStyle> = {
  display: { fontSize: 32, lineHeight: 38, fontWeight: '800', letterSpacing: 0.2 },
  title: { fontSize: 24, lineHeight: 30, fontWeight: '800' },
  heading: { fontSize: 20, lineHeight: 26, fontWeight: '700' },
  subheading: { fontSize: 17, lineHeight: 22, fontWeight: '600' },
  body: { fontSize: 15, lineHeight: 21, fontWeight: '400' },
  bodyStrong: { fontSize: 15, lineHeight: 21, fontWeight: '700' },
  label: { fontSize: 13, lineHeight: 18, fontWeight: '600', letterSpacing: 0.2 },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '400' },
  overline: { fontSize: 11, lineHeight: 14, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase' },
  number: { fontSize: 16, lineHeight: 20, fontWeight: '800', fontVariant: ['tabular-nums'] },
};

/** Default `maxFontSizeMultiplier` per text variant. */
export const variantFontScale: Record<TextVariant, number> = {
  display: fontScale.title,
  title: fontScale.title,
  heading: fontScale.title,
  subheading: fontScale.body,
  body: fontScale.body,
  bodyStrong: fontScale.body,
  label: fontScale.body,
  caption: fontScale.body,
  overline: fontScale.badge,
  number: fontScale.badge,
};

// ---------------------------------------------------------------------------
// Elevation, layering, motion
// ---------------------------------------------------------------------------

export type ElevationLevel = 0 | 1 | 2 | 3 | 4;

const SHADOWS: Record<ElevationLevel, string | undefined> = {
  0: undefined,
  1: '0px 1px 3px rgba(0, 0, 0, 0.35)',
  2: '0px 3px 8px rgba(0, 0, 0, 0.40)',
  3: '0px 6px 16px rgba(0, 0, 0, 0.45)',
  4: '0px 12px 28px rgba(0, 0, 0, 0.55)',
};

const ELEVATION_STYLES: Record<ElevationLevel, ViewStyle> = {
  0: {},
  1: { boxShadow: SHADOWS[1] },
  2: { boxShadow: SHADOWS[2] },
  3: { boxShadow: SHADOWS[3] },
  4: { boxShadow: SHADOWS[4] },
};

/**
 * Shadow style for a surface. Uses `boxShadow` (New Architecture, both
 * platforms), so it renders the same on Android and iOS. Returns a shared
 * object — safe to spread into `StyleSheet.create`.
 */
export function elevation(level: ElevationLevel): ViewStyle {
  return ELEVATION_STYLES[level];
}

/** Soft coloured glow, e.g. for a selected card. */
export function glow(color: string, radius: number = 12): ViewStyle {
  return { boxShadow: `0px 0px ${radius}px ${color}` };
}

/** Absolute positioning that fills the parent (spread into styles). */
export const fill = { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 } as const satisfies ViewStyle;

/** Stacking order. Keep overlays above game layers. */
export const zIndex = {
  base: 0,
  raised: 1,
  hand: 10,
  handSelected: 20,
  floatingNumbers: 30,
  header: 40,
  footer: 40,
  overlay: 100,
  sheet: 110,
  toast: 200,
} as const;

/** Durations in ms; with reduced motion animations are skipped instead. */
export const durations = {
  fast: 120,
  normal: 220,
  slow: 320,
  bar: 450,
  float: 950,
} as const;

/** Spring configs for Reanimated's `withSpring`. */
export const springs = {
  snappy: { damping: 20, stiffness: 320, mass: 0.8 },
  gentle: { damping: 18, stiffness: 180, mass: 1 },
} as const;

/** Opacity tokens for state layers. */
export const opacity = {
  disabled: 0.45,
  unaffordable: 0.72,
  pressed: 0.85,
} as const;

export const theme = {
  colors,
  eraColors,
  cardTypeColors,
  rarityColors,
  statusColors,
  intentColors,
  spacing,
  radii,
  sizes,
  typography,
  fontScale,
  zIndex,
  durations,
  springs,
  opacity,
} as const;

export type Theme = typeof theme;
