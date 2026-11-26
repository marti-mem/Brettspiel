/* Susis perfektes Weihnachtsdinner – Spiellogik der Web-Version */
const $ = s => document.querySelector(s);
const ORT = Object.fromEntries(SPIEL.orte.map(o => [o.id, o]));
const KN = Object.fromEntries(SPIEL.knoten.map(k => [k.id, k]));
const FIG = Object.fromEntries(SPIEL.figuren.map(f => [f.id, f]));
const KARTE = Object.fromEntries(SPIEL.karten.map(k => [k.nr, k]));
const NB = {};
SPIEL.kanten.forEach(([a, b]) => { (NB[a] = NB[a] || []).push(b); (NB[b] = NB[b] || []).push(a); });
const ortKnoten = id => (id === 'C' ? 'C' : SPIEL.knoten.find(k => k.ort === id).id);
const mischen = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const warte = ms => new Promise(r => setTimeout(r, ms));
const SPEICHER = 'susisWeihnachtsdinner.v1';

let S = null;       // Spielzustand (wird gespeichert)
let modus = null;   // aktuelle Auswahl auf dem Brett
let beschaeftigt = false;

// ======================================================================
// Startbildschirm
// ======================================================================
const ARTEN = {
  klassisch: { name: 'Klassisch', text: 'Jede Person spielt für sich. Wer zuerst alle Zutaten in Susis Küche bringt, gewinnt.', min: 2, max: 6 },
  team: { name: 'Team-Spiel', text: 'Zweier-Teams (bei ungerader Zahl ein Dreier-Team) mit gemeinsamer Einkaufsliste. Ideal für 7–10 Personen.', min: 4, max: 10 },
  gemeinsam: { name: 'Gemeinsam bis Heiligabend', text: 'Alle gegen den Adventskalender: Schafft ihr es, bevor Türchen 24 erreicht ist?', min: 2, max: 6 },
};
let wahl = { art: 'klassisch', figuren: [], kleine: false, start: 8 };

function gespeichert() { try { const s = JSON.parse(localStorage.getItem(SPEICHER)); return s && !s.ende ? s : null; } catch (e) { return null; } }
function speichern() { try { localStorage.setItem(SPEICHER, JSON.stringify(S)); } catch (e) { /* privat */ } }

function startbild() {
  S = null; modus = null;
  document.body.style.setProperty('--f', '#1f6b4a');
  const alt = gespeichert();
  const A = ARTEN[wahl.art];
  const teams = wahl.art === 'team' ? teamsBilden(wahl.figuren) : null;
  $('#app').innerHTML = `
  <div class="start">
    <div class="kopf" style="background-image:url(${BILD.winter})">
      <div class="susi" style="background-image:url(${BILD.susi})"></div>
      <div class="karte2"><h1><span>Susis</span> <i>perfektes</i><br>Weihnachtsdinner</h1>
      <p>Susi will das perfekte Weihnachtsdinner kochen – doch es fehlen noch Zutaten! Helft beim Einkaufen im Weihnachtsdorf und bringt alles von eurer Einkaufsliste zurück in Susis Küche.</p>
      ${alt ? '<div class="startzeile" style="margin-top:10px"><button class="gruen" id="weiter">▶ Gespeichertes Spiel fortsetzen</button></div>' : ''}</div>
    </div>
    <div class="panel schritt"><h3>1. Wie wollt ihr spielen?</h3>
      <div class="arten">${Object.entries(ARTEN).map(([k, a]) => `<div class="artk ${wahl.art === k ? 'an' : ''}" data-art="${k}"><h3>${a.name}</h3><p>${a.text}</p><p class="grau">${a.min}–${a.max} Personen</p></div>`).join('')}</div>
      <div class="optionen">
        <label><input type="checkbox" id="kleine" ${wahl.kleine ? 'checked' : ''}> Für die Kleinsten (Vorbeiziehen reicht, Küche nicht genau)</label>
        ${wahl.art === 'gemeinsam' ? `<label>Start-Türchen <select id="startTuer">${[[1, 'leicht'], [8, 'mittel'], [12, 'schwer']].map(([n, t]) => `<option value="${n}" ${wahl.start === n ? 'selected' : ''}>${n} (${t})</option>`).join('')}</select></label>` : ''}
      </div>
    </div>
    <div class="panel schritt"><h3>2. Wer spielt mit?</h3>
      <p class="grau" style="margin:0">Tippt die Figuren in der Reihenfolge an, in der gespielt wird – die jüngste Person zuerst.${wahl.art === 'team' ? ' Je zwei hintereinander bilden ein Team.' : ''}</p>
      <div class="figwahl">${SPIEL.figuren.map(f => { const n = wahl.figuren.indexOf(f.id); return `<div class="fw ${n >= 0 ? 'an' : ''}" style="--ff:${f.farbe}" data-id="${f.id}">${n >= 0 ? `<span class="nr">${n + 1}</span>` : ''}<img src="${BILD.figuren[f.id] || ''}" alt=""><div>${f.name}</div></div>`; }).join('')}</div>
      ${teams ? `<div class="teams">${teams.map((t, i) => `<span>Team ${i + 1}: ${t.map(id => FIG[id].name).join(' & ')}</span>`).join('')}</div>` : ''}
      <div class="startzeile"><button id="los" ${wahl.figuren.length < A.min ? 'disabled' : ''}>Los geht's! 🎄</button>
      <span class="grau">${wahl.figuren.length} ausgewählt · ${A.min}–${A.max} möglich</span>
      <button class="zweit" id="regelnStart">Spielregel</button></div>
    </div>
  </div>`;
  document.querySelectorAll('.artk').forEach(el => el.onclick = () => { wahl.art = el.dataset.art; wahl.figuren = wahl.figuren.slice(0, ARTEN[wahl.art].max); startbild(); });
  document.querySelectorAll('.fw').forEach(el => el.onclick = () => {
    const id = el.dataset.id;
    if (wahl.figuren.includes(id)) wahl.figuren = wahl.figuren.filter(x => x !== id);
    else if (wahl.figuren.length < A.max) wahl.figuren.push(id);
    startbild();
  });
  $('#kleine').onchange = e => { wahl.kleine = e.target.checked; };
  if ($('#startTuer')) $('#startTuer').onchange = e => { wahl.start = +e.target.value; };
  $('#los').onclick = neuesSpiel;
  $('#regelnStart').onclick = regeln;
  if (alt) $('#weiter').onclick = () => { S = alt; spielbild(); zugStart(true); };
}
function teamsBilden(ids) {
  const t = [];
  for (let i = 0; i < ids.length; i += 2) t.push(ids.slice(i, i + 2));
  if (t.length > 1 && t[t.length - 1].length === 1) t[t.length - 2].push(t.pop()[0]);
  return t;
}

