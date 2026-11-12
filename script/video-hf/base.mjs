// Parti comuni degli stampi dei video (deciso da Marco il 24/10/2026: i video delle notizie nello stile della prova DeepInfer,
// fatti ogni giorno da n8n sui computer di GitHub, senza Claude). Uno stampo è una scena HyperFrames già disegnata e animata,
// con i buchi (testi, numeri, tempi) riempiti dal piano del video (script/video-hf/piano.mjs).
// Caratteri dal preset «editorial-forest»; dal 4/11/2026 colori chiari di Claude al posto del verde del sito (#4ccb8b).
import fs from 'node:fs';

// Colori chiari di Claude (Marco, 4/11/2026: prova «Sì, prepara la prova», poi «Sì, passali» per tutti i video a stampi),
// gli stessi dello Short Top 10 (d-022), col logo del sito come in quello Short (d-023). I nomi restano quelli del verde
// per non toccare gli stampi: «crema» è il testo principale (ora scuro), «fondo» il fondo (ora chiaro), «accentoScuro»
// l'arancio tenue delle tacche. marchio: il verde del logo e di «Arena»; aloneRgb/aloneScuroRgb: gli accenti in r,g,b
// per gli aloni; pillola e futura: i sottotitoli.
export const C = {
  fondo: '#faf9f5', pannello: '#e8e6dc', scuro: '#d9d6cb',
  accento: '#d97757', accentoScuro: '#e39e86',
  crema: '#141413', crema2: '#6b6b69', inchiostro: '#141413',
  marchio: '#0d7a47', aloneRgb: '217,119,87', aloneScuroRgb: '227,158,134',
  pillola: '#ffffff', futura: '#b0aea5',
};
// il logo del sito (quadrato verde con tre barre), in linea nella barra in alto e nella chiusura
export const LOGO = fs.readFileSync(new URL('../../sorgente/favicon.svg', import.meta.url), 'utf8').trim();
export const W = 1920;
export const H = 1080;
export const FONDO_SOTTOTITOLI = 860; // sotto questa riga ci sono i sottotitoli: niente contenuto
// i due formati (24/10/2026 sera, Marco: «li vorrei tutti così», anche gli Short). Verticale = Short di YouTube: in basso
// YouTube copre lo schermo con titolo, canale e pulsanti, quindi contenuto fra y 150 e 1180, sottotitoli 1220-1420,
// sotto solo il fondo. margine: distanza dai bordi destro e sinistro
export const FORMATI = {
  orizzontale: { W: 1920, H: 1080, fondo: 860, capTop: 900, capH: 180, margine: 96 },
  verticale: { W: 1080, H: 1920, fondo: 1180, capTop: 1220, capH: 200, margine: 72 },
};
export const formatoDi = (nome) => FORMATI[nome] || FORMATI.orizzontale;

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// dimensione del carattere perché un testo stia in una larghezza, decisa qui e non nel browser (il video deve uscire
// sempre uguale). fattore: larghezza media di un carattere in em (serif ~0.5, mono 0.6)
export function misura(testo, { larghezza, max, min = 28, fattore = 0.5, righe = 1 }) {
  const n = Math.max(1, String(testo).length);
  const px = Math.floor((larghezza * righe) / (n * fattore));
  return Math.max(min, Math.min(max, px));
}

// la parola della voce che fa comparire un pezzo: quella scelta dal piano (dati.quando[chiave]) o, se manca,
// la parola più lunga del testo del pezzo (le parole corte come «the» si trovano ovunque)
const VUOTE = new Set(['the', 'and', 'for', 'with', 'from', 'that', 'this', 'into', 'your', 'are', 'its', 'per']);
const candidate = (testo) => String(testo ?? '').split(/[\s/·,]+/).map((w) => w.replace(/[^\w.%-]/g, '').replace(/\.$/, '')).filter((w) => w.length > 1 && !VUOTE.has(w.toLowerCase())).sort((a, b) => b.length - a.length);
export function attacco(dati, chiave, testo) {
  return dati?.quando?.[chiave] || candidate(testo)[0] || '';
}
// l'elenco per parole(dati): solo i pezzi che ci sono. «altre»: le altre parole del pezzo, che monta.mjs prova
// se la voce non dice la prima (il piano scrive «Largest model…» e la voce dice «The biggest model…»)
export const attacchi = (dati, coppie) => coppie.filter(([, testo]) => testo != null && String(testo).trim())
  .map(([chiave, testo]) => ({ chiave, parola: attacco(dati, chiave, testo), altre: candidate(testo) })).filter((x) => x.parola);

