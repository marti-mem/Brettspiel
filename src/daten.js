// Alle Inhalte des Spiels an einem Ort – hier kann man Texte, Namen und Farben ändern.
// Danach `npm run build` ausführen, um die Druck-PDFs neu zu erzeugen.

const titel = 'Susis Weihnachtszauber';
const titelZeilen = ['Susis', 'Weihnachts-', 'zauber']; // so steht der Titel auf dem Spielplan
const zentrum = { name: 'Susis Weihnachtsstube', kurz: ['Susis', 'Weihnachtsstube'], emoji: '🏡' };
const kartenName = 'Wichtel-Karte';
const kartenNameMehrzahl = 'Wichtel-Karten';
const listenName = 'Weihnachtsliste';

// Widmung auf dem Schachteldeckel (leer lassen = keine Widmung)
const widmung = 'Für Susi – Frohe Weihnachten 2026! Dein Wichtel';

// Die 8 Orte im Uhrzeigersinn, beginnend oben links.
// `mitte: true` = von hier führt ein Weg direkt in Susis Weihnachtsstube.
const orte = [
  { id: 'tannenwald',  name: 'Tannenwald',  emoji: '🌲',  farbe: '#1b5e20', mitte: false, ding: { name: 'Christbaum',   emoji: '🎄' } },
  { id: 'baeckerei',   name: 'Bäckerei',    emoji: '🧑‍🍳', farbe: '#b26a00', mitte: true,  ding: { name: 'Plätzchen',    emoji: '🍪' } },
  { id: 'postamt',     name: 'Postamt',     emoji: '📮',  farbe: '#c62828', mitte: false, ding: { name: 'Wunschzettel', emoji: '📜' } },
  { id: 'spielzeug',   name: 'Spielzeugladen', emoji: '🧸', farbe: '#6a1b9a', mitte: true, ding: { name: 'Geschenk',    emoji: '🎁' } },
  { id: 'rentierstall',name: 'Rentierstall',emoji: '🦌',  farbe: '#6d4c41', mitte: false, ding: { name: 'Glöckchen',    emoji: '🔔' } },
  { id: 'kirche',      name: 'Kirche',      emoji: '⛪',  farbe: '#ad1457', mitte: true,  ding: { name: 'Kerze',        emoji: '🕯️' } },
  { id: 'schneemann',  name: 'Schneewiese', emoji: '☃️',  farbe: '#0277bd', mitte: false, ding: { name: 'Karotte',      emoji: '🥕' } },
  { id: 'eislaufplatz',name: 'Eislaufplatz',emoji: '⛸️',  farbe: '#00838f', mitte: true,  ding: { name: 'Schlitten',    emoji: '🛷' } },
];

// Exemplare pro Gegenstand (jeder Gegenstand steht auf 6 der 12 Listen)
const exemplareProDing = 6;

// 12 Weihnachtslisten: jede hat 2 Orte mit Weg zur Mitte + 2 Eck-Orte (gleich schwer).
function listenErzeugen() {
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
  const reihenfolge = orte.map(o => o.id);
  return listen.map(l => l.sort((a, b) => reihenfolge.indexOf(a) - reihenfolge.indexOf(b)));
}
const suchlisten = listenErzeugen();

// Spielfiguren. Ein Foto kann als figuren/<id>.jpg oder .png abgelegt werden.
// `stern: true` = Hauptfigur (bekommt einen goldenen Stern)
const figuren = [
  { id: 'mami',    name: 'Mami',    farbe: '#c62828', stern: true },
  { id: 'jakob',   name: 'Jakob',   farbe: '#ef6c00', kind: true },
  { id: 'mama',    name: 'Mama',    farbe: '#c79100' },
  { id: 'oma',     name: 'Oma',     farbe: '#2e7d32' },
  { id: 'opa',     name: 'Opa',     farbe: '#00796b' },
  { id: 'birgit',  name: 'Birgit',  farbe: '#1565c0' },
  { id: 'gerhard', name: 'Gerhard', farbe: '#4527a0' },
  { id: 'lukas',   name: 'Lukas',   farbe: '#ad1457' },
  { id: 'astrid',  name: 'Astrid',  farbe: '#6d4c41' },
  { id: 'marti',   name: 'Marti',   farbe: '#455a64' },
];

