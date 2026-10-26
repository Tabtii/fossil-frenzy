import { router } from 'expo-router';
import { memo, useCallback, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { CONTENT } from '@/data';
import type { CardDef, EnemyDef, FossilEntry, FossilRecord } from '@/engine/types';
import { ROUTES } from '@/features/navigation';
import { useHydrated, useMeta, useSettings } from '@/state/selectors';
import {
  AppText,
  Button,
  CardDetailSheet,
  colors,
  DIET_LABELS,
  EmptyState,
  EraBadge,
  eraColors,
  FOSSIL_KIND_LABELS,
  formatLength,
  FossilArtwork,
  GameCard,
  Header,
  ListRow,
  Pill,
  radii,
  Screen,
  spacing,
  Surface,
  UI_STRINGS,
  useLayout,
} from '@/ui';

import { LockedCard } from './components/LockedCard';
import { type CardSheetState, upgradeToggleLabel, useBackTo, useCardSheet } from './hooks';
import {
  enemySubtitle,
  formatDateDe,
  formatFossilAge,
  gridItemWidth,
  lockedHint,
  relatedCards,
  relatedEnemies,
  timesFoundText,
} from './model';

const RELATED_CARD_WIDTH = 88;
const GAP = spacing.sm;

export interface FossilDetailScreenProps {
  /** Route param (may be missing or repeated in a malformed link). */
  id: string | string[] | undefined;
  /** Public reading mode; never unlocks a fossil or a card. */
  wiki?: boolean;
}

function SectionHeading({ children }: { children: string }) {
  return (
    <AppText variant="overline" tone="muted" accessibilityRole="header" style={styles.sectionHeading}>
      {children}
    </AppText>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow} accessible accessibilityLabel={`${label}: ${value}`}>
      <AppText variant="label" tone="muted">
        {label}
      </AppText>
      <AppText variant="body" style={styles.infoValue}>
        {value}
      </AppText>
    </View>
  );
}

const RelatedCard = memo(function RelatedCard({
  def,
  seen,
  width,
  onOpen,
}: {
  def: CardDef;
  seen: boolean;
  width: number;
  onOpen: (def: CardDef) => void;
}) {
  const onPress = useCallback(() => onOpen(def), [def, onOpen]);
  if (!seen) return <LockedCard era={def.era} rarity={def.rarity} width={width} testID={`related-locked-${def.id}`} />;
  return (
    <GameCard
      def={def}
      size="hand"
      width={width}
      onPress={onPress}
      accessibilityHint="Öffnet die Kartendetails."
      testID={`related-card-${def.id}`}
    />
  );
});

function EnemyRow({ def }: { def: EnemyDef }) {
  return (
    <ListRow
      left={def.emoji}
      title={def.name}
      subtitle={enemySubtitle(def)}
      right={<EraBadge era={def.era} size="sm" />}
    />
  );
}

function ArticleDetail({
  entry,
  record,
  cardsSeen,
  sheet,
}: {
  entry: FossilEntry;
  record: FossilRecord | undefined;
  cardsSeen: readonly string[];
  sheet: CardSheetState;
}) {
  const { innerWidth } = useLayout();
  const cards = useMemo(() => relatedCards(CONTENT, entry.id), [entry.id]);
  const enemies = useMemo(() => relatedEnemies(CONTENT, entry.id), [entry.id]);
  const seen = useMemo(() => new Set(cardsSeen), [cardsSeen]);
  const cardWidth = Math.min(RELATED_CARD_WIDTH, gridItemWidth(innerWidth, 3, GAP));
  const firstFound = record ? formatDateDe(record.discoveredAt) : null;
  const tone = eraColors[entry.era];

  return (
    <>
      <Surface style={[styles.hero, { borderColor: tone.main }]}>
        <View style={[styles.heroArt, { backgroundColor: tone.soft }]}>
          <FossilArtwork fossilId={entry.id} emoji={entry.emoji} emojiStyle={styles.heroEmoji} />
        </View>
        <AppText variant="title" align="center" accessibilityRole="header">
          {entry.name}
        </AppText>
        <AppText variant="body" tone="secondary" align="center" italic>
          {entry.scientificName}
        </AppText>
        <View style={styles.pills}>
          <EraBadge era={entry.era} showIcon={false} />
          <Pill label={FOSSIL_KIND_LABELS[entry.kind]} />
        </View>
      </Surface>

      <Surface style={styles.info}>
        <InfoRow label="Lebenszeit" value={formatFossilAge(entry.mya)} />
        <InfoRow label="Ernährung" value={DIET_LABELS[entry.diet]} />
        {entry.lengthM !== undefined ? <InfoRow label="Länge" value={formatLength(entry.lengthM)} /> : null}
        <InfoRow label="Fundort" value={entry.foundIn} />
        <InfoRow
          label="Sammlung"
          value={
            !record ? 'Noch nicht auf einer Expedition gefunden' : firstFound
              ? `${timesFoundText(record.timesFound)} · zuerst am ${firstFound}`
              : timesFoundText(record.timesFound)
          }
        />
      </Surface>

      <SectionHeading>{UI_STRINGS.facts}</SectionHeading>
      <Surface style={styles.facts}>
        {entry.facts.map((fact) => (
          <View key={fact} style={styles.factRow}>
            <AppText variant="body" tone="accent" accessible={false} importantForAccessibility="no">
              •
            </AppText>
            <AppText variant="body" style={styles.factText}>
              {fact}
            </AppText>
          </View>
        ))}
      </Surface>

      {!record ? <Surface style={styles.info}>
        <AppText variant="subheading">Im Spiel entdecken</AppText>
        <AppText variant="body" tone="secondary">{lockedHint(CONTENT, entry)}</AppText>
      </Surface> : null}

      {cards.length > 0 ? (
        <>
          <SectionHeading>{cards.length === 1 ? 'Karte' : 'Karten'}</SectionHeading>
          <View style={styles.cards}>
            {cards.map((def) => (
              <RelatedCard key={def.id} def={def} seen={seen.has(def.id)} width={cardWidth} onOpen={sheet.open} />
            ))}
          </View>
        </>
      ) : null}

      {enemies.length > 0 ? (
        <>
          <SectionHeading>Gegner</SectionHeading>
          <Surface padding="none" style={styles.enemies}>
            {enemies.map((def) => (
              <EnemyRow key={def.id} def={def} />
            ))}
          </Surface>
        </>
      ) : null}
    </>
  );
}

