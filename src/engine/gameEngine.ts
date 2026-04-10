import { Card, Enemy, GameState, Relic, Potion, StatusEffect, MapNode, NodeType, RunState } from '../types';
import { starterDeck, allCards, getCardById, upgradeCard } from '../data/cards';
import { allEnemies, getRandomEnemy, getBossEnemies, getEliteEnemies } from '../data/enemies';
import { allRelics, getRandomRelic, starterRelics } from '../data/relics';

// ============================================================================
// UTILITIES
// ============================================================================

export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// ============================================================================
// INITIAL STATE
// ============================================================================

export function createInitialRunState(): RunState {
  const deck = shuffleArray([...starterDeck]).map(c => ({ ...c }));
  
  return {
    currentScreen: 'map',
    floor: 0,
    maxFloors: 15,
    score: 0,
    gold: 50,
    runsWon: 0,
    runsPlayed: 0,
    relics: [...starterRelics],
    potions: [],
    currentNode: null,
    gameState: null,
    map: generateMap(),
  };
}

export function createGameState(deck: Card[]): GameState {
  const drawPile = shuffleArray([...deck]);
  const hand = drawPile.splice(0, 5);
  
  return {
    playerHP: 72,
    playerMaxHP: 72,
    playerBlock: 0,
    enemyHP: 40,
    enemyMaxHP: 40,
    deck: [...deck],
    hand,
    discardPile: [],
    drawPile,
    energy: 3,
    maxEnergy: 3,
    turn: 1,
    relics: [],
    gold: 0,
    potions: [],
    statusEffects: [],
  };
}

// ============================================================================
// MAP GENERATION
// ============================================================================

export function generateMap(): MapNode[][] {
  const floors: MapNode[][] = [];
  const width = 5; // 5 paths
  const totalFloors = 15;
  
  for (let y = 0; y < totalFloors; y++) {
    const floor: MapNode[] = [];
    const isBossFloor = y === totalFloors - 1;
    const isRestFloor = y % 5 === 4 && y < totalFloors - 1;
    
    for (let x = 0; x < width; x++) {
      let type: NodeType = 'battle';
      
      if (isBossFloor) {
        type = 'boss';
      } else if (isRestFloor) {
        type = 'rest';
      } else if (y > 0 && Math.random() < 0.15) {
        type = 'elite';
      } else if (Math.random() < 0.1) {
        type = 'shop';
      } else if (Math.random() < 0.15) {
        type = 'event';
      }
      
      floor.push({
        id: `node-${y}-${x}`,
        type,
        x,
        y,
        completed: false,
        locked: y !== 0,
        visited: false,
      });
    }
    
    // Connect nodes to previous floor
    if (y > 0) {
      const prevFloor = floors[y - 1];
      floor.forEach((node, i) => {
        const connections: string[] = [];
        // Connect to 1-3 nodes from previous floor
        const numConnections = Math.min(3, prevFloor.length);
        const startIdx = Math.max(0, i - 1);
        for (let j = startIdx; j < startIdx + numConnections && j < prevFloor.length; j++) {
          if (!prevFloor[j].locked) {
            connections.push(prevFloor[j].id);
          }
        }
        node.connectedTo = connections.length > 0 ? connections : [prevFloor[Math.floor(Math.random() * prevFloor.length)].id];
      });
    }
    
    floors.push(floor);
  }
  
  // Unlock first floor
  floors[0].forEach(node => {
    node.locked = false;
  });
  
  return floors;
}

// ============================================================================
// BATTLE LOGIC
// ============================================================================

export function startBattle(state: RunState, enemy: Enemy): RunState {
  const initialDeck = state.currentScreen === 'map' ? [...starterDeck] : (state.gameState?.deck || [...starterDeck]);
  const gameState = createGameState(initialDeck);
  gameState.enemyHP = enemy.hp;
  gameState.enemyMaxHP = enemy.maxHP;
  gameState.currentEnemy = { ...enemy };
  
  return {
    ...state,
    currentScreen: 'battle',
    gameState,
  };
}

export function playCard(state: RunState, cardIndex: number): RunState {
  if (!state.gameState) return state;
  
  const gs = { ...state.gameState };
  const card = gs.hand[cardIndex];
  
  if (!card || gs.energy < card.energyCost) {
    return state;
  }
  
  // Pay energy cost
  gs.energy -= card.energyCost;
  
  // Apply card effects
  if (card.damage) {
    gs.enemyHP = Math.max(0, gs.enemyHP - card.damage);
    gs.battleLog = [...(gs.battleLog || []), `${card.name} verursacht ${card.damage} Schaden!`];
  }
  
  if (card.block) {
    gs.playerBlock += card.block;
    gs.battleLog = [...(gs.battleLog || []), `${card.name} gibt ${card.block} Block!`];
  }
  
  if (card.heal) {
    gs.playerHP = Math.min(gs.playerMaxHP, gs.playerHP + card.heal);
    gs.battleLog = [...(gs.battleLog || []), `${card.name} heilt ${card.heal} HP!`];
  }
  
  if (card.energyGain) {
    gs.energy += card.energyGain;
    gs.battleLog = [...(gs.battleLog || []), `${card.name} gibt ${card.energyGain} Energie!`];
  }
  
  if (card.drawCards) {
    for (let i = 0; i < card.drawCards; i++) {
      drawCard(gs);
    }
  }
  
  // Move card to discard
  gs.hand = gs.hand.filter((_, i) => i !== cardIndex);
  gs.discardPile.push(card);
  
  // Check win condition
  if (gs.enemyHP <= 0) {
    return {
      ...state,
      gameState: gs,
      score: state.score + 100,
      gold: state.gold + 20,
    };
  }
  
  return { ...state, gameState: gs };
}

