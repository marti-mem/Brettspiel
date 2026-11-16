// Erzeugt alle Druckvorlagen als PDF im Ordner druck/.
// Aufruf: npm run build
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const D = require('./daten');

const ROOT = path.join(__dirname, '..');
const BUILD = path.join(ROOT, 'build');
const DRUCK = path.join(ROOT, 'druck');
const FIG_DIR = path.join(ROOT, 'figuren');
const EMOJI_DIR = path.join(ROOT, 'node_modules/@twemoji/svg');
fs.mkdirSync(BUILD, { recursive: true });
fs.mkdirSync(DRUCK, { recursive: true });

const ortById = Object.fromEntries(D.orte.map(o => [o.id, o]));
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// ---------- Emoji (Twemoji, Vektor) ----------
const emojiCache = {};
function emojiInner(ch) {
  if (emojiCache[ch]) return emojiCache[ch];
  const cps = [...ch].map(c => c.codePointAt(0).toString(16));
  const kandidaten = [cps.join('-'), cps.filter(c => c !== 'fe0f').join('-')];
  for (const k of kandidaten) {
    const f = path.join(EMOJI_DIR, k + '.svg');
    if (fs.existsSync(f)) {
      const s = fs.readFileSync(f, 'utf8');
      const inner = s.slice(s.indexOf('>') + 1, s.lastIndexOf('</svg>'));
      return (emojiCache[ch] = inner);
    }
  }
  throw new Error('Emoji nicht gefunden: ' + ch + ' ' + kandidaten);
}
// Emoji in einem SVG (Koordinaten in mm), zentriert auf cx/cy
const emoSvg = (ch, cx, cy, size, extra = '') =>
  `<svg x="${cx - size / 2}" y="${cy - size / 2}" width="${size}" height="${size}" viewBox="0 0 36 36" ${extra}>${emojiInner(ch)}</svg>`;
// Emoji in HTML
const emoHtml = (ch, size, cls = '') =>
  `<svg class="emo ${cls}" style="width:${size}mm;height:${size}mm" viewBox="0 0 36 36">${emojiInner(ch)}</svg>`;

// ---------- gemeinsames CSS ----------
const fontUrl = f => 'file://' + path.join(ROOT, 'node_modules/@fontsource', f);
const BASIS_CSS = `
@font-face{font-family:Fredoka;font-weight:400;src:url(${fontUrl('fredoka/files/fredoka-latin-400-normal.woff2')})}
@font-face{font-family:Fredoka;font-weight:500;src:url(${fontUrl('fredoka/files/fredoka-latin-500-normal.woff2')})}
@font-face{font-family:Fredoka;font-weight:600;src:url(${fontUrl('fredoka/files/fredoka-latin-600-normal.woff2')})}
@font-face{font-family:Fredoka;font-weight:700;src:url(${fontUrl('fredoka/files/fredoka-latin-700-normal.woff2')})}
@font-face{font-family:Nunito;font-weight:400;src:url(${fontUrl('nunito/files/nunito-latin-400-normal.woff2')})}
@font-face{font-family:Nunito;font-weight:700;src:url(${fontUrl('nunito/files/nunito-latin-700-normal.woff2')})}
@font-face{font-family:Nunito;font-weight:800;src:url(${fontUrl('nunito/files/nunito-latin-800-normal.woff2')})}
*{box-sizing:border-box;margin:0;padding:0}
html,body{font-family:Nunito,sans-serif;color:#2b2b2b;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.page{position:relative;overflow:hidden;page-break-after:always;break-after:page}
.page:last-child{page-break-after:auto;break-after:auto}
.emo{display:block}
.h{font-family:Fredoka,sans-serif}
.seitenhinweis{position:absolute;font-size:2.6mm;color:#999;font-family:Nunito}
`;
const htmlDoc = (titel, css, body) =>
  `<!doctype html><html lang="de"><head><meta charset="utf-8"><title>${esc(titel)}</title><style>${BASIS_CSS}${css}</style></head><body>${body}</body></html>`;

// Schnittmarken um ein Rechteck (in mm, absolut auf der Seite)
function schnittmarken(x, y, w, h, xs = [], ys = []) {
  const L = 5, G = 1.5;
  const lines = [];
  const allX = [x, ...xs, x + w], allY = [y, ...ys, y + h];
  for (const xx of allX) {
    lines.push([xx, y - G - L, xx, y - G]);
    lines.push([xx, y + h + G, xx, y + h + G + L]);
  }
  for (const yy of allY) {
    lines.push([x - G - L, yy, x - G, yy]);
    lines.push([x + w + G, yy, x + w + G + L, yy]);
  }
  return lines.map(([a, b, c, d]) => `<line x1="${a}" y1="${b}" x2="${c}" y2="${d}" stroke="#000" stroke-width="0.2"/>`).join('');
}
const markenSvg = (pw, ph, inner) =>
  `<svg style="position:absolute;left:0;top:0" width="${pw}mm" height="${ph}mm" viewBox="0 0 ${pw} ${ph}">${inner}</svg>`;

// ======================================================================
// SPIELPLAN
// ======================================================================
const B = 400; // Kantenlänge Spielplan in mm
const C = { x: 200, y: 200 };
const R_ORT = 25, R_FELD = 13.5, R_ZIMMER = 40;

function planGeometrie() {
  const lo = 35, hi = 365, mi = 200;
  const ortPos = [[lo, lo], [mi, lo], [hi, lo], [hi, mi], [hi, hi], [mi, hi], [lo, hi], [lo, mi]];
  const ring = []; // alle Felder des Rundwegs in Reihenfolge
  D.orte.forEach((o, i) => {
    const [x, y] = ortPos[i];
    const [nx, ny] = ortPos[(i + 1) % 8];
    ring.push({ typ: 'ort', ort: o, x, y });
    for (let k = 1; k <= 3; k++) {
      const t = k / 4;
      ring.push({ typ: k === 2 ? 'stern' : 'feld', x: x + (nx - x) * t, y: y + (ny - y) * t });
    }
  });
  const speichen = [];
  ring.filter(f => f.typ === 'ort' && f.ort.mitte).forEach(f => {
    const dx = C.x - f.x, dy = C.y - f.y, len = Math.hypot(dx, dy);
    const ux = dx / len, uy = dy / len;
    const frei = len - R_ORT - R_ZIMMER;
    const felder = [1, 2].map(k => ({ typ: 'feld', x: f.x + ux * (R_ORT + (frei * k) / 3), y: f.y + uy * (R_ORT + (frei * k) / 3) }));
    speichen.push({ von: f, felder });
  });
  return { ring, speichen };
}

