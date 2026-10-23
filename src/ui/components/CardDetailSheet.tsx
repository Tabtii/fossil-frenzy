import { memo, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { CardDef, FossilEntry } from '@/engine/types';

import { cardGlossary, formatLength, formatMya, getCardView } from '../format';
import { CARD_TAG_LABELS, DIET_LABELS, FOSSIL_KIND_LABELS, UI_STRINGS } from '../labels';
import { useLayout } from '../layout';
import { colors, fontScale, radii, spacing } from '../theme';
import { AppText } from './AppText';
import { BottomSheet } from './BottomSheet';
import { Button, type ButtonVariant } from './Button';
import { EraBadge } from './EraBadge';
import { GameCard } from './GameCard';
import { Pill } from './Pill';

export interface CardDetailAction {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  accessibilityHint?: string;
}

export interface CardDetailSheetProps {
  def: CardDef | null;
  upgraded?: boolean;
  /** Fossil entry of the card; facts are shown when given. */
  fossil?: FossilEntry;
  /** False hides facts and shows a "not discovered yet" hint (default true). */
  fossilDiscovered?: boolean;
  visible: boolean;
  onClose: () => void;
  /** Optional primary action, e.g. "Karte nehmen" or "Verbessern". */
  primaryAction?: CardDetailAction;
  /** Engine damage preview for the card in combat. */
  previewDamage?: number | null;
  /** App setting; the OS setting is respected automatically. */
  reducedMotion?: boolean;
  testID?: string;
}

const FULL_CARD_MAX = 260;

function FossilSection({ fossil, discovered }: { fossil: FossilEntry; discovered: boolean }) {
  return (
    <View style={styles.fossil}>
      <View style={styles.fossilHeader}>
        <Text style={styles.fossilEmoji} allowFontScaling={false} accessible={false}>
          {fossil.emoji}
        </Text>
        <View style={styles.fossilTitles}>
          <AppText variant="subheading">{fossil.name}</AppText>
          <AppText variant="caption" tone="secondary" italic>
            {fossil.scientificName}
          </AppText>
        </View>
      </View>
      <View style={styles.pills}>
        <EraBadge era={fossil.era} size="sm" />
        <Pill size="sm" label={FOSSIL_KIND_LABELS[fossil.kind]} />
        <Pill size="sm" label={DIET_LABELS[fossil.diet]} />
      </View>
      <AppText variant="caption" tone="secondary">
        {[formatMya(fossil.mya), fossil.lengthM !== undefined ? formatLength(fossil.lengthM) : null, `Fundort: ${fossil.foundIn}`]
          .filter(Boolean)
          .join(' · ')}
      </AppText>
      {discovered ? (
        <View style={styles.facts}>
          <AppText variant="overline" tone="accent">
            {UI_STRINGS.facts}
          </AppText>
          {fossil.facts.map((fact) => (
            <View key={fact} style={styles.factRow}>
              <AppText variant="body" tone="accent" accessible={false}>
                •
              </AppText>
              <AppText variant="body" style={styles.factText}>
                {fact}
              </AppText>
            </View>
          ))}
        </View>
      ) : (
        <AppText variant="body" tone="muted">
          Finde dieses Fossil auf einer Expedition, um mehr zu erfahren.
        </AppText>
      )}
    </View>
  );
}

/**
 * Bottom sheet with the full-size card, a glossary of its keywords/statuses
 * and the matching fossil facts. Opened by a long press on a card.
 */
export const CardDetailSheet = memo(function CardDetailSheet({
  def,
  upgraded = false,
  fossil,
  fossilDiscovered = true,
  visible,
  onClose,
  primaryAction,
  previewDamage,
  reducedMotion = false,
  testID,
}: CardDetailSheetProps) {
  const { innerWidth } = useLayout();
  // Keep showing the last card while the sheet animates out, even when the
  // parent clears `def` together with `visible`.
  const [shown, setShown] = useState({ def, upgraded, fossil });
  if (def !== null && (def !== shown.def || upgraded !== shown.upgraded || fossil !== shown.fossil)) {
    setShown({ def, upgraded, fossil });
  }

  const cardWidth = Math.min(FULL_CARD_MAX, Math.round(innerWidth * 0.72));
  const card = shown.def;
  const glossary = useMemo(() => (card ? cardGlossary(card, shown.upgraded) : []), [card, shown.upgraded]);
  const title = card ? getCardView(card, shown.upgraded).name : '';

  const footer = (
    <>
      {primaryAction ? (
        <Button
          label={primaryAction.label}
          onPress={primaryAction.onPress}
          variant={primaryAction.variant ?? 'primary'}
          disabled={primaryAction.disabled}
          accessibilityHint={primaryAction.accessibilityHint}
          size="lg"
          fullWidth
        />
      ) : null}
      <Button label={UI_STRINGS.close} onPress={onClose} variant={primaryAction ? 'ghost' : 'secondary'} fullWidth />
    </>
  );

  return (
    <BottomSheet
      visible={visible && card !== null}
      onClose={onClose}
      title={title}
      footer={footer}
      reducedMotion={reducedMotion}
      testID={testID}
    >
      {card ? (
        <>
          <View style={styles.cardWrap}>
            <GameCard def={card} upgraded={shown.upgraded} size="full" width={cardWidth} previewDamage={previewDamage} />
          </View>
          {card.tags.length > 0 ? (
            <View style={styles.glossary}>
              <AppText variant="overline" tone="secondary">KARTENGRUPPEN</AppText>
              <View style={styles.pills}>
                {card.tags.map((tag) => <Pill key={tag} label={CARD_TAG_LABELS[tag]} size="sm" />)}
              </View>
              <AppText variant="caption" tone="secondary">Diese Gruppen zählen für Effekte wie „je weitere …-Karte“.</AppText>
            </View>
          ) : null}
          {glossary.length > 0 ? (
            <View style={styles.glossary}>
              <AppText variant="overline" tone="secondary">
                {UI_STRINGS.keywords}
              </AppText>
              {glossary.map((entry) => (
                <View key={entry.key} style={styles.glossaryRow} accessible>
                  <AppText variant="bodyStrong" maxFontSizeMultiplier={fontScale.body}>
                    {entry.emoji ? `${entry.emoji} ${entry.name}` : entry.name}
                  </AppText>
                  <AppText variant="caption" tone="secondary">
                    {entry.description}
                  </AppText>
                </View>
              ))}
            </View>
          ) : null}
          {shown.fossil ? <FossilSection fossil={shown.fossil} discovered={fossilDiscovered} /> : null}
        </>
      ) : null}
    </BottomSheet>
  );
});

const styles = StyleSheet.create({
  cardWrap: { alignItems: 'center', paddingVertical: spacing.sm },
  glossary: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceRaised,
  },
  glossaryRow: { gap: spacing.xxs },
  fossil: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceRaised,
    borderLeftWidth: 3,
    borderLeftColor: colors.accent,
  },
  fossilHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  fossilEmoji: { fontSize: 36, lineHeight: 44, color: colors.text },
  fossilTitles: { flex: 1, minWidth: 0 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  facts: { gap: spacing.xs, marginTop: spacing.xs },
  factRow: { flexDirection: 'row', gap: spacing.sm },
  factText: { flex: 1 },
});