// secondi a 3 decimali, per i tempi scritti nel codice della scena
export const s3 = (x) => Math.round(Math.max(0, x) * 1000) / 1000;

const FONT = `@font-face { font-family: "Source Serif 4"; src: url("assets/fonts/Source_Serif_4.ttf") format("truetype"); font-weight: 200 900; font-style: normal; font-display: block; }
    @font-face { font-family: "JetBrains Mono"; src: url("assets/fonts/JetBrains_Mono.ttf") format("truetype"); font-weight: 100 800; font-style: normal; font-display: block; }
    @font-face { font-family: "Inter"; src: url("assets/fonts/Inter_700.woff2") format("woff2"); font-weight: 700; font-style: normal; font-display: block; }
    @font-face { font-family: "Caveat"; src: url("assets/fonts/Caveat_700.woff2") format("woff2"); font-weight: 700; font-style: normal; font-display: block; }`;

// Stampi «carta» (12/11/2026, Marco: «Sì, fai gli stampi» dopo la prova dei movimenti del video EarnixLab iO2sNuzaCxU):
// fondo di cartone con grana, oggetti come adesivi di carta (bordo crema e ombra). Colori propri, fissi: la carta resta carta.
export const CARTA = {
  fondo: `radial-gradient(ellipse 70% 60% at 50% 40%, rgba(255,250,235,0.35), rgba(0,0,0,0) 70%), url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' seed='7'/><feColorMatrix values='0 0 0 0 0.35 0 0 0 0 0.27 0 0 0 0 0.15 0 0 0 0.22 0'/></filter><rect width='240' height='240' filter='url(%23n)'/></svg>"), linear-gradient(160deg, #d6c29b, #c4ad82)`,
  bordo: '#fffaf0', foglio: '#fbf7ee', inchiostro: '#1d1d1f', grigio: '#8a8174', riga: '#d8d0c0', filo: '#6b5a3e',
  rosso: '#d6463c', giallo: '#f2b134', verde: '#2e9e6b', blu: '#3b6fd8', rosa: '#e8475f',
  ombra: 'drop-shadow(0 10px 0 rgba(60,40,10,0.18)) drop-shadow(0 18px 24px rgba(60,40,10,0.22))',
};
// coriandoli deterministici per gli stampi carta: elementi e righe di animazione (nessun Math.random nel video)
export function coriandoli(px, n, seme, { raggio = 300 } = {}) {
  let x = seme >>> 0;
  const r = () => ((x = (x * 1664525 + 1013904223) >>> 0) / 4294967296);
  const colori = [CARTA.rosa, CARTA.giallo, CARTA.verde, CARTA.blu, CARTA.inchiostro];
  const pezzi = Array.from({ length: n }, (_, i) => {
    const a = r() * Math.PI * 2, d = raggio * (0.5 + r() * 0.9);
    return { i, c: colori[i % 5], x: Math.cos(a) * d, y: Math.sin(a) * d * 0.7 - 60, rot: (r() - 0.5) * 540, w: 10 + r() * 10, h: 5 + r() * 6 };
  });
  const html = pezzi.map((p) => `<i class="${px}cf" id="${px}cf${p.i}" style="background:${p.c};width:${p.w.toFixed(1)}px;height:${p.h.toFixed(1)}px"></i>`).join('');
  const anima = (t) => pezzi.map((p) => `tl.fromTo(q("#${px}cf${p.i}"),{x:0,y:0,rotation:0,opacity:0,scale:0.4},{x:${p.x.toFixed(1)},y:${p.y.toFixed(1)},rotation:${p.rot.toFixed(0)},scale:1,opacity:1,duration:0.9,ease:"power3.out"},${t});tl.to(q("#${px}cf${p.i}"),{y:"+=140",opacity:0,duration:0.8,ease:"power1.in"},${s3(t + 0.9)});`).join(' ');
  const css = `.${px}cf { position: absolute; left: 0; top: 0; border-radius: 2px; opacity: 0; }`;
  return { html, anima, css };
}