// einfacher, reproduzierbarer Zufall für die Wiese
function rng(seed) { return () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646; }

function planInhalt() {
  const { ring, speichen } = planGeometrie();
  let s = '';
  // Hintergrund
  s += `<defs>
    <radialGradient id="wiese" cx="50%" cy="50%" r="70%"><stop offset="0" stop-color="#dff0c4"/><stop offset="1" stop-color="#bfe09a"/></radialGradient>
  </defs>`;
  s += `<rect x="0" y="0" width="${B}" height="${B}" fill="url(#wiese)"/>`;
  const r = rng(7);
  for (let i = 0; i < 700; i++) {
    const x = r() * B, y = r() * B;
    s += `<path d="M${x.toFixed(1)} ${y.toFixed(1)} l0.6 -2.2 M${(x + 1).toFixed(1)} ${y.toFixed(1)} l-0.4 -1.8" stroke="#8fc46a" stroke-width="0.45" stroke-linecap="round" opacity="0.6"/>`;
  }
  s += `<rect x="3" y="3" width="${B - 6}" height="${B - 6}" rx="10" fill="none" stroke="#6a9f45" stroke-width="2.5"/>`;

  // Wege
  const ringPfad = 'M' + ring.map(f => `${f.x} ${f.y}`).join(' L') + ' Z';
  const speichenPfad = speichen.map(sp => `M${sp.von.x} ${sp.von.y} L${C.x} ${C.y}`).join(' ');
  s += `<path d="${ringPfad} ${speichenPfad}" fill="none" stroke="#b08a57" stroke-width="22" stroke-linejoin="round" stroke-linecap="round"/>`;
  s += `<path d="${ringPfad} ${speichenPfad}" fill="none" stroke="#ead2a3" stroke-width="19" stroke-linejoin="round" stroke-linecap="round"/>`;
  s += `<path d="${ringPfad} ${speichenPfad}" fill="none" stroke="#dcc08a" stroke-width="0.6" stroke-dasharray="1.5 3" stroke-linejoin="round"/>`;

  // Viertel-Deko: Titel & Legende (je zweimal, gedreht, damit man von beiden Seiten lesen kann)
  const titelBlock = (cx, cy, rot) => `<g transform="rotate(${rot} ${cx} ${cy})">
    <rect x="${cx - 58}" y="${cy - 50}" width="116" height="100" rx="14" fill="#ffffff" opacity="0.55"/>
    ${emoSvg('🦋', cx - 42, cy - 36, 12)}${emoSvg('🐞', cx + 44, cy + 36, 9)}${emoSvg('🌼', cx + 42, cy - 38, 10)}${emoSvg('🍄', cx - 44, cy + 38, 10)}
    <text x="${cx}" y="${cy - 17}" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="17" fill="#d84315">Jakobs</text>
    <text x="${cx}" y="${cy + 2}" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="15" fill="#6a1b9a">große</text>
    <text x="${cx}" y="${cy + 21}" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="15.5" fill="#1565c0">Schatzsuche</text>
    ${emoSvg('🔍', cx, cy + 36, 11)}
  </g>`;
  const legende = (cx, cy, rot) => {
    const zeilen = [
      { icon: `<circle cx="0" cy="0" r="7" fill="#ffd54f" stroke="#b08a57" stroke-width="0.8"/>${emoSvg('⭐', 0, 0, 9)}`, t1: 'Sternfeld', t2: 'Jakob-Karte ziehen' },
      { icon: `<circle cx="0" cy="0" r="7" fill="#ef6c00"/><circle cx="0" cy="0" r="4.6" fill="#fff"/>${emoSvg('⚽', 0, 0, 7)}`, t1: 'Ort', t2: 'Gegenstand einsammeln' },
      { icon: `<circle cx="0" cy="0" r="7" fill="#ffe0b2" stroke="#e65100" stroke-width="0.8"/>${emoSvg('🏠', 0, 0, 9)}`, t1: 'Jakobs Zimmer', t2: 'Start und Ziel' },
    ];
    let g = `<g transform="rotate(${rot} ${cx} ${cy})"><rect x="${cx - 58}" y="${cy - 50}" width="116" height="100" rx="14" fill="#ffffff" opacity="0.55"/>`;
    g += `<text x="${cx}" y="${cy - 33}" text-anchor="middle" font-family="Fredoka" font-weight="600" font-size="7.5" fill="#33691e">So geht's</text>`;
    zeilen.forEach((z, i) => {
      const y = cy - 15 + i * 21, x = cx - 40;
      g += `<g transform="translate(${x} ${y})">${z.icon}</g>`;
      g += `<text x="${x + 12}" y="${y - 1}" font-family="Fredoka" font-weight="600" font-size="5.6" fill="#333">${esc(z.t1)}</text>`;
      g += `<text x="${x + 12}" y="${y + 5.5}" font-family="Nunito" font-weight="700" font-size="4.6" fill="#555">${esc(z.t2)}</text>`;
    });
    return g + '</g>';
  };
  s += titelBlock(118, 118, 0) + titelBlock(282, 282, 180) + legende(282, 118, 0) + legende(118, 282, 180);

  // Felder
  const feld = f => {
    if (f.typ === 'stern') {
      return `<circle cx="${f.x}" cy="${f.y}" r="${R_FELD}" fill="#ffd54f" stroke="#8a6a3d" stroke-width="1"/>` +
        `<circle cx="${f.x}" cy="${f.y}" r="${R_FELD - 2}" fill="none" stroke="#fff3c4" stroke-width="0.8"/>` + emoSvg('⭐', f.x, f.y, 16);
    }
    return `<circle cx="${f.x}" cy="${f.y}" r="${R_FELD}" fill="#fffaf0" stroke="#8a6a3d" stroke-width="1"/>` +
      `<circle cx="${f.x}" cy="${f.y}" r="${R_FELD - 2}" fill="none" stroke="#efe2c6" stroke-width="0.8"/>`;
  };
  ring.filter(f => f.typ !== 'ort').forEach(f => (s += feld(f)));
  speichen.forEach(sp => sp.felder.forEach(f => (s += feld(f))));

  // Orte
  ring.filter(f => f.typ === 'ort').forEach(f => {
    const o = f.ort;
    s += `<circle cx="${f.x}" cy="${f.y + 0.8}" r="${R_ORT}" fill="#000" opacity="0.18"/>`;
    s += `<circle cx="${f.x}" cy="${f.y}" r="${R_ORT}" fill="${o.farbe}" stroke="#fff" stroke-width="1.2"/>`;
    s += `<circle cx="${f.x}" cy="${f.y - 4}" r="15.5" fill="#fff"/>`;
    s += emoSvg(o.emoji, f.x, f.y - 4, 21);
    s += `<text x="${f.x}" y="${f.y + 18.6}" text-anchor="middle" font-family="Fredoka" font-weight="600" font-size="${o.name.length > 9 ? 4.3 : 4.8}" fill="#fff">${esc(o.name)}</text>`;
    // Gegenstand-Abzeichen, Richtung Plan-Mitte gedreht
    const a = ((f.x < 200 ? -135 : -45) * Math.PI) / 180; // schräg oben, weg vom Namen
    const bx = f.x + Math.cos(a) * 25, by = f.y + Math.sin(a) * 25;
    s += `<circle cx="${bx}" cy="${by + 0.5}" r="8.6" fill="#000" opacity="0.18"/>`;
    s += `<circle cx="${bx}" cy="${by}" r="8.6" fill="#fff" stroke="${o.farbe}" stroke-width="1.4"/>`;
    s += emoSvg(o.ding.emoji, bx, by, 11);
  });

  // Jakobs Zimmer
  s += `<circle cx="${C.x}" cy="${C.y + 1}" r="${R_ZIMMER}" fill="#000" opacity="0.18"/>`;
  s += `<circle cx="${C.x}" cy="${C.y}" r="${R_ZIMMER}" fill="#ffe0b2" stroke="#e65100" stroke-width="1.6"/>`;
  s += `<circle cx="${C.x}" cy="${C.y}" r="${R_ZIMMER - 3}" fill="none" stroke="#ffffff" stroke-width="1" stroke-dasharray="2 2"/>`;
  s += emoSvg('🏠', C.x, C.y - 8, 34);
  s += `<text x="${C.x}" y="${C.y + 19}" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="7" fill="#bf360c">Jakobs Zimmer</text>`;
  s += `<text x="${C.x}" y="${C.y + 26}" text-anchor="middle" font-family="Nunito" font-weight="800" font-size="4" fill="#bf360c">START &amp; ZIEL</text>`;
  return s;
}

