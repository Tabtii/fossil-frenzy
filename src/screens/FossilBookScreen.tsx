import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Modal } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { discoveredDinos, DiscoveredDino, getDiscoveredCount, getTotalCount } from '../data/discoveredDinos';

export default function FossilBookScreen() {
  const navigation = useNavigation();
  const [selectedDino, setSelectedDino] = useState<DiscoveredDino | null>(null);

  const renderDinoCard = (dino: DiscoveredDino) => (
    <TouchableOpacity
      key={dino.card.id}
      style={[styles.dinoCard, !dino.discovered && styles.dinoCardLocked]}
      onPress={() => dino.discovered && setSelectedDino(dino)}
    >
      <Text style={[styles.dinoEmoji, !dino.discovered && styles.lockedEmoji]}>
        {dino.discovered ? dino.card.emoji : '❓'}
      </Text>
      <Text style={[styles.dinoName, !dino.discovered && styles.lockedText]}>
        {dino.discovered ? dino.card.name : '???'}
      </Text>
      <Text style={[styles.dinoEra, !dino.discovered && styles.lockedText]}>
        {dino.discovered ? getEraText(dino.card.era) : '???之年'}
      </Text>
      {dino.discovered && (
        <View style={styles.playedBadge}>
          <Text style={styles.playedText}>×{dino.timesPlayed}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Zurück</Text>
        </TouchableOpacity>
        <Text style={styles.title}>📖 Fossilienbuch</Text>
        <Text style={styles.progress}>
          {getDiscoveredCount()} / {getTotalCount()} entdeckt
        </Text>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressBarContainer}>
        <View style={[
          styles.progressBar,
          { width: `${(getDiscoveredCount() / getTotalCount()) * 100}%` }
        ]} />
      </View>

      {/* Era Filter */}
      <ScrollView horizontal style={styles.eraFilter} showsHorizontalScrollIndicator={false}>
        <TouchableOpacity style={styles.eraButton}>
          <Text style={styles.eraButtonText}>Alle</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.eraButton, styles.eraButtonActive]}>
          <Text style={styles.eraButtonTextActive}>🦕 Trias</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.eraButton}>
          <Text style={styles.eraButtonText}>🦎 Jura</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.eraButton}>
          <Text style={styles.eraButtonText}>🦖 Kreide</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.eraButton}>
          <Text style={styles.eraButtonText}>🦣 Eiszeit</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Dino Grid */}
      <ScrollView style={styles.dinoGrid}>
        <View style={styles.gridContainer}>
          {discoveredDinos.map(renderDinoCard)}
        </View>
      </ScrollView>

      {/* Detail Modal */}
      <Modal
        visible={selectedDino !== null}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedDino(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalEmoji}>{selectedDino?.card.emoji}</Text>
            <Text style={styles.modalName}>{selectedDino?.card.name}</Text>
            <View style={styles.modalMeta}>
              <Text style={styles.modalEra}>📅 {getEraText(selectedDino?.card.era || 'trias')}</Text>
              <Text style={styles.modalType}>⚔️ {getTypeText(selectedDino?.card.type || 'hybrid')}</Text>
            </View>
            
            <View style={styles.modalStats}>
              {selectedDino?.card.damage && (
                <View style={styles.statBadge}>
                  <Text style={styles.statText}>⚔️ {selectedDino.card.damage} Schaden</Text>
                </View>
              )}
              {selectedDino?.card.block && (
                <View style={styles.statBadge}>
                  <Text style={styles.statText}>🛡️ {selectedDino.card.block} Block</Text>
                </View>
              )}
              {selectedDino?.card.heal && (
                <View style={styles.statBadge}>
                  <Text style={styles.statText}>💚 {selectedDino.card.heal} Heilung</Text>
                </View>
              )}
            </View>

            <View style={styles.factSection}>
              <Text style={styles.factTitle}>📚 Paläontologische Fakten</Text>
              <Text style={styles.factText}>{selectedDino?.card.fact}</Text>
            </View>

            <View style={styles.playStats}>
              <Text style={styles.playStatsText}>
                Mal gespielt: {selectedDino?.timesPlayed}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setSelectedDino(null)}
            >
              <Text style={styles.closeButtonText}>Schließen</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function getEraText(era: string): string {
  switch (era) {
    case 'trias': return '🦕 Trias';
    case 'jura': return '🦎 Jura';
    case 'kreide': return '🦖 Kreide';
    case 'eiszeit': return '🦣 Eiszeit';
    default: return era;
  }
}

function getTypeText(type: string): string {
  switch (type) {
    case 'attacker': return 'Angreifer';
    case 'defender': return 'Verteidiger';
    case 'support': return 'Unterstützung';
    case 'hybrid': return 'Hybrid';
    default: return type;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  header: {
    padding: 20,
    paddingTop: 50,
  },
  backButton: {
    color: '#e94560',
    fontSize: 16,
    marginBottom: 16,
  },
  title: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  progress: {
    color: '#888',
    fontSize: 14,
  },
  progressBarContainer: {
    height: 6,
    backgroundColor: '#333',
    marginHorizontal: 20,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#e94560',
  },
  eraFilter: {
    maxHeight: 50,
    paddingHorizontal: 16,
    marginTop: 16,
  },
  eraButton: {
    backgroundColor: '#16213e',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#0f3460',
  },
  eraButtonActive: {
    backgroundColor: '#e94560',
    borderColor: '#e94560',
  },
  eraButtonText: {
    color: '#888',
    fontSize: 14,
  },
  eraButtonTextActive: {
    color: '#fff',
    fontSize: 14,
  },
  dinoGrid: {
    flex: 1,
    padding: 16,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  dinoCard: {
    width: '48%',
    backgroundColor: '#16213e',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#0f3460',
  },
  dinoCardLocked: {
    opacity: 0.5,
    borderColor: '#333',
  },
  dinoEmoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  lockedEmoji: {
    fontSize: 36,
  },
  dinoName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 4,
  },
  lockedText: {
    color: '#666',
  },
  dinoEra: {
    color: '#888',
    fontSize: 12,
  },
  playedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#e94560',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  playedText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#16213e',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
  },
  modalEmoji: {
    fontSize: 80,
    marginBottom: 16,
  },
  modalName: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  modalMeta: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  modalEra: {
    color: '#888',
    fontSize: 14,
    marginRight: 16,
  },
  modalType: {
    color: '#888',
    fontSize: 14,
  },
  modalStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: 16,
  },
  statBadge: {
    backgroundColor: '#0f3460',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    margin: 4,
  },
  statText: {
    color: '#fff',
    fontSize: 14,
  },
  factSection: {
    backgroundColor: '#0f3460',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    width: '100%',
  },
  factTitle: {
    color: '#e94560',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  factText: {
    color: '#ccc',
    fontSize: 14,
    lineHeight: 22,
  },
  playStats: {
    marginBottom: 16,
  },
  playStatsText: {
    color: '#666',
    fontSize: 12,
  },
  closeButton: {
    backgroundColor: '#e94560',
    paddingHorizontal: 40,
    paddingVertical: 12,
    borderRadius: 25,
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
