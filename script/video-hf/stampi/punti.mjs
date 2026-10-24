// Stampo «punti»: 2–4 punti chiave per le notizie senza numeri (la maggior parte). Titolo in alto a sinistra con la riga
// d'accento che si disegna; i punti sono righe grandi numerate (01, 02… in un quadratino d'accento) che salgono una alla
// volta quando la voce le nomina; all'arrivo di un punto nuovo i precedenti si attenuano (crema2) perché si legga quello.
// Carattere dei punti deciso qui con misura() sul punto più lungo, poi ridotto finché tutto sta sopra i sottotitoli
// (y 860 in orizzontale; y 1180 nel verticale degli Short, dove i punti possono andare su 3 righe).
import { C, scena, s3, esc, misura, attacchi, formatoDi } from '../base.mjs';

const MAX_TITOLO = 32;
const MAX_PUNTO = 60;
const MAX_PAROLA = 22; // una parola più lunga non va a capo e sfonderebbe la riga
const INTERLINEA = 1.14;
const GAP_MIN = 30;
const F_MIN = 40;

// larghezza in em di ogni carattere di Source Serif 4 (misurata sui fotogrammi delle prove del 24/10/2026, con il 4–10% di
// margine): serve a sapere in quante righe va a capo un punto senza chiederlo al browser
const MINUSCOLE = { a: 0.5, b: 0.55, c: 0.45, d: 0.55, e: 0.48, f: 0.32, g: 0.5, h: 0.56, i: 0.27, j: 0.27, k: 0.52, l: 0.27, m: 0.83, n: 0.56, o: 0.53, p: 0.55, q: 0.55, r: 0.38, s: 0.42, t: 0.33, u: 0.56, v: 0.5, w: 0.74, x: 0.5, y: 0.5, z: 0.45 };
const MAIUSCOLE = { I: 0.32, J: 0.36, M: 0.86, W: 0.98, L: 0.58, F: 0.56, E: 0.6, T: 0.62, P: 0.58, S: 0.52, B: 0.62 };
const largo = (ch) => (ch === ' ' ? 0.23 : MINUSCOLE[ch] ?? (/[A-Z]/.test(ch) ? MAIUSCOLE[ch] ?? 0.68 : /[0-9]/.test(ch) ? 0.5 : /[A-Za-zÀ-ÿ]/.test(ch) ? 0.6 : 0.3));
const em = (s) => [...String(s)].reduce((a, c) => a + largo(c), 0);
// righe occupate andando a capo per parole, come fa il browser (larghezza in em)
function righeDi(testo, larghezzaEm) {
  let righe = 1, riga = 0;
  for (const p of String(testo).trim().split(/\s+/)) {
    const w = em(p);
    if (riga === 0) riga = w;
    else if (riga + 0.23 + w <= larghezzaEm) riga += 0.23 + w;
    else { righe++; riga = w; }
    if (w > larghezzaEm) return 99; // una parola sola non ci sta
  }
  return righe;
}

// le misure dei due formati: l'orizzontale (1920×1080) è quello di sempre; il verticale (Short, 1080×1920) ha il
// titolo anche su 2 righe, punti fino a 3 righe e tutto fra y 150 e 1180, con il gruppo dei punti centrato nello spazio
const MISURE = {
  orizzontale: { alto: 150, tMax: 84, tMin: 56, tRighe: 1, tetti: { 2: 136, 3: 108, 4: 92 }, righeMax: 2, latoMin: 60, latoMax: 84, scarto: 44, gapMax: 150, fIndice: 30, centra: false },
  verticale: { alto: 170, tMax: 88, tMin: 52, tRighe: 2, tetti: { 2: 112, 3: 92, 4: 80 }, righeMax: 3, latoMin: 56, latoMax: 72, scarto: 28, gapMax: 110, fIndice: 32, centra: true },
};

