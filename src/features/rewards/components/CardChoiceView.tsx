import { type ReactNode, useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { CONTENT } from '@/data';
import type { CardDef } from '@/engine/types';
import { usePressGuard } from '@/features/shell/hooks';
import * as haptics from '@/lib/haptics';
import { useMeta, useSettings } from '@/state/selectors';
import { AppText, Button, CardDetailSheet, getCardView, Screen, spacing, useLayout, useReduceMotion } from '@/ui';

import { choiceDefs } from '../rewardModel';
import { CardChoiceCarousel } from './CardChoiceCarousel';

export interface CardChoiceViewProps {
  /** Big emoji above the title. */
  icon: string;
  title: string;
  subtitle: string;
  /** Extra content between title and cards (fossil finds, banners …). */
  intro?: ReactNode;
  choices: readonly string[];
  /** Called once with the chosen card id, or null to skip. */
  onChoose: (defId: string | null) => void;
  /** Screen background (theme token value). */
  backgroundColor?: string;
  /** Colour of the title (theme token value). */
  titleColor?: string;
  testID?: string;
}

/**
 * Shared "pick 1 of 3" layout of the reward and dig screens: title, intro,
 * card carousel (tap = select, long press = details) and the thumb-zone
 * buttons "Karte nehmen" / "Überspringen".
 */
export function CardChoiceView({
  icon,
  title,
  subtitle,
  intro,
  choices,
  onChoose,
  backgroundColor,
  titleColor,
  testID,
}: CardChoiceViewProps) {
  const settings = useSettings();
  const { fossils } = useMeta();
  const reduceMotion = useReduceMotion(settings.reducedMotion);
  const { contentWidth, gutter, height } = useLayout();
  const guard = usePressGuard();

  const defs = useMemo(() => choiceDefs(CONTENT, choices), [choices]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<CardDef | null>(null);
  const selected = defs.find((def) => def.id === selectedId) ?? null;

  const onSelect = useCallback((def: CardDef) => {
    haptics.selection();
    setSelectedId(def.id);
  }, []);
  const onDetails = useCallback((def: CardDef) => {
    haptics.tapLight();
    setDetail(def);
  }, []);
  const closeDetail = useCallback(() => setDetail(null), []);

  const choose = useCallback(
    (defId: string | null) => {
      guard(() => {
        if (defId === null) haptics.tapLight();
        else haptics.cardPlayed();
        setDetail(null);
        onChoose(defId);
      });
    },
    [guard, onChoose],
  );
  const takeSelected = useCallback(() => {
    if (selectedId !== null) choose(selectedId);
  }, [choose, selectedId]);
  const skip = useCallback(() => choose(null), [choose]);
  const takeDetail = useCallback(() => {
    if (detail) choose(detail.id);
  }, [choose, detail]);

  const selectedName = selected ? getCardView(selected, false).name : null;
  const hasChoices = defs.length > 0;

  return (
    <Screen
      scroll
      backgroundColor={backgroundColor}
      contentStyle={styles.body}
      testID={testID}
      footer={
        <>
          {hasChoices ? (
            <Button
              label="Karte nehmen"
              accessibilityLabel={selectedName ? `${selectedName} nehmen` : 'Karte nehmen'}
              icon="🃏"
              size="lg"
              fullWidth
              disabled={selected === null}
              onPress={takeSelected}
              accessibilityHint={selected ? 'Fügt die Karte deinem Deck hinzu.' : 'Wähle zuerst eine Karte aus.'}
              testID="choice-take"
            />
          ) : null}
          <Button
            label={hasChoices ? 'Überspringen' : 'Weiter'}
            variant={hasChoices ? 'ghost' : 'primary'}
            size={hasChoices ? 'md' : 'lg'}
            fullWidth
            onPress={skip}
            accessibilityHint={hasChoices ? 'Du nimmst keine Karte mit.' : undefined}
            testID="choice-skip"
          />
        </>
      }
    >
      <View style={styles.hero}>
        <Text style={styles.icon} allowFontScaling={false} accessible={false}>
          {icon}
        </Text>
        <AppText variant="title" align="center" accessibilityRole="header" color={titleColor}>
          {title}
        </AppText>
        <AppText variant="body" tone="secondary" align="center">
          {subtitle}
        </AppText>
      </View>

      {intro}

      {hasChoices ? (
        <View style={[styles.choices, { marginHorizontal: -gutter }]}>
          <CardChoiceCarousel
            defs={defs}
            selectedId={selectedId}
            onSelect={onSelect}
            onDetails={onDetails}
            viewportWidth={contentWidth}
            windowHeight={height}
            reduceMotion={reduceMotion}
          />
          <AppText variant="caption" tone="muted" align="center" style={{ paddingHorizontal: gutter }}>
            Wischen zum Vergleichen · Tippen zum Wählen · Lange drücken für Details
          </AppText>
        </View>
      ) : (
        <AppText variant="body" tone="muted" align="center">
          Diesmal ist nichts Brauchbares dabei.
        </AppText>
      )}

      <CardDetailSheet
        def={detail}
        fossil={detail ? CONTENT.fossils[detail.fossilId] : undefined}
        fossilDiscovered={detail ? fossils[detail.fossilId] !== undefined : false}
        visible={detail !== null}
        onClose={closeDetail}
        primaryAction={detail ? { label: 'Karte nehmen', onPress: takeDetail } : undefined}
        reducedMotion={settings.reducedMotion}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { gap: spacing.lg, paddingTop: spacing.lg },
  hero: { alignItems: 'center', gap: spacing.xs },
  icon: { fontSize: 44, lineHeight: 54, textAlign: 'center' },
  // The carousel spans the full content column (it bleeds into the gutter).
  choices: { alignItems: 'center', gap: spacing.xs },
});
