# Fossil Frenzy - Claude Code Game Studio Config

## Game Overview
**Fossil Frenzy** ist ein Roguelike Deckbuilder mit paläontologischem Thema. Der Spieler sammelt Dino-Karten, baut Decks und kämpft gegen Gegner.

## Studio Konfiguration

### Agent Konfiguration
Das Studio nutzt folgende spezialisierte Agenten:

| Agent | Rolle | Verantwortung |
|-------|-------|---------------|
| game-designer | Game Designer | Mechaniken, Balancing, Deckbuilding-Logik |
| gameplay-programmer | Gameplay Programmer | Karten-System, Kampflogik, UI |
| art-director | Art Director | Visuelles Design, Karten-Grafiken |
| sound-designer | Sound Designer | Soundeffekte, Musik |
| qa-tester | QA Tester | Testing, Bug-Reports |
| systems-designer | Systems Designer | Economy, Progression |

### Workflow
1. **Konzept** → Game Designer plant Feature
2. **Design Review** → Design wird reviewed
3. **Implementation** → Programmer baut um
4. **Testing** → QA testet
5. **Polierung** → Sound + Art

## Verfügbare Skills

### Design
- `/design-review` - Design-Review für Mechaniken
- `/balance-check` - Balancing-Analyse
- `/brainstorm` - Ideen-Generierung

### Implementation  
- `/create-story` - Story-Konzepte
- `/dev-story` - Entwickler-Story schreiben
- `/prototype` - Prototypen bauen

### Production
- `/milestone-review` - Meilenstein-Review
- `/bug-report` - Bug dokumentieren
- `/playtest-report` - Playtest-Feedback

## Spiel-Meilensteine

### Phase 1: MVP (Abgeschlossen ✅)
- [x] Basis-Kampf-System
- [x] 10 Dino-Karten
- [x] Fossilienbuch

### Phase 2: Sammlung & Sound
- [ ] Sammlung Screen
- [ ] Sound-Effekte
- [ ] Mehr Karten (20+)
- [ ] Animationen

### Phase 3: Progression
- [ ] Rogue-Like Runde (Map)
- [ ] Boss-Kämpfe
- [ ] Deck-Upgrades
- [ ] Achievements

### Phase 4: Polierung
- [ ] Leaderboards
- [ ] Multiplayer (async)
- [ ] Cloud Save

## Tech Stack
- React Native + Expo
- TypeScript
- OpenClaw API (Remote Control)

## Repository
https://github.com/Tabtii/fossil-frenzy
