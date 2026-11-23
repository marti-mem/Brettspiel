# Susis Weihnachtszauber 🎄

Ein selbstgemachtes Familien-Brettspiel für 2–6 Spieler, im Team-Modus für bis zu 10 Personen. Es ist ab 7 Jahren geeignet und dauert ca. 30–45 Minuten.

Es ist der 24. Dezember, und Susi möchte für Jakob und die ganze Familie das schönste Weihnachtsfest vorbereiten. Alle helfen mit und sammeln im Weihnachtsdorf Christbaum, Plätzchen, Kerzen und Co. Wer zuerst alle 4 Sachen von seiner Weihnachtsliste in Susis Weihnachtsstube bringt, gewinnt. Mit der Variante „Gemeinsam bis Heiligabend“ spielen alle zusammen gegen den Adventskalender.

## Druckvorlagen (Ordner `druck/`)

| Datei | Inhalt | Druck |
|---|---|---|
| `01_Spielplan_40x40cm_Copyshop.pdf` | Spielplan in einem Stück | Copyshop, 40 × 40 cm (oder auf 50 × 50 cm Papier) |
| `01_Spielplan_4xA4.pdf` | Spielplan in 4 Teilen à 20 × 20 cm | Zu Hause auf A4 |
| `01_Spielplan_2xA3.pdf` | Spielplan in 2 Teilen à 40 × 20 cm | A3-Drucker / Copyshop |
| `02_Spielregel_A4.pdf` | Spielregel, 2 Seiten | Normales Papier, gern beidseitig |
| `03_Wichtel-Karten_A4_beidseitig.pdf` | 40 Wichtel-Karten und 5 leere Karten, mit Rückseiten (5 Bögen) | Beidseitig, Karton 250–300 g/m², an der langen Kante wenden |
| `04_Weihnachtslisten_A4.pdf` | 12 Weihnachtslisten (9,5 × 9,5 cm) | Nur Vorderseite, Karton |
| `05_Gegenstaende_A4.pdf` | 48 Gegenstand-Plättchen (3 × 3 cm), 1 Kalender-Stern und 5 leere Ersatz-Plättchen | Nur Vorderseite, Karton |
| `06_Spielfiguren_A4.pdf` | 10 Falt-Figuren mit Weihnachtsmütze (Mami/Susi mit Stern) | Nur Vorderseite, Karton 200–250 g/m² |
| `07_Schachteldeckel_A4.pdf` | Titelbild zum Aufkleben auf eine Schachtel | Fotopapier oder Karton |

Wichtig: Immer in **Originalgröße (100 %)** drucken, also nicht „An Seite anpassen“ wählen.

## Basteltipps

- **Spielplan:** Die Teile auf eine Graupappe (z. B. 2 mm) kleben. Sprühkleber oder Klebestift funktioniert am besten. Für einen klappbaren Plan zwei Pappen mit 2 mm Abstand nebeneinanderlegen und hinten mit Gewebeband verbinden.
- **Karten:** Mit dem Papierschneider oder mit Cutter und Lineal entlang der Schnittmarken schneiden. Mit einem Eckenrunder (3–5 mm) sehen die Karten wie gekauft aus.
- **Gegenstände:** Das Raster mit geraden Schnitten zerteilen, erst in Streifen, dann in Plättchen. Für mehr Stabilität vorher auf dünne Pappe kleben.
- **Figuren:** Ausschneiden, an der mittleren Linie falten (das ist der Kopf), Vorder- und Rückseite zusammenkleben und die Standfüße nach außen knicken. Alternativ die Füße abschneiden und die Figuren in Kunststoff-Aufstellfüße für Spielfiguren stecken.
- **Würfel:** Einen normalen Holzwürfel (1–6) dazulegen.
- **Schachtel:** Ein Schuhkarton oder eine Geschenkbox. Den Deckel bekleben und Gefrierbeutel für die Kleinteile beilegen.

## Anpassen und neu erzeugen

Alle Texte, Orte, Farben und Figuren stehen in `src/daten.js`. Fotos für die Figuren kommen nach `figuren/` (siehe `figuren/README.md`).

```bash
npm install
npm run build
```

Die PDFs landen danach in `druck/`.

Die Bilder stammen von [Twemoji](https://github.com/jdecked/twemoji) (CC-BY 4.0), die Schriften sind Fredoka und Nunito (SIL OFL).
