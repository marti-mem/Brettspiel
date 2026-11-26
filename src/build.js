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
// Illustrationen (Pixar-Stil) ersetzen Emojis, wenn eine Bilddatei in assets/ liegt
const ASSET = {};
const assetUri = {};
function assetDaten(datei) {
  if (!assetUri[datei]) assetUri[datei] = 'data:image/png;base64,' + fs.readFileSync(datei).toString('base64');
  return assetUri[datei];
}
function assetsRegistrieren() {
  const reg = (emoji, rel) => { const f = path.join(ROOT, 'assets', rel); if (emoji && fs.existsSync(f)) ASSET[emoji] = f; };
  D.orte.forEach(o => { reg(o.emoji, `orte/${o.id}.png`); reg(o.ding.emoji, `zutaten/${o.id}.png`); });
  reg(D.zentrum.emoji, 'zentrum.png');
  const kd = path.join(ROOT, 'assets/karten');
  if (fs.existsSync(kd)) fs.readdirSync(kd).filter(f => f.endsWith('.png')).forEach(f => {
    const ch = String.fromCodePoint(...f.replace('.png', '').split('-').map(h => parseInt(h, 16)));
    if (!ASSET[ch]) ASSET[ch] = path.join(kd, f);
  });
}
const assetFuer = ch => ASSET[ch] || ASSET[ch.replace(/\uFE0F/g, '')];
// Emoji in einem SVG (Koordinaten in mm), zentriert auf cx/cy
const emoSvg = (ch, cx, cy, size, extra = '') => assetFuer(ch)
  ? `<image href="${assetDaten(assetFuer(ch))}" x="${cx - size * 0.62}" y="${cy - size * 0.62}" width="${size * 1.24}" height="${size * 1.24}" ${extra}/>`
  : `<svg x="${cx - size / 2}" y="${cy - size / 2}" width="${size}" height="${size}" viewBox="0 0 36 36" ${extra}>${emojiInner(ch)}</svg>`;
// Emoji in HTML
const emoHtml = (ch, size, cls = '') => assetFuer(ch)
  ? `<img class="emo ${cls}" style="width:${size * 1.24}mm;height:${size * 1.24}mm;margin:${-size * 0.12}mm" src="${assetDaten(assetFuer(ch))}">`
  : `<svg class="emo ${cls}" style="width:${size}mm;height:${size}mm" viewBox="0 0 36 36">${emojiInner(ch)}</svg>`;

// ---------- Bild-Hilfen für das neue Design ----------
function bildUri(rel) {
  const f = path.join(ROOT, 'assets', rel);
  if (!fs.existsSync(f)) return null;
  return assetDaten(f).replace('data:image/png', rel.endsWith('.jpg') ? 'data:image/jpeg' : 'data:image/png');
}
const sternHtml = (mm, farbe = '#d4a537') => `<svg class="inl" style="width:${mm}mm;height:${mm}mm" viewBox="-10 -10 20 20"><path d="${stern5(0, 0.8, 9.5)}" fill="${farbe}"/></svg>`;
const sternfeldHtml = mm => `<svg class="inl" style="width:${mm}mm;height:${mm}mm" viewBox="-10 -10 20 20"><circle r="9.4" fill="#c8102e" stroke="#d4a537" stroke-width="1.2"/><path d="${stern5(0, 0.6, 6)}" fill="#f0d48a"/></svg>`;
const stechpalmeHtml = (mm, rot = 0) => `<svg style="width:${mm}mm;height:${mm * 0.6}mm" viewBox="-18 -13 36 16"><g transform="rotate(${rot})">${stechpalme(0, 0, 1, 0)}</g></svg>`;