function impagina(dati, formato = 'orizzontale') {
  const F = formatoDi(formato);
  const M = MISURE[formato === 'verticale' ? 'verticale' : 'orizzontale'];
  const MARGINE = F.margine;
  const LARGO = F.W - 2 * MARGINE; // 1728 in orizzontale, 936 in verticale
  const punti = dati.punti.map((p) => String(p).trim());
  const titolo = String(dati.titolo).trim();
  const n = punti.length;
  let fTitolo = Math.max(M.tMin, Math.min(M.tMax, Math.floor((LARGO * M.tRighe) / Math.max(1, em(titolo)))));
  while (fTitolo > M.tMin && righeDi(titolo, LARGO / fTitolo) > M.tRighe) fTitolo -= 2;
  const righeTitolo = righeDi(titolo, LARGO / fTitolo);
  const filo = M.alto + Math.round(fTitolo * 1.05 * righeTitolo) + 22; // la riga d'accento sotto il titolo
  const cima = filo + 4 + 44; // dove iniziano i punti
  const fondo = F.fondo - 14;
  const spazio = fondo - cima;
  const lato = (f) => Math.max(M.latoMin, Math.min(M.latoMax, Math.round(f * 0.92))); // il quadratino dell'indice
  const scarto = M.scarto; // fra quadratino e testo
  const larghezzaTesto = (f) => LARGO - lato(f) - scarto;
  // tetto per numero di punti, poi misura() sul punto più lungo, poi giù finché ogni punto sta nelle sue righe
  // (2 in orizzontale, 3 in verticale) e tutto sta sopra i sottotitoli
  const tetto = M.tetti[n] || M.tetti[4];
  const lungo = punti.reduce((a, b) => (em(b) > em(a) ? b : a), '');
  let f = misura(lungo, { larghezza: larghezzaTesto(tetto), max: tetto, min: F_MIN, fattore: em(lungo) / Math.max(1, lungo.length), righe: M.righeMax });
  const conto = (f) => {
    const righe = punti.map((p) => righeDi(p, larghezzaTesto(f) / f));
    const alti = righe.map((r) => Math.max(lato(f), Math.round(r * f * INTERLINEA)));
    return { righe, alti, totale: alti.reduce((a, b) => a + b, 0) };
  };
  const sta = (c) => c.righe.every((r) => r <= M.righeMax) && c.totale + (n - 1) * GAP_MIN <= spazio;
  let c = conto(f);
  while (f > F_MIN && !sta(c)) { f -= 2; c = conto(f); }
  // lo spazio che resta va fra i punti (con un tetto: oltre, il gruppo si stacca troppo)
  const gap = Math.round(Math.max(GAP_MIN, Math.min(M.gapMax, (spazio - c.totale) / Math.max(1, n - 1))));
  // in verticale il gruppo dei punti sta al centro dello spazio libero (il telefono si guarda in alto-centro)
  const sposta = M.centra ? Math.max(0, Math.round((spazio - c.totale - (n - 1) * gap) / 2)) : 0;
  return { punti, titolo, n, MARGINE, LARGO, alto: M.alto, fTitolo, titoloSta: righeTitolo <= M.tRighe, nowrap: M.tRighe === 1, filo, cima: cima + sposta, f,
    lato: lato(f), scarto, righe: c.righe, righeMax: M.righeMax, gap, fIndice: M.fIndice, sta: sta(c) };
}