function planDateien() {
  const inhalt = planInhalt();
  const out = [];
  // 1) ganze Fläche (Copyshop, 40 x 40 cm)
  out.push({
    name: '01_Spielplan_40x40cm_Copyshop',
    html: htmlDoc('Spielplan', `@page{size:${B}mm ${B}mm;margin:0}.page{width:${B}mm;height:${B}mm}`,
      `<div class="page"><svg width="${B}mm" height="${B}mm" viewBox="0 0 ${B} ${B}">${inhalt}</svg></div>`),
  });
  // 2) vier A4-Teile à 20 x 20 cm
  const teileA4 = [[0, 0, 'oben links'], [200, 0, 'oben rechts'], [0, 200, 'unten links'], [200, 200, 'unten rechts']];
  let body = '';
  teileA4.forEach(([vx, vy, lbl], i) => {
    const x = 5, y = 48.5; // linker Rand 5 mm, vertikal mittig
    body += `<div class="page" style="width:210mm;height:297mm">
      <div class="seitenhinweis" style="left:10mm;top:12mm;font-size:4mm;color:#555"><b>Spielplan – Teil ${i + 1} von 4 (${lbl})</b><br>
      In Originalgröße drucken (100 %, „Tatsächliche Größe“). An den Schnittmarken ausschneiden und die 4 Teile auf Graupappe kleben.</div>
      <svg style="position:absolute;left:${x}mm;top:${y}mm" width="200mm" height="200mm" viewBox="${vx} ${vy} 200 200">${inhalt}</svg>
      ${markenSvg(210, 297, schnittmarken(x, y, 200, 200))}
    </div>`;
  });
  out.push({ name: '01_Spielplan_4xA4', html: htmlDoc('Spielplan 4xA4', '@page{size:A4;margin:0}', body) });
  // 3) zwei A3-Teile à 40 x 20 cm
  body = '';
  [[0, 'obere Hälfte'], [200, 'untere Hälfte']].forEach(([vy, lbl], i) => {
    const x = 10, y = 60;
    body += `<div class="page" style="width:420mm;height:297mm">
      <div class="seitenhinweis" style="left:12mm;top:14mm;font-size:5mm;color:#555"><b>Spielplan – Teil ${i + 1} von 2 (${lbl})</b> · In Originalgröße drucken (100 %). An den Schnittmarken ausschneiden und auf Graupappe kleben.</div>
      <svg style="position:absolute;left:${x}mm;top:${y}mm" width="400mm" height="200mm" viewBox="0 ${vy} 400 200">${inhalt}</svg>
      ${markenSvg(420, 297, schnittmarken(x, y, 400, 200))}
    </div>`;
  });
  out.push({ name: '01_Spielplan_2xA3', html: htmlDoc('Spielplan 2xA3', '@page{size:A3 landscape;margin:0}', body) });
  return out;
}

