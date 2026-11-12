// Stampo «percorso» (carta, 12/11/2026): un sentiero tratteggiato si disegna sul cartone e le tappe (cerchi colorati con
// un'etichetta) scattano quando la voce le nomina. Per passi in ordine o un elenco di cose (formati, fasi, «dove → come → usa»).
// In verticale il sentiero scende a zig-zag. Dalla prova dei movimenti del video EarnixLab iO2sNuzaCxU.
import { scena, s3, esc, misura, attacchi, CARTA } from '../base.mjs';

const COLORI = [CARTA.verde, CARTA.giallo, CARTA.blu, CARTA.rosa, CARTA.inchiostro];

// punti del sentiero (polilinea fitta, stessa forma ogni volta) e posizione delle tappe sul sentiero
function geometria(V, n) {
  const punti = [];
  const N = 80;
  for (let i = 0; i <= N; i++) {
    const u = i / N;
    punti.push(V ? [540 + 280 * Math.sin(u * Math.PI * 2.2 + 0.4), 360 + u * 780] : [180 + u * 1560, 560 + 150 * Math.sin(u * Math.PI * 3 + 0.5)]);
  }
  const tappe = Array.from({ length: n }, (_, i) => {
    const u = (i + 0.5) / n;
    return V ? [540 + 280 * Math.sin(u * Math.PI * 2.2 + 0.4), 360 + u * 780] : [180 + u * 1560, 560 + 150 * Math.sin(u * Math.PI * 3 + 0.5)];
  });
  const d = punti.map(([x, y], i) => `${i ? 'L' : 'M'} ${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  return { d, tappe };
}

export default {
  nome: 'percorso',
  descrizione: 'dotted path drawn across a cardboard background, with 2-5 colored stops that pop in as the voice names them; use for steps in order or a short list of things (formats, phases, where → how → use)',
  schema: '{ "titolo": "max 32, e.g. It reads all of these", "tappe": ["max 10 each, 2-5 stops, e.g. Text, Images, Audio"] }',
  valida(d) {
    const e = [];
    const tit = d?.titolo == null ? '' : String(d.titolo).trim();
    if (!tit) e.push('titolo mancante'); else if (tit.length > 32) e.push('titolo oltre 32 caratteri');
    if (!Array.isArray(d?.tappe) || d.tappe.length < 2 || d.tappe.length > 5) e.push('tappe: da 2 a 5');
    else d.tappe.forEach((x, i) => { if (typeof x !== 'string' || !x.trim()) e.push(`tappa ${i + 1} vuota`); else if (x.trim().length > 10) e.push(`tappa ${i + 1} oltre 10 caratteri`); });
    return e;
  },
  parole(d) {
    return attacchi(d, (d.tappe || []).map((x, i) => [`p${i}`, x]));
  },
  html({ id, px, dati, durata, t, etichetta, numero, formato = 'orizzontale' }) {
    const V = formato === 'verticale';
    const W = V ? 1080 : 1920, Hh = V ? 1920 : 1080;
    const titolo = String(dati.titolo).trim(), tappe = dati.tappe.map((x) => String(x).trim());
    const { d, tappe: pos } = geometria(V, tappe.length);
    const fsTit = misura(titolo, { larghezza: W - 2 * (V ? 72 : 96), max: V ? 72 : 76, min: 40, fattore: 0.55 });
    const R = V ? 52 : 48, fsL = V ? 40 : 38;
    const fine = Math.max(0, durata - 0.6);
    const tempo = (x) => s3(Math.min(x, fine));
    const disegno = s3(Math.max(1.5, Math.min(durata * 0.8, durata - 0.8)));
    const tP = tappe.map((_, i) => Math.max(0.6 + i * 0.35, t(`p${i}`, 0.3 + disegno * ((i + 0.5) / tappe.length))));

    const css = `
    #${px}tit { position: absolute; left: 0; width: ${W}px; top: ${V ? 190 : 150}px; text-align: center; font-family: "Inter", sans-serif; font-weight: 700; font-size: ${fsTit}px; color: ${CARTA.inchiostro}; white-space: nowrap; }
    #${px}via { position: absolute; left: 0; top: 0; width: ${W}px; height: ${Hh}px; }
    .${px}pin { position: absolute; transform: translate(-50%, -${R}px); }
    .${px}pin-in { display: flex; flex-direction: column; align-items: center; }
    .${px}pin-c { width: ${2 * R}px; height: ${2 * R}px; border-radius: 50%; border: 8px solid ${CARTA.bordo}; filter: ${CARTA.ombra}; }
    .${px}pin-l { margin-top: 14px; background: ${CARTA.foglio}; font-family: "JetBrains Mono", monospace; font-weight: 700; font-size: ${fsL}px; padding: 8px 20px; border: 4px solid ${CARTA.inchiostro}; color: ${CARTA.inchiostro}; white-space: nowrap; }`;
    const clip = V ? `<rect id="${px}svela" x="0" y="0" width="${W}" height="0"/>` : `<rect id="${px}svela" x="0" y="0" width="0" height="${Hh}"/>`;
    const corpo = `
      <div id="${px}tit">${esc(titolo)}</div>
      <svg id="${px}via" viewBox="0 0 ${W} ${Hh}"><defs><clipPath id="${px}cp">${clip}</clipPath></defs>
        <path d="${d}" fill="none" stroke="${CARTA.bordo}" stroke-width="22" stroke-linecap="round" stroke-dasharray="2 30" clip-path="url(#${px}cp)"/>
        <path d="${d}" fill="none" stroke="${CARTA.filo}" stroke-width="10" stroke-linecap="round" stroke-dasharray="2 30" clip-path="url(#${px}cp)"/>
      </svg>
      ${tappe.map((x, i) => `<div class="${px}pin" style="left:${pos[i][0].toFixed(0)}px;top:${pos[i][1].toFixed(0)}px"><div class="${px}pin-in" id="${px}p${i}"><div class="${px}pin-c" style="background:${COLORI[i % 5]}"></div><div class="${px}pin-l">${esc(x)}</div></div></div>`).join('\n      ')}`;
    const anima = `
      tl.fromTo(q("#${px}tit"), { y: -30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, ease: "power2.out" }, 0.05);
      tl.fromTo(q("#${px}svela"), { attr: { ${V ? 'height' : 'width'}: 0 } }, { attr: { ${V ? 'height' : 'width'}: ${V ? Hh : W} }, duration: ${disegno}, ease: "power1.inOut" }, 0.3);
      ${tappe.map((_, i) => `tl.fromTo(q("#${px}p${i}"), { scale: 0, y: -60 }, { scale: 1, y: 0, duration: 0.4, ease: "back.out(2.4)" }, ${tempo(tP[i])});`).join('\n      ')}`;
    return scena({ id, px, durata, etichetta, numero, css, corpo, anima, formato: V ? 'verticale' : 'orizzontale', carta: true });
  },
};
