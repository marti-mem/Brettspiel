// Alle Inhalte des Spiels an einem Ort – hier kann man Texte, Namen und Farben ändern.
// Danach `npm run build` ausführen, um die Druck-PDFs neu zu erzeugen.

const titel = 'Susis Weihnachtsdinner';
const titelZeilen = ['Susis', 'Weihnachts-', 'dinner'];
const untertitel = 'Das perfekte Weihnachtsessen'; // so steht der Titel auf dem Spielplan
const zentrum = { name: 'Susis Weihnachtsküche', kurz: ['Susis', 'Weihnachtsküche'], emoji: '🏡', deko: '🍛' };
const kartenName = 'Wichtel-Karte';
const kartenNameMehrzahl = 'Wichtel-Karten';
const listenName = 'Einkaufsliste';

// Widmung auf dem Schachteldeckel (leer lassen = keine Widmung)
const widmung = 'Für Susi – Frohe Weihnachten 2026! Dein Wichtel';

// Die 8 Orte im Uhrzeigersinn, beginnend oben links.
// `mitte: true` = von hier führt ein Weg direkt in Susis Weihnachtsküche.
const orte = [
  { id: 'tannenwald',  name: 'Tannenwald',  emoji: '🌲',  farbe: '#1b5e20', mitte: false, ding: { name: 'Pilze',        emoji: '🍄' } },
  { id: 'baeckerei',   name: 'Bäckerei',    emoji: '🥨', farbe: '#b26a00', mitte: true,  ding: { name: 'Naan-Brot',    emoji: '🫓' } },
  { id: 'postamt',     name: 'Postamt',     emoji: '📮',  farbe: '#c62828', mitte: false, ding: { name: 'Gewürze',      emoji: '🌶️' } },
  { id: 'markt',       name: 'Gemüsemarkt', emoji: '🧺',  farbe: '#6a1b9a', mitte: true,  ding: { name: 'Erdäpfel',     emoji: '🥔' } },
  { id: 'bauernhof',   name: 'Bauernhof',   emoji: '🐓',  farbe: '#6d4c41', mitte: false, ding: { name: 'Milch',        emoji: '🥛' } },
  { id: 'kirche',      name: 'Kirche',      emoji: '⛪',  farbe: '#ad1457', mitte: true,  ding: { name: 'Kerze',        emoji: '🕯️' } },
  { id: 'schneemann',  name: 'Schneewiese', emoji: '☃️',  farbe: '#0277bd', mitte: false, ding: { name: 'Karotte',      emoji: '🥕' } },
  { id: 'almhuette',   name: 'Almhütte',    emoji: '🛖',  farbe: '#00838f', mitte: true,  ding: { name: 'Käse',         emoji: '🧀' } },
];

// Exemplare pro Gegenstand (jeder Gegenstand steht auf 6 der 12 Listen)
const exemplareProDing = 6;