// ---------- gemeinsames CSS ----------
const fontUrl = f => 'file://' + path.join(ROOT, 'node_modules/@fontsource', f);
const BASIS_CSS = `
@font-face{font-family:Fredoka;font-weight:400;src:url(${fontUrl('fredoka/files/fredoka-latin-400-normal.woff2')})}
@font-face{font-family:Fredoka;font-weight:500;src:url(${fontUrl('fredoka/files/fredoka-latin-500-normal.woff2')})}
@font-face{font-family:Fredoka;font-weight:600;src:url(${fontUrl('fredoka/files/fredoka-latin-600-normal.woff2')})}
@font-face{font-family:Fredoka;font-weight:700;src:url(${fontUrl('fredoka/files/fredoka-latin-700-normal.woff2')})}
@font-face{font-family:'DM Serif Display';font-style:italic;font-weight:400;src:url(${fontUrl('dm-serif-display/files/dm-serif-display-latin-400-italic.woff2')})}
@font-face{font-family:'DM Serif Display';font-weight:400;src:url(${fontUrl('dm-serif-display/files/dm-serif-display-latin-400-normal.woff2')})}
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

// ---------- Modernes Weihnachtsdesign ----------
const P = {
  gruen1: '#215f48', gruen2: '#123d2f', creme: '#fbf4e6', creme2: '#f3e6cc',
  gold: '#d4a537', goldHell: '#f0d48a', rot: '#c8102e', rotDunkel: '#9e0c24', tanne: '#1f6b4a',
};
const SERIF = "'DM Serif Display', serif";

// Hintergrund: Winterlandschaft (Illustration), füllt w x h ab (x0, y0)
function planHintergrund(x0, y0, w, h) {
  const f = path.join(ROOT, 'assets/hintergrund.jpg');
  if (!fs.existsSync(f)) return `<rect x="${x0}" y="${y0}" width="${w}" height="${h}" fill="#cfdff3"/>`;
  const uri = 'data:image/jpeg;base64,' + fs.readFileSync(f).toString('base64');
  return `<image href="${uri}" x="${x0}" y="${y0}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid slice"/>`;
}
// vierzackiger Funkelstern
function stern4(x, y, r) {
  const q = r * 0.28;
  return `M${x} ${y - r} Q${x + q} ${y - q} ${x + r} ${y} Q${x + q} ${y + q} ${x} ${y + r} Q${x - q} ${y + q} ${x - r} ${y} Q${x - q} ${y - q} ${x} ${y - r}Z`;
}
// fünfzackiger Stern
function stern5(x, y, ra, ri = ra * 0.45) {
  let d = '';
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? ri : ra;
    d += (i ? 'L' : 'M') + (x + Math.cos(a) * rr).toFixed(2) + ' ' + (y + Math.sin(a) * rr).toFixed(2);
  }
  return d + 'Z';
}
// Stechpalmen-Zweig
function stechpalme(x, y, s = 1, rot = 0) {
  return `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})">
    <path d="M0 0 C-6 -3 -12 -2 -16 -7 C-12 -6 -11 -10 -7 -9 C-6 -12 -2 -11 0 0Z" fill="${P.tanne}"/>
    <path d="M0 0 C6 -3 12 -2 16 -7 C12 -6 11 -10 7 -9 C6 -12 2 -11 0 0Z" fill="#2e8a5f"/>
    <circle cx="-2.2" cy="-1.5" r="2.3" fill="${P.rot}"/><circle cx="2.2" cy="-1.5" r="2.3" fill="${P.rot}"/><circle cx="0" cy="-4.2" r="2.3" fill="#e2263f"/>
  </g>`;
}

function planInhalt() {
  const { ring, speichen } = planGeometrie();
  let s = '';

  // Weg: goldener Rand, cremefarbenes Band
  const ringPfad = 'M' + ring.map(f => `${f.x} ${f.y}`).join(' L') + ' Z';
  const speichenPfad = speichen.map(sp => `M${sp.von.x} ${sp.von.y} L${C.x} ${C.y}`).join(' ');
  s += `<path d="${ringPfad} ${speichenPfad}" fill="none" stroke="#1b2f5a" stroke-opacity="0.28" stroke-width="25" stroke-linejoin="round" transform="translate(0 1.2)"/>`;
  s += `<path d="${ringPfad} ${speichenPfad}" fill="none" stroke="${P.gold}" stroke-width="24" stroke-linejoin="round" stroke-linecap="round"/>`;
  s += `<path d="${ringPfad} ${speichenPfad}" fill="none" stroke="${P.creme}" stroke-width="20.5" stroke-linejoin="round" stroke-linecap="round"/>`;
  s += `<path d="${ringPfad} ${speichenPfad}" fill="none" stroke="${P.gold}" stroke-opacity="0.55" stroke-width="0.6" stroke-dasharray="0.1 3.2" stroke-linecap="round" stroke-linejoin="round"/>`;

  // Karten-Felder in den vier Vierteln
  const kasten = (cx, cy) => `<rect x="${cx - 58}" y="${cy - 50}" width="116" height="100" rx="12" fill="#1b2f5a" opacity="0.26" transform="translate(0 1.5)"/>
    <rect x="${cx - 58}" y="${cy - 50}" width="116" height="100" rx="12" fill="${P.creme}"/>
    <rect x="${cx - 55}" y="${cy - 47}" width="110" height="94" rx="9.5" fill="none" stroke="${P.gold}" stroke-width="0.7"/>`;

  const titelBlock = (cx, cy, rot) => `<g transform="rotate(${rot} ${cx} ${cy})">${kasten(cx, cy)}
    ${stechpalme(cx - 40, cy - 32, 0.85, -18)}${stechpalme(cx + 40, cy + 38, 0.85, 162)}
    <path d="${stern5(cx + 41, cy - 35, 4.2)}" fill="${P.gold}"/><path d="${stern4(cx - 43, cy + 33, 3.2)}" fill="${P.gold}"/>
    <text x="${cx}" y="${cy - 20}" text-anchor="middle" font-family="${SERIF}" font-size="15" fill="${P.rot}">${esc(D.titelZeilen[0])}</text>
    <text x="${cx}" y="${cy - 8.5}" text-anchor="middle" font-family="${SERIF}" font-style="italic" font-size="10" fill="${P.gold}">${esc(D.titelZeilen[1])}</text>
    <text x="${cx}" y="${cy + 6.5}" text-anchor="middle" font-family="${SERIF}" font-size="14" fill="${P.tanne}">${esc(D.titelZeilen[2])}</text>
    <text x="${cx}" y="${cy + 20}" text-anchor="middle" font-family="${SERIF}" font-size="14" fill="${P.tanne}">${esc(D.titelZeilen[3])}</text>
    <line x1="${cx - 22}" y1="${cy + 25.5}" x2="${cx + 22}" y2="${cy + 25.5}" stroke="${P.gold}" stroke-width="0.6"/>
    <text x="${cx}" y="${cy + 32}" text-anchor="middle" font-family="Nunito" font-weight="700" font-size="3.6" letter-spacing="0.2" fill="#7a6a4f">${esc((D.untertitel || '').toUpperCase())}</text>
  </g>`;

  const kalender = (cx, cy) => {
    let g = kasten(cx, cy);
    g += `<text x="${cx}" y="${cy - 34}" text-anchor="middle" font-family="${SERIF}" font-size="9" fill="${P.rot}">Adventskalender</text>`;
    const farben = [P.rot, P.tanne, P.gold];
    const reihen = [[7, 15, 3, 21, 11, 18], [24, 1, 9, 13, 5, 20], [12, 17, 22, 2, 16, 8], [4, 19, 10, 6, 23, 14]];
    reihen.forEach((reihe, ri) => reihe.forEach((n, ci) => {
      const x = cx - 48 + ci * 16, y = cy - 28 + ri * 15;
      const f = n === 24 ? P.rotDunkel : farben[(ri + ci) % 3];
      g += `<rect x="${x + 0.7}" y="${y + 0.7}" width="14.6" height="13.6" rx="3" fill="${f}"/>`;
      if (n === 24) g += `<rect x="${x + 1.6}" y="${y + 1.6}" width="12.8" height="11.8" rx="2.4" fill="none" stroke="${P.goldHell}" stroke-width="0.7"/>`;
      g += `<text x="${x + 8}" y="${y + 10.2}" text-anchor="middle" font-family="${SERIF}" font-size="${n === 24 ? 8 : 7}" fill="${n === 24 ? P.goldHell : '#fff'}">${n}</text>`;
    }));
    g += `<text x="${cx}" y="${cy + 43}" text-anchor="middle" font-family="Nunito" font-weight="700" font-size="3.7" fill="#7a6a4f">für das Spiel „Gemeinsam bis Heiligabend“</text>`;
    return g;
  };

  const legende = (cx, cy, rot) => {
    const o = D.orte[7];
    const zeilen = [
      { icon: `<circle r="7" fill="${P.rot}"/><path d="${stern5(0, 0.4, 4.6)}" fill="${P.goldHell}"/>`, t1: 'Sternfeld', t2: D.kartenName + ' ziehen' },
      { icon: `<circle r="7" fill="#fff" stroke="${o.farbe}" stroke-width="1.6"/>${emoSvg(o.ding.emoji, 0, 0, 8)}`, t1: 'Ort', t2: 'Zutat einsammeln' },
      { icon: fs.existsSync(path.join(ROOT, 'assets/susi_mitte.jpg'))
        ? `<clipPath id="legSusi"><circle r="6.6"/></clipPath><image href="data:image/jpeg;base64,${fs.readFileSync(path.join(ROOT, 'assets/susi_mitte.jpg')).toString('base64')}" x="-6.6" y="-6.6" width="13.2" height="13.2" preserveAspectRatio="xMidYMid slice" clip-path="url(#legSusi)"/><circle r="6.8" fill="none" stroke="${P.gold}" stroke-width="1"/>`
        : `<circle r="7" fill="${P.creme2}" stroke="${P.gold}" stroke-width="1"/>${emoSvg(D.zentrum.emoji, 0, 0, 8.5)}`, t1: D.zentrum.name, t2: 'Start und Ziel' },
    ];
    let g = `<g transform="rotate(${rot} ${cx} ${cy})">${kasten(cx, cy)}`;
    g += `<text x="${cx}" y="${cy - 31}" text-anchor="middle" font-family="${SERIF}" font-size="9" fill="${P.tanne}">So geht's</text>`;
    zeilen.forEach((z, i) => {
      const y = cy - 15 + i * 21, x = cx - 44;
      g += `<g transform="translate(${x} ${y})">${z.icon}</g>`;
      g += `<text x="${x + 12}" y="${y - 1}" font-family="Fredoka" font-weight="600" font-size="5.4" fill="#2b2b2b">${esc(z.t1)}</text>`;
      g += `<text x="${x + 12}" y="${y + 5.5}" font-family="Nunito" font-weight="700" font-size="4.5" fill="#6b5d45">${esc(z.t2)}</text>`;
    });
    return g + '</g>';
  };
  const susiKarte = (cx, cy) => {
    const f = path.join(ROOT, 'assets/susi_kueche.jpg');
    if (!fs.existsSync(f)) return titelBlock(cx, cy, 180);
    const uri = 'data:image/jpeg;base64,' + fs.readFileSync(f).toString('base64');
    const x = cx - 58, y = cy - 50, w = 116, h = 100;
    let g = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="12" fill="#1b2f5a" opacity="0.28" transform="translate(0 1.5)"/>`;
    g += `<clipPath id="susiClip"><rect x="${x + 2.2}" y="${y + 2.2}" width="${w - 4.4}" height="${h - 4.4}" rx="10"/></clipPath>`;
    g += `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="12" fill="${P.creme}"/>`;
    g += `<image href="${uri}" x="${x + 2.2}" y="${y + 2.2}" width="${w - 4.4}" height="${h - 4.4}" preserveAspectRatio="xMidYMid slice" clip-path="url(#susiClip)"/>`;
    g += `<rect x="${x + 2.2}" y="${y + 2.2}" width="${w - 4.4}" height="${h - 4.4}" rx="10" fill="none" stroke="${P.gold}" stroke-width="0.9"/>`;
    // Sprechblase
    const bx = cx + 6, by = cy - 44, bw = 48, bh = 17;
    g += `<path d="M${bx + 6} ${by + bh - 0.5} L${bx - 7} ${by + bh + 7} L${bx + 13} ${by + bh - 0.5}Z" fill="#fffdf8" stroke="${P.gold}" stroke-width="0.6"/>`;
    g += `<rect x="${bx}" y="${by}" width="${bw}" height="${bh}" rx="8" fill="#fffdf8" stroke="${P.gold}" stroke-width="0.6"/>`;
    g += `<path d="M${bx + 6.2} ${by + bh - 0.9} L${bx + 12.8} ${by + bh - 0.9}" stroke="#fffdf8" stroke-width="1.4"/>`;
    g += `<text x="${bx + bw / 2}" y="${by + 7.2}" text-anchor="middle" font-family="Fredoka" font-weight="600" font-size="5" fill="${P.rot}">Hilfe! Mir fehlen</text>`;
    g += `<text x="${bx + bw / 2}" y="${by + 13.2}" text-anchor="middle" font-family="Fredoka" font-weight="600" font-size="5" fill="${P.rot}">noch Zutaten!</text>`;
    return g;
  };
  s += titelBlock(118, 118, 0) + titelBlock(282, 282, 180) + kalender(282, 118) + legende(118, 282, 180);

  // Felder
  s += `<defs><radialGradient id="fCreme" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="${P.creme2}"/></radialGradient>
    <radialGradient id="fRot" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="#e8304a"/><stop offset="1" stop-color="${P.rotDunkel}"/></radialGradient>
    <radialGradient id="oCreme" cx="50%" cy="38%" r="65%"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#e9eef7"/></radialGradient></defs>`;
  const feld = f => {
    let g = `<circle cx="${f.x}" cy="${f.y + 0.8}" r="${R_FELD}" fill="#1b2f5a" opacity="0.22"/>`;
    if (f.typ === 'stern') {
      g += `<circle cx="${f.x}" cy="${f.y}" r="${R_FELD}" fill="url(#fRot)" stroke="${P.gold}" stroke-width="1.3"/>`;
      g += `<circle cx="${f.x}" cy="${f.y}" r="${R_FELD - 2.6}" fill="none" stroke="${P.goldHell}" stroke-width="0.5" stroke-dasharray="0.1 1.6" stroke-linecap="round"/>`;
      g += `<path d="${stern5(f.x, f.y + 0.6, 8)}" fill="${P.goldHell}"/>`;
      return g;
    }
    g += `<circle cx="${f.x}" cy="${f.y}" r="${R_FELD}" fill="url(#fCreme)" stroke="${P.gold}" stroke-width="1.3"/>`;
    g += `<circle cx="${f.x}" cy="${f.y}" r="${R_FELD - 2.6}" fill="none" stroke="${P.creme2}" stroke-width="0.8"/>`;
    return g;
  };
  ring.filter(f => f.typ !== 'ort').forEach(f => (s += feld(f)));
  speichen.forEach(sp => sp.felder.forEach(f => (s += feld(f))));

  // Orte
  ring.filter(f => f.typ === 'ort').forEach(f => {
    const o = f.ort;
    s += `<circle cx="${f.x}" cy="${f.y + 1.2}" r="${R_ORT + 1}" fill="#1b2f5a" opacity="0.28"/>`;
    s += `<circle cx="${f.x}" cy="${f.y}" r="${R_ORT + 1}" fill="${P.gold}"/>`;
    s += `<circle cx="${f.x}" cy="${f.y}" r="${R_ORT - 0.6}" fill="${o.farbe}"/>`;
    s += `<circle cx="${f.x}" cy="${f.y - 1}" r="${R_ORT - 3.2}" fill="url(#oCreme)"/>`;
    s += emoSvg(o.emoji, f.x, f.y - 5, 33);
    const fs_ = o.name.length > 10 ? 4.3 : 4.8;
    const bw = Math.max(34, o.name.length * fs_ * 0.56 + 9);
    s += `<rect x="${f.x - bw / 2}" y="${f.y + 13.2}" width="${bw}" height="8.6" rx="4.3" fill="${o.farbe}" stroke="${P.gold}" stroke-width="0.8"/>`;
    s += `<text x="${f.x}" y="${f.y + 19.1}" text-anchor="middle" font-family="Fredoka" font-weight="600" font-size="${fs_}" fill="#fff">${esc(o.name)}</text>`;
    const a = ((f.x < 200 ? -135 : -45) * Math.PI) / 180;
    const bx = f.x + Math.cos(a) * 25.5, by = f.y + Math.sin(a) * 25.5;
    s += `<circle cx="${bx}" cy="${by + 0.6}" r="9" fill="#1b2f5a" opacity="0.26"/>`;
    s += `<circle cx="${bx}" cy="${by}" r="9" fill="#fffdf8" stroke="${P.gold}" stroke-width="1.4"/>`;
    s += emoSvg(o.ding.emoji, bx, by, 11.5);
  });

  // Zentrum mit Adventskranz
  s += `<circle cx="${C.x}" cy="${C.y + 1.5}" r="${R_ZIMMER + 5}" fill="#1b2f5a" opacity="0.28"/>`;
  const kranz = rng(5);
  for (let i = 0; i < 64; i++) {
    const a = (i / 64) * Math.PI * 2, rr = R_ZIMMER + 1.5 + (kranz() - 0.5) * 3;
    const x = C.x + Math.cos(a) * rr, y = C.y + Math.sin(a) * rr;
    const farbe = [P.tanne, '#2e8a5f', '#17573b'][i % 3];
    s += `<ellipse cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" rx="5.2" ry="2.1" fill="${farbe}" transform="rotate(${((a * 180) / Math.PI + 90 + (kranz() - 0.5) * 70).toFixed(1)} ${x.toFixed(2)} ${y.toFixed(2)})"/>`;
  }
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2 + 0.2, rr = R_ZIMMER + 2.5;
    s += `<circle cx="${(C.x + Math.cos(a) * rr).toFixed(2)}" cy="${(C.y + Math.sin(a) * rr).toFixed(2)}" r="1.6" fill="${i % 2 ? P.rot : P.goldHell}"/>`;
  }
  const susiF = path.join(ROOT, 'assets/susi_mitte.jpg');
  if (fs.existsSync(susiF)) {
    const uri = 'data:image/jpeg;base64,' + fs.readFileSync(susiF).toString('base64');
    const r = R_ZIMMER - 2;
    s += `<clipPath id="mitteClip"><circle cx="${C.x}" cy="${C.y}" r="${r}"/></clipPath>`;
    s += `<image href="${uri}" x="${C.x - r}" y="${C.y - r}" width="${2 * r}" height="${2 * r}" preserveAspectRatio="xMidYMid slice" clip-path="url(#mitteClip)"/>`;
    s += `<circle cx="${C.x}" cy="${C.y}" r="${r}" fill="none" stroke="${P.gold}" stroke-width="1.6"/>`;
    // Namensband
    const bw = 66, by = C.y + 17;
    s += `<path d="M${C.x - bw / 2 - 5} ${by + 2} L${C.x - bw / 2} ${by + 2} L${C.x - bw / 2} ${by + 13} L${C.x - bw / 2 - 5} ${by + 13} L${C.x - bw / 2 - 2.5} ${by + 7.5}Z" fill="${P.rotDunkel}"/>`;
    s += `<path d="M${C.x + bw / 2 + 5} ${by + 2} L${C.x + bw / 2} ${by + 2} L${C.x + bw / 2} ${by + 13} L${C.x + bw / 2 + 5} ${by + 13} L${C.x + bw / 2 + 2.5} ${by + 7.5}Z" fill="${P.rotDunkel}"/>`;
    s += `<rect x="${C.x - bw / 2}" y="${by}" width="${bw}" height="13.5" rx="2" fill="${P.rot}" stroke="${P.gold}" stroke-width="0.7"/>`;
    s += `<text x="${C.x}" y="${by + 6.3}" text-anchor="middle" font-family="${SERIF}" font-size="5.4" fill="#fff">${esc(D.zentrum.name)}</text>`;
    s += `<text x="${C.x}" y="${by + 11.2}" text-anchor="middle" font-family="Nunito" font-weight="800" font-size="3.2" letter-spacing="0.3" fill="${P.goldHell}">START &amp; ZIEL</text>`;
  } else {
    s += `<circle cx="${C.x}" cy="${C.y}" r="${R_ZIMMER - 2}" fill="${P.creme}" stroke="${P.gold}" stroke-width="1.4"/>`;
    s += emoSvg(D.zentrum.emoji, C.x, C.y - 14, 27);
    s += `<text x="${C.x}" y="${C.y + 11}" text-anchor="middle" font-family="${SERIF}" font-size="7.2" fill="${P.rot}">${esc(D.zentrum.kurz[0])}</text>`;
    s += `<text x="${C.x}" y="${C.y + 18.5}" text-anchor="middle" font-family="${SERIF}" font-size="6.6" fill="${P.rot}">${esc(D.zentrum.kurz[1])}</text>`;
  }
  return s;
}