// ======================================================================
// JAKOB-KARTEN (63 x 88 mm, 9 pro A4-Bogen, mit Rückseiten)
// ======================================================================
const KW = 63, KH = 88;
const KARTEN_CSS = `
@page{size:A4;margin:0}
.page{width:210mm;height:297mm}
.raster{position:absolute;left:10.5mm;top:16.5mm;width:189mm;height:264mm;display:grid;grid-template-columns:repeat(3,${KW}mm);grid-template-rows:repeat(3,${KH}mm)}
.karte{width:${KW}mm;height:${KH}mm;padding:2.5mm;position:relative;outline:0.15mm solid #ccc}
.innen{width:100%;height:100%;border-radius:3.5mm;border:1.6mm solid var(--f);background:var(--h);display:flex;flex-direction:column;align-items:center;padding:2.4mm 3mm 2mm;text-align:center}
.art{font-family:Fredoka;font-weight:600;font-size:3.3mm;color:#fff;background:var(--f);border-radius:3mm;padding:0.5mm 3mm;display:flex;align-items:center;gap:1.2mm;letter-spacing:0.2mm;text-transform:uppercase}
.art .emo{width:3.6mm!important;height:3.6mm!important}
.bild{margin:3.5mm 0 2.5mm;width:30mm;height:30mm;border-radius:50%;background:#fff;display:flex;align-items:center;justify-content:center;box-shadow:0 0 0 0.8mm var(--f) inset}
.titel{font-family:Fredoka;font-weight:600;font-size:5.3mm;line-height:1.05;color:var(--f);margin-bottom:1.8mm}
.text{font-size:3.55mm;line-height:1.28;font-weight:700;color:#333}
.behalten{margin-top:auto;font-family:Fredoka;font-weight:600;font-size:3mm;color:#fff;background:var(--f);border-radius:2mm;padding:0.6mm 2.5mm}
.fuss{margin-top:auto;font-size:2.3mm;color:#999;font-weight:700}
.behalten+.fuss{margin-top:1mm}
.linien{width:100%;margin-top:3mm;display:flex;flex-direction:column;gap:5.5mm}
.linien div{border-bottom:0.25mm dashed #bbb;height:0}
.rueck{width:100%;height:100%;border-radius:3.5mm;background:radial-gradient(circle at 50% 45%,#5c6bc0 0,#283593 70%);position:relative;overflow:hidden;display:flex;flex-direction:column;align-items:center;justify-content:center;border:1.2mm solid #ffd54f}
.rueck .kreis{width:34mm;height:34mm;border-radius:50%;background:#fff;display:flex;align-items:center;justify-content:center;box-shadow:0 0 0 1.4mm #fff}
.rueck .wort{font-family:Fredoka;font-weight:700;font-size:7mm;color:#fff;margin-top:4mm;letter-spacing:0.3mm}
.rueck .klein{font-family:Fredoka;font-weight:500;font-size:3mm;color:#c5cae9;margin-top:1mm}
.funkeln{position:absolute}
`;

function kartenVorderseite(k) {
  const a = D.kartenarten[k.art];
  return `<div class="karte" style="--f:${a.farbe};--h:${a.hell}"><div class="innen">
    <div class="art">${emoHtml(a.emoji, 3.6)}${esc(a.name)}</div>
    <div class="bild">${emoHtml(k.emoji, 21)}</div>
    <div class="titel">${esc(k.titel)}</div>
    <div class="text">${esc(k.text)}</div>
    ${k.art === 'joker' ? '<div class="behalten">Behalte diese Karte!</div>' : ''}
    <div class="fuss">${esc(D.titel)}</div>
  </div></div>`;
}
function leereKarte() {
  return `<div class="karte" style="--f:#757575;--h:#fafafa"><div class="innen">
    <div class="art">${emoHtml('✏️', 3.6)}Eigene Idee</div>
    <div class="bild" style="width:22mm;height:22mm;margin-bottom:1mm"></div>
    <div class="linien"><div></div><div></div><div></div><div></div><div></div><div></div></div>
    <div class="fuss">${esc(D.titel)}</div>
  </div></div>`;
}
function kartenRueckseite() {
  const funken = [[8, 10, 5], [46, 14, 4], [12, 66, 4], [44, 70, 6], [28, 6, 3], [6, 40, 3], [51, 42, 3.5]]
    .map(([x, y, s]) => `<div class="funkeln" style="left:${x}mm;top:${y}mm">${emoHtml('✨', s)}</div>`).join('');
  return `<div class="karte"><div class="rueck">${funken}
    <div class="kreis">${emoHtml('⭐', 24)}</div>
    <div class="wort">Jakob-Karte</div>
    <div class="klein">${esc(D.titel)}</div>
  </div></div>`;
}

function kartenDatei() {
  const vorder = [];
  D.jakobKarten.forEach(k => { for (let i = 0; i < k.anzahl; i++) vorder.push(kartenVorderseite(k)); });
  for (let i = 0; i < D.leereKarten; i++) vorder.push(leereKarte());
  const marken = markenSvg(210, 297, schnittmarken(10.5, 16.5, 189, 264, [10.5 + KW, 10.5 + 2 * KW], [16.5 + KH, 16.5 + 2 * KH]));
  let body = '';
  const boegen = Math.ceil(vorder.length / 9);
  for (let b = 0; b < boegen; b++) {
    const teil = vorder.slice(b * 9, b * 9 + 9);
    body += `<div class="page"><div class="seitenhinweis" style="left:10.5mm;top:7mm">Jakob-Karten · Bogen ${b + 1}/${boegen} · Vorderseite</div><div class="raster">${teil.join('')}</div>${marken}</div>`;
    body += `<div class="page"><div class="seitenhinweis" style="left:10.5mm;top:7mm">Jakob-Karten · Bogen ${b + 1}/${boegen} · Rückseite</div><div class="raster">${Array(9).fill(kartenRueckseite()).join('')}</div>${marken}</div>`;
  }
  return { name: '03_Jakob-Karten_A4_beidseitig', html: htmlDoc('Jakob-Karten', KARTEN_CSS, body), anzahl: vorder.length };
}