export default {
  nome: 'punti',
  descrizione: '2-4 key points of a news story that has no striking numbers (the most common case): what changed, why it matters, what stays the same',
  schema: '{ "titolo": "What changed, max 32 chars", "punti": ["one short sentence, max 60 chars", "2 to 4 points, in the order the voice says them"] }',
  valida(dati) {
    const e = [];
    if (!dati || typeof dati !== 'object') return ['dati mancanti'];
    const t = typeof dati.titolo === 'string' ? dati.titolo.trim() : '';
    if (!t) e.push('titolo mancante o non testo');
    else if (t.length > MAX_TITOLO) e.push(`titolo troppo lungo (${t.length} > ${MAX_TITOLO})`);
    if (!Array.isArray(dati.punti)) e.push('punti deve essere un elenco');
    else {
      if (dati.punti.length < 2 || dati.punti.length > 4) e.push(`punti: ne servono da 2 a 4 (sono ${dati.punti.length})`);
      dati.punti.forEach((p, i) => {
        if (typeof p !== 'string' || !p.trim()) { e.push(`punto ${i + 1} vuoto o non testo`); return; }
        const s = p.trim();
        if (s.length > MAX_PUNTO) e.push(`punto ${i + 1} troppo lungo (${s.length} > ${MAX_PUNTO})`);
        const parola = s.split(/\s+/).reduce((a, b) => (b.length > a.length ? b : a), '');
        if (parola.length > MAX_PAROLA) e.push(`punto ${i + 1}: parola troppo lunga per andare a capo («${parola}»)`);
      });
    }
    if (t) {
      const parola = t.split(/\s+/).reduce((a, b) => (b.length > a.length ? b : a), '');
      if (parola.length > MAX_PAROLA) e.push(`titolo: parola troppo lunga («${parola}»)`);
    }
    // deve entrare in tutti e due i formati: il piano non sa in quale verrà montato
    if (!e.length) for (const formato of ['orizzontale', 'verticale']) {
      const L = impagina(dati, formato);
      if (!L.titoloSta) e.push(`titolo troppo largo (${formato})`);
      if (!L.sta) e.push(`punti troppo lunghi: non stanno in ${L.righeMax} righe a ${F_MIN} px sopra i sottotitoli (${formato})`);
    }
    if (dati.quando != null && (typeof dati.quando !== 'object' || Array.isArray(dati.quando))) e.push('quando deve essere un oggetto { chiave: parola }');
    return e;
  },
  parole(dati) {
    // per i punti si cerca la parola più lunga della PRIMA metà: la riga sale quando la frase comincia, non a metà
    const punti = Array.isArray(dati.punti) ? dati.punti : [];
    const testa = (p) => { const w = String(p).trim().split(/\s+/); return w.slice(0, Math.max(2, Math.ceil(w.length / 2))).join(' '); };
    return attacchi(dati, [['titolo', dati.titolo], ...punti.map((p, i) => [`p${i + 1}`, testa(p)])]);
  },
  html({ id, px, dati, durata, t, etichetta, numero, formato = 'orizzontale' }) {
    const L = impagina(dati, formato);
    const tTitolo = t('titolo', 0.15);
    // riserve: i punti distribuiti sul resto della voce, mai tutti all'inizio
    const resto = Math.max(1, durata - 0.6 - (tTitolo + 0.8));
    const tPunti = L.punti.map((_, i) => {
      const riserva = tTitolo + 0.8 + (resto * i) / L.n;
      return t(`p${i + 1}`, riserva);
    });
    // un punto non sale prima del titolo né prima del punto precedente
    for (let i = 0; i < tPunti.length; i++) tPunti[i] = Math.max(tPunti[i], i ? tPunti[i - 1] + 0.35 : tTitolo + 0.3);
    const { MARGINE, LARGO, fIndice } = L;
    const css = `
    #${px}titolo { position: absolute; left: ${MARGINE}px; top: ${L.alto}px; width: ${LARGO}px; font-weight: 500; font-size: ${L.fTitolo}px;
      line-height: 1.05; letter-spacing: -0.02em; font-variation-settings: "opsz" 60; ${L.nowrap ? 'white-space: nowrap;' : 'text-wrap: balance;'} color: ${C.crema}; }
    #${px}filo { position: absolute; left: ${MARGINE}px; top: ${L.filo}px; width: 240px; height: 4px; background: ${C.accento}; transform-origin: left center; }
    #${px}elenco { position: absolute; left: ${MARGINE}px; top: ${L.cima}px; width: ${LARGO}px; display: flex; flex-direction: column; gap: ${L.gap}px; }
    .${px}riga { position: relative; display: flex; align-items: flex-start; gap: ${L.scarto}px; }
    .${px}indice { flex: none; width: ${L.lato}px; height: ${L.lato}px; box-sizing: border-box; border: 2px solid ${C.accento}; border-radius: 6px;
      display: flex; align-items: center; justify-content: center; margin-top: ${Math.max(0, Math.round((L.f * INTERLINEA - L.lato) / 2))}px;
      font-family: "JetBrains Mono", monospace; font-weight: 500; font-size: ${fIndice}px; letter-spacing: 0.02em; color: ${C.accento};
      font-variant-numeric: tabular-nums; }
    .${px}testo { flex: 1; min-width: 0; font-weight: 400; font-size: ${L.f}px; line-height: ${INTERLINEA}; letter-spacing: -0.01em;
      font-variation-settings: "opsz" 48; color: ${C.crema}; overflow-wrap: normal; text-wrap: balance; }
    .${px}separa { position: absolute; left: 0; width: ${LARGO}px; top: ${-Math.round(L.gap / 2) - 2}px; height: 3px; background: ${C.scuro}; transform-origin: left center; }`;
    const righe = L.punti.map((p, i) => `
        <div class="${px}riga" id="${px}r${i + 1}">${i ? `
          <div class="${px}separa" id="${px}s${i + 1}"></div>` : ''}
          <div class="${px}indice" id="${px}i${i + 1}">${String(i + 1).padStart(2, '0')}</div>
          <div class="${px}testo" id="${px}t${i + 1}">${esc(p)}</div>
        </div>`).join('');
    const corpo = `
      <div id="${px}titolo">${esc(L.titolo)}</div>
      <div id="${px}filo"></div>
      <div id="${px}elenco">${righe}
      </div>`;
    let anima = `
      tl.fromTo(q("#${px}titolo"), { opacity: 0, y: 36 }, { opacity: 1, y: 0, duration: 0.7, ease: "power3.out" }, ${s3(tTitolo)});
      tl.fromTo(q("#${px}filo"), { scaleX: 0 }, { scaleX: 1, duration: 0.8, ease: "expo.out" }, ${s3(tTitolo + 0.25)});`;
    tPunti.forEach((tp, i) => {
      const k = i + 1;
      anima += `
      tl.fromTo(q("#${px}r${k}"), { opacity: 0, y: 44 }, { opacity: 1, y: 0, duration: 0.8, ease: "power3.out" }, ${s3(tp)});`;
      if (k > 1) anima += `
      tl.fromTo(q("#${px}s${k}"), { scaleX: 0 }, { scaleX: 1, duration: 0.9, ease: "expo.out" }, ${s3(tp + 0.05)});`;
      // il punto precedente si attenua quando arriva questo (quelli prima lo sono già); si animano elementi interni,
      // così l'entrata della riga non viene toccata e il salto avanti/indietro nel tempo resta giusto
      if (k > 1) {
        anima += `
      tl.fromTo(q("#${px}t${k - 1}"), { color: "${C.crema}", opacity: 1 }, { color: "${C.crema2}", opacity: 0.75, duration: 0.6, ease: "power2.out", immediateRender: false }, ${s3(tp + 0.1)});
      tl.fromTo(q("#${px}i${k - 1}"), { opacity: 1 }, { opacity: 0.6, duration: 0.6, ease: "power2.out", immediateRender: false }, ${s3(tp + 0.1)});`;
      }
    });
    return scena({ id, px, durata, etichetta, numero, css, corpo, anima, formato });
  },
};
