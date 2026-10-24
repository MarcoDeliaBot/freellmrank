import { formatoDi } from './base.mjs';
// Sottotitoli dei video a stampi (24/10/2026): una pillola crema in basso, una frase corta alla volta, la parola detta
// si accende in verde (come la prova DeepInfer). Si costruiscono dalle parole del copione con i tempi di voce.mjs.
// Scrive anche il file .srt per YouTube, con lo stesso testo.
const SILENZIO = 0.18; // secondi di pausa che spezzano una frase
const MAX_PAROLE = 4;
const MAX_CARATTERI = 28;

// gruppi: [{ start, end, words: [{ text, start, end }] }] (tempi assoluti)
export function gruppi(parole) {
  const out = [];
  let cur = null;
  for (const w of parole) {
    const prec = cur && cur.words.at(-1);
    const lungo = cur && (cur.words.map((x) => x.text).join(' ') + ' ' + w.text).length > MAX_CARATTERI;
    // una parola che chiude la frase («day,») resta col suo gruppo invece di restare da sola
    const chiude = /[.,!?;:]$/.test(w.text) && cur && cur.words.length === MAX_PAROLE && !lungo && w.start - prec.end <= SILENZIO;
    if (!cur || (cur.words.length >= MAX_PAROLE && !chiude) || lungo || w.start - prec.end > SILENZIO || /[.,!?;:]$/.test(prec.text)) {
      cur = { words: [] }; out.push(cur);
    }
    cur.words.push(w);
  }
  for (const g of out) { g.start = g.words[0].start; g.end = g.words.at(-1).end; }
  return out;
}

export function composizione(lista, durata, formato = 'orizzontale') {
  const { W, H, capTop, capH } = formatoDi(formato);
  const vert = formato === 'verticale';
  const G = lista.map((g) => ({ start: g.start, end: g.end, words: g.words.map((w) => ({ text: w.text, start: w.start, end: w.end })) }));
  return `<template id="captions-template" data-composition-id="captions" data-width="${W}" data-height="${H}">
<script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
<style>
  @font-face { font-family: 'Source Serif 4'; src: url('assets/fonts/Source_Serif_4.ttf') format('truetype'); font-weight: 200 900; font-style: normal; font-display: block; }
  #captions-root { position: absolute; inset: 0; pointer-events: none; }
  .cap-strato { position: absolute; inset: 0; z-index: 20; pointer-events: none; }
  .cap-fascia { position: absolute; left: 0; right: 0; top: ${capTop}px; height: ${capH}px; display: flex; align-items: center; justify-content: center; }
  .cap-gruppo { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; opacity: 0; }
  .cap-pillola { max-width: ${vert ? 88 : 78}%; padding: 20px 44px 24px; background: #eef5f0; border: 2px solid #4ccb8b; border-radius: 6px; }
  .cap-riga { display: flex; flex-wrap: wrap; justify-content: center; gap: 0.1em 0.34em; font-family: "Source Serif 4", Georgia, serif;
    font-weight: 500; font-size: ${vert ? 64 : 58}px; line-height: 1.1; letter-spacing: -0.02em; }
  .cap-parola { display: inline-block; padding: 0 0.06em; color: #8a918d; }
  .cap-parola.attiva { color: #0b0f0d; background: #4ccb8b; box-shadow: 0 0 0 0.05em #4ccb8b; border-radius: 6px; }
  .cap-parola.detta { color: #0b0f0d; background: transparent; box-shadow: none; }
</style>
<div id="captions-root" data-composition-id="captions" data-timeline-locked data-start="0" data-duration="${durata}" data-fps="30" data-width="${W}" data-height="${H}">
  <div class="cap-strato" aria-hidden="true"><div id="cap-fascia" class="cap-fascia"></div></div>
</div>
<script>
  var DURATA = ${durata};
  var GRUPPI = ${JSON.stringify(G)};
  (function () {
    var fascia = document.getElementById("cap-fascia");
    GRUPPI.forEach(function (g, i) {
      var el = document.createElement("div"); el.className = "cap-gruppo"; el.id = "cap-gruppo-" + i;
      var p = document.createElement("div"); p.className = "cap-pillola";
      var r = document.createElement("div"); r.className = "cap-riga";
      g.words.forEach(function (w, k) { var s = document.createElement("span"); s.className = "cap-parola"; s.id = "cap-parola-" + i + "-" + k; s.textContent = w.text; r.appendChild(s); });
      p.appendChild(r); el.appendChild(p); fascia.appendChild(el);
    });
    var tl = gsap.timeline({ paused: true });
    GRUPPI.forEach(function (g, i) {
      var el = document.getElementById("cap-gruppo-" + i);
      var dopo = GRUPPI[i + 1];
      var da = Math.max(0, g.start);
      var a = dopo ? Math.min(dopo.start, g.end + 0.3) : DURATA;
      if (a <= da) a = da + 0.01;
      tl.set(el, { opacity: 1 }, da);
      tl.set(el, { opacity: 0 }, a);
      g.words.forEach(function (w, k) {
        var s = document.getElementById("cap-parola-" + i + "-" + k);
        var t = Math.max(da, w.start);
        tl.set(s, { className: "cap-parola" }, da);
        tl.set(s, { className: "cap-parola attiva" }, t);
        if (k + 1 < g.words.length) tl.set(s, { className: "cap-parola detta" }, Math.max(da, g.words[k + 1].start));
        else tl.set(s, { className: "cap-parola detta" }, Math.min(a, w.end + 0.1));
      });
    });
    tl.to({}, { duration: DURATA }, 0);
    window.__timelines = window.__timelines || {};
    window.__timelines["captions"] = tl;
  })();
</script>
</template>
`;
}

const ora = (t) => {
  const ms = Math.round(t * 1000);
  const p = (n, k = 2) => String(n).padStart(k, '0');
  return `${p(Math.floor(ms / 3600000))}:${p(Math.floor(ms / 60000) % 60)}:${p(Math.floor(ms / 1000) % 60)},${p(ms % 1000, 3)}`;
};
export function srt(lista) {
  return lista.map((g, i) => `${i + 1}\n${ora(g.start)} --> ${ora(Math.max(g.end, g.start + 0.3))}\n${g.words.map((w) => w.text).join(' ')}\n`).join('\n');
}