// ======================================================================
// Spielaufbau
// ======================================================================
function neuesSpiel() {
  const gruppen = wahl.art === 'team' ? teamsBilden(wahl.figuren) : wahl.figuren.map(id => [id]);
  const listen = mischen(SPIEL.listen);
  S = {
    art: wahl.art, kleine: wahl.kleine,
    figs: wahl.figuren.map(id => ({ id, pos: 'C', pfad: [] })),
    parteien: gruppen.map((g, i) => ({ figs: g.map(id => wahl.figuren.indexOf(id)), liste: listen[i], hat: [], joker: [], aussetzen: false, fertig: false, wuerfler: 0 })),
    dran: 0, stapel: mischen(SPIEL.karten.map(k => k.nr)), phase: 'wuerfeln', wurf: null, nochmal: false, aktFig: null,
    kalender: wahl.art === 'gemeinsam' ? wahl.start : null, log: [], ende: null,
  };
  log('Das Spiel beginnt! Alle starten in Susis Weihnachtsküche.');
  spielbild();
  zugStart();
}
const partei = () => S.parteien[S.dran];
const figurName = i => FIG[S.figs[i].id].name;
const parteiName = p => p.figs.map(figurName).join(' & ');
const parteiFarbe = p => FIG[S.figs[p.figs[0]].id].farbe;
const komplett = p => p.hat.length === p.liste.length;

function spielbild() {
  $('#app').innerHTML = `
  <div class="leiste">
    <div class="titel"><b>Susis</b> <i>perfektes</i> Weihnachtsdinner</div>
    <div class="amzug" id="amzug"></div>
    <div class="knoepfe"><button class="zweit" id="bRegeln">Regeln</button><button class="zweit" id="bMenue">Neues Spiel</button></div>
  </div>
  <div class="app">
    <div><div class="brettrahmen"><div class="brett" id="brett" style="background-image:url(${BILD.brett})"></div></div></div>
    <div class="seite">
      <div class="panel zugpanel" id="zugpanel"></div>
      ${S.art === 'gemeinsam' ? '<div class="panel" id="kalender"></div>' : ''}
      <div class="panel"><h3>Spielstand</h3><div class="stand" id="stand"></div></div>
      <div class="panel"><h3>Verlauf</h3><div class="log" id="log"></div></div>
    </div>
  </div>`;
  $('#bRegeln').onclick = regeln;
  $('#bMenue').onclick = () => dialog('Neues Spiel?', 'Das laufende Spiel bleibt gespeichert, bis ein neues gestartet wird.', [['Zum Startbildschirm', () => { zu(); startbild(); }], ['Abbrechen', zu, 'zweit']]);
  // Figuren einmalig anlegen (für weiche Bewegung)
  S.figs.forEach((f, i) => {
    const d = document.createElement('div');
    d.className = 'figur'; d.id = 'fig' + i;
    d.style.setProperty('--ff', FIG[f.id].farbe);
    d.style.backgroundImage = `url(${BILD.figuren[f.id] || ''})`;
    d.title = FIG[f.id].name;
    d.onclick = () => figurGeklickt(i);
    $('#brett').appendChild(d);
  });
  zeichnen();
}

