// Erzeugt die spielbare Web-Version (eine einzige HTML-Datei) in web/index.html.
// Aufruf: npm run web   (vorher einmal npm run build, damit das Spielbrett-PNG existiert)
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const D = require('./daten');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'web');
fs.mkdirSync(OUT, { recursive: true });
const tmp = path.join(ROOT, 'build', 'webassets.json');
fs.mkdirSync(path.dirname(tmp), { recursive: true });
execFileSync('python3', ['-I', path.join(ROOT, 'tools/web_assets.py'), tmp], { stdio: 'inherit' });
const BILDER = JSON.parse(fs.readFileSync(tmp, 'utf8'));

// ---- Spielplan-Geometrie (gleiche Werte wie im Druck, Koordinaten 0..400) ----
const C = { x: 200, y: 200 }, R_ORT = 25, R_ZIMMER = 40;
const lo = 35, hi = 365, mi = 200;
const ortPos = [[lo, lo], [mi, lo], [hi, lo], [hi, mi], [hi, hi], [mi, hi], [lo, hi], [lo, mi]];
const knoten = [];
const kanten = [];
D.orte.forEach((o, i) => {
  const [x, y] = ortPos[i], [nx, ny] = ortPos[(i + 1) % 8];
  knoten.push({ id: 'r' + i * 4, x, y, typ: 'ort', ort: o.id });
  for (let k = 1; k <= 3; k++) knoten.push({ id: 'r' + (i * 4 + k), x: x + ((nx - x) * k) / 4, y: y + ((ny - y) * k) / 4, typ: k === 2 ? 'stern' : 'feld' });
});
for (let i = 0; i < 32; i++) kanten.push(['r' + i, 'r' + ((i + 1) % 32)]);
knoten.push({ id: 'C', x: C.x, y: C.y, typ: 'kueche' });
D.orte.forEach((o, i) => {
  if (!o.mitte) return;
  const [x, y] = ortPos[i];
  const dx = C.x - x, dy = C.y - y, len = Math.hypot(dx, dy), ux = dx / len, uy = dy / len, frei = len - R_ORT - R_ZIMMER;
  const a = { id: 's' + i + 'a', x: x + ux * (R_ORT + frei / 3), y: y + uy * (R_ORT + frei / 3), typ: 'feld' };
  const b = { id: 's' + i + 'b', x: x + ux * (R_ORT + (2 * frei) / 3), y: y + uy * (R_ORT + (2 * frei) / 3), typ: 'feld' };
  knoten.push(a, b);
  kanten.push(['r' + i * 4, a.id], [a.id, b.id], [b.id, 'C']);
});

// ---- Kartenaktionen (nach Kartentitel) ----
const AKTION = {
  'Rentier-Express': { typ: 'ortwahl' }, 'Glitzerschnee': { typ: 'nochmal' }, 'Auf Skiern': { typ: 'frei' },
  'Wichtel-Hilfe': { typ: 'gefunden' }, 'Hohoho!': { typ: 'gehzu', ziel: 'christkindlmarkt', dann: 'nochmal' },
  'Kostprobe!': { typ: 'gehzu', ziel: 'C' }, 'Schlitterpartie': { typ: 'schritte', n: 6 }, 'Huckepack': { typ: 'huckepack' },
  'Kipferl-Duft': { typ: 'gehzu', ziel: 'baeckerei' }, 'Einladungen': { typ: 'gehzu', ziel: 'postamt' },
  'Autsch, heiß!': { typ: 'aussetzen' }, 'Schneegestöber': { typ: 'zurueck', n: 2 }, 'Hühner füttern': { typ: 'gehzu', ziel: 'huehner' },
  'Chorprobe': { typ: 'gehzu', ziel: 'kirche' }, 'Karussell': { typ: 'gehzu', ziel: 'christkindlmarkt' },
  'Heiße Maroni!': { typ: 'gehzu', ziel: 'maronistand' }, 'Handschuh verloren': { typ: 'zurueck', n: 3 }, 'Oh nein!': { typ: 'gehzu', ziel: 'bauernhof' },
  'Wichteln': { typ: 'manuell', dann: 'nochmal' }, 'Lieblingsessen': { typ: 'nochmal' },
  'Susis Schlitten': { typ: 'joker', joker: 'doppelt' }, 'Glücksschwein': { typ: 'joker', joker: 'besser' },
  'Kuschelsocken': { typ: 'joker', joker: 'schutz' }, 'Laterne': { typ: 'joker', joker: 'kompass' },
};
const hexVon = e => [...e].filter(c => c.codePointAt(0) !== 0xfe0f).map(c => c.codePointAt(0).toString(16)).join('-');
const karten = [];
let kid = 0;
D.jakobKarten.forEach(k => { for (let i = 0; i < k.anzahl; i++) karten.push({ nr: kid++, art: k.art, titel: k.titel, text: k.text, aktion: AKTION[k.titel] || { typ: 'manuell' }, bild: hexVon(k.emoji) }); });
const kartenBilder = {};
karten.forEach(k => {
  if (BILDER.karten[k.bild]) kartenBilder[k.bild] = BILDER.karten[k.bild];
  else { const o = D.orte.find(o => hexVon(o.ding.emoji) === k.bild || hexVon(o.emoji) === k.bild); if (o) kartenBilder[k.bild] = BILDER.zutaten[o.id]; }
});

const SPIEL = {
  titel: D.titel, orte: D.orte.map(o => ({ id: o.id, name: o.name, farbe: o.farbe, ding: o.ding.name })),
  figuren: D.figuren.map(f => ({ id: f.id, name: f.name, farbe: f.farbe })), listen: D.suchlisten,
  kartenarten: D.kartenarten, karten, knoten, kanten, zentrum: D.zentrum.name,
};
const BILD = { winter: BILDER.winter, brett: BILDER.brett, figuren: BILDER.figuren, zutaten: BILDER.zutaten, karten: kartenBilder, susi: BILDER.susi };

const CSS = fs.readFileSync(path.join(__dirname, 'web', 'stil.css'), 'utf8');
const JS = fs.readFileSync(path.join(__dirname, 'web', 'spiel.js'), 'utf8');

const html = `<!doctype html>
<html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${D.titel}</title>
<meta name="description" content="Das Familien-Weihnachtsspiel – online spielen">
<meta name="theme-color" content="#1f6b4a">
<link rel="icon" href="${BILDER.zutaten.maronistand}">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Fredoka:wght@500;600;700&family=Nunito:wght@400;700;800&display=swap" rel="stylesheet">
<style>${CSS}</style></head><body>
<div id="app"></div>
<div class="modal" id="modal"><div id="modalInhalt"></div></div>
<div class="toast" id="toast"></div>
<canvas id="konfetti"></canvas>
<script>
const SPIEL = ${JSON.stringify(SPIEL)};
const BILD = ${JSON.stringify(BILD)};
${JS}
</script></body></html>`;

fs.writeFileSync(path.join(OUT, 'index.html'), html);
console.log('✔ web/index.html', (fs.statSync(path.join(OUT, 'index.html')).size / 1e6).toFixed(2), 'MB');