// ======================================================================
// SUCHLISTEN (95 x 95 mm, 4 pro A4)
// ======================================================================
const SL = 95;
function suchlistenDatei() {
  const css = `
  @page{size:A4;margin:0}
  .page{width:210mm;height:297mm}
  .raster{position:absolute;left:10mm;top:20mm;display:grid;grid-template-columns:repeat(2,${SL}mm);grid-template-rows:repeat(2,${SL}mm);gap:0}
  .liste{width:${SL}mm;height:${SL}mm;padding:2mm;outline:0.15mm solid #ccc}
  .rahmen{width:100%;height:100%;border-radius:4mm;background:#fffdf5;border:1.4mm solid #ff8f00;display:flex;flex-direction:column;align-items:center;padding:2mm 3mm}
  .kopf{display:flex;align-items:center;gap:2mm;font-family:Fredoka;font-weight:700;font-size:6mm;color:#e65100;height:9mm}
  .nr{font-family:Fredoka;font-weight:500;font-size:3mm;color:#fff;background:#ff8f00;border-radius:2mm;padding:0.3mm 1.8mm;margin-left:1mm}
  .felder{display:grid;grid-template-columns:repeat(2,32mm);grid-template-rows:repeat(2,32mm);gap:3mm;margin-top:1.5mm}
  .slot{border:0.6mm dashed var(--f);border-radius:2.5mm;background:var(--h);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:0.6mm}
  .slot .emo{opacity:0.9}
  .slot .n{font-family:Fredoka;font-weight:600;font-size:3.6mm;color:#333;line-height:1}
  .slot .o{font-size:2.7mm;font-weight:800;color:var(--f);display:flex;align-items:center;gap:0.6mm;line-height:1}
  .tipp{margin-top:auto;font-size:2.7mm;font-weight:700;color:#8d6e63;display:flex;align-items:center;gap:1mm}
  `;
  const tint = (hex, a) => {
    const n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    const m = c => Math.round(c + (255 - c) * (1 - a));
    return `rgb(${m(r)},${m(g)},${m(b)})`;
  };
  const karte = (l, i) => `<div class="liste"><div class="rahmen">
    <div class="kopf">${emoHtml('📜', 7)}Suchliste<span class="nr">Nr. ${i + 1}</span></div>
    <div class="felder">${l.map(id => {
      const o = ortById[id];
      return `<div class="slot" style="--f:${o.farbe};--h:${tint(o.farbe, 0.12)}">${emoHtml(o.ding.emoji, 14)}<div class="n">${esc(o.ding.name)}</div><div class="o">${emoHtml(o.emoji, 3.2)}${esc(o.name)}</div></div>`;
    }).join('')}</div>
    <div class="tipp">Alles gefunden? Dann schnell zurück in Jakobs Zimmer! ${emoHtml('🏠', 3.4)}</div>
  </div></div>`;
  let body = '';
  const seiten = Math.ceil(D.suchlisten.length / 4);
  for (let s = 0; s < seiten; s++) {
    body += `<div class="page"><div class="seitenhinweis" style="left:10mm;top:11mm">Suchlisten · Bogen ${s + 1}/${seiten} · nur Vorderseite drucken</div>
      <div class="raster">${D.suchlisten.slice(s * 4, s * 4 + 4).map((l, i) => karte(l, s * 4 + i)).join('')}</div>
      ${markenSvg(210, 297, schnittmarken(10, 20, 190, 190, [10 + SL], [20 + SL]))}</div>`;
  }
  return { name: '04_Suchlisten_A4', html: htmlDoc('Suchlisten', css, body), tint };
}

// ======================================================================
// GEGENSTÄNDE (30 x 30 mm Plättchen, 6 x 8 = 48 auf einem A4-Bogen)
// ======================================================================
function gegenstaendeDatei(tint) {
  const P = 30, cols = 6, rows = 8, x0 = 15, y0 = 28.5;
  const css = `@page{size:A4;margin:0}.page{width:210mm;height:297mm}
  .raster{position:absolute;left:${x0}mm;top:${y0}mm;display:grid;grid-template-columns:repeat(${cols},${P}mm);grid-template-rows:repeat(${rows},${P}mm)}
  .chip{width:${P}mm;height:${P}mm;background:var(--h);display:flex;flex-direction:column;align-items:center;justify-content:center;outline:0.15mm solid #bbb;position:relative}
  .chip::before{content:'';position:absolute;inset:1.6mm;border:0.9mm solid var(--f);border-radius:2.5mm}
  .chip .n{font-family:Fredoka;font-weight:600;font-size:3.1mm;color:var(--f);margin-top:0.6mm;line-height:1}`;
  const chips = [];
  D.orte.forEach(o => { for (let i = 0; i < D.exemplareProDing; i++) chips.push(`<div class="chip" style="--f:${o.farbe};--h:${tint(o.farbe, 0.15)}">${emoHtml(o.ding.emoji, 16)}<div class="n">${esc(o.ding.name)}</div></div>`); });
  const xs = Array.from({ length: cols - 1 }, (_, i) => x0 + (i + 1) * P), ys = Array.from({ length: rows - 1 }, (_, i) => y0 + (i + 1) * P);
  const body = `<div class="page"><div class="seitenhinweis" style="left:15mm;top:14mm;font-size:3.2mm">Gegenstände · ${chips.length} Plättchen (je ${D.exemplareProDing}×) · auf Karton drucken, mit Lineal/Papierschneider an den Linien schneiden</div>
    <div class="raster">${chips.join('')}</div>${markenSvg(210, 297, schnittmarken(x0, y0, cols * P, rows * P, xs, ys))}</div>`;
  return { name: '05_Gegenstaende_A4', html: htmlDoc('Gegenstände', css, body) };
}

