// Alle Inhalte des Spiels an einem Ort – hier kann man Texte, Namen und Farben ändern.
// Danach `npm run build` ausführen, um die Druck-PDFs neu zu erzeugen.

const titel = 'Jakobs große Schatzsuche';

// Widmung auf dem Schachteldeckel (leer lassen = keine Widmung)
const widmung = 'Für Susi – Frohe Weihnachten 2026!';

// Die 8 Orte im Uhrzeigersinn, beginnend oben links.
// `mitte: true` = von hier führt ein Weg direkt in Jakobs Zimmer.
const orte = [
  { id: 'wald',        name: 'Wald',        emoji: '🌲', farbe: '#2e7d32', mitte: false, ding: { name: 'Taschenlampe',  emoji: '🔦' } },
  { id: 'spielplatz',  name: 'Spielplatz',  emoji: '🛝', farbe: '#ef6c00', mitte: true,  ding: { name: 'Fußball',       emoji: '⚽' } },
  { id: 'zoo',         name: 'Zoo',         emoji: '🦒', farbe: '#d4a017', mitte: false, ding: { name: 'Fernrohr',      emoji: '🔭' } },
  { id: 'baeckerei',   name: 'Bäckerei',    emoji: '🥨', farbe: '#8d5a3b', mitte: true,  ding: { name: 'Teddy',         emoji: '🧸' } },
  { id: 'bauernhof',   name: 'Bauernhof',   emoji: '🐄', farbe: '#c62828', mitte: false, ding: { name: 'Gummistiefel',  emoji: '👢' } },
  { id: 'bahnhof',     name: 'Bahnhof',     emoji: '🚂', farbe: '#546e7a', mitte: true,  ding: { name: 'Rucksack',      emoji: '🎒' } },
  { id: 'blumenwiese', name: 'Blumenwiese', emoji: '🌻', farbe: '#c2185b', mitte: false, ding: { name: 'Drachen',       emoji: '🪁' } },
  { id: 'schwimmbad',  name: 'Schwimmbad',  emoji: '🏊', farbe: '#0277bd', mitte: true,  ding: { name: 'Taucherbrille', emoji: '🤿' } },
];

// Exemplare pro Gegenstand (jeder Gegenstand steht auf 6 der 12 Suchlisten)
const exemplareProDing = 6;

// 12 Suchlisten: jede hat 2 Orte mit Weg zur Mitte + 2 Eck-Orte (gleich schwer).
function suchlistenErzeugen() {
  const mitte = orte.filter(o => o.mitte).map(o => o.id);
  const ecke = orte.filter(o => !o.mitte).map(o => o.id);
  const paare = a => {
    const p = [];
    for (let i = 0; i < a.length; i++) for (let j = i + 1; j < a.length; j++) p.push([a[i], a[j]]);
    return p;
  };
  const mp = paare(mitte), ep = paare(ecke);
  const listen = [];
  for (let k = 0; k < 6; k++) listen.push([...mp[k], ...ep[k]]);
  for (let k = 0; k < 6; k++) listen.push([...mp[k], ...ep[5 - k]]);
  // in Weg-Reihenfolge sortieren, damit die Liste "wie eine Runde" aussieht
  const reihenfolge = orte.map(o => o.id);
  return listen.map(l => l.sort((a, b) => reihenfolge.indexOf(a) - reihenfolge.indexOf(b)));
}
const suchlisten = suchlistenErzeugen();

// Spielfiguren. Ein Foto kann als figuren/<id>.jpg oder .png abgelegt werden.
const figuren = [
  { id: 'jakob',   name: 'Jakob',   farbe: '#e53935', kind: true },
  { id: 'mama',    name: 'Mama',    farbe: '#fb8c00' },
  { id: 'mami',    name: 'Mami',    farbe: '#e0a800' },
  { id: 'oma',     name: 'Oma',     farbe: '#43a047' },
  { id: 'opa',     name: 'Opa',     farbe: '#00897b' },
  { id: 'birgit',  name: 'Birgit',  farbe: '#1e88e5' },
  { id: 'gerhard', name: 'Gerhard', farbe: '#5e35b1' },
  { id: 'lukas',   name: 'Lukas',   farbe: '#d81b60' },
  { id: 'astrid',  name: 'Astrid',  farbe: '#6d4c41' },
  { id: 'marti',   name: 'Marti',   farbe: '#546e7a' },
];