// Plan in 400er-Koordinaten inkl. Hintergrund (für die Heimdruck-Versionen)
function planMitHintergrund() {
  return planHintergrund(0, 0, B, B) + planInhalt();
}

// Druckdaten für meinspiel.de (Spielbrett 300 x 300 mm, Datei 320 x 320 mm inkl. 10 mm Umschlag/Beschnitt)
const MS = { brett: 300, rand: 10, sicher: 5 };
function planMeinspielSvg(kontrolle = false) {
  const D_ = MS.brett + 2 * MS.rand, k = MS.brett / B;
  let s = planHintergrund(0, 0, D_, D_);
  s += `<g transform="translate(${MS.rand} ${MS.rand}) scale(${k})">${planInhalt()}</g>`;
  if (kontrolle) {
    const r = MS.rand, sc = MS.rand + MS.sicher;
    s += `<rect x="0" y="0" width="${D_}" height="${D_}" fill="none" stroke="#ff00ff" stroke-width="1.2"/>`;
    s += `<rect x="${r}" y="${r}" width="${MS.brett}" height="${MS.brett}" fill="none" stroke="#00e5ff" stroke-width="0.6"/>`;
    s += `<rect x="${sc}" y="${sc}" width="${MS.brett - 2 * MS.sicher}" height="${MS.brett - 2 * MS.sicher}" fill="none" stroke="#ffeb3b" stroke-width="0.5" stroke-dasharray="3 2"/>`;
    s += `<line x1="${D_ / 2}" y1="0" x2="${D_ / 2}" y2="${D_}" stroke="#ff5252" stroke-width="0.6" stroke-dasharray="4 2"/>`;
    const t = (x, y, txt, c) => `<text x="${x}" y="${y}" font-family="Nunito" font-weight="800" font-size="3.2" fill="${c}" stroke="#000" stroke-width="0.4" paint-order="stroke">${txt}</text>`;
    s += t(2, 6, 'Datei 320 × 320 mm (Umschlag + Beschnitt)', '#ff80ff') + t(r + 2, r + 5, 'Spielbrett 300 × 300 mm', '#80f0ff') + t(sc + 2, sc + 10, 'Sicherheitsabstand 5 mm', '#fff59d') + t(D_ / 2 + 2, D_ - 4, 'Falz (vertikal)', '#ff8a80');
  }
  return s;
}