// Kartenarten der Wichtel-Karten
const kartenarten = {
  glueck:      { name: 'Glück',       emoji: '🍀', farbe: '#e6a100', hell: '#fff8e1' },
  hoppla:      { name: 'Hoppla',      emoji: '❄️', farbe: '#1e88e5', hell: '#e3f2fd' },
  miteinander: { name: 'Miteinander', emoji: '🎶', farbe: '#2e7d32', hell: '#e8f5e9' },
  joker:       { name: 'Joker',       emoji: '🃏', farbe: '#8e24aa', hell: '#f3e5f5' },
};

// Die 40 Wichtel-Karten. `anzahl` = wie oft die Karte im Stapel ist.
const jakobKarten = [
  // ---- Glück (12) ----
  { art: 'glueck', anzahl: 2, emoji: '🦌', titel: 'Rentier-Express', text: 'Ein Rentier nimmt dich mit. Stell deine Figur auf einen Ort deiner Wahl.' },
  { art: 'glueck', anzahl: 2, emoji: '✨', titel: 'Glitzerschnee', text: 'Der Schnee glitzert, du hast gute Laune! Würfle gleich noch einmal und zieh weiter.' },
  { art: 'glueck', anzahl: 2, emoji: '⛷️', titel: 'Auf Skiern', text: 'Ab auf die Piste! Zieh 1 bis 6 Felder – du bestimmst, wie weit.' },
  { art: 'glueck', anzahl: 1, emoji: '🧝', titel: 'Wichtel-Hilfe', text: 'Ein Wichtel hat etwas für Susi gefunden! Nimm dir einen Gegenstand von deiner Liste aus dem Vorrat.' },
  { art: 'glueck', anzahl: 1, emoji: '🎅', titel: 'Hohoho!', text: 'Der Weihnachtsmann winkt dir zu. Stell deine Figur auf den Rentierstall. Dann würfle noch einmal.' },
  { art: 'glueck', anzahl: 2, emoji: '🫖', titel: 'Der Tee ist fertig', text: 'Susi ruft alle nach Hause. Stell deine Figur in Susis Weihnachtsstube.' },
  { art: 'glueck', anzahl: 1, emoji: '⛸️', titel: 'Schlitterpartie', text: 'Huiii, über das Eis! Zieh 6 Felder weit.' },
  { art: 'glueck', anzahl: 1, emoji: '🤗', titel: 'Huckepack', text: 'Susi nimmt dich Huckepack. Stell deine Figur auf das Feld einer anderen Figur deiner Wahl.' },

  // ---- Hoppla (10) ----
  { art: 'hoppla', anzahl: 1, emoji: '🍪', titel: 'Plätzchenduft', text: 'Susi riecht frische Plätzchen. Geh zur Bäckerei.' },
  { art: 'hoppla', anzahl: 1, emoji: '✉️', titel: 'Noch ein Brief', text: 'Susi hat vergessen, eine Weihnachtskarte abzuschicken. Geh zum Postamt.' },
  { art: 'hoppla', anzahl: 1, emoji: '🧣', titel: 'Schal vergessen', text: 'Brrr, ist das kalt! Du holst deinen Schal und setzt beim nächsten Mal aus.' },
  { art: 'hoppla', anzahl: 1, emoji: '🌨️', titel: 'Schneegestöber', text: 'Du siehst nichts mehr! Zieh 2 Felder zurück – dorthin, woher du gekommen bist.' },
  { art: 'hoppla', anzahl: 1, emoji: '⛄', titel: 'Schneemann bauen', text: 'Jakob will unbedingt einen Schneemann bauen. Geh zur Schneewiese.' },
  { art: 'hoppla', anzahl: 1, emoji: '🎶', titel: 'Chorprobe', text: 'Susi möchte noch kurz bei der Chorprobe zuhören. Geh zur Kirche.' },
  { art: 'hoppla', anzahl: 1, emoji: '⛸️', titel: 'Noch eine Runde', text: 'Jakob will noch eine Runde Schlittschuh laufen. Geh zum Eislaufplatz.' },
  { art: 'hoppla', anzahl: 1, emoji: '🌲', titel: 'Tannenzweige', text: 'Susi möchte noch Tannenzweige für den Adventskranz. Geh zum Tannenwald.' },
  { art: 'hoppla', anzahl: 1, emoji: '🧤', titel: 'Handschuh verloren', text: 'Jakob hat einen Handschuh verloren. Zieh 3 Felder zurück – dorthin, woher du gekommen bist.' },
  { art: 'hoppla', anzahl: 1, emoji: '😱', titel: 'Oh nein!', text: 'Susi fällt ein: Ein Geschenk fehlt noch! Geh zum Spielzeugladen.' },

  // ---- Miteinander (10) ----
  { art: 'miteinander', anzahl: 2, emoji: '🍪', titel: 'Plätzchen für alle', text: 'Susi verteilt Plätzchen. Alle Figuren dürfen 1 Feld ziehen – in eine Richtung ihrer Wahl.' },
  { art: 'miteinander', anzahl: 2, emoji: '😂', titel: 'Weihnachtswitz', text: 'Erzähl einen Witz! Wer zuerst lacht, darf 2 Felder ziehen.' },
  { art: 'miteinander', anzahl: 2, emoji: '🐧', titel: 'Wintertiere', text: 'Mach ein Wintertier nach (Rentier, Pinguin, Eisbär …). Wer es zuerst errät, darf 2 Felder ziehen – und du auch!' },
  { art: 'miteinander', anzahl: 1, emoji: '💝', titel: 'Wichteln', text: 'Mach jemandem eine Freude: Ein Mitspieler deiner Wahl darf 3 Felder ziehen. Danach würfelst du noch einmal.' },
  { art: 'miteinander', anzahl: 1, emoji: '🎭', titel: 'Pantomime', text: 'Mach ohne Worte vor, was man an Weihnachten tut (Baum schmücken, Plätzchen backen …). Wer es errät, darf 2 Felder ziehen – und du auch!' },
  { art: 'miteinander', anzahl: 1, emoji: '🎵', titel: 'Weihnachtslied', text: 'Alle singen zusammen eine Strophe von Susis Lieblings-Weihnachtslied. Danach dürfen alle Figuren 1 Feld ziehen.' },
  { art: 'miteinander', anzahl: 1, emoji: '✋', titel: 'Frohe Weihnachten!', text: 'Wünsch allen am Tisch frohe Weihnachten – mit High Five! Dann würfle noch einmal.' },

  // ---- Joker – zum Behalten (8) ----
  { art: 'joker', anzahl: 2, emoji: '🛷', titel: 'Susis Schlitten', text: 'Spiel diese Karte nach dem Würfeln: Du ziehst doppelt so weit.' },
  { art: 'joker', anzahl: 2, emoji: '🐷', titel: 'Glücksschwein', text: 'Spiel diese Karte nach dem Würfeln: Würfle noch einmal und nimm das bessere Ergebnis.' },
  { art: 'joker', anzahl: 2, emoji: '🧦', titel: 'Kuschelsocken', text: 'Spiel diese Karte, wenn du eine Hoppla-Karte ziehst: Die Hoppla-Karte gilt nicht.' },
  { art: 'joker', anzahl: 2, emoji: '🏮', titel: 'Laterne', text: 'Spiel diese Karte statt zu würfeln: Zieh 1 bis 6 Felder – so weit du willst.' },
];

// Leere Karten zum Selbstbeschriften (füllen den letzten Bogen auf)
const leereKarten = 5;

module.exports = { titel, titelZeilen, zentrum, kartenName, kartenNameMehrzahl, listenName, widmung, orte, exemplareProDing, suchlisten, figuren, kartenarten, jakobKarten, leereKarten };