// ======================================================================
// Ablauf
// ======================================================================
async function zugStart(fortsetzen) {
  if (S.ende) return zeichnen();
  modus = null;
  const p = partei();
  if (p.fertig) return naechster();
  if (p.aussetzen && !fortsetzen) {
    p.aussetzen = false; log(parteiName(p) + ' setzt diesmal aus.');
    await toast(p, 'setzt diesmal aus'); return naechster();
  }
  S.phase = 'wuerfeln'; S.wurf = null; S.aktFig = null;
  zeichnen(); speichern();
  if (!fortsetzen) await toast(p, S.nochmal ? 'darf noch einmal würfeln!' : 'ist am Zug!');
  S.nochmal = false;
}
async function naechster() {
  if (S.ende) return;
  const vorher = S.dran;
  do { S.dran = (S.dran + 1) % S.parteien.length; } while (S.parteien[S.dran].fertig && S.parteien.some(p => !p.fertig));
  if (S.art === 'gemeinsam' && S.dran <= vorher) { if (kalenderVor('Eine Runde ist vorbei')) return; }
  const p = partei();
  if (S.art === 'team' && p.figs.length > 1) p.wuerfler = (p.wuerfler + 1) % p.figs.length;
  zugStart();
}
function kalenderVor(grund) {
  S.kalender++;
  log(`${grund}: Der Kalender-Stern rückt auf Türchen ${S.kalender}.`);
  if (S.kalender >= 24) { ende({ typ: 'niederlage' }); return true; }
  return false;
}

async function wuerfeln(fest) {
  if (beschaeftigt || S.phase !== 'wuerfeln') return;
  beschaeftigt = true;
  const w = fest || 1 + Math.floor(Math.random() * 6);
  const el = $('#wuerfel');
  for (let i = 0; i < 7; i++) { augen(1 + Math.floor(Math.random() * 6)); await warte(55); }
  el.classList.remove('rollt'); void el.offsetWidth; el.classList.add('rollt');
  S.wurf = w; augen(w); S.phase = 'ziehen';
  const p = partei();
  log(`${S.art === 'team' ? figurName(p.figs[p.wuerfler]) + ' (' + parteiName(p) + ')' : parteiName(p)} würfelt eine ${w}.`);
  beschaeftigt = false;
  zieleFuerWurf(w);
}
function zieleFuerWurf(w, text) {
  const p = partei();
  const z = [];
  p.figs.forEach(fi => ziele(S.figs[fi].pos, w).forEach(t => z.push({ ...t, fig: fi })));
  zielauswahl(z, { quelle: 'wuerfel', text: text || (p.figs.length > 1 ? `Wählt ein leuchtendes Feld – das kleine Bild zeigt, welche Figur dorthin zieht.` : `Wähle ein leuchtendes Feld (${w} Felder, Richtung frei).`) });
}
function ziele(start, n) {
  const res = new Map();
  (function lauf(k, prev, rest, pfad) {
    if (rest === 0) { if (!res.has(k)) res.set(k, pfad); return; }
    for (const nb of NB[k]) { if (nb !== prev) lauf(nb, k, rest - 1, pfad.concat(nb)); }
  })(start, null, n, [start]);
  return [...res].map(([id, pfad]) => ({ id, pfad }));
}
function zieleBis6(fi) {
  const m = new Map();
  for (let n = 1; n <= 6; n++) ziele(S.figs[fi].pos, n).forEach(z => { if (!m.has(z.id)) m.set(z.id, { ...z, fig: fi }); });
  return [...m.values()];
}
function zielauswahl(z, extra) {
  if (!z.length) { log('Kein Feld erreichbar.'); return naechster(); }
  modus = { art: 'ziel', ziele: z, ...extra };
  zeichnen(); speichern();
}

async function bewegen(fi, ziel, pfad, quelle) {
  if (beschaeftigt) return;
  beschaeftigt = true; modus = null; S.aktFig = fi; S.phase = 'laufen';
  const f = S.figs[fi], p = parteiVon(fi);
  let weg = pfad || [f.pos, ziel];
  // Für die Kleinsten: Küche muss nicht genau getroffen werden
  if (S.kleine && komplett(p) && weg.indexOf('C') > 0) weg = weg.slice(0, weg.indexOf('C') + 1);
  zeichnen();
  for (let i = 1; i < weg.length; i++) {
    f.pos = weg[i]; setzeFigur(fi); await warte(pfad ? 190 : 380);
    if (S.kleine && i < weg.length - 1 && KN[weg[i]].typ === 'ort') sammeln(p, KN[weg[i]].ort);
  }
  if (pfad) f.pfad = weg;
  beschaeftigt = false;
  ankunft(fi, quelle);
}
function parteiVon(fi) { return S.parteien.find(p => p.figs.includes(fi)); }
async function ankunft(fi, quelle) {
  const f = S.figs[fi], p = parteiVon(fi), k = KN[f.pos];
  if (k.typ === 'ort') sammeln(p, k.ort);
  zeichnen();
  if (k.typ === 'kueche' && komplett(p)) return angekommen(p);
  if (k.typ === 'stern' && quelle === 'wuerfel') return karteZiehen(fi);
  if (S.nochmal) return zugStart();
  naechster();
}
function sammeln(p, ortId) {
  if (p.liste.includes(ortId) && !p.hat.includes(ortId)) {
    p.hat.push(ortId); S.neu = ortId;
    log(`🎉 ${parteiName(p)} findet: ${ORT[ortId].ding}!`);
    if (komplett(p)) log(`${parteiName(p)} hat alle Zutaten – jetzt ${S.kleine ? '' : 'genau '}zurück in Susis Küche!`);
  }
}
async function angekommen(p) {
  if (S.art === 'gemeinsam') {
    p.fertig = true; log(`🏠 ${parteiName(p)} ist mit allen Zutaten in der Küche.`);
    if (S.parteien.every(x => x.fertig)) return ende({ typ: 'gemeinsam' });
    return naechster();
  }
  ende({ typ: 'sieg', partei: S.parteien.indexOf(p) });
}

