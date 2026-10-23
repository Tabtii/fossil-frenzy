# Prüfen und auf einem Gerät spielen

## Automatische Prüfungen

```bash
npm ci
npm run typecheck
npm run lint
npm test -- --runInBand
npx expo-doctor
npx expo export --platform all --max-workers 2 --output-dir build/bundles
```

Der Workflow `.github/workflows/quality.yml` führt Typecheck, Lint, Tests und
Bundle-Export für Android, iOS und Web aus. Ein Bundle-Export prüft den
JavaScript-Teil; er erzeugt keine installierbare App.

## Android-Vorschau mit EAS

Einmal im eigenen Expo-Konto anmelden und das Repository mit dem eigenen
EAS-Projekt verbinden:

```bash
npx eas-cli@latest login
npx eas-cli@latest init
```

Anschließend die APK mit dem vorhandenen Profil erstellen:

```bash
npx eas-cli@latest build --platform android --profile preview
```

Das `preview`-Profil enthält das Spiel und benötigt keinen laufenden
Metro-Server. Nach erfolgreichem Build lässt sich die APK über den von EAS
angezeigten Downloadlink auf einem Android-Gerät installieren.
Für eine Store-Datei steht das Profil `production` bereit.

## Abläufe auf der Vorschau prüfen

1. Kaltstart: Fossil-Frenzy-Symbol und Startbildschirm auf dunklem Hintergrund.
2. Im Lager „Mit Code“ öffnen, eine fehlerhafte Eingabe prüfen und dann
   `FF-0000002A` starten. Die Softwaretastatur darf die Starttaste nicht verdecken.
3. Ersten Kampf betreten, Karte auswählen, Details öffnen, ausspielen und einen
   Zug beenden. Über „Akt … ⋮“ ins Lager zurückkehren und weiterspielen.
4. Die App während eines eigenen Zuges schließen und neu öffnen. LP, Hand,
   Energie und Zugnummer müssen dem letzten gespeicherten Stand entsprechen.
5. Nach einem Sieg eine Karte auswählen, „Deck ansehen“ öffnen und schließen.
   Die gewählte Belohnung muss erhalten bleiben; Übernehmen fügt sie einmal hinzu.
6. Bei einer Ausgrabung bzw. Rast Karte übernehmen oder Verbesserung vergleichen.
   Nach dem Boss führt die Reise zum nächsten Erdzeitalter.
7. Am Expeditionsende denselben Code wiederholen. Die neue Expedition beginnt
   mit dem Starterdeck und derselben ersten Karte; Funde bleiben im Archiv.
8. Sammlung nach „Meeresbewohner Fleischfresser“ durchsuchen und eine Verbesserung
   ansehen. Unentdeckte Karten dürfen durch die Suche nicht sichtbar werden.

Die Browser-Prüfung deckt den Spielablauf, Neuladen, Speicherfehler und Breiten
von 320 bis 768 Pixeln ab. Native Gesten, Bildschirmtastaturen, Safe Areas,
Haptik und das vom Betriebssystem maskierte App-Symbol zusätzlich auf einem
echten Android-/iOS-Gerät prüfen. Den Startbildschirm in einer Preview- oder
Produktions-App prüfen; Expo Go zeigt dafür sein eigenes Verhalten.

## Referenzen

- [EAS-Einrichtung](https://docs.expo.dev/build/setup/)
- [Android-APK-Profil](https://docs.expo.dev/build-reference/apk/)
- [EAS-Buildprofile](https://docs.expo.dev/build/eas-json/)
- [App-Symbol und Startbildschirm](https://docs.expo.dev/develop/user-interface/splash-screen-and-app-icon/)
