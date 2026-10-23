import { StyleSheet, View } from 'react-native';

import { AppText, BottomSheet, colors, radii, spacing } from '@/ui';

const LESSONS = [
  ['01', 'Lies die Absicht', 'Über dem Gegner siehst du seinen nächsten Zug. Bereite Block vor, wenn ein Angriff droht, und nutze ruhige Züge für deine Strategie.'],
  ['02', 'Drei Energie. Fünf Karten.', 'Du startest jeden Zug mit 3 Energie und ziehst 5 Karten. Tippe eine Karte für die Vorschau an; nochmal tippen oder nach oben wischen spielt sie aus.'],
  ['03', 'Schütze deine Lebenspunkte', 'Block fängt Angriffe ab und verfällt zu Beginn deines nächsten Zugs. Blutung ignoriert Block. Lange auf eine Karte drücken erklärt ihre Effekte.'],
  ['04', 'Baue dein Deck bewusst', 'Nach einem Sieg wählst du eine von drei Karten – oder überspringst die Belohnung. Ein kleines, abgestimmtes Deck zieht seine besten Karten häufiger.'],
  ['05', 'Plane deinen Weg', 'Rastplätze heilen dich oder verbessern eine Karte. Elite-Gegner sind gefährlicher, bieten aber bessere Belohnungen. Ein Boss beendet jedes Zeitalter.'],
  ['06', 'Jeder Fund bleibt', 'Eine Niederlage beendet die Expedition. Dein Fossilienbuch und entdeckte Karten bleiben erhalten. Zurück zum Lager pausiert nur: Du kannst später weiterspielen.'],
] as const;

export function GuideLessons() {
  return (
    <>
      {LESSONS.map(([number, title, body]) => (
        <View key={number} style={styles.lesson}>
          <AppText variant="overline" tone="accent" style={styles.number}>{number}</AppText>
          <View style={styles.copy}>
            <AppText variant="subheading" accessibilityRole="header">{title}</AppText>
            <AppText variant="body" tone="secondary">{body}</AppText>
          </View>
        </View>
      ))}
    </>
  );
}

export function FieldGuideSheet({ visible, onClose, reducedMotion }: { visible: boolean; onClose: () => void; reducedMotion: boolean }) {
  return (
    <BottomSheet visible={visible} onClose={onClose} title="Dein Expeditionshandbuch" reducedMotion={reducedMotion} testID="field-guide">
      <AppText tone="secondary">Alles, was du für deinen ersten Aufbruch wissen musst.</AppText>
      <GuideLessons />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  lesson: { flexDirection: 'row', gap: spacing.md, backgroundColor: colors.surfaceRaised, borderRadius: radii.lg, padding: spacing.lg },
  number: { paddingTop: spacing.xs },
  copy: { flex: 1, gap: spacing.xs },
});