// ======================================================================
// Wichtel-Karten
// ======================================================================
function karteZiehen(fi) {
  if (!S.stapel.length) S.stapel = mischen(SPIEL.karten.map(k => k.nr));
  const k = KARTE[S.stapel.shift()], p = parteiVon(fi), art = SPIEL.kartenarten[k.art];
  S.phase = 'karte'; S.aktFig = fi; zeichnen(); speichern();
  log(`${figurName(fi)} zieht „${k.titel}“.`);
  const schutz = k.art === 'hoppla' && p.joker.map(n => KARTE[n]).find(j => j.aktion.joker === 'schutz');
  const knoepfe = [];
  if (schutz) knoepfe.push(['🧦 Kuschelsocken spielen', () => {
    zu(); p.joker.splice(p.joker.indexOf(schutz.nr), 1); S.stapel.push(schutz.nr, k.nr);
    log(`${parteiName(p)} spielt die Kuschelsocken – die Hoppla-Karte gilt nicht.`); naechster();
  }, 'lila']);
  knoepfe.push([k.aktion.typ === 'joker' ? 'Behalten' : 'Los geht\'s', () => { zu(); ausfuehren(fi, k); }]);
  kartenDialog(k, art, figurName(fi), knoepfe);
}
function kartenDialog(k, art, wer, knoepfe) {
  $('#modalInhalt').innerHTML = `<div class="karte" style="--kf:${art.farbe};--h:${art.hell}"><span class="art">${art.name}</span>
    ${BILD.karten[k.bild] ? `<img class="bild" src="${BILD.karten[k.bild]}" alt="">` : ''}<h3>${k.titel}</h3><p>${k.text}</p>
    <div class="wer">gezogen von ${wer}</div><div class="knoepfe" id="kk"></div></div>`;
  knoepfe.forEach(([t, f, cls]) => { const b = document.createElement('button'); b.textContent = t; if (cls) b.className = cls; b.onclick = f; $('#kk').appendChild(b); });
  $('#modal').classList.add('offen');
}
function ausfuehren(fi, k) {
  const a = k.aktion, p = parteiVon(fi);
  if (S.art === 'gemeinsam' && k.art === 'hoppla' && kalenderVor('Hoppla-Karte')) return;
  if (a.dann === 'nochmal') S.nochmal = true;
  switch (a.typ) {
    case 'nochmal': S.nochmal = true; return zugStart();
    case 'ortwahl': return zielauswahl(SPIEL.orte.map(o => ({ id: ortKnoten(o.id), pfad: null, fig: fi })), { quelle: 'karte', text: `<b>Rentier-Express:</b> Wähle einen beliebigen Ort.` });
    case 'frei': return zielauswahl(zieleBis6(fi), { quelle: 'karte', text: `<b>Auf Skiern:</b> Zieh 1 bis 6 Felder – wähle ein Feld.` });
    case 'schritte': return zielauswahl(ziele(S.figs[fi].pos, a.n).map(z => ({ ...z, fig: fi })), { quelle: 'karte', text: `<b>${k.titel}:</b> Zieh ${a.n} Felder.` });
    case 'gefunden': {
      const fehlt = p.liste.filter(o => !p.hat.includes(o));
      if (!fehlt.length) { log('Es fehlt keine Zutat mehr.'); return naechster(); }
      return ortDialog('Welche Zutat bringt der Wichtel?', fehlt, id => { sammeln(p, id); zeichnen(); naechster(); });
    }
    case 'gehzu': return bewegen(fi, ortKnoten(a.ziel), null, 'karte');
    case 'aussetzen': p.aussetzen = true; log(`${parteiName(p)} setzt beim nächsten Mal aus.`); return naechster();
    case 'zurueck': {
      const pf = S.figs[fi].pfad || [];
      const ziel = pf.length > a.n ? pf[pf.length - 1 - a.n] : (pf[0] || S.figs[fi].pos);
      const rueck = pf.length > 1 ? pf.slice(Math.max(0, pf.length - 1 - a.n)).reverse() : null;
      return bewegen(fi, ziel, rueck, 'karte');
    }
    case 'huckepack': {
      const andere = S.figs.map((_, i) => i).filter(i => i !== fi);
      modus = { art: 'figur', wahl: andere, text: '<b>Huckepack:</b> Tippe auf die Figur, zu der du willst.', fertig: i => bewegen(fi, S.figs[i].pos, null, 'karte') };
      return zeichnen();
    }
    case 'joker':
      if (p.joker.length >= 2) { log('Schon 2 Joker auf der Hand – die Karte kommt unter den Stapel.'); S.stapel.push(k.nr); }
      else { p.joker.push(k.nr); log(`${parteiName(p)} behält „${k.titel}“.`); }
      return naechster();
    default:
      S.phase = 'manuell';
      modus = { art: 'info', text: `<b>${k.titel}:</b> Macht das am Tisch! Figuren bewegt ihr mit „Figur versetzen“. Danach auf „Weiter“ tippen.` };
      return zeichnen();
  }
}
function ortDialog(text, ids, f) {
  $('#modalInhalt').innerHTML = `<div class="karte" style="--kf:var(--tanne)"><h3>${text}</h3><div class="ortwahl" id="ow"></div></div>`;
  ids.forEach(id => { const b = document.createElement('button'); b.innerHTML = `<img src="${BILD.zutaten[id]}" alt="">${ORT[id].ding}`; b.onclick = () => { zu(); f(id); }; $('#ow').appendChild(b); });
  $('#modal').classList.add('offen');
}
function jokerSpielen(nr) {
  const p = partei(), j = KARTE[nr], t = j.aktion.joker;
  const weg = () => { p.joker.splice(p.joker.indexOf(nr), 1); S.stapel.push(nr); log(`${parteiName(p)} spielt „${j.titel}“.`); };
  if (t === 'kompass' && S.phase === 'wuerfeln') {
    weg(); S.phase = 'ziehen';
    const z = []; p.figs.forEach(fi => zieleBis6(fi).forEach(x => z.push(x)));
    return zielauswahl(z, { quelle: 'joker', text: '<b>Laterne:</b> Zieh 1 bis 6 Felder – wähle ein Feld.' });
  }
  if (t === 'doppelt' && S.phase === 'ziehen' && S.wurf) { weg(); S.wurf *= 2; augen(Math.min(S.wurf, 6)); return zieleFuerWurf(S.wurf, `<b>Susis Schlitten:</b> doppelt so weit – ${S.wurf} Felder!`); }
  if (t === 'besser' && S.phase === 'ziehen' && S.wurf) {
    weg(); const neu = 1 + Math.floor(Math.random() * 6), alt = S.wurf;
    return dialog('Glücksschwein', `Erster Wurf: <b>${alt}</b> · Neuer Wurf: <b>${neu}</b><br>Welchen nehmt ihr?`,
      [alt, neu].map(w => [w + ' nehmen', () => { zu(); S.wurf = w; augen(w); zieleFuerWurf(w); }]));
  }
  dialog(j.titel, t === 'schutz' ? 'Die Kuschelsocken werden automatisch angeboten, wenn ihr eine Hoppla-Karte zieht.' :
    t === 'kompass' ? 'Die Laterne spielt ihr <b>statt</b> zu würfeln.' : 'Diesen Joker spielt ihr <b>nach</b> dem Würfeln.', [['OK', zu]]);
}

