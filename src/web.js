// Erzeugt eine spielbare Web-Version (eine einzige HTML-Datei) in web/index.html.
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
const knoten = []; // {id, x, y, typ, ort?}
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
D.jakobKarten.forEach(k => { for (let i = 0; i < k.anzahl; i++) karten.push({ ...k, aktion: AKTION[k.titel] || { typ: 'manuell' }, bild: hexVon(k.emoji) }); });
const kartenBilder = {};
karten.forEach(k => {
  if (BILDER.karten[k.bild]) kartenBilder[k.bild] = BILDER.karten[k.bild];
  else { const o = D.orte.find(o => hexVon(o.ding.emoji) === k.bild || hexVon(o.emoji) === k.bild); if (o) kartenBilder[k.bild] = BILDER.zutaten[o.id]; }
});

const SPIEL = {
  titel: D.titel, orte: D.orte.map(o => ({ id: o.id, name: o.name, farbe: o.farbe, ding: o.ding.name })),
  figuren: D.figuren.map(f => ({ id: f.id, name: f.name, farbe: f.farbe })), listen: D.suchlisten,
  kartenarten: D.kartenarten, karten, knoten, kanten,
};
const BILD = { brett: BILDER.brett, figuren: BILDER.figuren, zutaten: BILDER.zutaten, orte: BILDER.orte, karten: kartenBilder, susi: BILDER.susi };