export function drawCard(gs: GameState): void {
  if (gs.drawPile.length === 0) {
    if (gs.discardPile.length === 0) return;
    gs.drawPile = shuffleArray([...gs.discardPile]);
    gs.discardPile = [];
  }
  if (gs.drawPile.length > 0) {
    gs.hand.push(gs.drawPile.pop()!);
  }
}

export function endTurn(state: RunState): RunState {
  if (!state.gameState) return state;
  
  const gs = { ...state.gameState };
  
  // Discard hand
  gs.discardPile.push(...gs.hand);
  gs.hand = [];
  
  // Reset block
  gs.playerBlock = 0;
  
  // Draw new hand
  for (let i = 0; i < 5; i++) {
    drawCard(gs);
  }
  
  // Reset energy
  gs.energy = gs.maxEnergy;
  
  // Enemy turn
  if (gs.currentEnemy) {
    const enemy = gs.currentEnemy;
    const damage = enemy.attack;
    const blockedDamage = Math.max(0, damage - gs.playerBlock);
    gs.playerHP -= blockedDamage;
    gs.battleLog = [...(gs.battleLog || []), `Gegner greift an für ${blockedDamage} Schaden!`];
    
    // Update enemy pattern
    enemy.currentPatternIndex = (enemy.currentPatternIndex + 1) % enemy.pattern.length;
    enemy.intent = enemy.pattern[enemy.currentPatternIndex];
  }
  
  // Check lose condition
  if (gs.playerHP <= 0) {
    return {
      ...state,
      currentScreen: 'gameover',
      gameState: gs,
      runsPlayed: state.runsPlayed + 1,
    };
  }
  
  // Check win condition again
  if (gs.enemyHP <= 0) {
    return {
      ...state,
      currentScreen: 'victory',
      gameState: gs,
      score: state.score + 100,
      gold: state.gold + 20,
      runsWon: state.runsWon + 1,
    };
  }
  
  gs.turn++;
  return { ...state, gameState: gs };
}

// ============================================================================
// MAP NAVIGATION
// ============================================================================

export function selectNode(state: RunState, nodeId: string): RunState {
  const map = state.map.map(floor => floor.map(node => ({ ...node })));
  const selectedNode = map.flat().find(n => n.id === nodeId);
  
  if (!selectedNode || selectedNode.locked) return state;
  
  selectedNode.visited = true;
  
  // Populate node content if not already done
  if (!selectedNode.data) {
    const act = Math.floor(selectedNode.y / 5) + 1 as 1 | 2 | 3;
    
    switch (selectedNode.type) {
      case 'battle':
        selectedNode.data = {
          enemy: getRandomEnemy(act),
        };
        break;
      case 'elite':
        selectedNode.data = {
          enemy: getRandomEnemy(act, true),
        };
        break;
      case 'boss':
        const bosses = getBossEnemies().filter(b => b.act === act);
        selectedNode.data = {
          enemy: bosses[Math.floor(Math.random() * bosses.length)] || getBossEnemies()[0],
        };
        break;
      case 'shop':
        const shopCards = shuffleArray(allCards.filter(c => c.rarity === 'common' || c.rarity === 'uncommon')).slice(0, 3);
        selectedNode.data = {
          shopItems: shopCards.map(c => ({
            id: `shop-${c.id}`,
            type: 'card' as const,
            item: c,
            cost: c.rarity === 'uncommon' ? 80 : 50,
          })),
        };
        break;
      case 'event':
        selectedNode.data = {
          event: {
            id: 'mysterious_fossil',
            title: 'Mysteriöses Fossil',
            description: 'Du findest ein seltsam leuchtendes Fossil...',
            emoji: '💎',
            choices: [
              { id: 'take', text: 'Aufheben (+10 HP, -10 Gold)' },
              { id: 'leave', text: 'Weitergehen' },
            ],
          },
        };
        break;
      case 'rest':
        selectedNode.data = {
          restOptions: [
            { id: 'sleep', text: 'Schlafen (+15 HP)', emoji: '😴' },
            { id: 'smith', text: 'Karte verbessern', emoji: '🔨' },
          ],
        };
        break;
    }
  }
  
  const newState: RunState = {
    ...state,
    map,
    currentNode: selectedNode,
  };
  
  // Auto-transition based on node type
  if (selectedNode.data?.enemy) {
    return startBattle(newState, selectedNode.data.enemy);
  }
  
  return newState;
}

// ============================================================================
// REWARD SYSTEM
// ============================================================================

export function chooseReward(state: RunState, rewardType: 'card' | 'relic' | 'gold', itemId?: string): RunState {
  if (rewardType === 'card' && itemId) {
    const card = getCardById(itemId);
    if (card && state.gameState) {
      state.gameState.deck.push({ ...card });
    }
  } else if (rewardType === 'relic' && itemId) {
    const relic = getRandomRelic();
    state.relics.push(relic);
  } else if (rewardType === 'gold') {
    state.gold += 50;
  }
  
  // Mark node as completed and unlock next floor
  if (state.currentNode) {
    state.currentNode.completed = true;
    
    // Unlock nodes in next floor
    const nextFloorNodes = state.map[state.currentNode.y + 1];
    if (nextFloorNodes) {
      nextFloorNodes.forEach(node => {
        if (state.currentNode && node.connectedTo && node.connectedTo.includes(state.currentNode.id)) {
          node.locked = false;
        }
      });
    }
  }
  
  return {
    ...state,
    currentScreen: 'map',
    gameState: null,
    floor: state.currentNode ? state.currentNode.y + 1 : state.floor,
  };
}
