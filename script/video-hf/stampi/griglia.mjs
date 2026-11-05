// Stampo «griglia» (5/11/2026, Marco: «ci sono delle foto e delle tabs che tu puoi mettere ma non hai messo»): da 2 a 6
// immagini vere in una griglia, ognuna con la sua etichetta, che entrano una alla volta quando la voce le nomina
// (come la griglia degli stili nello Short di esempio su Lemo-Opuscar). Solo per piani scritti a mano con file veri:
// il modello che scrive i piani delle notizie non ha immagini, quindi non lo vede (soloAMano).
import { C, scena, s3, esc, attacchi, formatoDi } from '../base.mjs';

const MAX_ETICHETTA = 22, MAX_TITOLO = 40, MAX_CREDITO = 44;
const testo = (x) => (typeof x === 'string' ? x.trim() : '');
const nomeFile = (p) => String(p).split(/[\\/]/).pop();

export default {
  nome: 'griglia',
  soloAMano: true,
  descrizione: 'ONLY for hand-written plans with real image files: 2 to 6 pictures in a grid, each with a short label, popping in as the voice names them',
  schema: '{ "titolo": "66 ready-made styles (max 40, optional)", "immagini": [{ "media": "path .jpg/.png", "etichetta": "Watercolor (max 22)" }], "rapporto": 1.78, "credito": "Stills: LemoLab · CC BY 4.0 (max 44)" }',

  valida(dati) {
    const p = [];
    if (!dati || typeof dati !== 'object') return ['dati mancanti'];
    const im = dati.immagini;
    if (!Array.isArray(im) || im.length < 2 || im.length > 6) return ['immagini: da 2 a 6'];
    im.forEach((x, i) => {
      if (typeof x?.media !== 'string' || !/\.(jpg|jpeg|png|webp)$/i.test(x.media)) p.push(`immagine ${i + 1}: media deve essere .jpg, .png o .webp`);
      const e = testo(x?.etichetta);
      if (!e) p.push(`immagine ${i + 1}: etichetta mancante`);
      else if (e.length > MAX_ETICHETTA) p.push(`immagine ${i + 1}: etichetta troppo lunga (${e.length} > ${MAX_ETICHETTA})`);
    });
    if (testo(dati.titolo).length > MAX_TITOLO) p.push(`titolo troppo lungo (> ${MAX_TITOLO})`);
    if (testo(dati.credito).length > MAX_CREDITO) p.push(`credito troppo lungo (> ${MAX_CREDITO})`);
    const r = Number(dati.rapporto ?? 16 / 9);
    if (!(r >= 0.5 && r <= 4)) p.push(`rapporto fuori misura (${dati.rapporto})`);
    return p;
  },

  // ogni immagine entra quando la voce dice la sua etichetta
  parole(dati) { return attacchi(dati, (dati.immagini || []).map((x, i) => [`e${i}`, testo(x.etichetta)])); },

  html({ id, px, dati, durata, t, etichetta, numero, formato = 'orizzontale' }) {
    const { W, fondo, margine: M } = formatoDi(formato);
    const vert = formato === 'verticale';
    const im = dati.immagini, n = im.length;
    const r = Number(dati.rapporto ?? 16 / 9);
    const ti = testo(dati.titolo), cr = testo(dati.credito);
    const alto = vert ? 220 : 150;
    const hTitolo = ti ? (vert ? 96 : 80) : 0, hCredito = cr ? (vert ? 64 : 52) : 0;
    const g = vert ? 26 : 30;
    const cols = vert ? (n <= 2 ? 1 : 2) : (n <= 4 ? 2 : 3);
    const rows = Math.ceil(n / cols);
    const areaW = W - 2 * M, areaH = fondo - alto - hTitolo - hCredito;
    let w = (areaW - (cols - 1) * g) / cols;
    let h = Math.min((areaH - (rows - 1) * g) / rows, w / r);
    w = Math.min(w, h * r);
    w = Math.round(w); h = Math.round(h);
    const gridW = cols * w + (cols - 1) * g, gridH = rows * h + (rows - 1) * g;
    const x0 = Math.round((W - gridW) / 2);
    const y0 = alto + hTitolo + Math.max(0, Math.round((areaH - gridH) / 2));
    const fsE = vert ? 30 : 28;
    // riserve: le immagini distribuite sulla prima parte della scena
    const riserva = (i) => 0.4 + (i * Math.max(0.5, durata * 0.7)) / n;
    const celle = im.map((x, i) => {
      const c = i % cols, rr = Math.floor(i / cols);
      // l'ultima riga incompleta va al centro
      const inRiga = rr === rows - 1 ? n - rr * cols : cols;
      const sx = Math.round((gridW - (inRiga * w + (inRiga - 1) * g)) / 2);
      return `<div class="${px}cella" id="${px}c${i}" style="left:${x0 + sx + c * (w + g)}px;top:${y0 + rr * (h + g)}px">`
        + `<img src="assets/media/${esc(nomeFile(x.media))}" alt=""><span class="${px}etichetta">${esc(testo(x.etichetta))}</span></div>`;
    }).join('');
    const css = `
    .${px}titolo { position: absolute; left: ${M}px; right: ${M}px; top: ${alto}px; text-align: center; font-weight: 600;
      font-size: ${vert ? 60 : 52}px; line-height: 1.1; color: ${C.crema}; opacity: 0; }
    .${px}cella { position: absolute; width: ${w}px; height: ${h}px; border-radius: 16px; overflow: hidden;
      border: 4px solid ${C.crema}; background: ${C.scuro}; opacity: 0; }
    .${px}cella img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .${px}etichetta { position: absolute; left: 14px; bottom: 14px; padding: 6px 16px; border-radius: 999px; background: ${C.crema};
      color: ${C.fondo}; font-family: "JetBrains Mono", monospace; font-weight: 600; font-size: ${fsE}px; letter-spacing: 0.04em; text-transform: uppercase; }
    .${px}credito { position: absolute; left: ${M}px; right: ${M}px; top: ${y0 + gridH + (vert ? 26 : 20)}px; text-align: center;
      font-family: "JetBrains Mono", monospace; font-size: ${vert ? 30 : 28}px; letter-spacing: 0.04em; color: ${C.crema2}; opacity: 0; }`;
    const corpo = (ti ? `<div class="${px}titolo" id="${px}titolo">${esc(ti)}</div>` : '') + celle
      + (cr ? `<div class="${px}credito" id="${px}credito">${esc(cr)}</div>` : '');
    const tempi = im.map((_, i) => Math.min(Math.max(0.25, t(`e${i}`, riserva(i))), Math.max(0.3, durata - 1)));
    // due immagini nominate quasi insieme entrano comunque una dopo l'altra
    for (let i = 1; i < n; i++) tempi[i] = Math.max(tempi[i], tempi[i - 1] + 0.25);
    const anima = `
      ${ti ? `tl.fromTo(q("#${px}titolo"), { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" }, 0.15);` : ''}
      ${tempi.map((tt, i) => `tl.fromTo(q("#${px}c${i}"), { opacity: 0, scale: 0.86, y: 30 }, { opacity: 1, scale: 1, y: 0, duration: 0.45, ease: "back.out(1.8)" }, ${s3(tt)});`).join('\n      ')}
      ${cr ? `tl.fromTo(q("#${px}credito"), { opacity: 0 }, { opacity: 1, duration: 0.4 }, ${s3(Math.min(tempi[n - 1] + 0.4, durata - 0.5))});` : ''}`;
    return scena({ id, px, durata, etichetta, numero, css, corpo, anima, formato });
  },
};