// la scena completa: fondo verde con griglia, barra in alto, il corpo dello stampo e la sua animazione.
// id: identificativo della composizione (es. "s3-numeri"); px: prefisso di classi e id dello stampo (es. "s3-");
// css, corpo: dello stampo, con classi e id che iniziano con px; anima: righe JS che usano tl, q(sel), qa(sel), DUR
// fuori: pezzi messi fuori dal palco (che ha data-start): un <video data-start> non può stare dentro un contenitore temporizzato
// (regola di HyperFrames «video_nested_in_timed_element»), quindi le clip dello stampo «immagine» vanno qui (26/10/2026)
export function scena({ id, px, durata, etichetta = '', numero = '', css = '', corpo = '', anima = '', ultima = false, formato = 'orizzontale', fuori = '', carta = false }) {
  const D = s3(durata);
  const { W, H, margine: M } = formatoDi(formato);
  const alto = formato === 'verticale' ? 72 : 56;
  return `<template>
  <style>
    ${FONT}
    #root { position: absolute; inset: 0; width: ${W}px; height: ${H}px; overflow: hidden; container-type: size; color: ${C.crema}; font-family: "Source Serif 4", Georgia, serif; }
    #${px}fondo { position: absolute; inset: 0; background: ${carta ? CARTA.fondo : `linear-gradient(to bottom, ${C.fondo} 0%, ${C.fondo} 50%, ${C.pannello} 100%)`}; }
    #${px}palco { position: absolute; inset: 0; }
    .${px}barra { position: absolute; left: ${M}px; right: ${M}px; top: ${alto}px; display: flex; justify-content: space-between; align-items: center;
      font-family: "JetBrains Mono", monospace; font-weight: 500; font-size: 28px; letter-spacing: 0.18em; text-transform: uppercase; color: ${C.crema2}; }
    .${px}riga-barra { position: absolute; left: ${M}px; right: ${M}px; top: ${alto + 52}px; height: 2px; background: ${C.crema2}; opacity: 0.35; transform-origin: left center; }
    .${px}firma { display: inline-flex; align-items: center; gap: 14px; text-transform: none; letter-spacing: 0; }
    .${px}firma svg { width: 40px; height: 40px; display: block; }
    .${px}firma-nome { font-family: "Source Serif 4", Georgia, serif; font-weight: 600; font-size: 32px; letter-spacing: -0.01em; color: ${C.crema}; }
    .${px}firma-arena { color: ${C.marchio}; }
    ${css}
  </style>
  <div id="root" data-composition-id="${id}" data-width="${W}" data-height="${H}" data-duration="${D}">
    <div id="${px}fondo" class="clip" data-start="0" data-duration="${D}" data-track-index="0"></div>
    <div id="${px}palco" class="clip" data-start="0" data-duration="${D}" data-track-index="1">
      <div class="${px}barra" id="${px}barra"><span>${ultima ? esc(etichetta) : `<span class="${px}firma">${LOGO}<span class="${px}firma-nome">FreeLLM<span class="${px}firma-arena">Arena</span></span></span>`}</span><span>${(ultima ? [numero] : [etichetta, numero]).filter(Boolean).map(esc).join(' · ')}</span></div>
      <div class="${px}riga-barra" id="${px}riga-barra"></div>
      ${corpo}
    </div>
    ${fuori}
  </div>
  <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
  <script>
    (function () {
      const ID = ${JSON.stringify(id)};
      const DUR = ${D};
      const q = (s) => document.querySelector('[data-composition-id="' + ID + '"] ' + s);
      const qa = (s) => document.querySelectorAll('[data-composition-id="' + ID + '"] ' + s);
      const tl = gsap.timeline({ paused: true });
      tl.fromTo(q("#${px}barra"), { opacity: 0, y: -12 }, { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" }, 0.05);
      tl.fromTo(q("#${px}riga-barra"), { scaleX: 0 }, { scaleX: 1, duration: 0.7, ease: "power3.out" }, 0.1);
      ${anima}
      ${ultima ? `tl.to(q("#${px}palco"), { opacity: 0, duration: 0.25, ease: "power1.in" }, DUR - 0.25);` : ''}
      window.__timelines = window.__timelines || {};
      window.__timelines[ID] = tl;
    })();
  </script>
</template>
`;
}
