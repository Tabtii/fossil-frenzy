# Fossil Frenzy 2 — Architektur & Regeln

Roguelike-Deckbuilder für **Android und iOS** (Expo SDK 57, React Native 0.86,
Expo Router). Hochformat, Mobile First, Sprache der Oberfläche: Deutsch.
Code, Bezeichner und Kommentare: Englisch.

## Schichten

```
src/
  engine/   Reine TypeScript-Spiellogik. Kein React, kein React Native, keine
            Uhrzeit, kein Math.random. Alle Funktionen sind pur: (db, state, …) → neuer State.
    types.ts      Vertrag aller Typen (nicht ohne Not ändern)
    rng.ts        mulberry32, State als uint32 im Spielstand
    combat.ts     Kampf: startCombat, canPlay, playCard, endTurn, getIntent, previewDamage
    describe.ts   Kartentext aus Effekten generieren, Status-Infos
    run.ts        Expedition: Karte, Knoten, Belohnungen, Rast, Akte
    __tests__/    Jest-Tests (Engine ist zu 100 % ohne UI testbar)
  data/     Inhalte (Karten, Gegner, Fossilien) + CONTENT-Registry
  state/    zustand-Store mit AsyncStorage-Persistenz, Meta-Fortschritt
  lib/      Plattform-Helfer (Haptik)
  ui/       Design-System: Theme-Tokens, Layout-Hooks, Komponenten
  app/      Expo-Router-Routen (nur Screens, keine Logik)
```

Abhängigkeitsrichtung: `app → ui/state → engine ← data`. Die Engine importiert
nichts aus `data`; Inhalte werden als `ContentDB` übergeben (Tests nutzen
eigene Fixtures).

## Kampfregeln

- Spieler: 3 Energie pro Zug, zieht 5 Karten pro Zug. Handlimit 10 (überzählige
  Karten werden direkt abgelegt). Leerer Nachziehstapel → Ablagestapel mischen.
- **Zugablauf** (`endTurn`):
  1. Handkarten auf den Ablagestapel. `weak`/`vulnerable` des Spielers −1.
  2. Gegnerzug: Gegner-Block → 0, Gegner-`bleed` tickt (kann ihn töten → Sieg),
     Gegner führt `nextMoveId` aus, dann Gegner-`weak`/`vulnerable` −1, nächster Zug wird gewählt.
  3. Spielerzug: Spieler-Block → 0, Spieler-`bleed` tickt, Energie = Max,
     5 Karten ziehen, `turn + 1`, Zähler für „diesen Zug gespielt“ zurücksetzen.
- **Schaden pro Treffer** = `(basis + stärke) × 0,75 falls Angreifer geschwächt`
  (abrunden) `× 1,5 falls Ziel verwundbar` (abrunden), min. 0. Block fängt zuerst ab,
  außer `pierce`. `bleed` ignoriert Block und Modifikatoren.
- **Verwirrt** (nur sinnvoll beim Gegner): Hat der Gegner `confused > 0` und führt
  einen Zug mit `attack` aus, treffen alle Angriffe dieses Zugs ihn selbst
  (gegen seinen eigenen Block, mit seinen eigenen `strength`/`weak`/`vulnerable`), danach `confused − 1`.
  Andere Effekte des Zugs wirken normal.
- Status-Stapel addieren sich. `strength` bleibt den ganzen Kampf.
- `firstAttackThisTurn`: wahr, wenn vor dieser Karte in diesem Zug noch keine
  Karte vom Typ `attack` gespielt wurde.
- `scaling` zählt Karten **ohne** die gerade gespielte Karte (Kartentext: „je weitere …-Karte im Deck“).
  Bei Mehrfachtreffern gilt der Bonus pro Treffer.
- Heilung kann Max-LP nicht überschreiten. `execute` setzt Gegner-LP auf 0.
- Sieg sobald Gegner-LP ≤ 0 (sofort, auch mitten in einem Effekt), Niederlage
  sobald Spieler-LP ≤ 0. Danach sind keine Aktionen mehr möglich.
- Zufall nur über `rng.ts` mit `rngState` im State → deterministisch und testbar.

## Expedition (Run)

- 4 Akte = 4 Erdzeitalter in Reihenfolge Trias → Jura → Kreide → Eiszeit.
- Pro Akt 6 Etagen: Etagen 0–4 mit je 2–3 Knoten, Etage 5 = Boss. Jeder Knoten
  verbindet zu 1–2 Knoten der nächsten Etage (benachbarte Lanes), jeder Knoten
  ist erreichbar, keine Kreuzungen nötig.
- Knotentypen: `fight` (normaler Gegner der Ära), `elite` (frühestens Etage 2),
  `rest` (frühestens Etage 2, mind. einer pro Akt), `dig` (Ausgrabung: 1 von 3 Karten
  gratis wählen), `boss`. Etage 0 besteht nur aus `fight`.
