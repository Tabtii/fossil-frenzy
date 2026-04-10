# 🦕 FOSSIL FRENZY - Dino Deckbuilder (Slay the Spire mit Dinos)

## 🎮 Spielkonzept

Ein Roguelike-Deckbuilder im Stil von "Slay the Spire" mit Dinosauriern als zentrale Elemente!

### Kernmechaniken

#### 1. **Kampfsystem** (Turn-basiert)
- Spiele Karten aus deinem Deck, um Gegner zu besiegen
- Jede Karte kostet Energie (⚡)
- Kartentypen:
  - ⚔️ **Angreifer** - Verursachen Schaden
  - 🛡️ **Verteidiger** - Bauen Block auf
  - 💚 **Unterstützung** - Heilung und spezielle Effekte
  - 🔄 **Hybrid** - Kombination aus allem

#### 2. **Gegner mit Intent-System**
- Jeder Gegner hat ein Angriffsmuster (Pattern)
- Siehe voraus, was der Gegner als Nächstes tut:
  - ⚔️ Angriff
  - 🛡️ Verteidigung
  - 😠 Buff (verstärkt sich)
  - 🎯 Debuff (schwächt dich)
  - 💥 Spezieller Angriff

#### 3. **Verzweigte Karte** (wie Slay the Spire)
- 12 Etagen bis zum Boss
- Knoten-Typen:
  - ⚔️ **Kampf** - Normale Gegner
  - 💀 **Elite** - Starke Gegner mit besseren Belohnungen
  - ❓ **Event** - Zufällige Ereignisse mit Entscheidungen
  - 🏪 **Shop** - Kaufe Karten, Relikte und Tränke
  - 🔥 **Rast** - Heile oder verbessere Karten
  - 👹 **Boss** - Abschluss jeder Region

#### 4. **Deck-Building**
- Starte mit einem Basis-Deck
- Füge nach Kämpfen neue Karten hinzu
- Entferne schwache Karten
- Verbessere starke Karten

#### 5. **Relikte** (Passive Boni)
- 🧿 **Fossilien-Amulett** - +1 Max Energie
- 📿 **Bernstein-Halskette** - Heilung nach Kampf
- 🦷 **Dino-Zahn** - +2 Angriffsschaden

#### 6. **Tränke** (Einmalige Effekte)
- 🧪 **Heiltrank** - Heilt 10 HP
- ⚡ **Energie-Trank** - +3 Energie
- 💪 **Kraft-Trank** - Doppelter Schaden für nächsten Angriff

#### 7. **Meta-Progression**
- Statistiken über mehrere Runs
- Freischaltbare Inhalte durch Erfolge
- Highscore-System

## 🃏 Karten-Beispiele

### Starter-Deck
| Karte | Typ | Kosten | Effekt | Epoche |
|-------|-----|--------|--------|--------|
| 🦖 T-Rex | Angreifer | ⚡⚡⚡ | 12 Schaden | Kreide |
| 🦕 Triceratops | Verteidiger | ⚡⚡ | 8 Block | Kreide |
| 🐦 Archaeopteryx | Hybrid | ⚡ | 4 Schaden, verwirrt | Jura |
| 🌿 Urweltfarn | Unterstützung | ⚡ | 5 Heilung | Trias |
| 🦎 Stegosaurus | Verteidiger | ⚡⚡ | 6 Block, Synergie | Jura |
| 🦕 Velociraptor | Angreifer | ⚡⚡ | 6 Schaden, 2x wenn allein | Kreide |

### Erweiterte Karten
| Karte | Typ | Kosten | Effekt | Epoche |
|-------|-----|--------|--------|--------|
| 🦣 Mammut | Verteidiger | ⚡⚡⚡ | 10 Block + 3 Heilung | Eiszeit |
| 🦅 Pteranodon | Angreifer | ⚡⚡ | 5 Schaden, unblockbar | Kreide |
| 🦞 Trilobit | Unterstützung | ⚡ | 2 Heilung + Karte ziehen | Trias |
| 🦕 Brachiosaurus | Hybrid | ⚡⚡⚡ | 4 Schaden + 4 Block | Jura |
| 🐯 Säbelzahntiger | Angreifer | ⚡⚡ | 8 Schaden, Crit 2x | Eiszeit |

## 👹 Gegner

| Gegner | HP | Angriff | Muster | Seltenheit |
|--------|----|---------|--------|------------|
| 🦕 Raptor-Schwarm | 35 | 6 | Angriff → Starker Angriff → Wut | Normal |
| 🦕 Wütender Triceratops | 50 | 8 | Block → Horn → Horn | Normal |
| 🦅 Pteranodon-Schwarm | 30 | 5 | Hieb → Verwundbar → Sturzflug | Normal |
| 🦖 T-Rex Alpha | 100 | 12 | Biss → Brüllen → Wut → Stampfer | Boss |

## 🗺️ Spielablauf

1. **Start**: Beginne deine Run am Startknoten
2. **Pfad wählen**: Wähle einen Weg durch die verzweigte Karte
3. **Kämpfe**: Besiege Gegner und erhalte Belohnungen
4. **Entscheide**: Wähle bei Events klug
5. **Sammle**: Neue Karten, Relikte und Tränke
6. **Überlebe**: Erreiche den Boss und besiege ihn
7. **Wiederhole**: Jeder Run ist anders!

## 🎯 Ziele

- Besiege alle Bosse
- Sammle alle Karten (Fossilienbuch)
- Entdecke alle Relikte
- Erreiche Highscores
- Schalte Schwierigkeitsgrade frei

## 🎨 Features

- ✅ Turn-basiertes Kampfsystem
- ✅ Verzweigte Karte mit 12 Etagen
- ✅ 5 verschiedene Knoten-Typen
- ✅ Intent-Vorschau für Gegneraktionen
- ✅ Deck-Building zwischen Kämpfen
- ✅ Relikte mit passiven Effekten
- ✅ Tränke für taktische Vorteile
- ✅ Fossilienbuch zum Sammeln
- ✅ Paläontologische Fakten zu jedem Dino
- ✅ Responsive Web-Design

## 🚀 Technologie

- React Native / Expo
- TypeScript
- Web-Export möglich

---

**Viel Spaß beim Sammeln und Kämpfen! 🦖⚔️🦕**
