import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { colors, radii, spacing, TOUCH_TARGET } from '../theme';
import { AppText } from './AppText';

export function SearchField({ value, onChangeText, placeholder, testID }: {
  value: string; onChangeText: (value: string) => void; placeholder: string; testID: string;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={[styles.root, focused && styles.focused]}>
      <AppText tone="muted" style={styles.icon} accessible={false}>⌕</AppText>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        accessibilityLabel={placeholder}
        returnKeyType="search"
        autoCorrect={false}
        autoCapitalize="none"
        maxLength={100}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        selectionColor={colors.accent}
        style={styles.input}
        testID={testID}
      />
      {value.length > 0 ? <Pressable onPress={() => onChangeText('')} accessibilityRole="button" accessibilityLabel="Suche löschen" style={styles.clear} testID={`${testID}-clear`}><AppText tone="secondary">✕</AppText></Pressable> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.backgroundDeep, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, minHeight: TOUCH_TARGET },
  icon: { paddingLeft: spacing.md, fontSize: 24 },
  input: { flex: 1, minWidth: 0, paddingHorizontal: spacing.md, paddingVertical: spacing.md, color: colors.text, fontSize: 15 },
  clear: { minWidth: TOUCH_TARGET, minHeight: TOUCH_TARGET, alignItems: 'center', justifyContent: 'center' },
  focused: { borderColor: colors.focus },
});