// ======================================================================
// Freies Versetzen (für Miteinander-Karten)
// ======================================================================
function versetzenStart() {
  if (beschaeftigt || S.ende) return;
  S.vorher = modus; modus = { art: 'versetzen', text: 'Tippe auf die Figur, die du versetzen möchtest.' }; zeichnen();
}
function figurGeklickt(i) {
  if (!modus) return;
  if (modus.art === 'figur' && modus.wahl.includes(i)) { const f = modus.fertig; modus = null; return f(i); }
  if (modus.art === 'versetzen') {
    modus = { art: 'ziel', quelle: 'versetzen', versetzen: true, ziele: SPIEL.knoten.map(k => ({ id: k.id, pfad: null, fig: i })), text: `Tippe auf das Feld, auf das <b>${figurName(i)}</b> soll.` };
    zeichnen();
  }
}
function zielGeklickt(z) {
  if (beschaeftigt) return;
  if (modus.versetzen) {
    const f = S.figs[z.fig]; f.pos = z.id; setzeFigur(z.fig);
    if (KN[z.id].typ === 'ort') sammeln(parteiVon(z.fig), KN[z.id].ort);
    log(`${figurName(z.fig)} wird versetzt.`);
    modus = S.vorher && S.vorher.art !== 'versetzen' ? S.vorher : null; S.vorher = null;
    zeichnen(); speichern(); return;
  }
  bewegen(z.fig, z.id, z.pfad, modus.quelle);
}
function weiter() { if (S.phase === 'manuell') { modus = null; S.nochmal ? zugStart() : naechster(); } }