// ======================================================================
// SPIELFIGUREN (Falt-Aufsteller)
// ======================================================================
function figurFoto(id) {
  for (const ext of ['jpg', 'jpeg', 'png', 'webp']) {
    const f = path.join(FIG_DIR, `${id}.${ext}`);
    if (fs.existsSync(f)) {
      const mime = ext === 'jpg' ? 'jpeg' : ext;
      return `data:image/${mime};base64,` + fs.readFileSync(f).toString('base64');
    }
  }
  return null;
}
function figurPanel(fig, w, h) {
  // Ein Panel (Vorder- oder Rückseite), Koordinaten in mm, Ursprung oben links
  const foto = figurFoto(fig.id);
  const cx = w / 2, cy = 18, r = 12.5;
  let s = `<rect x="0" y="0" width="${w}" height="${h}" fill="${fig.farbe}"/>`;
  s += `<rect x="1.2" y="1.2" width="${w - 2.4}" height="${h - 2.4}" rx="3" fill="none" stroke="#fff" stroke-width="0.6" opacity="0.8"/>`;
  s += `<circle cx="${cx}" cy="${cy}" r="${r + 1.2}" fill="#fff"/>`;
  if (foto) {
    s += `<clipPath id="cp-${fig.id}-${w}"><circle cx="${cx}" cy="${cy}" r="${r}"/></clipPath>`;
    s += `<image href="${foto}" x="${cx - r}" y="${cy - r}" width="${2 * r}" height="${2 * r}" preserveAspectRatio="xMidYMid slice" clip-path="url(#cp-${fig.id}-${w})"/>`;
  } else {
    // Platzhalter-Silhouette
    const k = fig.kind ? 0.85 : 1;
    s += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#f5f5f5"/>`;
    s += `<g clip-path="none"><circle cx="${cx}" cy="${cy - 3.5 * k}" r="${4.6 * k}" fill="${fig.farbe}"/>`;
    s += `<path d="M${cx - 8.5 * k} ${cy + 10.5} Q${cx - 8.5 * k} ${cy + 2 * k} ${cx} ${cy + 2 * k} Q${cx + 8.5 * k} ${cy + 2 * k} ${cx + 8.5 * k} ${cy + 10.5} Z" fill="${fig.farbe}"/></g>`;
  }
  const fs_ = fig.name.length > 6 ? 4.6 : 5.4;
  s += `<rect x="2.5" y="${h - 13}" width="${w - 5}" height="9" rx="2.5" fill="#fff"/>`;
  s += `<text x="${cx}" y="${h - 6.8}" text-anchor="middle" font-family="Fredoka" font-weight="600" font-size="${fs_}" fill="${fig.farbe}">${esc(fig.name)}</text>`;
  return s;
}
function figurenDatei() {
  const W = 32, PH = 48, LA = 12, H = PH * 2 + LA * 2; // 32 x 120 mm Streifen
  const cols = 5, x0 = 25, y0 = 22, gapY = 13;
  let s = '';
  const marken = [];
  D.figuren.forEach((fig, i) => {
    const c = i % cols, r = Math.floor(i / cols);
    const x = x0 + c * (W + 0), y = y0 + r * (H + gapY);
    const lasche = (yy, oben) => `<rect x="${x}" y="${yy}" width="${W}" height="${LA}" fill="${fig.farbe}" opacity="0.35"/>
      <text x="${x + W / 2}" y="${yy + LA / 2 + 1.2}" text-anchor="middle" font-family="Nunito" font-weight="800" font-size="3" fill="#555" ${oben ? `transform="rotate(180 ${x + W / 2} ${yy + LA / 2})"` : ''}>Standfuß</text>`;
    s += lasche(y, true);
    // Rückseite: um 180° gedreht (wird über die Oberkante nach hinten gefaltet)
    s += `<g transform="translate(${x + W} ${y + LA + PH}) rotate(180)">${figurPanel(fig, W, PH)}</g>`;
    s += `<g transform="translate(${x} ${y + LA + PH})">${figurPanel(fig, W, PH)}</g>`;
    s += lasche(y + LA + 2 * PH, false);
    // Faltlinien
    [y + LA, y + LA + PH, y + LA + 2 * PH].forEach(yy => (s += `<line x1="${x}" y1="${yy}" x2="${x + W}" y2="${yy}" stroke="#333" stroke-width="0.3" stroke-dasharray="1.2 1"/>`));
    s += `<rect x="${x}" y="${y}" width="${W}" height="${H}" fill="none" stroke="#999" stroke-width="0.15"/>`;
    marken.push(schnittmarken(x, y, W, H));
  });
  const leg = `<div class="seitenhinweis" style="left:25mm;top:9mm;font-size:3.2mm;line-height:1.35;color:#555;width:165mm">
    <b>Spielfiguren</b> · Am Rand ausschneiden. An der mittleren gestrichelten Linie falten (das ist der Kopf der Figur),
    Vorder- und Rückseite zusammenkleben. Die beiden Standfüße an den äußeren Linien nach außen knicken – fertig.</div>`;
  const body = `<div class="page">${leg}<svg style="position:absolute;left:0;top:0" width="210mm" height="297mm" viewBox="0 0 210 297">${s}</svg>
    ${markenSvg(210, 297, '')}</div>`;
  return { name: '06_Spielfiguren_A4', html: htmlDoc('Spielfiguren', '@page{size:A4;margin:0}.page{width:210mm;height:297mm}', body) };
}

