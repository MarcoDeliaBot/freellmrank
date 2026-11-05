// Bit che parla (5/11/2026, Marco: «sembra che parli la mascotte, li voglio così», come nei Reel dei concorrenti).
// Bit sta in scena per tutto il video, in basso a destra: la bocca si apre e si chiude sulle parole della voce (tempi di
// voce.mjs), faccia e braccia cambiano a ogni scena, respira e sbatte gli occhi. Nella chiusura va al posto del Bit
// grande dello stampo (che monta.mjs spegne) e continua a parlare. Disegno: sorgente/mascotte/bit.svg e le espressioni
// di bit-espressioni/genera.py, scomposti in pezzi (corpo, occhi, bocca chiusa e aperta, braccia).
import { formatoDi } from './base.mjs';

const ARANCIO = '#d97757', SCURO = '#141413', VERDE = '#3ddc84', MARCHIO = '#0d7a47', CREMA = '#faf9f5', ORECCHIE = '#b85a3d', GUANCE = '#f2a1a1', GIALLO = '#ffd23f';

const tratto = (d, w = 6) => `<path d="${d}" stroke="${VERDE}" stroke-width="${w}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
const occhio = (cx, cy, r = 12) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${VERDE}"/><circle cx="${(cx + r * 0.33).toFixed(1)}" cy="${(cy - r * 0.42).toFixed(1)}" r="${Math.max(3, r * 0.3).toFixed(1)}" fill="${CREMA}"/>`;
const ovale = (cx, cy, rx, ry) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${VERDE}"/><ellipse cx="${cx}" cy="${cy + 1}" rx="${(rx * 0.45).toFixed(1)}" ry="${(ry * 0.45).toFixed(1)}" fill="${SCURO}"/>`;
const aperta = `<path d="M82 112 L118 112 Q118 135 100 135 Q82 135 82 112 Z" fill="${VERDE}"/><path d="M91 129 Q100 123 109 129 Q100 134 91 129 Z" fill="#ff5c7a" opacity=".8"/>`;