const html = `<!doctype html>
<html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${D.titel} – Testversion</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Fredoka:wght@500;600;700&family=Nunito:wght@400;700;800&display=swap" rel="stylesheet">
<style>
:root{--creme:#fbf4e6;--gold:#d4a537;--rot:#c8102e;--tanne:#1f6b4a;--text:#3a3226;--blau:#dfe8f6}
*{box-sizing:border-box}
html,body{margin:0;background:#c9d8ee;color:var(--text);font-family:Nunito,system-ui,sans-serif}
body{min-height:100vh;background:linear-gradient(180deg,#b9cbe8,#e6edf8)}
h1,h2,h3{font-family:'DM Serif Display',serif;font-weight:400;margin:0}
button{font-family:Fredoka,sans-serif;font-weight:600;cursor:pointer;border:0;border-radius:999px;padding:.55em 1.1em;font-size:1rem;background:var(--rot);color:#fff;box-shadow:0 0 0 2px var(--gold)}
button.zweit{background:#fffdf8;color:var(--tanne)}
button:disabled{opacity:.45;cursor:default}
.app{display:grid;grid-template-columns:minmax(0,1fr) 340px;gap:16px;max-width:1300px;margin:0 auto;padding:14px}
@media(max-width:900px){.app{grid-template-columns:1fr}}
.brett{position:relative;width:100%;aspect-ratio:1;border-radius:14px;overflow:hidden;box-shadow:0 0 0 3px var(--gold),0 10px 30px rgba(30,50,90,.3);background:#dfe8f6 center/cover}
.knoten{position:absolute;transform:translate(-50%,-50%);border-radius:50%;pointer-events:none}
.ziel{pointer-events:auto;cursor:pointer;width:7.5%;aspect-ratio:1;border:4px solid #fff;box-shadow:0 0 0 3px var(--rot),0 0 18px 6px rgba(255,220,120,.9);animation:puls 1s infinite alternate}
.ziel.gross{width:13%}
@keyframes puls{from{transform:translate(-50%,-50%) scale(.92)}to{transform:translate(-50%,-50%) scale(1.06)}}
.figur{position:absolute;width:5.4%;aspect-ratio:1;border-radius:50%;transform:translate(-50%,-50%);background:#fff center/cover;border:3px solid var(--f);box-shadow:0 3px 8px rgba(0,0,0,.4);transition:left .35s,top .35s;z-index:5}
.figur.aktiv{box-shadow:0 0 0 3px #fff,0 0 0 6px var(--gold),0 4px 10px rgba(0,0,0,.5);z-index:6}
.figur.waehlbar{cursor:pointer;outline:4px dashed var(--rot);outline-offset:3px}
.seite{display:flex;flex-direction:column;gap:12px}
.panel{background:var(--creme);border-radius:14px;padding:14px;box-shadow:0 0 0 2px var(--gold),0 6px 18px rgba(30,50,90,.18)}
.dran{display:flex;align-items:center;gap:12px}
.dran img{width:64px;height:64px;border-radius:50%;object-fit:cover;box-shadow:0 0 0 3px var(--f)}
.dran h2{font-size:1.6rem;color:var(--tanne)}
.wuerfel{width:72px;height:72px;border-radius:16px;background:#fff;box-shadow:0 0 0 3px var(--gold),0 4px 10px rgba(0,0,0,.2);display:grid;place-items:center;font-family:'DM Serif Display',serif;font-size:2.6rem;color:var(--rot)}
.wuerfel.rollt{animation:rollen .5s}
@keyframes rollen{0%{transform:rotate(0)}100%{transform:rotate(720deg)}}
.zeile{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
.hinweis{font-size:.95rem;line-height:1.4;margin-top:8px;min-height:2.8em}
.liste{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-top:8px}
.liste div{background:#fffdf8;border:2px dashed var(--f);border-radius:10px;padding:4px;text-align:center;font-size:.72rem;font-weight:800;opacity:.55}
.liste div.ok{opacity:1;border-style:solid;background:#fff;box-shadow:0 0 0 2px var(--gold)}
.liste img{width:100%;aspect-ratio:1;object-fit:contain}
.joker{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}
.joker button{font-size:.8rem;padding:.4em .8em;background:#7b3fa0}
.spieler{display:flex;flex-direction:column;gap:6px}
.sp{display:flex;align-items:center;gap:8px;font-size:.9rem}
.sp img{width:30px;height:30px;border-radius:50%;object-fit:cover;box-shadow:0 0 0 2px var(--f)}
.sp .punkte{margin-left:auto;font-weight:800;color:var(--tanne)}
.log{max-height:150px;overflow:auto;font-size:.82rem;line-height:1.4}
.modal{position:fixed;inset:0;background:rgba(20,35,70,.55);display:none;align-items:center;justify-content:center;z-index:50;padding:14px}
.modal.offen{display:flex}
.karte{width:min(340px,92vw);background:linear-gradient(180deg,var(--h),var(--creme) 45%);border-radius:18px;padding:18px;text-align:center;box-shadow:0 0 0 4px var(--gold),inset 0 0 0 3px var(--f),0 20px 50px rgba(0,0,0,.4)}
.karte .art{display:inline-block;background:var(--f);color:#fff;border-radius:999px;padding:.2em 1em;font-family:Fredoka;font-weight:600;letter-spacing:.05em;text-transform:uppercase;font-size:.85rem}
.karte img{width:62%;aspect-ratio:1;object-fit:contain;margin:10px auto;display:block;border-radius:50%;background:radial-gradient(circle,#fff,#eef2f8);box-shadow:0 0 0 4px var(--f),0 0 0 7px var(--gold)}
.karte h3{font-size:1.7rem;color:var(--f)}
.karte p{font-weight:700;line-height:1.4}
.setup{max-width:900px;margin:20px auto;padding:14px}
.kopf{display:flex;gap:18px;align-items:center;background:var(--creme);border-radius:18px;padding:16px;box-shadow:0 0 0 3px var(--gold)}
.kopf img{width:120px;height:120px;border-radius:50%;object-fit:cover;box-shadow:0 0 0 4px var(--gold)}
.kopf h1{font-size:2.2rem;color:var(--tanne);line-height:1}
.kopf h1 span{color:var(--rot)} .kopf h1 i{color:#b8862b;font-size:.75em}
.figwahl{display:grid;grid-template-columns:repeat(auto-fill,minmax(100px,1fr));gap:10px;margin-top:14px}
.fw{background:#fffdf8;border-radius:14px;padding:8px;text-align:center;cursor:pointer;box-shadow:0 0 0 2px #e7cf8f;font-family:Fredoka;font-weight:600}
.fw img{width:100%;aspect-ratio:1;object-fit:cover;border-radius:10px}
.fw.an{box-shadow:0 0 0 4px var(--f),0 0 0 7px var(--gold)}
.fw .nr{display:inline-block;background:var(--rot);color:#fff;border-radius:999px;padding:0 .5em;font-size:.8rem;margin-left:4px}
.ortwahl{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:10px}
.ortwahl button{font-size:.8rem;padding:.4em}
small.grau{color:#7a6a4f}
</style></head><body>
<div id="setup" class="setup"></div>
<div id="spiel" class="app" style="display:none">
  <div><div class="brett" id="brett"></div></div>
  <div class="seite">
    <div class="panel">
      <div class="dran" id="dran"></div>
      <div class="zeile" style="margin-top:10px">
        <div class="wuerfel" id="wuerfel">?</div>
        <button id="btnWuerfeln">Würfeln</button>
        <button class="zweit" id="btnVersetzen" title="Für Miteinander-Karten: eine beliebige Figur auf ein beliebiges Feld setzen">Figur versetzen</button>
      </div>
      <div class="hinweis" id="hinweis"></div>
      <div class="liste" id="liste"></div>
      <div class="joker" id="joker"></div>
    </div>
    <div class="panel"><h3 style="color:var(--tanne)">Spielerinnen &amp; Spieler</h3><div class="spieler" id="spieler" style="margin-top:6px"></div></div>
    <div class="panel"><h3 style="color:var(--tanne)">Verlauf</h3><div class="log" id="log"></div>
      <div class="zeile" style="margin-top:8px"><button class="zweit" id="btnNeu">Neues Spiel</button><button class="zweit" id="btnZugEnde">Zug beenden</button></div></div>
  </div>
</div>
<div class="modal" id="modal"><div id="modalInhalt"></div></div>
<script>
const SPIEL = ${JSON.stringify(SPIEL)};
const BILD = ${JSON.stringify(BILD)};
const $ = s => document.querySelector(s);
const ORT = Object.fromEntries(SPIEL.orte.map(o => [o.id, o]));
const KN = Object.fromEntries(SPIEL.knoten.map(k => [k.id, k]));
const NB = {}; SPIEL.kanten.forEach(([a, b]) => { (NB[a] = NB[a] || []).push(b); (NB[b] = NB[b] || []).push(a); });
const ortKnoten = id => id === 'C' ? 'C' : SPIEL.knoten.find(k => k.ort === id).id;
const mischen = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

let S = null; // Spielzustand
let modus = null; // aktuelle Auswahl: {art, ziele:[{id,pfad}], ...}

// ---------- Aufbau ----------
let wahl = [];
function setupZeigen() {
  $('#spiel').style.display = 'none'; $('#setup').style.display = 'block';
  $('#setup').innerHTML = \`
  <div class="kopf"><img src="\${BILD.susi}"><div><h1><span>Susis</span> <i>perfektes</i><br>Weihnachtsdinner</h1>
  <p style="margin:.5em 0 0">Testversion zum Ausprobieren. Wählt 2–6 Figuren in der Reihenfolge, in der gespielt wird (die jüngste Person zuerst).</p></div></div>
  <div class="panel" style="margin-top:14px"><h2 style="color:var(--tanne)">Wer spielt mit?</h2>
  <div class="figwahl">\${SPIEL.figuren.map(f => \`<div class="fw \${wahl.includes(f.id) ? 'an' : ''}" style="--f:\${f.farbe}" data-id="\${f.id}"><img src="\${BILD.figuren[f.id] || ''}"><div>\${f.name}\${wahl.includes(f.id) ? '<span class="nr">' + (wahl.indexOf(f.id) + 1) + '</span>' : ''}</div></div>\`).join('')}</div>
  <div class="zeile" style="margin-top:14px"><button id="btnStart" \${wahl.length < 2 ? 'disabled' : ''}>Spiel starten (\${wahl.length})</button><small class="grau">Team-Spiel und „Gemeinsam bis Heiligabend“ sind in dieser Testversion nicht automatisiert.</small></div></div>\`;
  document.querySelectorAll('.fw').forEach(el => el.onclick = () => {
    const id = el.dataset.id;
    if (wahl.includes(id)) wahl = wahl.filter(x => x !== id); else if (wahl.length < 6) wahl.push(id);
    setupZeigen();
  });
  $('#btnStart').onclick = start;
}
function start() {
  const listen = mischen(SPIEL.listen);
  S = { sp: wahl.map((id, i) => ({ id, fig: SPIEL.figuren.find(f => f.id === id), pos: 'C', liste: listen[i], hat: [], joker: [], aussetzen: false, letzterPfad: [] })),
        dran: 0, stapel: mischen(SPIEL.karten), wurf: null, phase: 'wuerfeln', gewonnen: null };
  $('#setup').style.display = 'none'; $('#spiel').style.display = 'grid';
  log('Das Spiel beginnt! Alle starten in Susis Weihnachtsküche.');
  zugStart();
}

// ---------- Bewegung ----------
function ziele(start, n, ausschluss = null) {
  const res = new Map();
  (function lauf(k, prev, rest, pfad) {
    if (rest === 0) { if (!res.has(k)) res.set(k, pfad); return; }
    for (const nb of NB[k]) { if (nb === prev || nb === ausschluss) continue; lauf(nb, k, rest - 1, pfad.concat(nb)); }
  })(start, null, n, [start]);
  return [...res].map(([id, pfad]) => ({ id, pfad }));
}
function zieleBis6(start) { const m = new Map(); for (let n = 1; n <= 6; n++) ziele(start, n).forEach(z => { if (!m.has(z.id)) m.set(z.id, z); }); return [...m.values()]; }

function aktuell() { return S.sp[S.dran]; }
function zugStart() {
  modus = null;
  const p = aktuell();
  if (p.aussetzen) { p.aussetzen = false; log(p.fig.name + ' setzt diesmal aus.'); return naechster(); }
  S.phase = 'wuerfeln'; S.wurf = null; S.jokerGenutzt = null;
  hinweis('Würfle! Danach wählst du ein leuchtendes Feld – die Richtung darfst du selbst bestimmen.');
  zeichnen();
}
function wuerfeln(ext) {
  const w = ext || 1 + Math.floor(Math.random() * 6);
  const el = $('#wuerfel'); el.classList.remove('rollt'); void el.offsetWidth; el.classList.add('rollt'); el.textContent = w;
  S.wurf = w; S.phase = 'ziehen';
  log(aktuell().fig.name + ' würfelt eine ' + w + '.');
  zielauswahl(ziele(aktuell().pos, w), { quelle: 'wuerfel' });
}
function zielauswahl(z, extra) {
  if (!z.length) { hinweis('Kein Feld erreichbar.'); return naechster(); }
  modus = { art: 'ziel', ziele: z, ...extra };
  hinweis(extra.text || 'Wähle ein leuchtendes Feld.');
  zeichnen();
}
function bewegen(ziel, pfad, quelle) {
  const p = aktuell();
  p.pos = ziel; if (pfad) p.letzterPfad = pfad;
  modus = null; zeichnen();
  setTimeout(() => ankunft(p, quelle), 380);
}
function ankunft(p, quelle) {
  const k = KN[p.pos];
  if (k.typ === 'ort') sammeln(p, k.ort);
  if (k.typ === 'kueche' && p.hat.length === p.liste.length) return sieg(p);
  if (k.typ === 'stern' && quelle === 'wuerfel') return karteZiehen(p);
  if (S.nochmal) { S.nochmal = false; log(p.fig.name + ' darf noch einmal würfeln.'); return zugStart(); }
  naechster();
}
function sammeln(p, ortId) {
  if (p.liste.includes(ortId) && !p.hat.includes(ortId)) {
    p.hat.push(ortId); log('🎉 ' + p.fig.name + ' findet: ' + ORT[ortId].ding + '!');
    if (p.hat.length === p.liste.length) log(p.fig.name + ' hat alles – jetzt genau in die Küche!');
  }
}
function naechster() { if (S.gewonnen) return; S.dran = (S.dran + 1) % S.sp.length; zugStart(); }

// ---------- Karten ----------
function karteZiehen(p) {
  if (!S.stapel.length) S.stapel = mischen(SPIEL.karten);
  const k = S.stapel.shift();
  const art = SPIEL.kartenarten[k.art];
  const istHoppla = k.art === 'hoppla';
  const schutz = istHoppla && p.joker.find(j => j.aktion.joker === 'schutz');
  log(p.fig.name + ' zieht „' + k.titel + '“.');
  zeigeKarte(k, art, [
    ...(schutz ? [['Kuschelsocken spielen (Karte gilt nicht)', () => { p.joker.splice(p.joker.indexOf(schutz), 1); S.stapel.push(schutz, k); log(p.fig.name + ' spielt die Kuschelsocken.'); zu(); naechster(); }]] : []),
    [k.aktion.typ === 'joker' ? 'Behalten' : 'Ausführen', () => { zu(); ausfuehren(p, k); }],
  ]);
}
function zeigeKarte(k, art, knoepfe) {
  $('#modalInhalt').innerHTML = \`<div class="karte" style="--f:\${art.farbe};--h:\${art.hell}"><span class="art">\${art.name}</span>
    \${BILD.karten[k.bild] ? '<img src="' + BILD.karten[k.bild] + '">' : ''}<h3>\${k.titel}</h3><p>\${k.text}</p>
    <div class="zeile" style="justify-content:center" id="kk"></div></div>\`;
  knoepfe.forEach(([t, f]) => { const b = document.createElement('button'); b.textContent = t; b.onclick = f; $('#kk').appendChild(b); });
  $('#modal').classList.add('offen');
}
function zu() { $('#modal').classList.remove('offen'); }
function ausfuehren(p, k) {
  const a = k.aktion;
  const danach = () => { if (a.dann === 'nochmal') S.nochmal = true; };
  switch (a.typ) {
    case 'nochmal': S.nochmal = true; return ankunftOhneKarte(p);
    case 'ortwahl': return zielauswahl(SPIEL.orte.map(o => ({ id: ortKnoten(o.id), pfad: null })), { quelle: 'karte', text: 'Wähle einen beliebigen Ort.' });
    case 'frei': return zielauswahl(zieleBis6(p.pos), { quelle: 'karte', text: 'Zieh 1 bis 6 Felder – wähle ein Feld.' });
    case 'schritte': return zielauswahl(ziele(p.pos, a.n), { quelle: 'karte', text: 'Zieh ' + a.n + ' Felder.' });
    case 'gefunden': {
      const fehlt = p.liste.filter(o => !p.hat.includes(o));
      if (!fehlt.length) { log('Es fehlt nichts mehr.'); return naechster(); }
      return ortAuswahlDialog('Welche Zutat nimmst du?', fehlt, id => { sammeln(p, id); zeichnen(); naechster(); });
    }
    case 'gehzu': danach(); return bewegen(ortKnoten(a.ziel), null, 'karte');
    case 'aussetzen': p.aussetzen = true; return naechster();
    case 'zurueck': {
      const pf = p.letzterPfad || [];
      const ziel = pf.length > a.n ? pf[pf.length - 1 - a.n] : (pf[0] || p.pos);
      return bewegen(ziel, null, 'karte');
    }
    case 'huckepack': {
      const andere = S.sp.filter(x => x !== p);
      modus = { art: 'figur', text: 'Klicke auf die Figur, zu der du Huckepack willst.', wahl: andere, fertig: x => bewegen(x.pos, null, 'karte') };
      hinweis(modus.text); return zeichnen();
    }
    case 'joker':
      if (p.joker.length >= 2) { log('Du hast schon 2 Joker – die Karte kommt unter den Stapel.'); S.stapel.push(k); }
      else { p.joker.push(k); log(p.fig.name + ' behält „' + k.titel + '“.'); }
      return naechster();
    default: // manuell (Miteinander-Karten)
      danach();
      hinweis('Macht, was auf der Karte steht. Mit „Figur versetzen“ könnt ihr Figuren bewegen. Danach „Zug beenden“.');
      S.phase = 'manuell'; return zeichnen();
  }
}
function ankunftOhneKarte(p) { if (S.nochmal) { S.nochmal = false; log(p.fig.name + ' darf noch einmal würfeln.'); return zugStart(); } naechster(); }
function ortAuswahlDialog(text, ids, f) {
  $('#modalInhalt').innerHTML = \`<div class="karte" style="--f:var(--tanne);--h:#fff"><h3>\${text}</h3><div class="ortwahl" id="ow"></div></div>\`;
  ids.forEach(id => { const b = document.createElement('button'); b.textContent = ORT[id].ding; b.onclick = () => { zu(); f(id); }; $('#ow').appendChild(b); });
  $('#modal').classList.add('offen');
}
function jokerSpielen(j) {
  const p = aktuell(), t = j.aktion.joker;
  const weg = () => { p.joker.splice(p.joker.indexOf(j), 1); S.stapel.push(j); log(p.fig.name + ' spielt „' + j.titel + '“.'); };
  if (t === 'kompass' && S.phase === 'wuerfeln') { weg(); S.phase = 'ziehen'; return zielauswahl(zieleBis6(p.pos), { quelle: 'joker', text: 'Laterne: Zieh 1 bis 6 Felder.' }); }
  if (t === 'doppelt' && S.phase === 'ziehen' && S.wurf) { weg(); S.wurf *= 2; $('#wuerfel').textContent = S.wurf; return zielauswahl(ziele(p.pos, S.wurf), { quelle: 'wuerfel', text: 'Doppelt so weit: ' + S.wurf + ' Felder.' }); }
  if (t === 'besser' && S.phase === 'ziehen' && S.wurf) {
    weg(); const neu = 1 + Math.floor(Math.random() * 6);
    $('#modalInhalt').innerHTML = \`<div class="karte" style="--f:#7b3fa0;--h:#f3e5f5"><h3>Glücksschwein</h3><p>Erster Wurf: \${S.wurf} · Neuer Wurf: \${neu}</p><div class="zeile" style="justify-content:center" id="kk"></div></div>\`;
    [S.wurf, neu].forEach(w => { const b = document.createElement('button'); b.textContent = w + ' nehmen'; b.onclick = () => { zu(); S.wurf = w; $('#wuerfel').textContent = w; zielauswahl(ziele(p.pos, w), { quelle: 'wuerfel' }); }; $('#kk').appendChild(b); });
    return $('#modal').classList.add('offen');
  }
  hinweis(t === 'schutz' ? 'Die Kuschelsocken werden automatisch angeboten, wenn du eine Hoppla-Karte ziehst.' : (t === 'kompass' ? 'Die Laterne spielst du statt zu würfeln.' : 'Diesen Joker spielst du nach dem Würfeln.'));
}
function sieg(p) {
  S.gewonnen = p; log('🏆 ' + p.fig.name + ' ist zurück in der Küche und gewinnt!');
  $('#modalInhalt').innerHTML = \`<div class="karte" style="--f:var(--rot);--h:#fff6f2"><span class="art">Gewonnen!</span><img src="\${BILD.figuren[p.id] || BILD.susi}" style="object-fit:cover"><h3>\${p.fig.name}</h3><p>ist Susis Chef-Gehilfe oder Chef-Gehilfin! Das perfekte Weihnachtsdinner kann beginnen. 🎄</p><div class="zeile" style="justify-content:center"><button onclick="zu()">Schließen</button></div></div>\`;
  $('#modal').classList.add('offen'); zeichnen();
}

// ---------- Darstellung ----------
function hinweis(t) { $('#hinweis').textContent = t; }
function log(t) { const d = document.createElement('div'); d.textContent = t; $('#log').prepend(d); }
function zeichnen() {
  const p = aktuell(), b = $('#brett');
  b.style.backgroundImage = 'url(' + BILD.brett + ')';
  b.innerHTML = '';
  if (modus && modus.art === 'ziel') modus.ziele.forEach(z => {
    const k = KN[z.id], d = document.createElement('div');
    d.className = 'knoten ziel' + (k.typ !== 'feld' && k.typ !== 'stern' ? ' gross' : '');
    d.style.left = k.x / 4 + '%'; d.style.top = k.y / 4 + '%';
    d.onclick = () => bewegen(z.id, z.pfad, modus.quelle);
    b.appendChild(d);
  });
  const proKnoten = {};
  S.sp.forEach(x => (proKnoten[x.pos] = proKnoten[x.pos] || []).push(x));
  Object.entries(proKnoten).forEach(([id, liste]) => liste.forEach((x, i) => {
    const k = KN[id], n = liste.length, wink = (i / n) * Math.PI * 2, r = n > 1 ? 2.2 : 0;
    const d = document.createElement('div');
    d.className = 'figur' + (x === p ? ' aktiv' : '') + ((modus && modus.art === 'figur' && modus.wahl.includes(x)) || (modus && modus.art === 'versetzen' && !modus.figur) ? ' waehlbar' : '');
    d.style.setProperty('--f', x.fig.farbe); d.style.backgroundImage = 'url(' + (BILD.figuren[x.id] || '') + ')';
    d.style.left = k.x / 4 + Math.cos(wink) * r + '%'; d.style.top = k.y / 4 + Math.sin(wink) * r + '%';
    d.title = x.fig.name;
    d.onclick = () => {
      if (modus && modus.art === 'figur' && modus.wahl.includes(x)) { const f = modus.fertig; modus = null; f(x); }
      else if (modus && modus.art === 'versetzen' && !modus.figur) { modus.figur = x; hinweis('Jetzt das Zielfeld für ' + x.fig.name + ' anklicken.'); versetzenZiele(); }
    };
    b.appendChild(d);
  }));
  $('#dran').innerHTML = \`<img src="\${BILD.figuren[p.id] || ''}" style="--f:\${p.fig.farbe}"><div><small class="grau">Am Zug</small><h2>\${p.fig.name}</h2></div>\`;
  $('#liste').innerHTML = p.liste.map(o => \`<div class="\${p.hat.includes(o) ? 'ok' : ''}" style="--f:\${ORT[o].farbe}"><img src="\${BILD.zutaten[o]}">\${ORT[o].ding}</div>\`).join('');
  $('#joker').innerHTML = '';
  p.joker.forEach(j => { const bt = document.createElement('button'); bt.textContent = '🃏 ' + j.titel; bt.onclick = () => jokerSpielen(j); $('#joker').appendChild(bt); });
  $('#spieler').innerHTML = S.sp.map(x => \`<div class="sp" style="--f:\${x.fig.farbe}"><img src="\${BILD.figuren[x.id] || ''}"><span>\${x === p ? '<b>' + x.fig.name + '</b>' : x.fig.name}\${x.aussetzen ? ' (setzt aus)' : ''}</span><span class="punkte">\${x.hat.length}/\${x.liste.length}</span></div>\`).join('');
  $('#btnWuerfeln').disabled = S.phase !== 'wuerfeln' || !!S.gewonnen;
}
function versetzenZiele() {
  modus.art = 'ziel'; modus.quelle = 'versetzen';
  modus.ziele = SPIEL.knoten.map(k => ({ id: k.id, pfad: null }));
  const fig = modus.figur;
  zeichnen();
  document.querySelectorAll('.ziel').forEach((el, i) => el.onclick = () => {
    const id = SPIEL.knoten[i].id; fig.pos = id; modus = null;
    if (KN[id].typ === 'ort') sammeln(fig, KN[id].ort);
    log(fig.fig.name + ' wird versetzt.');
    modus = S.vorher || null; S.vorher = null;
    hinweis('Fertig? Dann weiterspielen oder „Zug beenden“.'); zeichnen();
  });
}
$('#btnWuerfeln').onclick = () => wuerfeln();
$('#btnVersetzen').onclick = () => { S.vorher = modus && modus.art === 'ziel' ? modus : null; modus = { art: 'versetzen' }; hinweis('Klicke auf die Figur, die du versetzen möchtest.'); zeichnen(); };
$('#btnZugEnde').onclick = () => { if (S.gewonnen) return; modus = null; if (S.nochmal) { S.nochmal = false; return zugStart(); } naechster(); };
$('#btnNeu').onclick = () => { if (confirm('Neues Spiel starten?')) { wahl = []; $('#log').innerHTML = ''; setupZeigen(); } };
$('#modal').onclick = e => { if (e.target.id === 'modal' && S && S.gewonnen) zu(); };
setupZeigen();
</script></body></html>`;

fs.writeFileSync(path.join(OUT, 'index.html'), html);
console.log('✔ web/index.html', (fs.statSync(path.join(OUT, 'index.html')).size / 1e6).toFixed(2), 'MB');
