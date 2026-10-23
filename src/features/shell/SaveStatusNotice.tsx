import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useSaveStatus } from '@/state/saveStatus';
import { retrySave } from '@/state/store';
import { AppText, Button, colors, spacing, useLayout } from '@/ui';

/** Only appears after an actual storage failure; never writes state itself. */
export function SaveStatusNotice() {
  const issue = useSaveStatus((state) => state.issue);
  const [retrying, setRetrying] = useState(false);
  const { insets, gutter } = useLayout();
  if (issue === null) return null;
  const retry = async () => {
    if (retrying) return;
    setRetrying(true);
    try { await retrySave(); } finally { setRetrying(false); }
  };
  return (
    <View style={[styles.root, { paddingTop: insets.top + spacing.sm, paddingHorizontal: gutter }]} accessibilityRole="alert" accessibilityLiveRegion="polite" testID="save-status-notice">
      <View style={styles.copy}>
        <AppText variant="label" tone="danger">{issue === 'read' ? 'Spielstand konnte nicht geladen werden' : 'Speichern gerade nicht möglich'}</AppText>
        <AppText variant="caption" tone="secondary">
          {issue === 'read'
            ? 'Dein bisheriger Spielstand wird geschützt und nicht überschrieben. Öffne die App erneut, um das Laden zu wiederholen.'
            : 'Deine Expedition bleibt geöffnet. Prüfe den freien Speicher und versuche es erneut, bevor du die App schließt.'}
        </AppText>
      </View>
      {issue === 'write' ? <Button label={retrying ? 'Speichert …' : 'Erneut speichern'} variant="secondary" disabled={retrying} onPress={retry} fullWidth testID="retry-save" /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: colors.surfaceRaised, borderBottomWidth: 1, borderBottomColor: colors.danger, paddingBottom: spacing.md, gap: spacing.sm },
  copy: { gap: spacing.xs },
});
