import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { GameState, Card } from '../types';
import { createInitialState, drawCards, playCard, endTurn, startBattle, isGameOver } from '../engine/gameEngine';
import { sampleEnemy } from '../engine/gameEngine';

export default function BattleScreen() {
  const navigation = useNavigation();
  const [gameState, setGameState] = useState<GameState>(createInitialState());
  const [showFact, setShowFact] = useState<Card | null>(null);

  useEffect(() => {
    // Start battle with initial draw
    const initial = startBattle(gameState);
    setGameState(initial);
  }, []);

  const handlePlayCard = (cardId: string) => {
    const card = gameState.hand.find(c => c.id === cardId);
    if (!card) return;
    if (gameState.energy < card.energyCost) {
      Alert.alert('Nicht genug Energie!', `${card.energyCost} Energie benötigt.`);
      return;
    }
    
    const newState = playCard(gameState, cardId);
    setGameState(newState);
    
    // Check for game over
    const result = isGameOver(newState);
    if (result === 'enemy') {
      Alert.alert('Sieg! 🏆', 'Du hast gewonnen! Der Dino ist besiegt.', [
        { text: 'Erneut spielen', onPress: () => setGameState(createInitialState()) }
      ]);
    } else if (result === 'player') {
      Alert.alert('Niederlage 💀', 'Du wurdest besiegt...', [
        { text: 'Erneut spielen', onPress: () => setGameState(createInitialState()) }
      ]);
    }
  };

  const handleEndTurn = () => {
    const newState = endTurn(gameState);
    const drawnState = drawCards(newState, 5);
    setGameState(drawnState);
    
    const result = isGameOver(drawnState);
    if (result === 'player') {
      Alert.alert('Niederlage 💀', 'Du wurdest besiegt...', [
        { text: 'Erneut spielen', onPress: () => setGameState(createInitialState()) }
      ]);
    }
  };

  const renderCard = (card: Card) => (
    <TouchableOpacity
      key={card.id}
      style={[styles.card, gameState.energy < card.energyCost && styles.cardDisabled]}
      onPress={() => handlePlayCard(card.id)}
      onLongPress={() => setShowFact(card)}
    >
      <Text style={styles.cardEmoji}>{card.emoji}</Text>
      <Text style={styles.cardName}>{card.name}</Text>
      <Text style={styles.cardCost}>⚡{card.energyCost}</Text>
      <View style={styles.cardStats}>
        {card.damage && <Text style={styles.statText}>⚔️{card.damage}</Text>}
        {card.block && <Text style={styles.statText}>🛡️{card.block}</Text>}
        {card.heal && <Text style={styles.statText}>💚{card.heal}</Text>}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Zurück</Text>
        </TouchableOpacity>
        <Text style={styles.turnText}>Zug {gameState.turn}</Text>
      </View>

      {/* Enemy Section */}
      <View style={styles.enemySection}>
        <Text style={styles.enemyEmoji}>{sampleEnemy.emoji}</Text>
        <Text style={styles.enemyName}>{sampleEnemy.name}</Text>
        <View style={styles.hpBarContainer}>
          <View style={[styles.hpBar, { width: `${(gameState.enemyHP / gameState.enemyMaxHP) * 100}%` }]} />
        </View>
        <Text style={styles.hpText}>{gameState.enemyHP} / {gameState.enemyMaxHP} HP</Text>
      </View>

      {/* Player Section */}
      <View style={styles.playerSection}>
        <View style={styles.playerStats}>
          <Text style={styles.playerHP}>❤️ {gameState.playerHP}/{gameState.playerMaxHP}</Text>
          <Text style={styles.playerBlock}>🛡️ {gameState.playerBlock}</Text>
          <Text style={styles.energyText}>⚡ {gameState.energy}/{gameState.maxEnergy}</Text>
        </View>
        <View style={styles.hpBarContainer}>
          <View style={[styles.hpBar, styles.playerHpBar, { width: `${(gameState.playerHP / gameState.playerMaxHP) * 100}%` }]} />
        </View>
      </View>

      {/* Fact Modal */}
      {showFact && (
        <View style={styles.factModal}>
          <View style={styles.factContent}>
            <Text style={styles.factEmoji}>{showFact.emoji}</Text>
            <Text style={styles.factTitle}>{showFact.name}</Text>
            <Text style={styles.factText}>{showFact.fact}</Text>
            <TouchableOpacity onPress={() => setShowFact(null)}>
              <Text style={styles.factClose}>Schließen</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Hand */}
      <ScrollView horizontal style={styles.handArea} contentContainerStyle={styles.handContent}>
        {gameState.hand.map(renderCard)}
      </ScrollView>

      {/* End Turn Button */}
      <TouchableOpacity style={styles.endTurnButton} onPress={handleEndTurn}>
        <Text style={styles.endTurnText}>Zug beenden</Text>
      </TouchableOpacity>

      {/* Deck Info */}
      <View style={styles.deckInfo}>
        <Text style={styles.deckText}>Deck: {gameState.deck.length} | Ablage: {gameState.discardPile.length}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButton: {
    color: '#e94560',
    fontSize: 16,
  },
  turnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  enemySection: {
    alignItems: 'center',
    marginBottom: 30,
  },
  enemyEmoji: {
    fontSize: 64,
    marginBottom: 8,
  },
  enemyName: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  hpBarContainer: {
    width: '80%',
    height: 12,
    backgroundColor: '#333',
    borderRadius: 6,
    overflow: 'hidden',
  },
  hpBar: {
    height: '100%',
    backgroundColor: '#e94560',
  },
  playerHpBar: {
    backgroundColor: '#00ff00',
  },
  hpText: {
    color: '#888',
    fontSize: 12,
    marginTop: 4,
  },
  playerSection: {
    marginBottom: 20,
  },
  playerStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
  },
  playerHP: {
    color: '#fff',
    fontSize: 16,
  },
  playerBlock: {
    color: '#fff',
    fontSize: 16,
  },
  energyText: {
    color: '#ffd700',
    fontSize: 16,
    fontWeight: 'bold',
  },
  handArea: {
    flex: 1,
    maxHeight: 220,
  },
  handContent: {
    paddingVertical: 8,
  },
  card: {
    width: 120,
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 12,
    marginRight: 10,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#0f3460',
  },
  cardDisabled: {
    opacity: 0.5,
  },
  cardEmoji: {
    fontSize: 36,
    marginBottom: 4,
  },
  cardName: {
    color: '#fff',
    fontSize: 11,
    textAlign: 'center',
    marginBottom: 4,
  },
  cardCost: {
    color: '#ffd700',
    fontSize: 14,
    fontWeight: 'bold',
  },
  cardStats: {
    flexDirection: 'row',
    marginTop: 4,
  },
  statText: {
    color: '#aaa',
    fontSize: 12,
    marginHorizontal: 2,
  },
  endTurnButton: {
    backgroundColor: '#e94560',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  endTurnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  deckInfo: {
    alignItems: 'center',
    marginTop: 10,
  },
  deckText: {
    color: '#666',
    fontSize: 12,
  },
  factModal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  factContent: {
    backgroundColor: '#16213e',
    padding: 24,
    borderRadius: 16,
    maxWidth: '85%',
    alignItems: 'center',
  },
  factEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  factTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  factText: {
    color: '#aaa',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  factClose: {
    color: '#e94560',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