// ======================================================================
// Spielende
// ======================================================================
function ende(e) {
  S.ende = e; S.phase = 'ende'; modus = null; zeichnen(); speichern();
  if (e.typ === 'niederlage') {
    log('⭐ Der Stern hat Türchen 24 erreicht – Heiligabend ist da!');
    return dialog('Oh nein – Heiligabend!', 'Der Kalender-Stern ist bei Türchen 24 angekommen, bevor alle Zutaten in der Küche waren. Probiert es gleich noch einmal!', [['Neues Spiel', () => { zu(); startbild(); }], ['Brett ansehen', zu, 'zweit']]);
  }
  konfetti();
  if (e.typ === 'gemeinsam') {
    log('🏆 Alle Zutaten sind in der Küche – ihr habt es gemeinsam geschafft!');
    return $('#modalInhalt').innerHTML = siegKarte(BILD.susi, 'Geschafft!', `Alle Zutaten sind rechtzeitig vor Heiligabend in Susis Küche (Türchen ${S.kalender}). Das perfekte Weihnachtsdinner kann beginnen! 🎄`), zeigeModal();
  }
  const p = S.parteien[e.partei];
  log(`🏆 ${parteiName(p)} gewinnt!`);
  $('#modalInhalt').innerHTML = siegKarte(BILD.figuren[S.figs[p.figs[0]].id], parteiName(p),
    `${p.figs.length > 1 ? 'sind Susis Chef-Gehilfen und gewinnen' : 'ist Susis Chef-Gehilfe oder Chef-Gehilfin und gewinnt'}! Das perfekte Weihnachtsdinner kann beginnen. 🎄`);
  zeigeModal();
}
function siegKarte(bild, titel, text) {
  setTimeout(() => { $('#sNeu').onclick = () => { zu(); startbild(); }; $('#sZu').onclick = zu; }, 0);
  return `<div class="karte" style="--kf:var(--rot);--h:#fff6f2"><span class="art">Gewonnen!</span><img class="bild" src="${bild}" style="object-fit:cover" alt=""><h3>${titel}</h3><p>${text}</p><div class="knoepfe"><button id="sNeu">Neues Spiel</button><button class="zweit" id="sZu">Brett ansehen</button></div></div>`;
}

// ======================================================================
// Darstellung
// ======================================================================
const AUGEN = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
function augen(n) { const el = $('#wuerfel'); if (!el) return; el.classList.toggle('leer', !n); [...el.children].forEach((c, i) => c.classList.toggle('an', !!n && AUGEN[n].includes(i))); }