function planDateien() {
  const inhalt = planMitHintergrund();
  const out = [];
  const DM = MS.brett + 2 * MS.rand;
  const msHtml = (titel, kontrolle) => htmlDoc(titel, `@page{size:${DM}mm ${DM}mm;margin:0}.page{width:${DM}mm;height:${DM}mm}body{margin:0}`,
    `<div class="page"><svg width="${DM}mm" height="${DM}mm" viewBox="0 0 ${DM} ${DM}">${planMeinspielSvg(kontrolle)}</svg></div>`);
  out.push({ name: '00_meinspiel_Spielbrett_300x300mm', html: msHtml('Spielbrett meinspiel', false), png: { mm: DM, px: 3780 } });
  out.push({ name: '00_meinspiel_KONTROLLANSICHT_nicht_drucken', html: msHtml('Kontrollansicht', true), png: { mm: DM, px: 1890 }, keinPdf: true });
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
// WICHTEL-KARTEN (63 x 88 mm, 9 pro A4-Bogen, mit Rückseiten)
// ======================================================================
const KW = 63, KH = 88;
const KARTEN_CSS = `
@page{size:A4;margin:0}
.page{width:210mm;height:297mm}
.raster{position:absolute;left:10.5mm;top:16.5mm;width:189mm;height:264mm;display:grid;grid-template-columns:repeat(3,${KW}mm);grid-template-rows:repeat(3,${KH}mm)}
.karte{width:${KW}mm;height:${KH}mm;padding:2.5mm;position:relative;outline:0.15mm solid #ccc}
.innen{width:100%;height:100%;border-radius:3.5mm;border:0.9mm solid #d4a537;background:linear-gradient(180deg,var(--h) 0,#fbf4e6 42%);display:flex;flex-direction:column;align-items:center;padding:2.6mm 3mm 2mm;text-align:center;box-shadow:inset 0 0 0 0.6mm #fffaf0,inset 0 0 0 0.85mm var(--f)}
.art{font-family:Fredoka;font-weight:600;font-size:3mm;color:#fff;background:var(--f);border-radius:3mm;padding:0.5mm 3mm;display:flex;align-items:center;gap:1.2mm;letter-spacing:0.3mm;text-transform:uppercase;box-shadow:0 0 0 0.35mm #d4a537}
.art .emo{width:3.4mm!important;height:3.4mm!important;margin:0!important}
.bild{margin:3.2mm 0 2.4mm;width:30mm;height:30mm;border-radius:50%;background:radial-gradient(circle at 50% 40%,#fff 0,#eef2f8 100%);display:flex;align-items:center;justify-content:center;box-shadow:0 0 0 0.9mm var(--f),0 0 0 1.5mm #d4a537}
.titel{font-family:'DM Serif Display',serif;font-size:5.6mm;line-height:1.05;color:var(--f);margin-bottom:1.6mm}
.text{font-size:3.45mm;line-height:1.28;font-weight:700;color:#3a3226}
.behalten{margin-top:auto;font-family:Fredoka;font-weight:600;font-size:2.9mm;color:#fff;background:var(--f);border-radius:2mm;padding:0.6mm 2.5mm}
.fuss{margin-top:auto;font-family:'DM Serif Display',serif;font-size:2.5mm;color:#a08a5f}
.behalten+.fuss{margin-top:1mm}
.linien{width:100%;margin-top:3mm;display:flex;flex-direction:column;gap:5.5mm}
.linien div{border-bottom:0.25mm dashed #bbb;height:0}
.rueck{width:100%;height:100%;border-radius:3.5mm;position:relative;overflow:hidden;display:flex;flex-direction:column;align-items:center;justify-content:center;border:0.9mm solid #d4a537;background-size:cover;background-position:center}
.rueck .kreis{width:30mm;height:30mm;border-radius:50%;background:radial-gradient(circle at 45% 38%,#e8304a 0,#9e0c24 100%);display:flex;align-items:center;justify-content:center;box-shadow:0 0 0 1.2mm #d4a537,0 0 0 2.2mm #fbf4e6,0 1.5mm 3mm rgba(20,40,80,.35)}
.rueck .wort{font-family:'DM Serif Display',serif;font-size:7mm;color:#fff;margin-top:5mm;text-shadow:0 0.4mm 1.2mm rgba(15,30,70,.6)}
.rueck .klein{font-family:'DM Serif Display',serif;font-style:italic;font-size:3mm;color:#fff;margin-top:0.8mm;text-shadow:0 0.3mm 1mm rgba(15,30,70,.6)}
.inl{display:inline-block;vertical-align:-0.6mm}
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
  const bg = bildUri('hintergrund.jpg');
  return `<div class="karte"><div class="rueck" style="${bg ? `background-image:url(${bg})` : 'background:#3a5a9a'}">
    <div class="kreis"><svg style="width:21mm;height:21mm" viewBox="-10 -10 20 20"><path d="${stern5(0, 0.8, 9.3)}" fill="#f0d48a"/></svg></div>
    <div class="wort">${esc(D.kartenName)}</div>
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
    body += `<div class="page"><div class="seitenhinweis" style="left:10.5mm;top:7mm">${D.kartenNameMehrzahl} · Bogen ${b + 1}/${boegen} · Vorderseite</div><div class="raster">${teil.join('')}</div>${marken}</div>`;
    body += `<div class="page"><div class="seitenhinweis" style="left:10.5mm;top:7mm">${D.kartenNameMehrzahl} · Bogen ${b + 1}/${boegen} · Rückseite</div><div class="raster">${Array.from({ length: 9 }, (_, j) => (Math.floor(j / 3) * 3 + (2 - (j % 3)) < teil.length ? kartenRueckseite() : '<div class="karte" style="outline:none"></div>')).join('')}</div>${marken}</div>`;
  }
  return { name: '03_Wichtel-Karten_A4_beidseitig', html: htmlDoc(D.kartenNameMehrzahl, KARTEN_CSS, body), anzahl: vorder.length };
}

