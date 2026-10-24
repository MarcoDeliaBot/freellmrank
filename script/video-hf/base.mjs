// Parti comuni degli stampi dei video (deciso da Marco il 24/10/2026: i video delle notizie nello stile della prova DeepInfer,
// fatti ogni giorno da n8n sui computer di GitHub, senza Claude). Uno stampo è una scena HyperFrames già disegnata e animata,
// con i buchi (testi, numeri, tempi) riempiti dal piano del video (script/video-hf/piano.mjs).
// Colori e caratteri vengono dal preset «editorial-forest» rimappato sul verde del sito (#4ccb8b).

export const C = {
  fondo: '#31433a', pannello: '#3d5348', scuro: '#27352e',
  accento: '#4ccb8b', accentoScuro: '#2f9e68',
  crema: '#eef5f0', crema2: '#cfdbd5', inchiostro: '#0b0f0d',
};
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
    @font-face { font-family: "JetBrains Mono"; src: url("assets/fonts/JetBrains_Mono.ttf") format("truetype"); font-weight: 100 800; font-style: normal; font-display: block; }`;

// la scena completa: fondo verde con griglia, barra in alto, il corpo dello stampo e la sua animazione.
// id: identificativo della composizione (es. "s3-numeri"); px: prefisso di classi e id dello stampo (es. "s3-");
// css, corpo: dello stampo, con classi e id che iniziano con px; anima: righe JS che usano tl, q(sel), qa(sel), DUR
export function scena({ id, px, durata, etichetta = '', numero = '', css = '', corpo = '', anima = '', ultima = false, formato = 'orizzontale' }) {
  const D = s3(durata);
  const { W, H, margine: M } = formatoDi(formato);
  const alto = formato === 'verticale' ? 72 : 56;
  return `<template>
  <style>
    ${FONT}
    #root { position: absolute; inset: 0; width: ${W}px; height: ${H}px; overflow: hidden; container-type: size; color: ${C.crema}; font-family: "Source Serif 4", Georgia, serif; }
    #${px}fondo { position: absolute; inset: 0; background-color: ${C.fondo};
      background-image: linear-gradient(to right, ${C.pannello} 2px, transparent 2px), linear-gradient(to bottom, ${C.pannello} 2px, transparent 2px);
      background-size: 120px 120px; background-position: center center; }
    #${px}velo { position: absolute; inset: 0; background: ${C.fondo}; opacity: 0.55; }
    #${px}palco { position: absolute; inset: 0; }
    .${px}barra { position: absolute; left: ${M}px; right: ${M}px; top: ${alto}px; display: flex; justify-content: space-between; align-items: center;
      font-family: "JetBrains Mono", monospace; font-weight: 500; font-size: 28px; letter-spacing: 0.18em; text-transform: uppercase; color: ${C.accento}; }
    .${px}riga-barra { position: absolute; left: ${M}px; right: ${M}px; top: ${alto + 52}px; height: 2px; background: ${C.accento}; transform-origin: left center; }
    ${css}
  </style>
  <div id="root" data-composition-id="${id}" data-width="${W}" data-height="${H}" data-duration="${D}">
    <div id="${px}fondo" class="clip" data-start="0" data-duration="${D}" data-track-index="0"><div id="${px}velo"></div></div>
    <div id="${px}palco" class="clip" data-start="0" data-duration="${D}" data-track-index="1">
      <div class="${px}barra" id="${px}barra"><span>${esc(etichetta)}</span><span>${esc(numero)}</span></div>
      <div class="${px}riga-barra" id="${px}riga-barra"></div>
      ${corpo}
    </div>
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