// ======================================================================
// SPIELREGEL (A4, 2 Seiten)
// ======================================================================
function regelDatei() {
  const ortChips = D.orte.map(o => `<span class="oc" style="--f:${o.farbe}">${emoHtml(o.emoji, 4.2)}${esc(o.name)} → ${emoHtml(o.ding.emoji, 4.2)}${esc(o.ding.name)}</span>`).join('');
  const ka = D.kartenarten;
  const artZeile = (k, t) => `<div class="kart" style="--f:${ka[k].farbe};--h:${ka[k].hell}"><b>${emoHtml(ka[k].emoji, 4)}${ka[k].name}</b><span>${t}</span></div>`;
  const css = `@page{size:A4;margin:0}
  .page{width:210mm;height:297mm;padding:13mm 15mm 12mm;background:#fffdf7}
  h1{font-family:Fredoka;font-weight:700;font-size:13mm;line-height:1;color:#d84315;display:flex;align-items:center;gap:3mm}
  .unter{font-family:Fredoka;font-weight:500;font-size:4.2mm;color:#6a1b9a;margin:2mm 0 4mm;display:flex;gap:5mm;flex-wrap:wrap}
  .unter span{display:flex;align-items:center;gap:1.2mm}
  h2{font-family:Fredoka;font-weight:600;font-size:5.6mm;color:#1565c0;margin:4.2mm 0 1.6mm;display:flex;align-items:center;gap:2mm;border-bottom:0.5mm solid #bbdefb;padding-bottom:0.8mm}
  p,li{font-size:3.55mm;line-height:1.42}
  ul,ol{padding-left:5.5mm}
  li{margin:0.6mm 0}
  b{font-weight:800}
  .story{background:#fff3e0;border-radius:4mm;padding:3mm 4mm;font-size:3.8mm;line-height:1.45;border-left:1.5mm solid #ff9800}
  .zwei{display:grid;grid-template-columns:1fr 1fr;gap:6mm}
  .oc{display:inline-flex;align-items:center;gap:0.8mm;font-size:3.1mm;font-weight:700;border:0.4mm solid var(--f);color:#333;border-radius:2mm;padding:0.4mm 1.6mm;margin:0.6mm 0.6mm 0 0}
  .oc .emo{display:inline-block}
  .kart{display:grid;grid-template-columns:30mm 1fr;align-items:center;background:var(--h);border-left:1.4mm solid var(--f);border-radius:1.5mm;padding:1.2mm 2.5mm;margin:1.3mm 0;font-size:3.4mm;line-height:1.35}
  .kart>b{display:flex;align-items:center;gap:1.2mm;color:var(--f);font-family:Fredoka;font-weight:600;font-size:4mm}
  .box{background:#e8f5e9;border-radius:4mm;padding:2.5mm 4mm;margin-top:2mm}
  .box.lila{background:#f3e5f5}
  .box.blau{background:#e3f2fd}
  .inl{display:inline-block;vertical-align:-0.8mm}
  .fuss{position:absolute;bottom:7mm;left:15mm;right:15mm;font-size:2.4mm;color:#aaa;display:flex;justify-content:space-between}
  `;
  const i = (ch, s = 4) => emoHtml(ch, s, 'inl');
  const seite1 = `<div class="page">
    <h1>${emoHtml('🔍', 12)}${esc(D.titel)}</h1>
    <div class="unter"><span>${i('👨‍👩‍👧‍👦', 4.5)} 2–6 Spieler · bis 10 im Team</span><span>${i('🎂', 4.5)} ab 7 Jahren</span><span>${i('⏱️', 4.5)} ca. 30–45 Minuten</span></div>
    <div class="story">Oje! Jakob hat beim Spielen seine Lieblingssachen überall verteilt – im Wald, im Zoo, im Schwimmbad … Jetzt hilft die ganze Familie beim Suchen.
    <b>Wer zuerst alle Sachen von seiner Suchliste findet und zurück in Jakobs Zimmer bringt, gewinnt!</b></div>

    <div class="zwei">
    <div>
      <h2>${emoHtml('📦', 6)}Inhalt</h2>
      <ul>
        <li>1 Spielplan</li>
        <li>10 Spielfiguren</li>
        <li>${D.orte.length * D.exemplareProDing} Gegenstände (je ${D.exemplareProDing}× ${D.orte.length} Sorten)</li>
        <li>${D.suchlisten.length} Suchlisten</li>
        <li>${D.jakobKarten.reduce((a, k) => a + k.anzahl, 0)} Jakob-Karten (+ ${D.leereKarten} leere für eigene Ideen)</li>
        <li>1 Würfel</li>
      </ul>
    </div>
    <div>
      <h2>${emoHtml('🧩', 6)}Vorbereitung</h2>
      <ol>
        <li>Jeder sucht sich eine <b>Figur</b> aus und stellt sie in <b>Jakobs Zimmer</b> (Mitte).</li>
        <li>Die <b>Gegenstände</b> nach Sorten neben den Plan legen (Vorrat).</li>
        <li><b>Suchlisten</b> mischen, jeder zieht eine und legt sie <b>offen</b> vor sich.</li>
        <li><b>Jakob-Karten</b> mischen und verdeckt bereitlegen.</li>
        <li>Die <b>jüngste</b> Person beginnt, dann geht es im Uhrzeigersinn weiter.</li>
      </ol>
    </div>
    </div>

    <h2>${emoHtml('🗺️', 6)}Wo liegt was?</h2>
    <p>Jeder Ort hat einen Gegenstand. Das kleine Bild am Ort zeigt, was man dort findet:</p>
    <div>${ortChips}</div>

    <h2>${emoHtml('🎲', 6)}So spielst du</h2>
    <ol>
      <li><b>Würfeln</b> und genau so viele Felder ziehen.</li>
      <li><b>Die Richtung darfst du jedes Mal selbst wählen</b> – vorwärts oder rückwärts. Nur während eines Zuges darfst du nicht umdrehen.</li>
      <li>An den <b>4 Abzweigungen</b> (Spielplatz, Bäckerei, Bahnhof, Schwimmbad) darfst du in Richtung Mitte abbiegen.
          <b>Jakobs Zimmer zählt als 1 Feld.</b> Du darfst einfach hindurchgehen und auf einem anderen Weg wieder hinaus – eine tolle Abkürzung!</li>
      <li>Auf einem Feld dürfen beliebig viele Figuren stehen.</li>
    </ol>
    <div class="box blau" style="margin-top:2mm"><p><b>Beispiel:</b> Du stehst in Jakobs Zimmer und würfelst eine <b>3</b>. Damit kommst du genau zum Spielplatz, zur Bäckerei, zum Bahnhof oder zum Schwimmbad – du suchst dir aus, wohin.</p></div>

    <h2>${emoHtml('📍', 6)}Wo bist du gelandet?</h2>
    <ul>
      <li><b>Auf einem Ort:</b> Steht der Gegenstand dieses Ortes auf deiner Suchliste und hast du ihn noch nicht? Dann nimm ihn dir aus dem Vorrat und leg ihn auf deine Liste. Das gilt auch, wenn dich eine Karte dorthin schickt.</li>
      <li><b>Auf einem Sternfeld</b> ${i('⭐', 3.6)}: Zieh eine <b>Jakob-Karte</b>, lies sie vor (Große helfen Kleinen gern!) und mach, was draufsteht. Danach kommt sie unter den Stapel.</li>
      <li><b>Auf einem leeren Feld:</b> Nichts passiert – der Nächste ist dran.</li>
    </ul>
    <div class="fuss"><span>${esc(D.titel)} · Spielregel</span><span>Seite 1/2</span></div>
  </div>`;

  const seite2 = `<div class="page">
    <h2 style="margin-top:0">${emoHtml('🃏', 6)}Die Jakob-Karten</h2>
    ${artZeile('glueck', 'Gute Nachrichten! Du kommst schneller voran.')}
    ${artZeile('hoppla', 'Jakob hat eine Idee – und du musst mit. Manchmal hilft das sogar!')}
    ${artZeile('miteinander', 'Jetzt machen alle mit: lachen, raten, singen. Oft dürfen mehrere ziehen.')}
    ${artZeile('joker', '<b>Behalte diese Karte</b> offen vor dir und spiel sie, wann du willst. Du darfst höchstens <b>2 Joker</b> haben. Danach kommt sie unter den Stapel.')}
    <p style="margin-top:1.5mm">Wichtig: Eine neue Jakob-Karte gibt es nur, wenn du <b>mit dem Würfel</b> auf einem Stern landest. Bringt dich eine Karte auf ein Sternfeld, ziehst du keine weitere Karte.</p>

    <h2>${emoHtml('🏆', 6)}Wer gewinnt?</h2>
    <p>Hast du <b>alle 4 Gegenstände</b> deiner Suchliste? Dann ab nach Hause! Wer als Erstes <b>Jakobs Zimmer</b> erreicht, gewinnt.
    Du musst das Zimmer <b>nicht genau</b> treffen – übrige Würfelpunkte verfallen. Wer möchte, spielt danach um die weiteren Plätze weiter.</p>

    <h2>${emoHtml('👫', 6)}Team-Spiel für 7 bis 10 Personen</h2>
    <div class="box blau">
    <ul>
      <li>Bildet <b>Zweier-Teams</b> (bei einer ungeraden Zahl gibt es ein Dreier-Team). Jede Person spielt mit ihrer eigenen Figur.</li>
      <li>Jedes Team hat <b>eine gemeinsame Suchliste</b>. Die Teams sind reihum dran. Im Team wird abwechselnd gewürfelt.</li>
      <li>Nach dem Würfeln entscheidet das Team gemeinsam, <b>welche seiner Figuren</b> zieht.</li>
      <li>Gegenstände, die irgendeine Figur des Teams findet, gehören dem ganzen Team. Auch Joker gehören dem Team (höchstens 2).</li>
      <li>Das Team gewinnt, sobald die Liste voll ist und <b>eine</b> seiner Figuren Jakobs Zimmer erreicht.</li>
    </ul>
    <p style="margin-top:1mm">Tipp: Das Team-Spiel klappt auch mit weniger Personen – zum Beispiel Groß und Klein zusammen.</p>
    </div>

    <h2>${emoHtml('⚙️', 6)}Varianten</h2>
    <div class="box">
      <p><b>${i('🐣')} Für die Kleinsten:</b> Ein Gegenstand darf schon eingesammelt werden, wenn man an seinem Ort nur <b>vorbeizieht</b>.</p>
      <p><b>${i('⏩')} Kurzes Spiel:</b> Es reichen <b>3 Gegenstände</b> – einen beliebigen auf der Liste vorher abdecken.</p>
    </div>
    <div class="box lila">
      <p><b>${i('🧠')} Für Profis:</b> Suchlisten werden <b>geheim</b> gehalten. Jakobs Zimmer muss am Schluss <b>genau</b> erreicht werden, und jeder darf nur <b>1 Joker</b> auf der Hand haben.</p>
    </div>

    <h2>${emoHtml('✏️', 6)}Eigene Karten</h2>
    <p>Auf die leeren Karten könnt ihr eigene Ideen schreiben – etwa Jakobs Lieblingswitz oder eine kleine Aufgabe für alle – und sie in den Stapel mischen.</p>
    <p style="margin-top:5mm;text-align:center;font-family:Fredoka;font-size:5mm;color:#d84315">Viel Spaß beim Suchen! ${i('🧸', 5)}${i('⚽', 5)}${i('🔦', 5)}</p>
    <div class="fuss"><span>${esc(D.titel)} · Spielregel · Bilder: Twemoji (CC-BY 4.0)</span><span>Seite 2/2</span></div>
  </div>`;
  return { name: '02_Spielregel_A4', html: htmlDoc('Spielregel', css, seite1 + seite2) };
}

