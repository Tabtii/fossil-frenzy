import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface Props {
  navigation: any;
}

export default function BattleScreen({ navigation }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>⚔️ Kampf</Text>
      <Text style={styles.subtitle}>Kampfsystem kommt bald...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#e94560',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#888',
  },
});