- Start: 60/60 LP, Startdeck aus `STARTER_DECK`.
- Belohnungen nach Kampf: 3 Kartenoptionen (überspringen erlaubt), ohne Starter-
  und Duplikate innerhalb einer Auswahl. Seltenheiten: normal 60 % common / 33 %
  uncommon / 7 % rare; Elite 40/45/15; Boss nur rare. Bevorzugt Karten der aktuellen
  Ära (≥ 2 von 3, falls verfügbar). Elite +4 Max-LP, Boss +8 Max-LP und volle Heilung
  beim Aktwechsel um 50 % der fehlenden LP.
- Rast: 30 % Max-LP heilen (aufrunden) **oder** eine nicht verbesserte Karte verbessern.
- Fossilienfunde: jede Karte und jeder besiegte Gegner verweist auf einen
  `fossilId`. Neue Funde landen im Fossilienbuch (Meta, persistiert).
- Niederlage → `defeat`, letzter Boss besiegt → `victory`.

## Expeditionscodes und Archivwerkzeuge

- `features/shell/expedition.ts` stellt den vollständigen uint32-Seed als `FF-XXXXXXXX`
  dar. Ungültige Eingaben werden abgewiesen. Wiederholungen setzen dieselbe Inhaltsversion voraus.
- Tagesexpeditionen leiten ihren Seed mit den bestehenden RNG-Helfern aus dem
  **UTC-Kalendertag** ab. Sie verwenden die normalen Spielregeln und denselben
  Speicherplatz. Eine laufende Expedition wird erst nach Bestätigung ersetzt.
- `features/map/deckAnalysis.ts` zählt physische Karten einschließlich Duplikaten
  und berücksichtigt die tatsächlichen Kosten verbesserter Karten.
- Die Archivsuche durchsucht ausschließlich entdeckte Inhalte und kombiniert sich
  mit den bestehenden Filtern. Namen und Regeln gesperrter Inhalte bleiben verborgen.
- Die Speicherprüfung erkennt ungültige Kartenverbindungen, Kampfwerte,
  Statuseffekte, entfernte Gegnerzüge sowie doppelte oder widersprüchliche Karten-IDs.
  Wird eine beschädigte Expedition verworfen, bleibt der gültige Meta-Fortschritt erhalten.
- Tatsächliche Speicherfehler werden in einem separaten, nicht persistierten
  Status-Store gemeldet, damit die Fehlermeldung keine weitere Speicherung auslöst.
  Ein erneuter Speicherversuch schreibt den aktuellen Arbeitsspeicherstand; nach
  einem Lesefehler bleibt das Überschreiben des bestehenden Spielstands gesperrt.
  Verspätete Antworten älterer Schreibvorgänge verdecken keinen neueren Fehler.
- Bilder liegen ausschließlich in der UI (`ui/components/FossilArtwork.tsx`). Engine
  und Inhaltsregister bleiben unabhängig von React Native. Ohne Bild oder Entdeckung
  werden die ursprünglichen Symbole verwendet.

## Balance-Ziele

- Startdeck 10 Karten, Gegner Trias normal 18–30 LP, Bosse 90–220 LP steigend je Akt.
- Durchschnittlicher Normal-Kampf in Akt 1: 3–5 Züge, 5–12 LP Verlust.
- Kartenwert ~ 6 Schaden oder 5 Block pro Energie bei common; Effekte rechnen ein.

## UI-Leitlinien (Mobile First)

- Basisbreite 360 dp; alles muss von 320 dp (kleines Android) bis 430 dp
  (großes iPhone) ohne horizontales Scrollen passen; Tablets: Inhalt mittig,
  max. 560 dp breit.
- Safe Areas überall (`react-native-safe-area-context`), Edge-to-Edge auf Android.
- Daumenzone: primäre Aktionen (Karten, „Zug beenden“, Auswahl bestätigen) im
  unteren Drittel. Touch-Ziele ≥ 48 dp.
- Kampf: Gegner + Absicht oben, Spielerstatus Mitte, Hand unten. Tippen hebt
  eine Karte an (Vorschau mit Schaden), erneutes Tippen oder Wischen nach oben
  spielt sie. Langes Drücken öffnet die Detailansicht mit Fossil-Fakt.
- Feedback: schwebende Schadenszahlen, Haptik (abschaltbar), reduzierte Bewegung respektieren.
- Schriftskalierung des Systems respektieren (`maxFontSizeMultiplier` ≈ 1.3 für Kartentexte).
- Barrierefreiheit: `accessibilityLabel`/`accessibilityRole` auf allen Bedienelementen.
- Dunkles Theme, Farben nur über Tokens aus `src/ui/theme.ts`.

## Prüfungen

```
npm run typecheck   # tsc --noEmit
npm run lint        # expo lint
npm test            # jest (jest-expo)
npx expo export --platform android --platform ios   # Bundles bauen
```