const ROSSO = '#ff5c7a', AZZURRO = '#7cc4f5';
const segno = (d, c = ARANCIO, w = 4) => `<path d="${d}" stroke="${c}" stroke-width="${w}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
const stella = (x, y, s = 1, c = GIALLO) => `<path transform="translate(${x} ${y}) scale(${s})" d="M0 -10 L2.5 -2.5 L10 0 L2.5 2.5 L0 10 L-2.5 2.5 L-10 0 L-2.5 -2.5 Z" fill="${c}"/>`;
const cuore = (x, y, s = 1, c = ROSSO) => `<path transform="translate(${x} ${y}) scale(${s})" d="M0 4 C0 -2 -9 -4 -9 3 C-9 8 -3 11 0 15 C3 11 9 8 9 3 C9 -4 0 -2 0 4 Z" fill="${c}"/>`;
const goccia = (x, y, s = 1) => `<path d="M${x} ${y} q${-7 * s} ${11 * s} 0 ${16 * s} q${7 * s} ${-5 * s} 0 ${-16 * s} Z" fill="${AZZURRO}"/>`;
const scritta = (x, y, t, size = 34, c = ARANCIO) => `<text x="${x}" y="${y}" font-family="Georgia, serif" font-weight="700" font-size="${size}" fill="${c}" text-anchor="middle">${t}</text>`;
const sorriso = tratto('M84 118 Q100 131 116 118');
const piatta = tratto('M88 122 L112 122');
const giu = tratto('M86 128 Q100 116 114 128');
const occhiTondi = occhio(76, 96) + occhio(124, 96);
const archi = tratto('M64 100 Q76 84 88 100', 7) + tratto('M112 100 Q124 84 136 100', 7);
const palpebre = (y = 96) => `<rect x="60" y="${y - 16}" width="34" height="16" fill="${SCURO}"/><rect x="106" y="${y - 16}" width="34" height="16" fill="${SCURO}"/>`;
const spirale = (cx, cy) => tratto(`M${cx} ${cy} m-2 0 a2 2 0 1 1 4 0 a6 6 0 1 1 -10 0 a10 10 0 1 1 18 0`, 3.5);
const stellina = (cx, cy) => `<path transform="translate(${cx} ${cy}) scale(1.3)" d="M0 -10 L2.9 -3.1 L10 -3.1 L4.3 1.4 L6.2 9 L0 4.6 L-6.2 9 L-4.3 1.4 L-10 -3.1 L-2.9 -3.1 Z" fill="${GIALLO}"/>`;

// facce (5/11/2026, Marco: «dobbiamo dare più caratteri alla mascotte», con un foglio di 30 facce come esempio).
// occhi (sbattono), bocca chiusa e aperta (si alternano sulle parole), segni attorno; fisso = occhi che non sbattono
const FACCE = {
  neutro: { occhi: occhiTondi, chiusa: piatta, aperta: ovale(100, 122, 8, 8) },
  felice: { occhi: occhiTondi, chiusa: sorriso, aperta },
  contento: { occhi: archi, chiusa: sorriso, aperta, fisso: true },
  eccitato: { occhi: occhio(76, 94, 14) + occhio(124, 94, 14), chiusa: tratto('M80 116 Q100 136 120 116'), aperta, segni: stella(178, 34) + stella(22, 40, 0.7) },
  ride: { occhi: tratto('M62 98 Q76 82 90 98', 8) + tratto('M110 98 Q124 82 138 98', 8), chiusa: aperta, aperta: `<path d="M78 110 L122 110 Q122 138 100 138 Q78 138 78 110 Z" fill="${VERDE}"/><path d="M90 131 Q100 123 110 131 Q100 137 90 131 Z" fill="${ROSSO}" opacity=".8"/>`, fisso: true, segni: segno('M170 40 l10 -8 M176 54 l12 0', ARANCIO) },
  innamorato: { occhi: cuore(76, 86, 1.5) + cuore(124, 86, 1.5), chiusa: sorriso, aperta, fisso: true, segni: cuore(178, 26, 1.1) + cuore(24, 40, 0.8) },
  timido: { occhi: occhio(76, 104, 9) + occhio(124, 104, 9), chiusa: tratto('M92 124 Q100 129 108 124', 5), aperta: ovale(100, 124, 6, 6),
    segni: `<ellipse cx="55" cy="122" rx="12" ry="7" fill="${GUANCE}"/><ellipse cx="145" cy="122" rx="12" ry="7" fill="${GUANCE}"/>` },
  fiero: { occhi: occhiTondi + palpebre(), chiusa: tratto('M84 120 Q102 130 118 114'), aperta, segni: stella(180, 30, 1.1) },
  occhiolino: { occhi: occhio(76, 96) + tratto('M112 98 Q124 90 136 98', 7), chiusa: tratto('M84 116 Q100 132 116 116'), aperta, fisso: true },
  cool: { occhi: `<rect x="56" y="84" width="40" height="22" rx="8" fill="${SCURO}" stroke="${VERDE}" stroke-width="4"/><rect x="104" y="84" width="40" height="22" rx="8" fill="${SCURO}" stroke="${VERDE}" stroke-width="4"/>` + tratto('M96 92 L104 92', 4),
    chiusa: tratto('M86 122 Q102 128 116 118'), aperta, fisso: true },
  stelle: { occhi: stellina(76, 96) + stellina(124, 96), chiusa: tratto('M80 116 Q100 136 120 116'), aperta, fisso: true, segni: stella(180, 30) + stella(20, 34, 0.8) + stella(186, 70, 0.6) },
  determinato: { occhi: tratto('M62 80 L88 86', 6) + tratto('M112 86 L138 80', 6) + occhio(76, 100, 10) + occhio(124, 100, 10), chiusa: tratto('M86 124 L114 124', 6), aperta: ovale(100, 124, 9, 7) },
  sorpreso: { occhi: occhio(76, 94, 14) + occhio(124, 94, 14), chiusa: ovale(100, 126, 6, 7), aperta: ovale(100, 125, 9, 11) },
  scioccato: { occhi: occhio(74, 92, 17) + occhio(126, 92, 17), chiusa: ovale(100, 127, 9, 10), aperta: ovale(100, 126, 12, 14), segni: scritta(182, 44, '!!', 36) },
  wow: { occhi: occhio(74, 94, 15) + occhio(126, 94, 15), chiusa: ovale(100, 126, 6, 7), aperta: ovale(100, 125, 10, 12), segni: stella(182, 30) + stella(18, 30, 0.8) },
  pensa: { occhi: tratto('M112 76 Q124 68 136 74', 5) + occhio(76, 98, 11) + occhio(124, 98, 11), chiusa: tratto('M88 124 L114 120'), aperta: ovale(101, 123, 9, 8),
    segni: `<circle cx="168" cy="40" r="4" fill="${ARANCIO}"/><circle cx="180" cy="40" r="4" fill="${ARANCIO}"/><circle cx="192" cy="40" r="4" fill="${ARANCIO}"/>` },
  idea: { occhi: occhio(76, 94, 13) + occhio(124, 94, 13), chiusa: tratto('M80 116 Q100 134 120 116'), aperta,
    segni: `<circle cx="172" cy="28" r="14" fill="${GIALLO}"/><rect x="166" y="40" width="12" height="9" rx="2" fill="#8a8a85"/>` + segno('M172 6 l0 -3 M154 14 l-3 -3 M190 14 l3 -3', GIALLO, 3) },
  confuso: { occhi: tratto('M62 78 Q74 70 88 76', 5) + tratto('M114 84 L136 84', 5) + occhio(76, 96, 12) + occhio(124, 98, 8), chiusa: tratto('M84 122 l8 -5 l8 5 l8 -5 l8 5', 5), aperta: ovale(100, 123, 8, 8), segni: scritta(176, 40, '?', 44) },
  scettico: { occhi: occhio(76, 100, 11) + occhio(124, 100, 11) + `<rect x="62" y="86" width="28" height="13" fill="${SCURO}"/><rect x="110" y="86" width="28" height="13" fill="${SCURO}"/>` + tratto('M64 98 L88 98', 4) + tratto('M112 98 L136 98', 4) + tratto('M112 78 Q124 70 136 76', 5),
    chiusa: tratto('M88 124 L114 120'), aperta: ovale(101, 123, 8, 7) },
  sospettoso: { occhi: `<rect x="62" y="92" width="26" height="9" rx="4" fill="${VERDE}"/><rect x="110" y="92" width="26" height="9" rx="4" fill="${VERDE}"/><circle cx="83" cy="96" r="3" fill="${SCURO}"/><circle cx="131" cy="96" r="3" fill="${SCURO}"/>`,
    chiusa: tratto('M90 122 L112 124', 5), aperta: ovale(102, 123, 7, 6), fisso: true },
  annoiato: { occhi: occhio(76, 100, 11) + occhio(124, 100, 11) + palpebre(100) + tratto('M64 100 L88 100', 4) + tratto('M112 100 L136 100', 4), chiusa: piatta, aperta: ovale(100, 122, 7, 5) },
  assonnato: { occhi: tratto('M64 98 Q76 104 88 98', 6) + tratto('M112 98 Q124 104 136 98', 6), chiusa: ovale(100, 124, 6, 6), aperta: ovale(100, 124, 9, 10), fisso: true,
    segni: scritta(170, 40, 'Z', 26) + scritta(186, 22, 'z', 20) },
  stordito: { occhi: spirale(76, 96) + spirale(124, 96), chiusa: tratto('M84 124 Q92 118 100 124 Q108 130 116 124', 5), aperta: ovale(100, 124, 8, 9), fisso: true, segni: stella(30, 30, 0.7) + stella(170, 26, 0.7) + stella(100, 0, 0.6) },
  preoccupato: { occhi: tratto('M62 80 L86 72', 5) + tratto('M114 72 L138 80', 5) + occhio(76, 98, 10) + occhio(124, 98, 10),
    chiusa: tratto('M84 124 Q92 118 100 124 Q108 130 116 124', 5), aperta: ovale(100, 124, 9, 9), segni: goccia(172, 28, 1.3) },
  nervoso: { occhi: occhio(76, 98, 8) + occhio(124, 98, 8), chiusa: tratto('M84 124 l8 -4 l8 4 l8 -4 l8 4', 5), aperta: `<rect x="82" y="116" width="36" height="14" rx="4" fill="${VERDE}"/>` + tratto('M88 116 L88 130 M96 116 L96 130 M104 116 L104 130 M112 116 L112 130', 2),
    segni: goccia(170, 26, 1.1) + goccia(30, 34, 0.9) },
  triste: { occhi: tratto('M62 82 L86 76', 5) + tratto('M114 76 L138 82', 5) + occhio(76, 100, 10) + occhio(124, 100, 10), chiusa: giu, aperta: ovale(100, 125, 8, 8), segni: goccia(66, 112, 0.8) },
  piange: { occhi: tratto('M64 96 Q76 104 88 96', 6) + tratto('M112 96 Q124 104 136 96', 6) + `<rect x="70" y="102" width="10" height="34" rx="5" fill="${AZZURRO}"/><rect x="120" y="102" width="10" height="34" rx="5" fill="${AZZURRO}"/>`,
    chiusa: giu, aperta: ovale(100, 126, 11, 11), fisso: true },
  arrabbiato: { occhi: tratto('M62 74 L88 84', 6) + tratto('M112 84 L138 74', 6) + `<ellipse cx="76" cy="100" rx="11" ry="7" fill="${VERDE}"/><ellipse cx="124" cy="100" rx="11" ry="7" fill="${VERDE}"/>`,
    chiusa: tratto('M84 126 Q100 114 116 126', 6), aperta: `<rect x="82" y="116" width="36" height="14" rx="4" fill="${VERDE}"/>`,
    segni: segno('M158 24 Q165 24 165 17 M175 17 Q175 24 182 24 M182 34 Q175 34 175 41 M165 41 Q165 34 158 34', ROSSO, 4.5) },
  zen: { occhi: tratto('M64 98 L88 98', 6) + tratto('M112 98 L136 98', 6), chiusa: tratto('M90 120 Q100 126 110 120', 5), aperta: ovale(100, 122, 7, 6), fisso: true, segni: stella(26, 34, 0.6, VERDE) + stella(176, 30, 0.6, VERDE) },
};
export const NOMI_FACCE = Object.keys(FACCE);

function braccio(lato, angolo, lungo = 34) {
  const [px, py] = lato === 'sx' ? [62, 179] : [138, 179];
  const a = (angolo * Math.PI) / 180, ex = (px + lungo * Math.cos(a)).toFixed(1), ey = (py + lungo * Math.sin(a)).toFixed(1);
  return `<line x1="${px}" y1="${py}" x2="${ex}" y2="${ey}" stroke="${ORECCHIE}" stroke-width="18" stroke-linecap="round"/>`
    + `<line x1="${px}" y1="${py}" x2="${ex}" y2="${ey}" stroke="${ARANCIO}" stroke-width="13" stroke-linecap="round"/>`
    + `<circle cx="${ex}" cy="${ey}" r="10" fill="${ARANCIO}" stroke="${ORECCHIE}" stroke-width="2.5"/>`;
}
// pose: braccio sinistro e destro (angoli in gradi, 0 = verso destra, -90 = in su). Bit sta a destra: indica verso sinistra
const POSE = {
  riposo: [braccio('sx', 150), braccio('dx', 30)],
  saluta: [braccio('sx', 150), braccio('dx', -55, 42)],
  indica: [braccio('sx', 182, 50), braccio('dx', 35)],
  wow: [braccio('sx', -128, 60), braccio('dx', -52, 60)],
  pensa: [braccio('sx', 150), braccio('dx', -105, 40)],
};

// faccia e posa di ogni scena dal testo della voce (5/11/2026): prima le parole che dicono l'umore, poi lo stampo,
// poi un giro di facce diverse; due scene di fila non hanno mai la stessa faccia
const REGOLE = [
  [/\?/, ['pensa', 'pensa']],
  [/\b(but|however|risk|warn|limit|bug|fail|lawsuit|ban|concern|leak|vulnerab|attack|danger|problem)/, ['preoccupato', 'riposo']],
  [/\b(record|billion|trillion|million|fastest|largest|biggest|beats?|outperform|times faster|percent)/, ['scioccato', 'wow']],
  [/\b(free|open[- ]source|open weights|no cost)/, ['stelle', 'wow']],
  [/\b(acquir|buys?|deal|partner|merg)/, ['occhiolino', 'indica']],
  [/\b(first|best|leads?|wins?|state-of-the-art|top)\b/, ['fiero', 'indica']],
  [/\b(slow|delay|wait|expensive|costly|price|pay)/, ['scettico', 'pensa']],
  [/\b(layoff|shut|cancel|lose|loss|drops?|down)\b/, ['triste', 'riposo']],
  [/\b(smart|clever|idea|trick|tip|how to|you can)/, ['idea', 'pensa']],
  [/\b(launch|release|unveil|introduc|announc|new)/, ['eccitato', 'indica']],
];
const PER_STAMPO = { numero: ['scioccato', 'wow'], numeri: ['pensa', 'indica'], barre: ['determinato', 'indica'], confronto: ['pensa', 'riposo'], punti: ['felice', 'indica'], lista: ['felice', 'indica'] };
const GIRO = [['felice', 'indica'], ['cool', 'riposo'], ['determinato', 'indica'], ['sorpreso', 'wow'], ['occhiolino', 'riposo'], ['idea', 'pensa'], ['fiero', 'indica'], ['zen', 'riposo'], ['timido', 'riposo']];

function scegli(sc, i, prima) {
  if (sc.stampo === 'chiusura') return ['contento', 'saluta'];
  if (i === 0) return ['eccitato', 'saluta'];
  const testo = String(sc.testo || '').toLowerCase();
  const prove = REGOLE.filter(([re]) => re.test(testo)).map(([, c]) => c);
  if (PER_STAMPO[sc.stampo]) prove.push(PER_STAMPO[sc.stampo]);
  for (let k = 0; k < GIRO.length; k++) prove.push(GIRO[(i + k) % GIRO.length]);
  return prove.find((c) => c[0] !== prima) || GIRO[0];
}

// posto di Bit: in basso a destra; nella chiusura dove stava il Bit dello stampo chiusura
const POSTI = {
  orizzontale: { normale: { left: 1614, top: 812, width: 210, height: 252 }, chiusura: { left: 1560, top: 530, width: 250, height: 300 } },
  verticale: { normale: { left: 690, top: 1440, width: 300, height: 360 }, chiusura: { left: 330, top: 1405, width: 420, height: 504 } },
};

function svg() {
  const g = (cls, nome, dentro) => `<g class="bit-${cls}" id="bit-${cls}-${nome}" style="visibility:hidden">${dentro}</g>`;
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 240" overflow="visible">'
    + `<line x1="100" y1="42" x2="100" y2="20" stroke="${SCURO}" stroke-width="5" stroke-linecap="round"/><circle cx="100" cy="15" r="9" fill="${MARCHIO}"/>`
    + `<rect x="6" y="80" width="18" height="40" rx="9" fill="${ORECCHIE}"/><rect x="176" y="80" width="18" height="40" rx="9" fill="${ORECCHIE}"/>`
    + `<rect x="20" y="40" width="160" height="120" rx="36" fill="${ARANCIO}"/><rect x="38" y="58" width="124" height="84" rx="24" fill="${SCURO}"/>`
    + Object.entries(FACCE).map(([n, f]) => g('occhi', n, f.occhi) + g('chiusa', n, f.chiusa) + g('aperta', n, f.aperta) + g('segni', n, f.segni || '')).join('')
    + `<ellipse cx="55" cy="122" rx="7" ry="4" fill="${GUANCE}" opacity=".75"/><ellipse cx="145" cy="122" rx="7" ry="4" fill="${GUANCE}" opacity=".75"/>`
    + Object.entries(POSE).map(([n, [sx, dx]]) => g('sx', n, sx) + g('dx', n, dx)).join('')
    + `<rect x="60" y="164" width="80" height="56" rx="20" fill="${CREMA}" stroke="${ARANCIO}" stroke-width="4"/>`
    + `<rect x="85" y="194" width="8" height="14" rx="2" fill="${MARCHIO}"/><rect x="96" y="182" width="8" height="26" rx="2" fill="${MARCHIO}"/><rect x="107" y="188" width="8" height="20" rx="2" fill="${MARCHIO}"/>`
    + `<rect x="68" y="218" width="26" height="12" rx="6" fill="${ORECCHIE}"/><rect x="106" y="218" width="26" height="12" rx="6" fill="${ORECCHIE}"/>`
    + '</svg>';
}

// scene: [{ stampo, inizio, durata, parole: [{ start, end }] }] (tempi delle parole relativi alla scena)
export function composizione(scene, durata, formato = 'orizzontale') {
  const { W, H } = formatoDi(formato);
  const posti = POSTI[formato === 'verticale' ? 'verticale' : 'orizzontale'];
  let prima = null;
  const piano = scene.map((sc, i) => {
    const coppia = scegli(sc, i, prima);
    prima = coppia[0];
    return { inizio: sc.inizio, faccia: coppia[0], posa: coppia[1], chiusura: sc.stampo === 'chiusura',
      parole: sc.parole.map((w) => [+(w.start + sc.inizio).toFixed(3), +(w.end + sc.inizio).toFixed(3)]) };
  });
  return `<template id="bit-template" data-composition-id="bit" data-width="${W}" data-height="${H}">
