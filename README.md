# 🦭 Arnes Mathe-Abenteuer

Ein kleines Rechenspiel für die 2. Klasse. Ziel: mit **sehr einfachen**
Plus- und Minus-Aufgaben Punkte sammeln. Die Aufgaben werden langsam schwerer.

## Spielen

Einfach die Datei **`index.html`** im Browser öffnen
(Doppelklick oder im Terminal `xdg-open index.html`).
Es muss nichts installiert werden.

## So funktioniert es

- Jede richtige Aufgabe gibt **einen Punkt** ⭐.
- Nach `3` richtigen Aufgaben geht es eine **Stufe** höher (🏆).
- Die Zahlen gehen **nie über 100** und **nie unter 0**.
- Alle Aufgaben sind zufällig – am Anfang trotzdem ganz leicht.

### Was kommt wann?

| Ab Stufe | Neu |
|----------|-----|
| 1        | Plus mit kleinen Zahlen (z. B. `10 + 0`, `10 + 5`) |
| 3        | **Minus bis 10** (z. B. `8 − 3`, `10 − 6`) |
| 4        | Plus und Minus mit größeren Zahlen (z. B. `13 − 7`, `9 + 17`) |
| 8        | **Zahlenreihen** (z. B. `2, 4, 6, 8, 10, 12, ?`) |
| 15       | **Drei Zahlen** (z. B. `3 + 9 + 14`, `17 − 3 − 7`) |

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
const SUB_FROM_LEVEL    = 3;   // ab hier Minus
const SEQ_FROM_LEVEL    = 8;   // ab hier Zahlenreihen
const TRIPLE_FROM_LEVEL = 15;  // ab hier drei Zahlen
const MAX_BY_LEVEL = [10,12,10,20,30,40,50,50,60,70,80,90,100,100,100];
```

Zum schnellen Ausprobieren einer Stufe: `index.html?stufe=8` öffnen
(startet direkt auf Stufe 8).
