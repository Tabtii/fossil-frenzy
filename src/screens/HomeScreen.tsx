import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { RunState } from '../types';
import { createInitialRunState } from '../engine/gameEngine';

interface Props {
  navigation: any;
}

export default function HomeScreen({ navigation }: Props) {
  const [runState, setRunState] = useState<RunState | null>(null);

  const startNewRun = () => {
    const initialState = createInitialRunState();
    setRunState(initialState);
    // Navigate to map screen (we'll create this next)
    console.log('Starting new run:', initialState);
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Title */}
        <View style={styles.header}>
          <Text style={styles.emoji}>🦖</Text>
          <Text style={styles.title}>DINO SPIRE</Text>
          <Text style={styles.subtitle}>Ein Roguelike Deckbuilder</Text>
        </View>

        {/* Main Menu Buttons */}
        <View style={styles.menuButtons}>
          <TouchableOpacity 
            style={[styles.button, styles.primaryButton]} 
            onPress={startNewRun}
          >
            <Text style={styles.buttonEmoji}>⚔️</Text>
            <Text style={styles.buttonText}>Neues Spiel</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.button, styles.secondaryButton]}>
            <Text style={styles.buttonEmoji}>📖</Text>
            <Text style={styles.buttonText}>Kartenbuch</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.button, styles.secondaryButton]}>
            <Text style={styles.buttonEmoji}>⚙️</Text>
            <Text style={styles.buttonText}>Einstellungen</Text>
          </TouchableOpacity>
        </View>

        {/* Stats Section */}
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>Statistiken</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>0</Text>
              <Text style={styles.statLabel}>Siege</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>0</Text>
              <Text style={styles.statLabel}>Niederlagen</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>0</Text>
              <Text style={styles.statLabel}>Höchster Score</Text>
            </View>
          </View>
        </View>

        {/* Dino Collection Preview */}
        <View style={styles.collectionSection}>
          <Text style={styles.sectionTitle}>Deine Dinos</Text>
          <View style={styles.dinoPreview}>
            <Text style={styles.dinoEmoji}>🦖</Text>
            <Text style={styles.dinoEmoji}>🦕</Text>
            <Text style={styles.dinoEmoji}>🐦</Text>
            <Text style={styles.dinoEmoji}>🦎</Text>
            <Text style={styles.dinoEmoji}>🦣</Text>
            <Text style={styles.dinoEmoji}>🦏</Text>
          </View>
          <Text style={styles.collectionCount}>0 von 30 entdeckt</Text>
        </View>

        {/* Info Section */}
        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>Wie man spielt:</Text>
          <Text style={styles.infoText}>• Kämpfe gegen Dinosaurier-Gegner</Text>
          <Text style={styles.infoText}>• Sammle neue Karten für dein Deck</Text>
          <Text style={styles.infoText}>• Finde mächtige Relikte</Text>
          <Text style={styles.infoText}>• Besiege alle 3 Bosse um zu gewinnen!</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  scrollContent: {
    padding: 20,
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
    marginTop: 40,
  },
  emoji: {
    fontSize: 64,
    marginBottom: 10,
  },
  title: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#ffd700',
    letterSpacing: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#888',
    marginTop: 5,
  },
  menuButtons: {
    width: '100%',
    marginBottom: 30,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  primaryButton: {
    backgroundColor: '#e94560',
  },
  secondaryButton: {
    backgroundColor: '#16213e',
    borderWidth: 2,
    borderColor: '#0f3460',
  },
  buttonEmoji: {
    fontSize: 28,
    marginRight: 12,
  },
  buttonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  statsSection: {
    width: '100%',
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffd700',
    marginBottom: 15,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statBox: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  statLabel: {
    fontSize: 12,
    color: '#888',
    marginTop: 5,
  },
  collectionSection: {
    width: '100%',
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    alignItems: 'center',
  },
  dinoPreview: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: 10,
  },
  dinoEmoji: {
    fontSize: 32,
    margin: 5,
  },
  collectionCount: {
    fontSize: 14,
    color: '#888',
  },
  infoSection: {
    width: '100%',
    backgroundColor: '#0f3460',
    borderRadius: 12,
    padding: 20,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffd700',
    marginBottom: 10,
  },
  infoText: {
    fontSize: 14,
    color: '#ccc',
    marginBottom: 5,
    lineHeight: 20,
  },
});
