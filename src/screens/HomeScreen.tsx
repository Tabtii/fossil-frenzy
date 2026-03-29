import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';

export default function HomeScreen() {
  const navigation = useNavigation();

  return (
    <View style={styles.container}>
      {/* Title Section */}
      <View style={styles.titleSection}>
        <Text style={styles.dinoEmoji}>🦖⚔️🦕</Text>
        <Text style={styles.title}>FOSSIL FRENZY</Text>
        <Text style={styles.subtitle}>Dino Deckbuilder</Text>
      </View>

      {/* Menu Buttons */}
      <View style={styles.menu}>
        <TouchableOpacity 
          style={styles.menuButton}
          onPress={() => (navigation as any).navigate('Battle')}
        >
          <Text style={styles.menuButtonText}>🎮 Spielen</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.menuButtonSecondary}
          onPress={() => (navigation as any).navigate('FossilBook')}
        >
          <Text style={styles.menuButtonText}>📖 Fossilienbuch</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuButtonSecondary}>
          <Text style={styles.menuButtonText}>🃏 Sammlung</Text>
        </TouchableOpacity>
      </View>

      {/* Info Section */}
      <View style={styles.infoSection}>
        <Text style={styles.infoText}>
          Baue dein Deck aus dinosaurier-Karten{'\n'}
          und besiege deine Gegner!
        </Text>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.version}>v0.1 Alpha</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    padding: 20,
    justifyContent: 'center',
  },
  titleSection: {
    alignItems: 'center',
    marginBottom: 50,
  },
  dinoEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#e94560',
    letterSpacing: 4,
  },
  subtitle: {
    fontSize: 18,
    color: '#888',
    marginTop: 8,
  },
  menu: {
    marginBottom: 40,
  },
  menuButton: {
    backgroundColor: '#e94560',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  menuButtonSecondary: {
    backgroundColor: '#16213e',
    borderWidth: 1,
    borderColor: '#0f3460',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  menuButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  infoSection: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  infoText: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  version: {
    color: '#444',
    fontSize: 12,
  },
});
