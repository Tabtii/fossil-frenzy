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
- **Expeditionslager** im Wald-/Amber-Design mit lokal gebündelten Illustrationen;
  die drei Starterkarten tragen eigene Motive, auch im Fossilienbuch
- **Tagesexpedition** mit weltweitem UTC-Tagescode und **Expeditionscodes** zum
  Wiederholen derselben Ausgangslage innerhalb derselben Spielversion
- **Deckanalyse** mit Energiekurve, tatsächlichen Verbesserungskosten,
  Kartentypen und zusammengefassten Duplikaten
- **Archivsuche** nach entdeckten Karten/Effekten bzw. Fossilien/Fundorten
- **Expeditionshandbuch** erklärt Kampf, Deckbau und Fortschritt direkt im Lager
- **Kampfmenü** über „Akt … ⋮“: Regeln nachschlagen, weiterspielen oder den
  laufenden Kampf im Lager pausieren. Am Run-Ende lässt sich derselbe Code direkt wiederholen
- **Speicherhilfe** zeigt tatsächliche Schreib-/Lesefehler an; „Erneut speichern“
  sichert den aktuellen Stand, ohne einen älteren Spielstand darüberzuladen

## Tech Stack

Expo SDK 57 · React Native 0.86 · Expo Router · TypeScript · zustand · Reanimated 4 ·
Gesture Handler · Jest

Architektur und Spielregeln: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)

Bildquellen und verwendete Generierungsprompts: [`docs/ARTWORK.md`](docs/ARTWORK.md).

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

GitHub Actions prüft Pull Requests automatisch mit Typecheck, Lint, Tests und
Bundle-Export für Android, iOS und Web (`.github/workflows/quality.yml`).

Builds für die Stores laufen über EAS (`npx eas-cli@latest build`).

## Spielanleitung

1. **Neue Expedition** starten und auf der Karte einen leuchtenden Ort wählen.
2. **Karte antippen** hebt sie an, nochmal tippen oder nach oben wischen spielt sie.
3. **Lange drücken** zeigt Details und den Fossil-Fakt zur Karte.
4. Die Anzeige über dem Gegner verrät seinen nächsten Zug — Block lohnt sich bei ⚔️.
5. Nach jedem Sieg eine neue Karte wählen, an Rastplätzen heilen oder Karten verbessern.
6. Auf der Karte das Deck öffnen: Energiekurve prüfen und den Expeditionscode
   auswählen/kopieren. Mit „Mit Code“ im Lager lässt sich die Ausgangslage erneut spielen.

Die Tagesexpedition verwendet die bestehenden Spielregeln und wechselt um
00:00 UTC. Eine laufende Expedition bleibt bis zu deiner ausdrücklichen Bestätigung
erhalten, wenn du einen neuen oder anderen Code starten möchtest.

## Lizenz

MIT