// Kartenarten der Jakob-Karten
const kartenarten = {
  glueck:      { name: 'Glück',       emoji: '🌈', farbe: '#f9a825', hell: '#fff8e1' },
  hoppla:      { name: 'Hoppla',      emoji: '💦', farbe: '#1e88e5', hell: '#e3f2fd' },
  miteinander: { name: 'Miteinander', emoji: '💚', farbe: '#43a047', hell: '#e8f5e9' },
  joker:       { name: 'Joker',       emoji: '🎁', farbe: '#8e24aa', hell: '#f3e5f5' },
};

// Die 40 Jakob-Karten. `anzahl` = wie oft die Karte im Stapel ist.
const jakobKarten = [
  // ---- Glück (12) ----
  { art: 'glueck', anzahl: 2, emoji: '🗺️', titel: 'Geheimweg', text: 'Jakob zeigt dir einen geheimen Weg. Stell deine Figur auf einen Ort deiner Wahl.' },
  { art: 'glueck', anzahl: 2, emoji: '🌬️', titel: 'Rückenwind', text: 'Der Wind schiebt dich an! Würfle gleich noch einmal und zieh weiter.' },
  { art: 'glueck', anzahl: 2, emoji: '🚲', titel: 'Mit dem Fahrrad', text: 'Jakob leiht dir sein Fahrrad. Zieh 1 bis 6 Felder – du bestimmst, wie weit.' },
  { art: 'glueck', anzahl: 1, emoji: '🎉', titel: 'Gefunden!', text: 'Jakob hat etwas entdeckt! Nimm dir einen Gegenstand von deiner Suchliste aus dem Vorrat.' },
  { art: 'glueck', anzahl: 1, emoji: '🚆', titel: 'Tschu-tschu!', text: 'Fahr mit dem Zug: Stell deine Figur auf den Bahnhof. Dann würfle noch einmal.' },
  { art: 'glueck', anzahl: 2, emoji: '🚕', titel: 'Ab nach Hause', text: 'Ein Taxi bringt dich heim. Stell deine Figur in Jakobs Zimmer.' },
  { art: 'glueck', anzahl: 1, emoji: '🏃', titel: 'Sprint!', text: 'Jakob rennt los und du rennst mit. Zieh 6 Felder weit.' },
  { art: 'glueck', anzahl: 1, emoji: '🐴', titel: 'Huckepack', text: 'Jakob nimmt dich Huckepack. Stell deine Figur auf das Feld einer anderen Figur deiner Wahl.' },

  // ---- Hoppla (10) ----
  { art: 'hoppla', anzahl: 1, emoji: '🥨', titel: 'Hunger!', text: 'Jakob hat Hunger auf eine Brezel. Geh zur Bäckerei.' },
  { art: 'hoppla', anzahl: 1, emoji: '🦒', titel: 'Giraffen gucken', text: 'Jakob will unbedingt die Giraffen sehen. Geh zum Zoo.' },
  { art: 'hoppla', anzahl: 1, emoji: '👟', titel: 'Schnürsenkel offen', text: 'Erst mal Schuhe binden! Du setzt beim nächsten Mal aus.' },
  { art: 'hoppla', anzahl: 1, emoji: '🌧️', titel: 'Regenschauer', text: 'Schnell unterstellen! Zieh 2 Felder zurück – dorthin, woher du gekommen bist.' },
  { art: 'hoppla', anzahl: 1, emoji: '☀️', titel: 'So heiß heute', text: 'Jakob will ins kühle Wasser. Geh zum Schwimmbad.' },
  { art: 'hoppla', anzahl: 1, emoji: '🐷', titel: 'Matsch-Alarm', text: 'Jakob ist in den Matsch gefallen. Geh zum Bauernhof – dort gibt es einen Wasserschlauch.' },
  { art: 'hoppla', anzahl: 1, emoji: '💐', titel: 'Blumen pflücken', text: 'Jakob möchte Blumen für Mama und Mami pflücken. Geh zur Blumenwiese.' },
  { art: 'hoppla', anzahl: 1, emoji: '🦔', titel: 'Falsch abgebogen', text: 'Huch, wo sind wir denn hier? Geh zum Wald.' },
  { art: 'hoppla', anzahl: 1, emoji: '🧢', titel: 'Mütze vergessen', text: 'Jakob hat seine Mütze liegen lassen. Zieh 3 Felder zurück – dorthin, woher du gekommen bist.' },
  { art: 'hoppla', anzahl: 1, emoji: '🛝', titel: 'Nur noch einmal!', text: 'Jakob will nur noch einmal rutschen. Geh zum Spielplatz.' },

  // ---- Miteinander (10) ----
  { art: 'miteinander', anzahl: 2, emoji: '🍪', titel: 'Kekse für alle', text: 'Jakob verteilt Kekse. Alle Figuren dürfen 1 Feld ziehen – in eine Richtung ihrer Wahl.' },
  { art: 'miteinander', anzahl: 2, emoji: '😂', titel: 'Witzeerzähler', text: 'Erzähl einen Witz! Wer zuerst lacht, darf 2 Felder ziehen.' },
  { art: 'miteinander', anzahl: 2, emoji: '🐮', titel: 'Tierstimmen', text: 'Mach ein Tiergeräusch. Wer zuerst das Tier errät, darf 2 Felder ziehen – und du auch!' },
  { art: 'miteinander', anzahl: 1, emoji: '🤝', titel: 'Gute Tat', text: 'Hilf jemandem: Ein Mitspieler deiner Wahl darf 3 Felder ziehen. Danach würfelst du noch einmal.' },
  { art: 'miteinander', anzahl: 1, emoji: '🎭', titel: 'Pantomime', text: 'Mach ohne Worte vor, was Jakob gern macht. Wer es errät, darf 2 Felder ziehen – und du auch!' },
  { art: 'miteinander', anzahl: 1, emoji: '🎵', titel: 'Jakobs Lied', text: 'Alle singen zusammen ein Lied, das Jakob mag. Danach dürfen alle Figuren 1 Feld ziehen.' },
  { art: 'miteinander', anzahl: 1, emoji: '✋', titel: 'High Five', text: 'Gib allen am Tisch ein High Five! Dann würfle noch einmal.' },

  // ---- Joker – zum Behalten (8) ----
  { art: 'joker', anzahl: 2, emoji: '🛴', titel: 'Jakobs Roller', text: 'Spiel diese Karte nach dem Würfeln: Du ziehst doppelt so weit.' },
  { art: 'joker', anzahl: 2, emoji: '🍀', titel: 'Glücksklee', text: 'Spiel diese Karte nach dem Würfeln: Würfle noch einmal und nimm das bessere Ergebnis.' },
  { art: 'joker', anzahl: 2, emoji: '☂️', titel: 'Regenschirm', text: 'Spiel diese Karte, wenn du eine Hoppla-Karte ziehst: Die Hoppla-Karte gilt nicht.' },
  { art: 'joker', anzahl: 2, emoji: '🧭', titel: 'Jakobs Kompass', text: 'Spiel diese Karte statt zu würfeln: Zieh 1 bis 6 Felder – so weit du willst.' },
];

// Leere Karten zum Selbstbeschriften (füllen den letzten Bogen auf)
const leereKarten = 5;

module.exports = { titel, widmung, orte, exemplareProDing, suchlisten, figuren, kartenarten, jakobKarten, leereKarten };
