import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { reportSaveRecovery, useSaveStatus } from '@/state/saveStatus';
import { retrySave } from '@/state/store';
import { AppText, Button, colors, spacing, useLayout } from '@/ui';

const COPY = {
  read: {
    title: 'Spielstand konnte nicht geladen werden',
    description: 'Dein bisheriger Spielstand wird geschützt und nicht überschrieben. Öffne die App erneut, um das Laden zu wiederholen.',
  },
  write: {
    title: 'Speichern gerade nicht möglich',
    description: 'Deine Expedition bleibt geöffnet. Prüfe den freien Speicher und versuche es erneut, bevor du die App schließt.',
  },
  run: {
    title: 'Expedition konnte nicht wiederhergestellt werden',
    description: 'Die gespeicherte Expedition war beschädigt oder ist mit dieser Spielversion nicht kompatibel. Gültige Funde und Statistiken bleiben erhalten. Die Originaldatei wurde auf diesem Gerät gesichert.',
  },
  file: {
    title: 'Spielstand konnte nicht wiederhergestellt werden',
    description: 'Die gespeicherte Datei war unlesbar. Ihre Originalfassung wurde auf diesem Gerät gesichert. Du kannst mit einer neuen Expedition beginnen.',
  },
} as const;

/** Actual storage failures or rejected saves; acknowledging never changes game progress. */
export function SaveStatusNotice() {
  const issue = useSaveStatus((state) => state.issue);
  const recovery = useSaveStatus((state) => state.recovery);
  const [retrying, setRetrying] = useState(false);
  const { insets, gutter } = useLayout();
  const kind = issue ?? recovery;
  if (kind === null) return null;
  const copy = COPY[kind];
  const recovering = issue === null;
  const retry = async () => {
    if (retrying) return;
    setRetrying(true);
    try { await retrySave(); } finally { setRetrying(false); }
  };
  return (
    <View style={[styles.root, { paddingTop: insets.top + spacing.sm, paddingHorizontal: gutter, borderBottomColor: recovering ? colors.warning : colors.danger }]} accessibilityRole="alert" accessibilityLiveRegion="polite" testID={recovering ? 'save-recovery-notice' : 'save-status-notice'}>
      <View style={styles.copy}>
        <AppText variant="label" color={recovering ? colors.warning : colors.danger}>{copy.title}</AppText>
        <AppText variant="caption" tone="secondary">{copy.description}</AppText>
      </View>
      {issue === 'write' ? <Button label={retrying ? 'Speichert …' : 'Erneut speichern'} variant="secondary" disabled={retrying} onPress={retry} fullWidth testID="retry-save" /> : null}
      {recovering ? <Button label="Verstanden" variant="secondary" onPress={() => reportSaveRecovery(null)} fullWidth testID="dismiss-save-recovery" /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: colors.surfaceRaised, borderBottomWidth: 1, borderBottomColor: colors.danger, paddingBottom: spacing.md, gap: spacing.sm },
  copy: { gap: spacing.xs },
});