// ======================================================================
// WEIHNACHTSLISTEN (95 x 95 mm, 4 pro A4)
// ======================================================================
const SL = 95;
function suchlistenDatei() {
  const css = `
  @page{size:A4;margin:0}
  .page{width:210mm;height:297mm}
  .raster{position:absolute;left:10mm;top:20mm;display:grid;grid-template-columns:repeat(2,${SL}mm);grid-template-rows:repeat(2,${SL}mm);gap:0}
  .liste{width:${SL}mm;height:${SL}mm;padding:2mm;outline:0.15mm solid #ccc}
  .rahmen{width:100%;height:100%;border-radius:4mm;background:#fbf4e6;border:1mm solid #d4a537;box-shadow:inset 0 0 0 0.7mm #fffaf0,inset 0 0 0 0.95mm #c8102e;display:flex;flex-direction:column;align-items:center;padding:2mm 3mm}
  .kopf{display:flex;align-items:center;gap:2mm;font-family:'DM Serif Display',serif;font-size:7mm;color:#c8102e;height:9mm}
  .nr{font-family:Fredoka;font-weight:500;font-size:3mm;color:#f0d48a;background:#1f6b4a;border-radius:2mm;padding:0.3mm 1.8mm;margin-left:1mm;font-family:Fredoka;font-weight:600}
  .felder{display:grid;grid-template-columns:repeat(2,32mm);grid-template-rows:repeat(2,32mm);gap:3mm;margin-top:1.5mm}
  .slot{border:0.6mm dashed var(--f);border-radius:2.5mm;background:#fffdf8;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:0.6mm}
  .slot .emo{opacity:0.9}
  .slot .n{font-family:Fredoka;font-weight:600;font-size:3.6mm;color:#333;line-height:1}
  .slot .o{font-size:2.7mm;font-weight:800;color:var(--f);display:flex;align-items:center;gap:0.6mm;line-height:1}
  .tipp{margin-top:auto;font-size:2.7mm;font-weight:700;color:#1f6b4a;display:flex;align-items:center;gap:1mm}
  `;
  const tint = (hex, a) => {
    const n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    const m = c => Math.round(c + (255 - c) * (1 - a));
    return `rgb(${m(r)},${m(g)},${m(b)})`;
  };
  const karte = (l, i) => `<div class="liste"><div class="rahmen">
    <div class="kopf">${stechpalmeHtml(8)}${esc(D.listenName)}<span class="nr">Nr. ${i + 1}</span></div>
    <div class="felder">${l.map(id => {
      const o = ortById[id];
      return `<div class="slot" style="--f:${o.farbe};--h:${tint(o.farbe, 0.12)}">${emoHtml(o.ding.emoji, 14)}<div class="n">${esc(o.ding.name)}</div><div class="o">${emoHtml(o.emoji, 3.2)}${esc(o.name)}</div></div>`;
    }).join('')}</div>
    <div class="tipp">${sternHtml(3)} Alles gefunden? Dann schnell zurück zu Susi in die Küche! ${sternHtml(3)}</div>
  </div></div>`;
  let body = '';
  const seiten = Math.ceil(D.suchlisten.length / 4);
  for (let s = 0; s < seiten; s++) {
    body += `<div class="page"><div class="seitenhinweis" style="left:10mm;top:11mm">${D.listenName}n · Bogen ${s + 1}/${seiten} · nur Vorderseite drucken</div>
      <div class="raster">${D.suchlisten.slice(s * 4, s * 4 + 4).map((l, i) => karte(l, s * 4 + i)).join('')}</div>
      ${markenSvg(210, 297, schnittmarken(10, 20, 190, 190, [10 + SL], [20 + SL]))}</div>`;
  }
  return { name: '04_Einkaufslisten_A4', html: htmlDoc(D.listenName + 'n', css, body), tint };
}