// ======================================================================
// SCHACHTELDECKEL (A4 quer)
// ======================================================================
function deckelDatei() {
  const css = `@page{size:A4 landscape;margin:0}
  .page{width:297mm;height:210mm;background:radial-gradient(circle at 50% 40%,#e8f5d0 0,#b9dc8f 80%);display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center}
  .rahmen{position:absolute;inset:6mm;border:2mm solid #fff;border-radius:8mm}
  .t1{font-family:Fredoka;font-weight:700;font-size:26mm;color:#d84315;line-height:1}
  .t2{font-family:Fredoka;font-weight:700;font-size:22mm;color:#1565c0;line-height:1.05}
  .reihe{display:flex;gap:5mm;margin:7mm 0 6mm}
  .reihe div{width:22mm;height:22mm;border-radius:50%;background:#fff;display:flex;align-items:center;justify-content:center;box-shadow:0 0 0 1.5mm var(--f)}
  .info{font-family:Fredoka;font-weight:500;font-size:6mm;color:#33691e}
  .widmung{font-family:Fredoka;font-weight:500;font-size:5.5mm;color:#6a1b9a;margin-top:5mm}
  .ecke{position:absolute}`;
  const deko = [['🦋', 18, 16, 14], ['🌼', 262, 18, 12], ['🐞', 20, 174, 11], ['🍄', 262, 172, 12], ['⭐', 40, 40, 8], ['⭐', 246, 150, 8]]
    .map(([e, x, y, s]) => `<div class="ecke" style="left:${x}mm;top:${y}mm">${emoHtml(e, s)}</div>`).join('');
  const body = `<div class="page"><div class="rahmen"></div>${deko}
    <div class="t1">Jakobs große</div><div class="t2">Schatzsuche ${emoHtml('🔍', 18, 'inl')}</div>
    <div class="reihe">${D.orte.map(o => `<div style="--f:${o.farbe}">${emoHtml(o.ding.emoji, 14)}</div>`).join('')}</div>
    <div class="info">2–6 Spieler · bis 10 im Team · ab 7 Jahren · ca. 30–45 Minuten</div>
    ${D.widmung ? `<div class="widmung">${esc(D.widmung)}</div>` : ''}
  </div>`;
  return { name: '07_Schachteldeckel_A4', html: htmlDoc('Schachteldeckel', css + '.inl{display:inline-block;vertical-align:-2mm}', body) };
}

// ======================================================================
async function main() {
  const sl = suchlistenDatei();
  const dateien = [...planDateien(), regelDatei(), kartenDatei(), sl, gegenstaendeDatei(sl.tint), figurenDatei(), deckelDatei()];
  const browser = await chromium.launch();
  const page = await browser.newPage();
  for (const d of dateien) {
    const htmlPfad = path.join(BUILD, d.name + '.html');
    fs.writeFileSync(htmlPfad, d.html);
    await page.goto('file://' + htmlPfad, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    await page.pdf({ path: path.join(DRUCK, d.name + '.pdf'), preferCSSPageSize: true, printBackground: true });
    console.log('✔', d.name + '.pdf');
  }
  await browser.close();
}
main().catch(e => { console.error(e); process.exit(1); });