function setzeFigur(i) {
  const d = $('#fig' + i); if (!d) return;
  const pos = S.figs[i].pos;
  const auf = S.figs.map((f, j) => j).filter(j => S.figs[j].pos === pos);
  const n = auf.length, idx = auf.indexOf(i), k = KN[pos];
  const r = n > 1 ? (k.typ === 'feld' || k.typ === 'stern' ? 2.6 : 3.6) : 0, w = (idx / n) * Math.PI * 2 - Math.PI / 2;
  d.style.left = k.x / 4 + Math.cos(w) * r + '%';
  d.style.top = k.y / 4 + Math.sin(w) * r + '%';
}
function zeichnen() {
  if (!S || !$('#brett')) return;
  const p = partei(), farbe = parteiFarbe(p);
  document.body.style.setProperty('--f', S.ende ? '#1f6b4a' : farbe);
  // Am-Zug-Anzeige
  $('#amzug').innerHTML = S.ende ? `<div class="pille" style="--f:var(--tanne)"><div class="t" style="padding-left:12px"><small>Spielende</small><b>${S.ende.typ === 'niederlage' ? 'Heiligabend!' : 'Gewonnen!'}</b></div></div>` :
    `<div class="pille">${p.figs.map(fi => `<img src="${BILD.figuren[S.figs[fi].id] || ''}" alt="">`).join('')}<div class="t"><small>Am Zug</small><b>${parteiName(p)}</b></div></div>`;
  // Figuren
  S.figs.forEach((f, i) => {
    const d = $('#fig' + i); setzeFigur(i);
    const aktiv = !S.ende && p.figs.includes(i);
    d.classList.toggle('aktiv', aktiv);
    d.classList.toggle('passiv', !aktiv && !S.ende);
    d.classList.toggle('waehlbar', !!modus && ((modus.art === 'figur' && modus.wahl.includes(i)) || modus.art === 'versetzen'));
  });
  // Ziele
  document.querySelectorAll('.ziel').forEach(e => e.remove());
  if (modus && modus.art === 'ziel') {
    const mehrere = new Set(modus.ziele.map(z => z.fig)).size > 1 && !modus.versetzen;
    modus.ziele.forEach(z => {
      const k = KN[z.id], d = document.createElement('div');
      d.className = 'ziel' + (k.typ === 'ort' || k.typ === 'kueche' ? ' gross' : '');
      d.style.left = k.x / 4 + '%'; d.style.top = k.y / 4 + '%';
      d.style.setProperty('--zf', FIG[S.figs[z.fig].id].farbe);
      if (mehrere) d.innerHTML = `<img src="${BILD.figuren[S.figs[z.fig].id] || ''}" alt="">`;
      d.onclick = () => zielGeklickt(z);
      $('#brett').appendChild(d);
    });
  }
  // Zug-Panel
  const wuerfler = S.art === 'team' && p.figs.length > 1 ? `<div class="grau" style="font-weight:800">🎲 Es würfelt: ${figurName(p.figs[p.wuerfler])}</div>` : '';
  let text = modus && modus.text ? modus.text : S.phase === 'wuerfeln' ? `<b>${parteiName(p)}</b>, du bist dran: Würfle!` : S.phase === 'laufen' ? 'Unterwegs …' : '';
  if (S.ende) text = 'Das Spiel ist zu Ende. Über „Neues Spiel“ geht es zurück zum Start.';
  $('#zugpanel').innerHTML = `
    <div class="wurfzeile">
      <div class="wuerfel leer" id="wuerfel">${'<i></i>'.repeat(9)}</div>
      <div class="wurfknoepfe">
        ${wuerfler}
        <button class="gross" id="bWurf" ${S.phase !== 'wuerfeln' || S.ende ? 'disabled' : ''}>🎲 Würfeln</button>
        ${S.phase === 'manuell' ? '<button class="gruen" id="bWeiter">Weiter ▶</button>' : ''}
        <button class="zweit" id="bVersetzen" ${S.ende ? 'disabled' : ''}>Figur versetzen</button>
      </div>
    </div>
    <div class="hinweis">${text}</div>
    <h3 style="margin-top:12px">Einkaufsliste ${p.figs.length > 1 ? 'von ' + parteiName(p) : ''}</h3>
    <div class="liste">${p.liste.map(o => `<div class="${p.hat.includes(o) ? 'ok' : ''} ${S.neu === o ? 'neu' : ''}" style="--lf:${ORT[o].farbe}"><img src="${BILD.zutaten[o]}" alt="">${ORT[o].ding}<br><span class="grau" style="font-weight:700">${ORT[o].name}</span></div>`).join('')}</div>
    ${p.joker.length ? `<div class="joker">${p.joker.map(n => `<button class="lila" data-j="${n}">🃏 ${KARTE[n].titel}</button>`).join('')}</div>` : ''}`;
  S.neu = null;
  augen(S.wurf && S.phase !== 'wuerfeln' ? Math.min(S.wurf, 6) : 0);
  $('#bWurf').onclick = () => wuerfeln();
  $('#bVersetzen').onclick = versetzenStart;
  if ($('#bWeiter')) $('#bWeiter').onclick = weiter;
  document.querySelectorAll('[data-j]').forEach(b => b.onclick = () => jokerSpielen(+b.dataset.j));
  // Kalender
  if ($('#kalender')) $('#kalender').innerHTML = `<h3>Adventskalender</h3><div class="kalender"><div class="tuer">${S.kalender}</div><div><div class="rest">Noch ${24 - S.kalender} Türchen bis Heiligabend</div><div class="grau">Der Stern rückt nach jeder Runde und bei jeder Hoppla-Karte weiter.</div></div></div>`;
  // Spielstand
  $('#stand').innerHTML = S.parteien.map((x, i) => `<div class="sp ${i === S.dran && !S.ende ? 'dran' : ''}" style="--sf:${parteiFarbe(x)}">
      <div class="bilder">${x.figs.map(fi => `<img src="${BILD.figuren[S.figs[fi].id] || ''}" alt="">`).join('')}</div>
      <div class="info"><div class="name">${parteiName(x)}</div><div class="tags">${x.aussetzen ? '<span class="tag">setzt aus</span>' : ''}${x.fertig ? '<span class="tag" style="background:var(--tanne)">in der Küche</span>' : ''}${x.joker.length ? `<span class="tag" style="background:#7b3fa0">${x.joker.length} Joker</span>` : ''}</div>
      <div class="balken"><i style="width:${(x.hat.length / x.liste.length) * 100}%"></i></div></div>
      <div class="mini">${x.liste.map(o => `<img class="${x.hat.includes(o) ? 'ok' : ''}" src="${BILD.zutaten[o]}" title="${ORT[o].ding}" alt="">`).join('')}</div></div>`).join('');
  $('#log').innerHTML = S.log.slice(0, 40).map(t => `<div>${t}</div>`).join('');
}
function log(t) { S.log.unshift(t); if ($('#log')) $('#log').innerHTML = S.log.slice(0, 40).map(x => `<div>${x}</div>`).join(''); }

