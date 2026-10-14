# 🦖 Fossil Frenzy — Dino-Deckbuilder

Ein Roguelike-Deckbuilder für **Android und iOS**: Ziehe auf einer Expedition durch
Trias, Jura, Kreidezeit und Eiszeit, baue dein Deck aus Urzeit-Karten und fülle
dein Fossilienbuch mit echten paläontologischen Fakten.

## Features

- **Expeditionen** über 4 Akte mit verzweigter Karte: Kämpfe, Elite-Gegner, Rastplätze,
  Ausgrabungen und ein Boss pro Erdzeitalter
- **Kampf** mit Energie, Block, Statuseffekten (Stärke, Verwundbar, Geschwächt,
  Blutung, Verwirrt) und angekündigten Gegnerabsichten
- **43 Karten, 28 Gegner, 50 Fossilien** — Kartentexte werden aus den Regeln erzeugt
- **Fossilienbuch & Sammlung** mit geprüften Fakten (Alter, Fundort, Ernährung, „Wusstest du?“)
- **Mobile First**: Hochformat, Daumenzone, Safe Areas, 320–430 dp, Haptik,
  reduzierte Bewegung, Screenreader-Labels
- Spielstand wird automatisch gespeichert (Expedition fortsetzen jederzeit möglich)

## Tech Stack

Expo SDK 57 · React Native 0.86 · Expo Router · TypeScript · zustand · Reanimated 4 ·
Gesture Handler · Jest

Architektur und Spielregeln: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)

## Entwicklung

```bash
npm install
npx expo start          # Dev-Server (Expo Go oder Development Build)
npx expo start --android
npx expo start --ios

npm run typecheck       # tsc --noEmit
npm run lint            # expo lint
npm test                # jest
```

Builds für die Stores laufen über EAS (`npx eas-cli@latest build`).

## Spielanleitung

1. **Neue Expedition** starten und auf der Karte einen leuchtenden Ort wählen.
2. **Karte antippen** hebt sie an, nochmal tippen oder nach oben wischen spielt sie.
3. **Lange drücken** zeigt Details und den Fossil-Fakt zur Karte.
4. Die Anzeige über dem Gegner verrät seinen nächsten Zug — Block lohnt sich bei ⚔️.
5. Nach jedem Sieg eine neue Karte wählen, an Rastplätzen heilen oder Karten verbessern.

## Lizenz

MIT
