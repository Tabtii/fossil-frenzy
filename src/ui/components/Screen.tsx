import { StatusBar } from 'expo-status-bar';
import type { ReactNode } from 'react';
import { ScrollView, type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';

import { useLayout } from '../layout';
import { colors, sizes, spacing } from '../theme';

export interface ScreenProps {
  children?: ReactNode;
  /** Wrap the body in a ScrollView (default false). */
  scroll?: boolean;
  /** Fixed content above the body, e.g. <Header>. Not padded horizontally. */
  header?: ReactNode;
  /**
   * Fixed content at the bottom (thumb zone), e.g. the primary action. Gets the
   * bottom safe-area inset; the body then does not.
   */
  footer?: ReactNode;
  /** Horizontal gutter for body and footer (default true). */
  padded?: boolean;
  /** Max. width of the centred column (default 560). */
  maxWidth?: number;
  /** Background colour token value (default colors.background). */
  backgroundColor?: string;
  /** Render the light status bar (default true). */
  statusBar?: boolean;
  /** Apply the top safe-area inset (default true; false for full-bleed art). */
  safeTop?: boolean;
  style?: StyleProp<ViewStyle>;
  /** Style of the body (or the ScrollView's content container). */
  contentStyle?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * Screen frame: background, safe areas (edge-to-edge), centred content column
 * (max. 560 dp on tablets), optional scrolling body and a fixed footer for
 * primary actions in the thumb zone.
 */
export function Screen({
  children,
  scroll = false,
  header,
  footer,
  padded = true,
  maxWidth = sizes.maxContentWidth,
  backgroundColor = colors.background,
  statusBar = true,
  safeTop = true,
  style,
  contentStyle,
  testID,
}: ScreenProps) {
  const { insets, gutter } = useLayout();
  const horizontal = padded ? gutter : 0;
  const bodyBottom = footer ? spacing.sm : insets.bottom + spacing.lg;

  const frame = {
    paddingTop: safeTop ? insets.top : 0,
    paddingLeft: insets.left,
    paddingRight: insets.right,
  };
  const bodyPadding = { paddingHorizontal: horizontal, paddingBottom: bodyBottom };

  return (
    <View style={[styles.root, { backgroundColor }, style]} testID={testID}>
      {statusBar ? <StatusBar style="light" /> : null}
      <View style={[styles.frame, frame]}>
        <View style={[styles.column, { maxWidth }]}>
          {header}
          {scroll ? (
            <ScrollView
              style={styles.flex}
              contentContainerStyle={[styles.scrollContent, bodyPadding, contentStyle]}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {children}
            </ScrollView>
          ) : (
            <View style={[styles.flex, bodyPadding, contentStyle]}>{children}</View>
          )}
          {footer ? (
            <View style={[styles.footer, { paddingHorizontal: horizontal, paddingBottom: insets.bottom + spacing.md }]}>
              {footer}
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  frame: { flex: 1 },
  column: { flex: 1, width: '100%', alignSelf: 'center' },
  flex: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  footer: { paddingTop: spacing.sm, gap: spacing.sm },
});