async function toast(p, text) {
  const el = $('#toast');
  el.style.setProperty('--tf', parteiFarbe(p));
  el.innerHTML = `<div>${p.figs.map(fi => `<img src="${BILD.figuren[S.figs[fi].id] || ''}" alt="">`).join('')}</div><h2>${parteiName(p)}</h2><p>${text}</p>`;
  el.classList.add('zeigen'); await warte(1150); el.classList.remove('zeigen'); await warte(250);
}
function dialog(titel, text, knoepfe) {
  $('#modalInhalt').innerHTML = `<div class="karte" style="--kf:var(--tanne)"><h3>${titel}</h3><p>${text}</p><div class="knoepfe" id="kk"></div></div>`;
  knoepfe.forEach(([t, f, cls]) => { const b = document.createElement('button'); b.textContent = t; if (cls) b.className = cls; b.onclick = f; $('#kk').appendChild(b); });
  zeigeModal();
}
function zeigeModal() { $('#modal').classList.add('offen'); }
function zu() { $('#modal').classList.remove('offen'); }

function regeln() {
  $('#modalInhalt').innerHTML = `<div class="regeln">
  <h2>Spielregel in Kürze</h2>
  <p>Susi will das <b>perfekte Weihnachtsdinner</b> kochen, doch es fehlen noch Zutaten. Wer zuerst alle 4 Zutaten der eigenen <b>Einkaufsliste</b> in <b>${SPIEL.zentrum}</b> bringt, wird Susis Chef-Gehilfe oder Chef-Gehilfin und gewinnt!</p>
  <h3>Ziehen</h3><ul>
  <li>Würfeln und <b>genau</b> so viele Felder ziehen. Die Richtung darfst du jedes Mal frei wählen – nur im Zug nicht umdrehen.</li>
  <li>An den vier Abzweigungen geht es in die Mitte. Die Küche zählt als 1 Feld und ist eine Abkürzung.</li>
  <li>Alle erreichbaren Felder leuchten – einfach antippen.</li></ul>
  <h3>Felder</h3><ul>
  <li><b>Ort:</b> Steht die Zutat auf deiner Liste, bekommst du sie – aber nur, wenn du <b>genau</b> dort landest.</li>
  <li><b>Sternfeld:</b> Eine Wichtel-Karte wird gezogen (nur nach einem Würfelwurf).</li>
  <li><b>Küche:</b> Mit allen Zutaten musst du sie genau treffen. Bei zu viel Würfelpunkten ziehst du hindurch und versuchst es im nächsten Zug wieder.</li></ul>
  <h3>Wichtel-Karten</h3><ul>
  <li><b>Glück</b> bringt dich voran, <b>Hoppla</b> schickt dich woandershin, <b>Miteinander</b> macht ihr gemeinsam am Tisch (Figuren mit „Figur versetzen“ bewegen, dann „Weiter“).</li>
  <li><b>Joker</b> behaltet ihr (höchstens 2) und spielt sie über den lila Knopf.</li></ul>
  <h3>Varianten</h3><ul>
  <li><b>Team-Spiel:</b> je zwei Figuren teilen sich eine Liste; nach dem Würfeln entscheidet das Team, welche Figur zieht.</li>
  <li><b>Gemeinsam bis Heiligabend:</b> Der Kalender-Stern rückt nach jeder Runde und bei jeder Hoppla-Karte weiter. Alle müssen mit vollen Listen in der Küche sein, bevor Türchen 24 erreicht ist.</li>
  <li><b>Für die Kleinsten:</b> Zutaten gibt es schon beim Vorbeiziehen, und die Küche muss nicht genau getroffen werden.</li></ul>
  <p class="grau">Das Spiel wird automatisch in diesem Browser gespeichert.</p>
  <div class="knoepfe" style="text-align:center"><button id="rZu">Alles klar!</button></div></div>`;
  zeigeModal(); $('#rZu').onclick = zu;
}

function konfetti() {
  const c = $('#konfetti'), x = c.getContext('2d');
  c.width = innerWidth; c.height = innerHeight;
  const farben = ['#c8102e', '#d4a537', '#1f6b4a', '#f0d48a', '#ffffff', '#2f6fb3'];
  const teile = Array.from({ length: 180 }, () => ({ x: Math.random() * c.width, y: -20 - Math.random() * c.height, v: 2 + Math.random() * 4, w: Math.random() * 6, r: 4 + Math.random() * 6, f: farben[Math.floor(Math.random() * farben.length)] }));
  let t = 0;
  (function bild() {
    x.clearRect(0, 0, c.width, c.height);
    teile.forEach(p => { p.y += p.v; p.x += Math.sin((t + p.w) / 12) * 1.5; x.fillStyle = p.f; x.save(); x.translate(p.x, p.y); x.rotate((t + p.w * 10) / 15); x.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2); x.restore(); });
    if (t++ < 360) requestAnimationFrame(bild); else x.clearRect(0, 0, c.width, c.height);
  })();
}

document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && $('#modal').classList.contains('offen') && !$('#kk')) zu();
  if ((e.key === ' ' || e.key === 'Enter') && S && S.phase === 'wuerfeln' && !$('#modal').classList.contains('offen') && document.activeElement.tagName !== 'BUTTON') { e.preventDefault(); wuerfeln(); }
});
startbild();