// ======================================================================
// GEGENSTÄNDE (30 x 30 mm Plättchen, 6 x 8 = 48 auf einem A4-Bogen)
// ======================================================================
function gegenstaendeDatei(tint) {
  const P = 30, cols = 6, rows = 9, x0 = 15, y0 = 13;
  const css = `@page{size:A4;margin:0}.page{width:210mm;height:297mm}.inl{display:block}
  .raster{position:absolute;left:${x0}mm;top:${y0}mm;display:grid;grid-template-columns:repeat(${cols},${P}mm);grid-template-rows:repeat(${rows},${P}mm)}
  .chip{width:${P}mm;height:${P}mm;background:radial-gradient(circle at 50% 40%,#fffdf8 0,#f3e6cc 100%);display:flex;flex-direction:column;align-items:center;justify-content:center;outline:0.15mm solid #bbb;position:relative}
  .chip::before{content:'';position:absolute;inset:1.6mm;border:0.9mm solid var(--f);border-radius:2.5mm}
  .chip .n{font-family:Fredoka;font-weight:600;font-size:3.1mm;color:var(--f);margin-top:0.6mm;line-height:1}`;
  const chips = [];
  D.orte.forEach(o => { for (let i = 0; i < D.exemplareProDing; i++) chips.push(`<div class="chip" style="--f:${o.farbe};--h:${tint(o.farbe, 0.15)}">${emoHtml(o.ding.emoji, 16)}<div class="n">${esc(o.ding.name)}</div></div>`); });
  const anzahlDinge = chips.length;
  chips.push(`<div class="chip" style="--f:#c8102e;--h:#fff8e1">${sternfeldHtml(17)}<div class="n">Kalender</div></div>`);
  while (chips.length < cols * rows) chips.push(`<div class="chip" style="--f:#9e9e9e;--h:#fafafa"><div class="n" style="margin-top:17mm">Ersatz</div></div>`);
  const xs = Array.from({ length: cols - 1 }, (_, i) => x0 + (i + 1) * P), ys = Array.from({ length: rows - 1 }, (_, i) => y0 + (i + 1) * P);
  const body = `<div class="page"><div class="seitenhinweis" style="left:15mm;top:3.5mm;font-size:2.8mm">Gegenstände · ${anzahlDinge} Plättchen (je ${D.exemplareProDing}×) + Kalender-Stern + Ersatz zum Bemalen · auf Karton drucken, mit Lineal/Papierschneider schneiden</div>
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
  if (foto) {
    // Porträt groß im abgerundeten Rahmen über dem Namensschild
    const ix = 2.4, iy = 2.4, iw = w - 4.8, ih = h - 16.2;
    s += `<rect x="${ix - 0.7}" y="${iy - 0.7}" width="${iw + 1.4}" height="${ih + 1.4}" rx="3.2" fill="#fff"/>`;
    s += `<clipPath id="cp-${fig.id}"><rect x="${ix}" y="${iy}" width="${iw}" height="${ih}" rx="2.6"/></clipPath>`;
    s += `<image href="${foto}" x="${ix}" y="${iy}" width="${iw}" height="${ih}" preserveAspectRatio="xMidYMin slice" clip-path="url(#cp-${fig.id})"/>`;
  } else {
    s += `<circle cx="${cx}" cy="${cy}" r="${r + 1.2}" fill="#fff"/>`;
    // Platzhalter-Silhouette
    const k = fig.kind ? 0.85 : 1;
    s += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#f5f5f5"/>`;
    const kopfY = cy - 1.5 * k, kr = 4.6 * k;
    s += `<clipPath id="pl-${fig.id}-${w}"><circle cx="${cx}" cy="${cy}" r="${r}"/></clipPath><g clip-path="url(#pl-${fig.id}-${w})">`;
    s += `<circle cx="${cx}" cy="${kopfY}" r="${kr}" fill="${fig.farbe}"/>`;
    s += `<path d="M${cx - 8.5 * k} ${cy + 12} Q${cx - 8.5 * k} ${cy + 3 * k} ${cx} ${cy + 3 * k} Q${cx + 8.5 * k} ${cy + 3 * k} ${cx + 8.5 * k} ${cy + 12} Z" fill="${fig.farbe}"/>`;
    // Weihnachtsmütze
    s += `<path d="M${cx - kr} ${kopfY - 3.8 * k} Q${cx - 1} ${kopfY - 11.5 * k} ${cx + 6.5 * k} ${kopfY - 9.5 * k} L${cx + kr} ${kopfY - 3.8 * k} Z" fill="#d32f2f"/>`;
    s += `<rect x="${cx - kr - 0.8}" y="${kopfY - 5.2 * k}" width="${2 * kr + 1.6}" height="${2.2 * k}" rx="${1.1 * k}" fill="#fff" stroke="#ddd" stroke-width="0.2"/>`;
    s += `<circle cx="${cx + 6.5 * k}" cy="${kopfY - 9.5 * k}" r="${1.5 * k}" fill="#fff" stroke="#ddd" stroke-width="0.2"/></g>`;
  }
  if (fig.stern) s += emoSvg('⭐', w - 5, 5, 7);
  if (!foto) s += emoSvg('❄️', 4.5, 4.5, 4);
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
  .page{width:210mm;height:297mm;padding:12mm 15mm 12mm;background:#fbf4e6}
  .page::before{content:'';position:absolute;inset:5mm;border:0.5mm solid #d4a537;border-radius:5mm;pointer-events:none}
  .page::after{content:'';position:absolute;inset:6.2mm;border:0.2mm solid #e7cf8f;border-radius:4.2mm;pointer-events:none}
  .kopf{display:grid;grid-template-columns:36mm 1fr;gap:5mm;align-items:center;border-radius:4mm;padding:3mm 4mm;background-size:cover;background-position:center;position:relative;box-shadow:0 0 0 0.5mm #d4a537}
  .kopf .susi{width:36mm;height:36mm;border-radius:50%;background-size:cover;background-position:center;box-shadow:0 0 0 1.2mm #d4a537,0 0 0 2.2mm #fbf4e6,0 1mm 3mm rgba(20,40,80,.35)}
  .kopf .karte{background:rgba(251,244,230,.94);border-radius:3mm;padding:2.8mm 4mm;box-shadow:0 0 0 0.4mm #d4a537}
  h1{font-family:'DM Serif Display',serif;font-weight:400;line-height:0.95;color:#1f6b4a;font-size:10.5mm}
  h1 .a{display:block;color:#c8102e;font-size:8mm}
  h1 .b{font-style:italic;color:#b8862b;font-size:7mm}
  .unter{font-family:Fredoka;font-weight:500;font-size:3.5mm;color:#1f6b4a;margin:1.6mm 0 1.4mm;display:flex;gap:4mm;flex-wrap:wrap}
  .unter span{display:flex;align-items:center;gap:1mm}
  .story{font-size:3.3mm;line-height:1.38;color:#3a3226}
  h2{font-family:'DM Serif Display',serif;font-weight:400;font-size:6.4mm;color:#1f6b4a;margin:3.6mm 0 1.3mm;display:flex;align-items:center;gap:2mm;border-bottom:0.35mm solid #d4a537;padding-bottom:0.6mm}
  p,li{font-size:3.45mm;line-height:1.38;color:#3a3226}
  ul,ol{padding-left:5.5mm}
  li{margin:0.6mm 0}
  li::marker{color:#c8102e;font-weight:800}
  b{font-weight:800;color:#2a241b}
  .zwei{display:grid;grid-template-columns:1fr 1fr;gap:6mm}
  .oc{display:inline-flex;align-items:center;gap:0.8mm;font-size:3.1mm;font-weight:700;background:#fffdf8;border:0.4mm solid var(--f);color:#333;border-radius:2mm;padding:0.3mm 1.6mm;margin:0.7mm 0.6mm 0 0}
  .oc .emo{display:inline-block}
  .kart{display:grid;grid-template-columns:36mm 1fr;align-items:center;background:#fffdf8;border:0.3mm solid #e7cf8f;border-left:1.4mm solid var(--f);border-radius:1.5mm;padding:1.2mm 2.5mm;margin:1.3mm 0;font-size:3.4mm;line-height:1.35}
  .kart>b{display:flex;align-items:center;gap:1.2mm;color:var(--f);font-family:'DM Serif Display',serif;font-weight:400;font-size:4.6mm}
  .box{background:#fffdf8;border:0.35mm solid #e7cf8f;border-radius:3mm;padding:2.3mm 4mm;margin-top:2mm}
  .s1 p,.s1 li{font-size:3.35mm;line-height:1.34}
  .s1 h2{margin:2.4mm 0 1mm;font-size:6mm}
  .s2 h2{margin:2.8mm 0 1.1mm;font-size:6mm}
  .s2 p,.s2 li{font-size:3.4mm;line-height:1.34}
  .s2 li{margin:0.4mm 0}
  .s2 .box{padding:2mm 4mm;margin-top:1.5mm}
  .s1 li{margin:0.35mm 0}
  .box.rot{background:#fff6f2;border-color:#e9a3a3}
  .box.blau{background:#eef3fb;border-color:#b9cbe8}
  .inl{display:inline-block;vertical-align:-0.8mm}
  .fuss{position:absolute;bottom:8mm;left:15mm;right:15mm;font-family:'DM Serif Display',serif;font-size:2.7mm;color:#a08a5f;display:flex;justify-content:space-between}
  .online{display:flex;align-items:center;gap:5mm;margin-top:3mm;background:#fffdf8;border:0.35mm solid #e7cf8f;border-radius:3mm;padding:2.5mm 4mm}
  .online .qr{background:#fff;padding:1.8mm;border-radius:2mm;box-shadow:0 0 0 0.5mm #d4a537}
  .online .ot{font-family:'DM Serif Display',serif;font-size:5.6mm;color:#c8102e}
  .online p{margin:0.6mm 0 0}
  .online .gruss{font-family:'DM Serif Display',serif;font-size:4.6mm;color:#c8102e;text-align:center;line-height:1.15}
  .online .url{font-family:Fredoka;font-weight:600;color:#1f6b4a;font-size:3.2mm}
  .schluss{margin-top:3mm;display:flex;align-items:center;justify-content:center;gap:3mm;font-family:'DM Serif Display',serif;font-size:6.5mm;color:#c8102e}
  `;
  const i = (ch, s = 4) => emoHtml(ch, s, 'inl');
  const abzweig = D.orte.filter(o => o.mitte).map(o => o.name);
  const abzweigText = abzweig.slice(0, -1).join(', ') + ' und ' + abzweig[abzweig.length - 1];
  const KN = D.kartenName, KNM = D.kartenNameMehrzahl, LN = D.listenName, Z = D.zentrum.name;
  const kartenZahl = D.jakobKarten.reduce((a, k) => a + k.anzahl, 0);
  const seite1 = `<div class="page s1">
    <div class="kopf" style="background-image:url(${bildUri('hintergrund.jpg') || ''})">
      <div class="susi" style="background-image:url(${bildUri('susi_mitte.jpg') || ''})"></div>
      <div class="karte">
        <h1><span class="a">Susis <span class="b">perfektes</span></span>Weihnachtsdinner</h1>
        <div class="unter"><span>${sternHtml(3.2)} 2–6 Personen · bis 10 im Team</span><span>${sternHtml(3.2)} ab 7 Jahren</span><span>${sternHtml(3.2)} ca. 30–45 Minuten</span></div>
        <div class="story">Es ist der 24. Dezember! Susi ist für ihre Kochpartys berühmt, und heute hat sie sich etwas ganz Besonderes vorgenommen:
        <b>das perfekte Weihnachtsdinner</b> für Jakob und die ganze Familie. Doch oje, in der Küche fehlt noch so einiges: Erdäpfel für den Erdäpfelsalat, Maroni, Eier, Vanillekipferl, Kinderpunsch und ihr Geheimrezept …
        Zum Glück helfen alle beim Einkaufen mit! <b>Wer zuerst alle Zutaten von der eigenen ${LN} in Susis Weihnachtsküche bringt, wird Susis Chef-Gehilfe oder Chef-Gehilfin und gewinnt!</b></div>
      </div>
    </div>

    <div class="zwei">
    <div>
      <h2>${sternHtml(4.6)}Inhalt</h2>
      <ul>
        <li>1 Spielplan</li>
        <li>10 Spielfiguren</li>
        <li>${D.orte.length * D.exemplareProDing} Zutaten (${D.exemplareProDing}× ${D.orte.length} Sorten), 1 Kalender-Stern</li>
        <li>${D.suchlisten.length} ${LN}n</li>
        <li>${kartenZahl} ${KNM}</li>
        <li>1 Würfel</li>
      </ul>
    </div>
    <div>
      <h2>${sternHtml(4.6)}Vorbereitung</h2>
      <ol>
        <li>Alle suchen sich eine <b>Figur</b> aus und stellen sie in <b>${Z}</b> (Mitte).</li>
        <li>Die <b>Gegenstände</b> nach Sorten neben den Plan legen (Vorrat).</li>
        <li>Die <b>${LN}n</b> mischen. Alle ziehen eine und legen sie <b>offen</b> vor sich.</li>
        <li>Die <b>${KNM}</b> mischen und verdeckt bereitlegen.</li>
        <li>Die <b>jüngste</b> Person beginnt, dann geht es im Uhrzeigersinn weiter.</li>
      </ol>
    </div>
    </div>

    <h2>${sternHtml(4.6)}Wo gibt es was?</h2>
    <p>An jedem Ort im Weihnachtsdorf gibt es eine Sache. Das kleine Bild am Ort zeigt, welche:</p>
    <div>${ortChips}</div>

    <h2>${sternHtml(4.6)}So spielst du</h2>
    <ol>
      <li><b>Würfle</b> und zieh genau so viele Felder – nicht mehr und nicht weniger.</li>
      <li><b>Die Richtung darfst du jedes Mal selbst wählen</b>, vorwärts oder rückwärts. Nur während eines Zuges darfst du nicht umdrehen.</li>
      <li>An den <b>4 Abzweigungen</b> (${abzweigText}) darfst du in Richtung Mitte abbiegen.
          <b>${Z} zählt als 1 Feld.</b> Du darfst einfach hindurchgehen und auf einem anderen Weg wieder hinaus. Das ist eine tolle Abkürzung!</li>
      <li>Auf einem Feld dürfen beliebig viele Figuren stehen.</li>
    </ol>
    <div class="box blau" style="margin-top:1.5mm;padding:1.8mm 4mm"><p><b>Beispiel:</b> Du stehst in ${Z} und würfelst eine <b>3</b>. Damit kommst du genau zu ${abzweig.map(n => '<b>' + n + '</b>').join(', ').replace(/, ([^,]*)$/, ' oder $1')}. Du suchst dir aus, wohin.</p></div>

    <h2>${sternHtml(4.6)}Wo bist du gelandet?</h2>
    <ul>
      <li><b>Genau auf einem Ort:</b> Eine Zutat bekommst du nur, wenn du <b>genau</b> auf ihrem Ort landest – vorbeiziehen reicht nicht. Steht die Sache dieses Ortes auf deiner ${LN} und hast du sie noch nicht? Dann nimm sie dir aus dem Vorrat und leg sie auf deine Liste. Das gilt auch, wenn dich eine Karte dorthin schickt.</li>
      <li><b>Auf einem Sternfeld</b> ${sternfeldHtml(4)}: Zieh eine <b>${KN}</b>, lies sie vor (Große helfen Kleinen gern!) und mach, was draufsteht. Danach kommt sie unter den Stapel.</li>
      <li><b>Auf einem leeren Feld:</b> Es passiert nichts, und die nächste Person ist dran.</li>
    </ul>
    <div class="fuss"><span>${esc(D.titel)} · Spielregel</span><span>Seite 1/2</span></div>
  </div>`;

  const seite2 = `<div class="page s2">
    <h2 style="margin-top:0">${sternHtml(4.6)}Die ${KNM}</h2>
    ${artZeile('glueck', 'Gute Nachrichten! Du kommst schneller voran.')}
    ${artZeile('hoppla', 'Susi oder Jakob haben eine Idee, und du musst mit. Manchmal hilft das sogar!')}
    ${artZeile('miteinander', 'Jetzt machen alle mit: lachen, raten, singen. Oft dürfen mehrere ziehen.')}
    ${artZeile('joker', '<b>Behalte diese Karte</b> offen vor dir und spiel sie, wann du willst. Du darfst höchstens <b>2 Joker</b> haben. Nach dem Ausspielen kommt sie unter den Stapel.')}
    <p style="margin-top:1.2mm">Wichtig: Eine neue ${KN} gibt es nur, wenn du <b>mit dem Würfel</b> auf einem Stern landest. Bringt dich eine Karte auf ein Sternfeld, ziehst du keine weitere Karte.</p>

    <h2>${sternHtml(4.6)}Wer gewinnt?</h2>
    <p>Hast du <b>alle 4 Sachen</b> von deiner ${LN}? Dann ab nach Hause! Wer als Erstes in <b>${Z}</b> ankommt, wird Susis Chef-Gehilfe oder Chef-Gehilfin und gewinnt.
    Die Küche musst du <b>genau</b> treffen! Würfelst du zu viel, ziehst du durch die Küche hindurch und auf einem anderen Weg wieder hinaus. Dann versuchst du es im nächsten Zug noch einmal. Wer möchte, spielt danach um die weiteren Plätze weiter.</p>

    <h2>${sternHtml(4.6)}Team-Spiel für 7 bis 10 Personen</h2>
    <div class="box blau">
    <ul>
      <li>Bildet <b>Zweier-Teams</b> (bei ungerader Zahl ein Dreier-Team). Jede Person hat ihre eigene Figur, jedes Team <b>eine gemeinsame ${LN}</b>. Die Teams sind reihum dran, im Team wird abwechselnd gewürfelt.</li>
      <li>Nach dem Würfeln entscheidet das Team gemeinsam, <b>welche seiner Figuren</b> zieht.</li>
      <li>Was irgendeine Figur des Teams findet, gehört dem ganzen Team. Auch Joker gehören dem Team (höchstens 2).</li>
      <li>Das Team gewinnt, sobald die Liste voll ist und <b>eine</b> seiner Figuren ${Z} genau erreicht.</li>
    </ul>
    </div>

    <h2>${sternHtml(4.6)}Gemeinsam bis Heiligabend</h2>
    <div class="box rot">
      <p>In dieser Variante spielen <b>alle zusammen gegen die Zeit</b>. Legt den <b>Kalender-Stern</b> auf ein Türchen des Adventskalenders auf dem Spielplan:
      <b>1</b> (leicht), <b>8</b> (mittel) oder <b>12</b> (schwer).</p>
      <ul>
        <li>Immer wenn alle einmal dran waren, rückt der Stern auf das <b>nächste Türchen</b> (die nächsthöhere Zahl suchen!).</li>
        <li>Bei jeder <b>Hoppla-Karte</b> rückt er zusätzlich ein Türchen weiter.</li>
        <li>Ihr dürft euch beraten und Joker-Karten einander schenken.</li>
        <li>Ihr gewinnt alle zusammen, wenn <b>alle Listen voll</b> sind und <b>alle Figuren</b> in ${Z} stehen, bevor der Stern das <b>Türchen 24</b> erreicht.</li>
      </ul>
    </div>

    <h2>${sternHtml(4.6)}Noch mehr Varianten</h2>
    <div class="box">
      <p><b>${i('🐣')} Für die Kleinsten:</b> Eine Sache darf man schon einsammeln, wenn man an ihrem Ort nur <b>vorbeizieht</b>, und die Küche muss nicht genau getroffen werden.</p>
      <p><b>${i('⏩')} Kurzes Spiel:</b> Es reichen <b>3 Sachen</b>. Deckt vorher eine beliebige auf der Liste ab.</p>
      <p><b>${i('🧠')} Für Profis:</b> Die Listen bleiben <b>geheim</b>, und alle dürfen nur <b>1 Joker</b> haben.</p>
    </div>
    ${QR_SVG ? `<div class="online"><div class="qr">${qrHtml(19)}</div><div style="flex:1"><div class="ot">Online spielen</div>
      <p>QR-Code scannen und die digitale Version im Browser spielen – mit allen Figuren, Karten und dem Spielbrett.</p>
      <p class="url">${esc(D.onlineLink.replace('https://', ''))}</p></div>
      <div class="gruss">${stechpalmeHtml(10)}<br>Frohe Weihnachten<br>und viel Spaß!</div></div>`
    : `<div class="schluss">${stechpalmeHtml(11)}Frohe Weihnachten und viel Spaß!${stechpalmeHtml(11)}</div>`}
    <div class="fuss"><span>${esc(D.titel)} · Spielregel · Illustrationen KI-generiert, Symbole: Twemoji (CC-BY 4.0)</span><span>Seite 2/2</span></div>
  </div>`;
  return { name: '02_Spielregel_A4', html: htmlDoc('Spielregel', css, seite1 + seite2) };
}

// ======================================================================
// SCHACHTELDECKEL (A4 quer)
// ======================================================================
function deckelDatei() {
  const css = `@page{size:A4 landscape;margin:0}
  .page{width:297mm;height:210mm;background-size:cover;background-position:center;display:flex;align-items:center;justify-content:center}
  .rahmen{position:absolute;inset:6mm;border:1.2mm solid #d4a537;border-radius:8mm}
  .rahmen2{position:absolute;inset:8.5mm;border:0.35mm solid #f0d48a;border-radius:6mm}
  .inhalt{display:grid;grid-template-columns:84mm 1fr;gap:9mm;align-items:center;width:262mm}
  .susi{width:84mm;height:84mm;border-radius:50%;background-size:cover;background-position:center;box-shadow:0 0 0 2mm #d4a537,0 0 0 4mm #fbf4e6,0 0 0 4.6mm #d4a537,0 3mm 8mm rgba(20,40,80,.4)}
  .karte{background:rgba(251,244,230,.95);border-radius:6mm;padding:7mm 7mm;box-shadow:0 0 0 0.7mm #d4a537,0 2mm 6mm rgba(20,40,80,.3);text-align:center}
  .t1{font-family:'DM Serif Display',serif;font-size:14mm;color:#c8102e;line-height:1}
  .t1 i{font-style:italic;color:#b8862b;font-size:12mm}
  .t2{font-family:'DM Serif Display',serif;font-size:16.5mm;color:#1f6b4a;line-height:1.05}
  .unter{font-family:'DM Serif Display',serif;font-style:italic;font-size:6mm;color:#7a6a4f;margin-top:1.5mm}
  .reihe{display:flex;gap:2.5mm;justify-content:center;margin:6mm 0 5mm}
  .reihe div{width:15mm;height:15mm;border-radius:50%;background:radial-gradient(circle at 50% 40%,#fff 0,#eef2f8 100%);display:flex;align-items:center;justify-content:center;box-shadow:0 0 0 0.8mm var(--f),0 0 0 1.4mm #d4a537}
  .info{font-family:Fredoka;font-weight:500;font-size:4.6mm;color:#1f6b4a}
  .widmung{font-family:'DM Serif Display',serif;font-style:italic;font-size:5.5mm;color:#c8102e;margin-top:3mm}
  .emo{display:block}
  .qrbox{position:absolute;right:14mm;bottom:14mm;background:rgba(251,244,230,.96);border-radius:4mm;padding:2.5mm;text-align:center;box-shadow:0 0 0 0.6mm #d4a537,0 1.5mm 4mm rgba(20,40,80,.3)}
  .qrbox .q{background:#fff;padding:1.5mm;border-radius:1.5mm}
  .qrbox span{display:block;font-family:Fredoka;font-weight:600;font-size:3mm;color:#1f6b4a;margin-top:1.2mm}`;
  const body = `<div class="page" style="background-image:url(${bildUri('hintergrund.jpg') || ''})"><div class="rahmen"></div><div class="rahmen2"></div>
    ${QR_SVG ? `<div class="qrbox"><div class="q">${qrHtml(20)}</div><span>Online spielen</span></div>` : ''}
    <div class="inhalt">
      <div class="susi" style="background-image:url(${bildUri('susi_mitte.jpg') || ''})"></div>
      <div class="karte">
        <div class="t1">Susis <i>perfektes</i></div><div class="t2">Weihnachtsdinner</div>
        <div class="unter">${esc(D.untertitel)}</div>
        <div class="reihe">${D.orte.map(o => `<div style="--f:${o.farbe}">${emoHtml(o.ding.emoji, 10)}</div>`).join('')}</div>
        <div class="info">2–6 Personen · bis 10 im Team · ab 7 Jahren · ca. 30–45 Minuten</div>
        ${D.widmung ? `<div class="widmung">${esc(D.widmung)}</div>` : ''}
      </div>
    </div>
  </div>`;
  return { name: '07_Schachteldeckel_A4', html: htmlDoc('Schachteldeckel', css, body) };
}

// ======================================================================
let QR_SVG = '';
const qrHtml = mm => `<div style="width:${mm}mm;height:${mm}mm">${QR_SVG.replace('<svg ', '<svg style="width:100%;height:100%;display:block" ')}</div>`;
async function main() {
  QR_SVG = D.onlineLink ? await require('qrcode').toString(D.onlineLink, { type: 'svg', margin: 0, errorCorrectionLevel: 'M', color: { dark: '#1f4d38', light: '#ffffff' } }) : '';
  assetsRegistrieren();
  const sl = suchlistenDatei();
  const dateien = [...planDateien(), regelDatei(), kartenDatei(), sl, gegenstaendeDatei(sl.tint), figurenDatei(), deckelDatei()];
  const browser = await chromium.launch();
  const page = await browser.newPage();
  for (const d of dateien) {
    const htmlPfad = path.join(BUILD, d.name + '.html');
    fs.writeFileSync(htmlPfad, d.html);
    if (!d.keinPdf) {
      await page.goto('file://' + htmlPfad, { waitUntil: 'load' });
      await page.evaluate(() => document.fonts.ready);
      await page.pdf({ path: path.join(DRUCK, d.name + '.pdf'), preferCSSPageSize: true, printBackground: true });
      console.log('✔', d.name + '.pdf');
    }
    if (d.png) {
      // Rasterbild in exakter Pixelgröße (z. B. 3780 x 3780 px = 320 mm bei 300 dpi)
      const css = (d.png.mm * 96) / 25.4;
      const ctx = await browser.newContext({ viewport: { width: Math.ceil(css), height: Math.ceil(css) }, deviceScaleFactor: d.png.px / css });
      const p2 = await ctx.newPage();
      await p2.goto('file://' + htmlPfad, { waitUntil: 'load' });
      await p2.evaluate(() => document.fonts.ready);
      const ziel = path.join(DRUCK, d.name + '.png');
      await p2.screenshot({ path: ziel, clip: { x: 0, y: 0, width: css, height: css } });
      await ctx.close();
      require('child_process').execFileSync('python3', ['-I', path.join(ROOT, 'tools/png_fertig.py'), ziel, String(d.png.px)]);
      console.log('✔', d.name + '.png');
    }
  }
  await browser.close();
}
main().catch(e => { console.error(e); process.exit(1); });
