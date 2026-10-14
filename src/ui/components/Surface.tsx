import { memo } from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';

import { colors, elevation, type ElevationLevel, radii, spacing, type SpacingToken } from '../theme';

export type SurfaceLevel = 'surface' | 'raised' | 'high';

export interface SurfaceProps extends ViewProps {
  level?: SurfaceLevel;
  /** Inner padding token (default 'lg'). */
  padding?: SpacingToken;
  /** Draw a 1 dp border (default true). */
  bordered?: boolean;
  shadow?: ElevationLevel;
  radius?: keyof typeof radii;
}

const BACKGROUNDS: Record<SurfaceLevel, string> = {
  surface: colors.surface,
  raised: colors.surfaceRaised,
  high: colors.surfaceHigh,
};

/** Rounded panel on top of the screen background. */
export const Surface = memo(function Surface({
  level = 'surface',
  padding = 'lg',
  bordered = true,
  shadow = 0,
  radius = 'lg',
  style,
  ...rest
}: SurfaceProps) {
  return (
    <View
      style={[
        { backgroundColor: BACKGROUNDS[level], padding: spacing[padding], borderRadius: radii[radius] },
        bordered && styles.border,
        elevation(shadow),
        style,
      ]}
      {...rest}
    />
  );
});

export interface DividerProps {
  /** Vertical margin token (default 'sm'). */
  spacing?: SpacingToken;
}

/** Hairline separator. */
export const Divider = memo(function Divider({ spacing: gap = 'sm' }: DividerProps) {
  return <View style={[styles.divider, { marginVertical: spacing[gap] }]} accessible={false} importantForAccessibility="no" />;
});

const styles = StyleSheet.create({
  border: { borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.divider, alignSelf: 'stretch' },
});
