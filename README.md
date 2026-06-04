# 🦭 Arnes Mathe-Abenteuer

Ein kleines Rechenspiel für die 1. Klasse. Ziel: mit **sehr einfachen**
Plus- und Minus-Aufgaben Punkte sammeln. Die Aufgaben werden langsam schwerer.

## Spielen

Einfach die Datei **`index.html`** im Browser öffnen
(Doppelklick oder im Terminal `xdg-open index.html`).
Es muss nichts installiert werden.

## So funktioniert es

- Jede richtige Aufgabe gibt **einen Punkt** ⭐.
- Nach `3` richtigen Aufgaben geht es eine **Stufe** höher (🏆).
- Alle `3` Stufen gibt es ein Leben zurück, wenn eins fehlt.
- Die Zahlen gehen **nie über 100** und **nie unter 0**.
- Alle Aufgaben sind zufällig – am Anfang trotzdem ganz leicht.

### Was kommt wann?

| Ab Stufe | Neu |
|----------|-----|
| 1        | Plus bis 5 (z. B. `3 + 2`) |
| 2        | Plus bis 10 (z. B. `6 + 3`) |
| 3        | **Verliebte Zahlen** zur 10 (z. B. `7 + ? = 10`) |
| 4        | **Minus bis 10** (z. B. `8 − 3`, `10 − 6`) |
| 5        | Plus und Minus gemischt bis 10 |
| 6        | Plus bis 20 |
| 7        | Minus bis 20 |
| 8        | Plus und Minus gemischt bis 20 |
| 9        | Zehnerfreunde wiederholen, gemischt mit normalen Aufgaben |
| 12       | **Zahlenreihen** als Extra-Herausforderung |
| 17       | **Drei Zahlen** als Extra-Herausforderung |

### Anschauung mit Würfeln

Wenn etwas falsch ist – und am Anfang auch bei richtigen Antworten –
zeigt das Spiel die Lösung mit Würfeln:

- **Plus:** erst die grünen Würfel, dann kommen neue (gelb) dazu und werden zusammengesteckt.
- **Minus:** die letzten Würfel werden **rot** und weggenommen.

So sieht ein Kind, *warum* das Ergebnis stimmt (passend zum Zehner-/Hunderterfeld).

## Bedienung

- Mit den **Knöpfen** tippen oder die **Tastatur** benutzen (Zahlen, `⌫`, `Enter`).
- 🔊 schaltet den Ton an/aus.
- ↺ startet das Spiel neu (Punkte und Stufe werden gelöscht).
- Der Spielstand wird automatisch im Browser gespeichert.

## Für Eltern: anpassen

Alles oben in **`game.js`** einstellbar:

```js
const CORRECT_PER_LEVEL = 3;   // richtige Aufgaben pro Stufe
const BOND_TO_TEN_LEVEL = 3;   // verliebte Zahlen
const SUB_FROM_LEVEL    = 4;   // ab hier Minus
const SEQ_FROM_LEVEL    = 12;  // ab hier Zahlenreihen
const TRIPLE_FROM_LEVEL = 17;  // ab hier drei Zahlen
const LIFE_EVERY        = 3;   // alle 3 Stufen ein Leben zurück
const MAX_BY_LEVEL = [5,10,10,10,10,20,20,20,20,30,40,50,50,60,70,80,90,100,100,100];
```

Zum schnellen Ausprobieren einer Stufe: `index.html?stufe=8` öffnen
(startet direkt auf Stufe 8).