function LockedDetail({ entry }: { entry: FossilEntry }) {
  const tone = eraColors[entry.era];
  return (
    <Surface style={[styles.hero, styles.lockedHero]}>
      <View style={[styles.heroArt, { backgroundColor: tone.soft }]}>
        <Text style={[styles.heroEmoji, styles.silhouette]} allowFontScaling={false} accessible={false}>
          ❓
        </Text>
      </View>
      <AppText variant="title" align="center" accessibilityRole="header">
        Noch nicht entdeckt
      </AppText>
      <EraBadge era={entry.era} style={styles.center} />
      <AppText variant="body" tone="secondary" align="center">
        {lockedHint(CONTENT, entry)}
      </AppText>
    </Surface>
  );
}

/** Fossil book entry: facts and related cards/enemies, or a locked hint. */
export function FossilDetailScreen({ id: rawId, wiki = false }: FossilDetailScreenProps) {
  const hydrated = useHydrated();
  const meta = useMeta();
  const { reducedMotion } = useSettings();
  const sheet = useCardSheet();
  const onBack = useBackTo(ROUTES.fossils);
  const toBook = useCallback(() => router.dismissTo(ROUTES.fossils), []);

  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  const entry = id !== undefined ? CONTENT.fossils[id] : undefined;
  const record = entry ? meta.fossils[entry.id] : undefined;

  const title = !entry ? 'Dino-Wiki' : record || wiki ? entry.name : 'Unentdeckt';
  const header = <Header title={title} onBack={onBack} divider />;

  if (!hydrated) return <Screen header={header} />;

  if (!entry) {
    return (
      <Screen
        header={header}
        footer={
          <Button
            label="Zum Dino-Wiki"
            icon="📖"
            size="lg"
            fullWidth
            onPress={toBook}
            testID="fossil-detail-to-book"
          />
        }
        testID="fossil-detail-missing"
      >
        <View style={styles.centerBody}>
          <EmptyState
            icon="🪨"
            title="Kein Fossil gefunden"
            message="Diesen Eintrag gibt es im Dino-Wiki nicht. Vielleicht liegt er noch tief im Gestein verborgen."
          />
        </View>
      </Screen>
    );
  }

  return (
    <Screen
      header={header}
      scroll
      contentStyle={styles.content}
      testID={wiki ? 'wiki-detail' : record ? 'fossil-detail' : 'fossil-detail-locked'}
    >
      {record || wiki ? (
        <ArticleDetail entry={entry} record={record} cardsSeen={meta.cardsSeen} sheet={sheet} />
      ) : (
        <LockedDetail entry={entry} />
      )}
      <CardDetailSheet
        def={sheet.def}
        upgraded={sheet.upgraded}
        visible={sheet.visible}
        onClose={sheet.close}
        reducedMotion={reducedMotion}
        primaryAction={{
          label: upgradeToggleLabel(sheet.upgraded),
          onPress: sheet.toggleUpgraded,
          variant: 'secondary',
          accessibilityHint: 'Wechselt zwischen normaler und verbesserter Karte.',
        }}
        testID="fossil-detail-card-sheet"
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md, paddingTop: spacing.md },
  centerBody: { flex: 1, justifyContent: 'center' },
  hero: { alignItems: 'center', gap: spacing.sm, borderWidth: 1 },
  lockedHero: { borderStyle: 'dashed', borderColor: colors.borderStrong },
  heroArt: {
    overflow: 'hidden',
    width: 128,
    height: 128,
    borderRadius: radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  heroEmoji: { fontSize: 72, lineHeight: 86, color: colors.text },
  silhouette: { opacity: 0.5 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.xs },
  center: { alignSelf: 'center' },
  info: { gap: spacing.md },
  infoRow: { gap: spacing.xxs },
  infoValue: { minWidth: 0 },
  sectionHeading: { marginTop: spacing.sm, marginHorizontal: spacing.xs },
  facts: { gap: spacing.sm },
  factRow: { flexDirection: 'row', gap: spacing.sm },
  factText: { flex: 1, minWidth: 0 },
  cards: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP },
  enemies: { overflow: 'hidden' },
});
