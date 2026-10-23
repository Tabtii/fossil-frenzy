import { useEffect, useState } from 'react';
import { Keyboard, StyleSheet, TextInput, View } from 'react-native';

import { AppText, BottomSheet, Button, colors, radii, spacing } from '@/ui';

import { dailyExpedition, parseExpeditionCode } from './expedition';

export type ExpeditionSetupMode = 'daily' | 'code' | null;

export function ExpeditionSetupSheet({ mode, onClose, onStart, reducedMotion }: {
  mode: ExpeditionSetupMode;
  onClose: () => void;
  onStart: (seed: number) => void;
  reducedMotion: boolean;
}) {
  const [input, setInput] = useState('');
  const [, refreshDay] = useState(0);
  const day = dailyExpedition(new Date());
  const [submitted, setSubmitted] = useState(false);
  useEffect(() => {
    if (mode === null) return;
    const timer = setInterval(() => refreshDay((tick) => tick + 1), 60_000);
    return () => clearInterval(timer);
  }, [mode]);
  const seed = parseExpeditionCode(input);
  const invalid = submitted && seed === null;
  const start = () => {
    if (mode === 'daily') { Keyboard.dismiss(); onStart(dailyExpedition(new Date()).seed); }
    else if (seed !== null) { Keyboard.dismiss(); onStart(seed); }
    else setSubmitted(true);
  };
  return (
    <BottomSheet
      visible={mode !== null}
      onClose={() => { Keyboard.dismiss(); onClose(); }}
      title={mode === 'daily' ? 'Deine Tagesexpedition' : 'Expeditionscode eingeben'}
      reducedMotion={reducedMotion}
      avoidKeyboard={mode === 'code'}
      footer={<Button label="Expedition starten" icon="🧭" fullWidth onPress={start} testID="expedition-code-start" />}
      testID="expedition-setup"
    >
      {mode === 'daily' ? (
        <View style={styles.daily}>
          <AppText variant="overline" tone="accent">FELDNOTIZ · {day.dateLabel.toUpperCase()}</AppText>
          <AppText variant="heading">Gleiche Welt. Dein eigener Weg.</AppText>
          <AppText tone="secondary">Jeden Tag eine neue Ausgangslage: dieselbe Karte und dieselben Chancen für alle. Deine Entscheidungen formen die Expedition.</AppText>
          <AppText variant="number" selectable testID="daily-code">{day.code}</AppText>
          <AppText variant="caption" tone="muted">Der Tagescode wechselt um 00:00 UTC. Du kannst eine begonnene Expedition jederzeit fortsetzen.</AppText>
        </View>
      ) : (
        <View style={styles.daily}>
          <AppText tone="secondary">Spiele eine Expedition erneut oder erkunde den Code eines Freundes. Gleicher Code und gleiche Spielversion ergeben dieselbe Ausgangslage.</AppText>
          <TextInput
            value={input}
            onChangeText={(value) => { setInput(value); setSubmitted(false); }}
            placeholder="FF-0000002A"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={32}
            accessibilityLabel="Expeditionscode"
            accessibilityHint="FF, Bindestrich und acht Zeichen von 0 bis 9 oder A bis F."
            style={[styles.input, invalid && styles.invalid]}
            onSubmitEditing={start}
            returnKeyType="go"
            testID="expedition-code-input"
          />
          <AppText variant="caption" tone={invalid ? 'danger' : 'muted'} accessibilityLiveRegion="polite">
            {invalid ? 'Bitte gib einen vollständigen Code ein, z. B. FF-0000002A.' : 'Deinen Code findest du im Deck und am Ende einer Expedition.'}
          </AppText>
        </View>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  daily: { gap: spacing.md },
  input: { minHeight: 56, borderRadius: radii.md, padding: spacing.lg, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.backgroundDeep, color: colors.text, fontSize: 22, fontWeight: '700', letterSpacing: 2 },
  invalid: { borderColor: colors.danger },
});
