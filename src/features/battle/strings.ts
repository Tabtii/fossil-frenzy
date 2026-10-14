// German UI strings of the combat screen. Shared engine/UI terms (LP, Block,
// Energie, …) come from UI_STRINGS in '@/ui'.

export const BATTLE_TEXT = {
  endTurn: 'Zug beenden',
  endTurnHint: 'Beendet deinen Zug. Danach handelt der Gegner.',
  play: 'Ausspielen',
  playSelectedHint: 'Spielt die ausgewählte Karte aus.',
  notEnoughEnergy: 'Nicht genug Energie',
  enemyTurn: 'Gegnerzug…',
  cardHintSelect: 'Doppeltippen zum Auswählen',
  cardHintPlay: 'Doppeltippen zum Ausspielen',
  actionSelect: 'Auswählen',
  actionPlay: 'Ausspielen',
  actionDetails: 'Details anzeigen',
  intro: 'Tippe eine Karte an. Nochmal tippen oder nach oben wischen spielt sie.',
  previewHint: 'Tippen, nach oben wischen oder Gegner antippen',
  enemyHintInfo: 'Doppeltippen für Infos zum Gegner',
  you: 'Du',
  yourHp: 'Deine LP',
  enemyHp: 'Gegner-LP',
  victory: 'Sieg!',
  defeat: 'Niederlage',
  defeatSubtitle: 'Deine Expedition endet hier.',
  boss: 'Boss',
  elite: 'Elite',
  loading: 'Kampf wird geladen …',
  nextMove: 'Nächster Zug',
  moves: 'Bekannte Züge',
  statuses: 'Zustände',
  noStatuses: 'Keine Zustände',
  patternCycle: 'Wiederholt seine Züge in fester Reihenfolge.',
  patternWeighted: 'Wählt seine Züge zufällig, aber nie mehr als zweimal hintereinander denselben.',
  fossilNew: 'Neu! Besiege den Gegner, um ihn ins Fossilienbuch einzutragen.',
  pileSorted: 'Sortiert angezeigt – die Reihenfolge bleibt geheim.',
  pileEmpty: 'Keine Karten',
  pileHint: 'Doppeltippen, um die Karten anzuzeigen',
  handEmpty: 'Keine Karten auf der Hand',
  unknownEnemy: 'Unbekannter Gegner',
} as const;

export function turnLabel(turn: number): string {
  return `Zug ${turn}`;
}

export function actLabel(act: number): string {
  return `Akt ${act + 1}`;
}

export function floorLabel(floor: number): string {
  return `Etage ${floor + 1}`;
}

export function enemyTargetHint(cardName: string): string {
  return `Doppeltippen, um ${cardName} auf den Gegner zu spielen`;
}

export function victorySubtitle(enemyName: string): string {
  return `${enemyName} wurde besiegt.`;
}

/** "1 Karte" / "7 Karten". */
export function cardCountLabel(count: number): string {
  return count === 1 ? '1 Karte' : `${count} Karten`;
}