<script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
<style>
  #bit-root { position: absolute; inset: 0; pointer-events: none; }
  #bit-posto { position: absolute; left: ${posti.normale.left}px; top: ${posti.normale.top}px; width: ${posti.normale.width}px; height: ${posti.normale.height}px; z-index: 30; transform-origin: 0 0; }
  #bit-corpo { width: 100%; height: 100%; transform-origin: 50% 100%; }
  #bit-corpo svg { width: 100%; height: 100%; display: block; overflow: visible; }
</style>
<div id="bit-root" data-composition-id="bit" data-timeline-locked data-start="0" data-duration="${durata}" data-fps="30" data-width="${W}" data-height="${H}">
  <div id="bit-posto"><div id="bit-corpo">${svg()}</div></div>
</div>
<script>
  var DURATA = ${durata};
  var PIANO = ${JSON.stringify(piano)};
  // la chiusura con trasformazioni (x, y, scala), non con left/top: il controllo di HyperFrames vuole movimenti fluidi
  var MOSSA = ${JSON.stringify({ x: posti.chiusura.left - posti.normale.left, y: posti.chiusura.top - posti.normale.top, scale: +(posti.chiusura.width / posti.normale.width).toFixed(4) })};
  var FACCE = ${JSON.stringify(Object.keys(FACCE))};
  var FISSI = ${JSON.stringify(Object.keys(FACCE).filter((n) => FACCE[n].fisso))};
  var POSE = ${JSON.stringify(Object.keys(POSE))};
  (function () {
    var el = function (id) { return document.getElementById(id); };
    var tl = gsap.timeline({ paused: true });
    var corpo = el("bit-corpo");
    // entra saltando
    tl.fromTo(corpo, { opacity: 0, y: 60, scale: 0.6 }, { opacity: 1, y: 0, scale: 1, duration: 0.5, ease: "back.out(2.2)" }, 0.05);
    // respira: su e giù piano per tutto il video
    tl.to(corpo, { y: -7, duration: 0.85, ease: "sine.inOut", yoyo: true, repeat: Math.max(1, Math.floor((DURATA - 0.6) / 0.85)) }, 0.6);
    PIANO.forEach(function (sc, i) {
      var t0 = Math.max(0, sc.inizio);
      var fine = i + 1 < PIANO.length ? PIANO[i + 1].inizio : DURATA;
      // faccia e posa della scena: si spengono le altre
      FACCE.forEach(function (f) {
        var su = f === sc.faccia;
        tl.set(el("bit-occhi-" + f), { visibility: su ? "visible" : "hidden" }, t0);
        tl.set(el("bit-chiusa-" + f), { visibility: su ? "visible" : "hidden" }, t0);
        tl.set(el("bit-aperta-" + f), { visibility: "hidden" }, t0);
        tl.set(el("bit-segni-" + f), { visibility: su ? "visible" : "hidden" }, t0);
      });
      POSE.forEach(function (p) {
        tl.set(el("bit-sx-" + p), { visibility: p === sc.posa ? "visible" : "hidden" }, t0);
        tl.set(el("bit-dx-" + p), { visibility: p === sc.posa ? "visible" : "hidden" }, t0);
      });
      // un saltello a ogni scena nuova
      if (i > 0) tl.fromTo(corpo, { scale: 0.9 }, { scale: 1, duration: 0.35, ease: "back.out(3)" }, t0);
      // saluta muovendo il braccio
      if (sc.posa === "saluta") {
        tl.fromTo(el("bit-dx-saluta"), { rotation: -12, svgOrigin: "138 179" }, { rotation: 14, svgOrigin: "138 179", duration: 0.28, ease: "sine.inOut", yoyo: true, repeat: 5 }, t0 + 0.1);
      }
      // nella chiusura va al posto del Bit grande
      if (sc.chiusura) tl.to(el("bit-posto"), { x: MOSSA.x, y: MOSSA.y, scale: MOSSA.scale, duration: 0.7, ease: "power3.inOut" }, t0);
      // la bocca: aperta e chiusa sulle parole (nelle parole lunghe si apre e si chiude più volte)
      var chiusa = el("bit-chiusa-" + sc.faccia), apri = el("bit-aperta-" + sc.faccia);
      sc.parole.forEach(function (w) {
        var a = Math.max(t0, w[0]), b = Math.min(fine, Math.max(w[1], a + 0.08));
        for (var t = a; t < b - 0.04; t += 0.2) {
          tl.set(apri, { visibility: "visible" }, t);
          tl.set(chiusa, { visibility: "hidden" }, t);
          var c = Math.min(b, t + 0.12);
          tl.set(apri, { visibility: "hidden" }, c);
          tl.set(chiusa, { visibility: "visible" }, c);
        }
      });
      // sbatte gli occhi ogni tanto (non con gli occhi chiusi di «contento»)
      if (FISSI.indexOf(sc.faccia) < 0) {
        var occhi = el("bit-occhi-" + sc.faccia);
        for (var b2 = t0 + 1.3; b2 < fine - 0.4; b2 += 3.1) {
          tl.to(occhi, { scaleY: 0.12, svgOrigin: "100 96", duration: 0.06, ease: "none" }, b2);
          tl.to(occhi, { scaleY: 1, svgOrigin: "100 96", duration: 0.09, ease: "none" }, b2 + 0.07);
        }
      }
    });
    tl.to({}, { duration: DURATA }, 0);
    window.__timelines = window.__timelines || {};
    window.__timelines["bit"] = tl;
  })();
</script>
</template>
`;
}

// Bit fermo con una faccia e una posa, bocca chiusa (per il foglio delle facce e per le copertine)
export function statico(faccia = 'felice', posa = 'riposo') {
  return svg()
    .replace(new RegExp(`(id="bit-(?:occhi|chiusa|segni)-${faccia}") style="visibility:hidden"`, 'g'), '$1')
    .replace(new RegExp(`(id="bit-(?:sx|dx)-${posa}") style="visibility:hidden"`, 'g'), '$1');
}