// 12 Einkaufslisten: jede hat 2 Orte mit Weg zur Mitte + 2 Eck-Orte (gleich schwer).
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
  { art: 'glueck', anzahl: 1, emoji: '🧝', titel: 'Wichtel-Hilfe', text: 'Ein Wichtel hat eine Zutat für Susi gefunden! Nimm dir eine Sache von deiner Einkaufsliste aus dem Vorrat.' },
  { art: 'glueck', anzahl: 1, emoji: '🎅', titel: 'Hohoho!', text: 'Der Weihnachtsmann nimmt dich auf seinem Schlitten mit. Stell deine Figur auf die Almhütte. Dann würfle noch einmal.' },
  { art: 'glueck', anzahl: 2, emoji: '🥄', titel: 'Kostprobe!', text: 'Susi ruft: „Kommt probieren!“ Stell deine Figur in Susis Weihnachtsküche.' },
  { art: 'glueck', anzahl: 1, emoji: '⛸️', titel: 'Schlitterpartie', text: 'Huiii, über das Eis! Zieh 6 Felder weit.' },
  { art: 'glueck', anzahl: 1, emoji: '🤗', titel: 'Huckepack', text: 'Susi nimmt dich Huckepack. Stell deine Figur auf das Feld einer anderen Figur deiner Wahl.' },

  // ---- Hoppla (10) ----
  { art: 'hoppla', anzahl: 1, emoji: '🫓', titel: 'Duft von Naan', text: 'Susi riecht frisch gebackenes Naan-Brot. Geh zur Bäckerei.' },
  { art: 'hoppla', anzahl: 1, emoji: '✉️', titel: 'Einladungen', text: 'Susi hat vergessen, die Einladungen zum Dinner abzuschicken. Geh zum Postamt.' },
  { art: 'hoppla', anzahl: 1, emoji: '🥵', titel: 'Zu scharf!', text: 'Huch, das Curry ist zu scharf! Du trinkst erst ein Glas Lassi und setzt beim nächsten Mal aus.' },
  { art: 'hoppla', anzahl: 1, emoji: '🌨️', titel: 'Schneegestöber', text: 'Du siehst nichts mehr! Zieh 2 Felder zurück – dorthin, woher du gekommen bist.' },
  { art: 'hoppla', anzahl: 1, emoji: '⛄', titel: 'Schneemann bauen', text: 'Jakob will unbedingt einen Schneemann bauen. Geh zur Schneewiese.' },
  { art: 'hoppla', anzahl: 1, emoji: '🎶', titel: 'Chorprobe', text: 'Susi möchte noch kurz bei der Chorprobe zuhören, während das Curry köchelt. Geh zur Kirche.' },
  { art: 'hoppla', anzahl: 1, emoji: '🛷', titel: 'Rodelpartie', text: 'Jakob will unbedingt noch rodeln. Geh zur Almhütte.' },
  { art: 'hoppla', anzahl: 1, emoji: '🌲', titel: 'Tischdeko', text: 'Susi möchte noch Tannenzweige für den festlichen Tisch. Geh zum Tannenwald.' },
  { art: 'hoppla', anzahl: 1, emoji: '🧤', titel: 'Handschuh verloren', text: 'Jakob hat einen Handschuh verloren. Zieh 3 Felder zurück – dorthin, woher du gekommen bist.' },
  { art: 'hoppla', anzahl: 1, emoji: '😱', titel: 'Oh nein!', text: 'Susi zählt nach: Die Erdäpfel reichen nicht für alle! Geh zum Gemüsemarkt.' },

  // ---- Miteinander (10) ----
  { art: 'miteinander', anzahl: 2, emoji: '🥟', titel: 'Momos für alle', text: 'Susi verteilt frische Momos zum Kosten. Alle Figuren dürfen 1 Feld ziehen – in eine Richtung ihrer Wahl.' },
  { art: 'miteinander', anzahl: 2, emoji: '😂', titel: 'Weihnachtswitz', text: 'Erzähl einen Witz! Wer zuerst lacht, darf 2 Felder ziehen.' },
  { art: 'miteinander', anzahl: 2, emoji: '🐧', titel: 'Wintertiere', text: 'Mach ein Wintertier nach (Rentier, Pinguin, Eisbär …). Wer es zuerst errät, darf 2 Felder ziehen – und du auch!' },
  { art: 'miteinander', anzahl: 1, emoji: '💝', titel: 'Wichteln', text: 'Mach jemandem eine Freude: Ein Mitspieler deiner Wahl darf 3 Felder ziehen. Danach würfelst du noch einmal.' },
  { art: 'miteinander', anzahl: 1, emoji: '🎭', titel: 'Pantomime', text: 'Mach ohne Worte vor, was man in der Küche tut (rühren, schnippeln, abschmecken …). Wer es errät, darf 2 Felder ziehen – und du auch!' },
  { art: 'miteinander', anzahl: 1, emoji: '🎵', titel: 'Weihnachtslied', text: 'Alle singen zusammen eine Strophe von Susis Lieblings-Weihnachtslied. Danach dürfen alle Figuren 1 Feld ziehen.' },
  { art: 'miteinander', anzahl: 1, emoji: '👩‍🍳', titel: 'Lieblingsessen', text: 'Alle verraten reihum ihr liebstes Weihnachtsessen. Danach darfst du noch einmal würfeln.' },

  // ---- Joker – zum Behalten (8) ----
  { art: 'joker', anzahl: 2, emoji: '🛷', titel: 'Susis Schlitten', text: 'Spiel diese Karte nach dem Würfeln: Du ziehst doppelt so weit.' },
  { art: 'joker', anzahl: 2, emoji: '🐷', titel: 'Glücksschwein', text: 'Spiel diese Karte nach dem Würfeln: Würfle noch einmal und nimm das bessere Ergebnis.' },
  { art: 'joker', anzahl: 2, emoji: '🧦', titel: 'Kuschelsocken', text: 'Spiel diese Karte, wenn du eine Hoppla-Karte ziehst: Die Hoppla-Karte gilt nicht.' },
  { art: 'joker', anzahl: 2, emoji: '🏮', titel: 'Laterne', text: 'Spiel diese Karte statt zu würfeln: Zieh 1 bis 6 Felder – so weit du willst.' },
];

// Leere Karten zum Selbstbeschriften (füllen den letzten Bogen auf)
const leereKarten = 5;

module.exports = { titel, titelZeilen, untertitel, zentrum, kartenName, kartenNameMehrzahl, listenName, widmung, orte, exemplareProDing, suchlisten, figuren, kartenarten, jakobKarten, leereKarten };
