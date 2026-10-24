// Stampo «numeri»: due o tre numeri insieme (dalla prova DeepInfer del 24/10/2026, quadro 3 «reported numbers»).
// In alto il conteggio in accento e il titolo; sotto, le caselle vuote a filo, poi le schede che vi si posano una alla
// volta quando la voce dice il loro numero: il numero conta da 0 al valore, con un piccolo grafico (barra, anello per
// le percentuali, linea del tempo con la tacca, o niente).
import { C, scena, s3, esc, misura, attacchi } from '../base.mjs';

const GRAFICI = ['barra', 'anello', 'linea', 'nessuno'];
// numero scritto come lo scrive la voce: «155», «96», «0.4», «1,200», «12.5» (separatore delle migliaia: virgola)
const NUMERO = /^(\d{1,3}(,\d{3})+|\d{1,6})(\.\d{1,2})?$/;
const MAX_VALORE = 7; // caratteri di «valore», es. «1,200.5»

// geometria: 3 schede da 560 o 2 da 760, centrate
const GEO = {
  3: { larga: 560, spazio: 32 },
  2: { larga: 760, spazio: 48 },
};
const ALTO = 320; // y della cima delle schede
const ALTEZZA = 530; // fino a y 850, sopra i sottotitoli (860)
const PAD = 40; // margine interno orizzontale

const pulito = (v) => String(v ?? '').trim();
const unitaDi = (v) => pulito(v.unita);
const numeroDi = (valore) => Number(pulito(valore).replace(/,/g, ''));

// larghezza in em di numero + unità (Source Serif 4, cifre tabulari ~0.56 em, punto e virgola ~0.3 em;
// unità al 60% del numero, ~0.62 em per lettera)
function ems(valore, unita) {
  const s = pulito(valore);
  const cifre = s.replace(/[^\d]/g, '').length;
  const segni = s.length - cifre;
  return 0.56 * cifre + 0.3 * segni + (unita ? 0.6 * (0.62 * unita.length + 0.08) : 0) + 0.04;
}
// dimensione del numero perché numero + unità stiano in «larghezza» (in px), con misura() di base.mjs
const misuraNumero = (valore, unita, larghezza, max) => {
  const s = pulito(valore) || '0';
  return misura(s, { larghezza, max, min: 28, fattore: ems(s, unita) / s.length });
};

export default {
  nome: 'numeri',
  descrizione: '2 or 3 numbers shown together as cards (e.g. three figures a company reports); the voice must say every valore in digits, in the same order as voci',
  schema: '{ "titolo": "DeepSeek reports, max 32", "voci": [{ "valore": "numeric, digits as the voice says them: 155, 96, 0.4, 1,200 (max 7 chars)", "unita": "T, %, ms, B or empty, max 4", "etichetta": "tokens / day / cluster, max 26", "grafico": "barra|anello|linea|nessuno (anello only if unita is % and valore <= 100)" }] } (voci: 2 or 3)',

  valida(dati) {
    const p = [];
    if (!dati || typeof dati !== 'object') return ['dati mancanti'];
    const titolo = pulito(dati.titolo);
    if (!titolo) p.push('titolo mancante');
    else if (titolo.length > 32) p.push(`titolo troppo lungo (${titolo.length} > 32)`);
    if (dati.quando != null && (typeof dati.quando !== 'object' || Array.isArray(dati.quando))) p.push('quando deve essere un oggetto');
    const voci = dati.voci;
    if (!Array.isArray(voci) || voci.length < 2 || voci.length > 3) {
      p.push(`voci: ne servono 2 o 3 (ricevute ${Array.isArray(voci) ? voci.length : 'nessuna'})`);
      return p;
    }
    const larga = GEO[voci.length].larga - 2 * PAD;
    voci.forEach((v, i) => {
      const n = `voce ${i + 1}`;
      if (!v || typeof v !== 'object') { p.push(`${n}: non è un oggetto`); return; }
      if (typeof v.valore !== 'string' && typeof v.valore !== 'number') { p.push(`${n}: valore mancante`); return; }
      const valore = pulito(v.valore);
      if (!NUMERO.test(valore)) p.push(`${n}: valore non numerico o scritto male («${valore}»: cifre, virgola ogni tre cifre, al massimo 2 decimali)`);
      else if (valore.length > MAX_VALORE) p.push(`${n}: valore troppo lungo (${valore.length} > ${MAX_VALORE})`);
      if (v.unita != null && typeof v.unita !== 'string') p.push(`${n}: unita deve essere un testo`);
      const unita = unitaDi(v);
      if (unita.length > 4) p.push(`${n}: unita troppo lunga (${unita.length} > 4)`);
      if (/\d/.test(unita)) p.push(`${n}: unita non deve contenere cifre`);
      const etichetta = pulito(v.etichetta);
      if (!etichetta) p.push(`${n}: etichetta mancante`);
      else if (etichetta.length > 26) p.push(`${n}: etichetta troppo lunga (${etichetta.length} > 26)`);
      else if (etichetta.split(/\s+/).some((w) => w.length > 24)) p.push(`${n}: etichetta con una parola più lunga di 24 caratteri (non va a capo)`);
      const g = v.grafico ?? 'nessuno';
      if (!GRAFICI.includes(g)) p.push(`${n}: grafico sconosciuto «${g}» (barra, anello, linea, nessuno)`);
      if (g === 'anello' && (unita !== '%' || !(numeroDi(valore) <= 100))) p.push(`${n}: anello solo con unita «%» e valore fino a 100`);
      if (NUMERO.test(valore) && misuraNumero(valore, unita, g === 'anello' ? 210 : larga, 160) < 72) p.push(`${n}: numero e unità non entrano nella scheda`);
    });
    return p;
  },

  // la voce nomina prima il titolo, poi i numeri nell'ordine delle voci: l'attacco di ogni scheda è il suo valore
  // (senza le virgole: «1,200» e «1200» si confrontano uguali). dati.quando = { titolo, v1, v2, v3 } lo sostituisce.
  parole(dati) {
    const voci = Array.isArray(dati.voci) ? dati.voci : [];
    return attacchi(dati, [['titolo', dati.titolo], ...voci.map((v, i) => [`v${i + 1}`, pulito(v.valore).replace(/,/g, '')])]);
  },

  html(arg) {
    if (arg.formato === 'verticale') return verticale(arg);
    const { id, px, dati, durata, t, etichetta, numero, formato } = arg;
    const voci = dati.voci;
    const n = voci.length;
    const { larga, spazio } = GEO[n];
    const sinistra = Math.round((1920 - (n * larga + (n - 1) * spazio)) / 2);
    const interna = larga - 2 * PAD;

    const { tTitolo, arrivi } = tempi(n, durata, t);

    const titolo = pulito(dati.titolo);
    const fTitolo = misura(titolo, { larghezza: 1400, max: 64, min: 40, fattore: 0.48 });

    const L_ANELLO = +(2 * Math.PI * 130).toFixed(2);
    const schede = voci.map((v, i) => {
      const k = i + 1;
      const valore = pulito(v.valore);
      const unita = unitaDi(v);
      const g = GRAFICI.includes(v.grafico) ? v.grafico : 'nessuno';
      const dec = (valore.split('.')[1] || '').length;
      const sep = valore.includes(',');
      const zero = (0).toFixed(dec);
      const x = sinistra + i * (larga + spazio);
      const pos = `left:${x}px;width:${larga}px`;
      let figura, fNum;
      if (g === 'anello') {
        fNum = misuraNumero(valore, unita, 210, 112);
        figura = `<div class="${px}anello">
              <svg viewBox="0 0 290 290" width="290" height="290"><circle class="${px}anello-fondo" cx="145" cy="145" r="130"/><circle id="${px}anello-${k}" class="${px}anello-pieno" cx="145" cy="145" r="130" transform="rotate(-90 145 145)" stroke-dasharray="${L_ANELLO}" stroke-dashoffset="${L_ANELLO}"/></svg>
              <div class="${px}cifra ${px}cifra-anello" style="font-size:${fNum}px"><span id="${px}num-${k}" class="${px}num">${zero}</span>${unita ? `<span id="${px}unita-${k}" class="${px}unita">${esc(unita)}</span>` : ''}</div>
            </div>`;
      } else {
        fNum = misuraNumero(valore, unita, interna, g === 'nessuno' ? 180 : 160);
        const cifra = `<div class="${px}cifra" style="font-size:${fNum}px"><span id="${px}num-${k}" class="${px}num">${zero}</span>${unita ? `<span id="${px}unita-${k}" class="${px}unita">${esc(unita)}</span>` : ''}</div>`;
        let grafico = '';
        if (g === 'barra') grafico = `<div class="${px}pista" style="width:${interna}px"><div id="${px}riempi-${k}" class="${px}riempi"></div></div>`;
        if (g === 'linea') {
          const fine = interna - 4;
          grafico = `<svg class="${px}tempo" width="${interna}" height="80" viewBox="0 0 ${interna} 80">
                <path id="${px}asse-${k}" class="${px}asse" d="M 4 40 L ${fine} 40" stroke-dasharray="${fine - 4}" stroke-dashoffset="${fine - 4}"/>
                <path id="${px}inizio-${k}" class="${px}asse" d="M 4 30 L 4 50"/>
                <line id="${px}tacca-${k}" class="${px}tacca" x1="4" y1="58" x2="4" y2="14"/>
                <text id="${px}zero-${k}" class="${px}zero" x="0" y="80">0</text>
              </svg>`;
        }
        figura = cifra + grafico;
      }
      const corpo = `
      <div id="${px}scheda-${k}" class="${px}scheda" style="${pos}">
        <div class="${px}tag">${String(k).padStart(2, '0')}</div>
        <div class="${px}zona">${figura}</div>
        <div id="${px}etichetta-${k}" class="${px}etichetta">${esc(pulito(v.etichetta))}</div>
      </div>`;
      // fill della barra: per le percentuali fino a 100 la frazione vera, altrimenti piena
      const frazione = unita === '%' && numeroDi(valore) <= 100 ? numeroDi(valore) / 100 : 1;
      const a = arrivi[i];
      const conta = Math.max(0.6, Math.min(1.5, durata - a - 0.5));
      let js = `
      tl.fromTo(q("#${px}scheda-${k}"), { opacity: 0, y: 56 }, { opacity: 1, y: 0, duration: 0.8, ease: "power3.out" }, ${s3(a)});
      conta(q("#${px}num-${k}"), ${numeroDi(valore)}, ${dec}, ${sep}, ${JSON.stringify(valore)}, ${s3(a + 0.2)}, ${s3(conta)});
      tl.fromTo(q("#${px}num-${k}"), { scale: 0.55 }, { scale: 1, duration: ${s3(conta)}, ease: "power3.out" }, ${s3(a + 0.2)});
      tl.fromTo(q("#${px}etichetta-${k}"), { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" }, ${s3(a + 0.5)});`;
      if (unita) js += `
      tl.fromTo(q("#${px}unita-${k}"), { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.45, ease: "power3.out" }, ${s3(a + 0.2 + conta * 0.7)});`;
      if (g === 'barra') js += `
      tl.fromTo(q("#${px}riempi-${k}"), { scaleX: 0 }, { scaleX: ${frazione}, duration: ${s3(conta)}, ease: "power3.out" }, ${s3(a + 0.2)});`;
      if (g === 'anello') js += `
      tl.fromTo(q("#${px}anello-${k}"), { strokeDashoffset: ${L_ANELLO} }, { strokeDashoffset: ${+(L_ANELLO * (1 - frazione)).toFixed(2)}, duration: ${s3(conta)}, ease: "power3.out" }, ${s3(a + 0.2)});`;
      if (g === 'linea') {
        const xt = Math.round(4 + (interna - 8) * 0.4);
        js += `
      tl.fromTo(q("#${px}asse-${k}"), { strokeDashoffset: ${interna - 8} }, { strokeDashoffset: 0, duration: 0.8, ease: "power2.out" }, ${s3(a + 0.3)});
      tl.fromTo(q("#${px}zero-${k}"), { opacity: 0 }, { opacity: 1, duration: 0.4, ease: "power1.out" }, ${s3(a + 0.4)});
      tl.fromTo(q("#${px}tacca-${k}"), { attr: { x1: 4, x2: 4 } }, { attr: { x1: ${xt}, x2: ${xt} }, duration: ${s3(conta)}, ease: "power3.out" }, ${s3(a + 0.2)});`;
      }
      return { corpo, js };
    });

    const css = `
    #${px}testa { position: absolute; left: 96px; right: 96px; top: 150px; height: 140px; display: flex; justify-content: center; align-items: center; gap: 36px; }
    #${px}conto { font-weight: 500; font-size: 140px; line-height: 0.92; letter-spacing: -0.02em; color: ${C.accento}; font-variant-numeric: tabular-nums; display: inline-block; }
    #${px}titolo { font-weight: 400; font-size: ${fTitolo}px; line-height: 1.1; color: ${C.crema}; white-space: nowrap; display: inline-block; }
    .${px}casella, .${px}scheda { position: absolute; top: ${ALTO}px; height: ${ALTEZZA}px; border-radius: 6px; box-sizing: border-box; }
    .${px}casella { border: 2px solid ${C.pannello}; }
    .${px}scheda { background: ${C.pannello}; padding: 34px ${PAD}px 34px; display: flex; flex-direction: column; overflow: hidden; }
    .${px}tag { font-family: "JetBrains Mono", monospace; font-weight: 500; font-size: 28px; line-height: 1.2; letter-spacing: 0.14em; color: ${C.accento};
      padding-bottom: 14px; border-bottom: 2px solid ${C.accento}; }
    .${px}zona { flex: 1; display: flex; flex-direction: column; justify-content: center; align-items: center; min-height: 0; }
    .${px}cifra { display: flex; align-items: baseline; justify-content: center; font-weight: 500; line-height: 0.92; letter-spacing: -0.03em; color: ${C.accento}; white-space: nowrap; }
    .${px}num { display: inline-block; font-variant-numeric: tabular-nums; transform-origin: center bottom; }
    .${px}unita { display: inline-block; font-size: 0.6em; margin-left: 0.08em; letter-spacing: -0.01em; }
    .${px}pista { height: 16px; margin-top: 34px; border-radius: 3px; background: ${C.scuro}; overflow: hidden; }
    .${px}riempi { width: 100%; height: 100%; background: ${C.accento}; transform-origin: left center; }
    .${px}anello { position: relative; width: 290px; height: 290px; }
    .${px}anello svg { position: absolute; inset: 0; }
    .${px}anello-fondo { fill: none; stroke: ${C.scuro}; stroke-width: 16; }
    .${px}anello-pieno { fill: none; stroke: ${C.accento}; stroke-width: 16; stroke-linecap: round; }
    .${px}cifra-anello { position: absolute; inset: 0; align-items: center; }
    .${px}cifra-anello .${px}num { transform-origin: center center; }
    .${px}tempo { margin-top: 30px; overflow: visible; }
    .${px}asse { fill: none; stroke: ${C.crema2}; stroke-width: 2; stroke-linecap: round; }
    .${px}tacca { stroke: ${C.accento}; stroke-width: 6; stroke-linecap: round; }
    .${px}zero { font-family: "JetBrains Mono", monospace; font-weight: 500; font-size: 28px; letter-spacing: 0.14em; fill: ${C.crema2}; }
    .${px}etichetta { font-family: "JetBrains Mono", monospace; font-weight: 500; font-size: 28px; line-height: 1.3; letter-spacing: 0.06em; text-transform: uppercase;
      color: ${C.crema}; min-height: 2.6em; display: flex; align-items: flex-end; }`;

    const caselle = voci.map((_, i) => `<div id="${px}casella-${i + 1}" class="${px}casella" style="left:${sinistra + i * (larga + spazio)}px;width:${larga}px"></div>`).join('\n      ');
    const corpo = `
      <div id="${px}testa"><span id="${px}conto">${n}</span><span id="${px}titolo">${esc(titolo)}</span></div>
      ${caselle}
      ${schede.map((s) => s.corpo).join('')}`;

    const anima = `${CONTA}
      tl.fromTo(q("#${px}titolo"), { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.6, ease: "power3.out" }, ${s3(tTitolo)});
      tl.fromTo(q("#${px}conto"), { opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1, duration: 0.7, ease: "expo.out" }, ${s3(tTitolo + 0.25)});
      ${voci.map((_, i) => `tl.fromTo(q("#${px}casella-${i + 1}"), { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" }, ${s3(tTitolo + 0.6 + i * 0.12)});`).join('\n      ')}
      ${schede.map((s) => s.js).join('')}`;

    return scena({ id, px, durata, etichetta, numero, css, corpo, anima, formato });
  },
};

// tempi: titolo all'inizio, schede sul loro numero (riserve distribuite sulla durata), mai prima della precedente
function tempi(n, durata, t) {
  const tTitolo = Math.min(t('titolo', 0.1), 0.6);
  const arrivi = [];
  for (let i = 0; i < n; i++) {
    const riserva = durata * (n === 3 ? 0.14 + 0.27 * i : 0.18 + 0.4 * i);
    const prima = i ? arrivi[i - 1] + 0.6 : 1.1; // le caselle vuote si vedono prima della prima scheda
    arrivi.push(Math.min(durata - 0.9, Math.max(prima, t(`v${i + 1}`, riserva))));
  }
  return { tTitolo, arrivi };
}

// contatore sicuro con il seek: il testo dipende solo dall'avanzamento del proxy; all'arrivo scrive il valore
// esatto com'è nei dati (decimali e virgole delle migliaia compresi)
const CONTA = `
      function conta(el, fine, dec, sep, esatto, at, dur) {
        const proxy = { p: 0 };
        const scrivi = () => {
          if (proxy.p >= 1) { el.textContent = esatto; return; }
          let s = (fine * proxy.p).toFixed(dec);
          if (sep) { const [a, b] = s.split("."); s = a.replace(/\\B(?=(\\d{3})+(?!\\d))/g, ",") + (b != null ? "." + b : ""); }
          el.textContent = s;
        };
        tl.fromTo(proxy, { p: 0 }, { p: 1, duration: dur, ease: "power3.out", onUpdate: scrivi, onComplete: scrivi }, at);
      }`;

// ── verticale (Short, 1080x1920): schede piene di larghezza una sotto l'altra, fra y 300 e 1180.
// Ogni scheda: in alto «01» + etichetta su una riga (filetto in accento), sotto il numero a sinistra e il grafico a destra.
const V = { M: 72, alto: 300, fondo: 1180, spazio: 24, pad: 32, padY: 28, riga: 62, stacco: 16, spazioFig: 40 };
function verticale({ id, px, dati, durata, t, etichetta, numero, formato }) {
  const voci = dati.voci;
  const n = voci.length;
  const larga = 1080 - 2 * V.M; // 936
  const interna = larga - 2 * V.pad; // 872
  const h = n === 3 ? Math.floor((V.fondo - V.alto - 2 * V.spazio) / 3) : 360; // 277 o 360
  const rigaFig = h - 2 * V.padY - V.riga - V.stacco; // altezza della riga numero + grafico
  const { tTitolo, arrivi } = tempi(n, durata, t);
  const titolo = pulito(dati.titolo);
  const fTitolo = misura(titolo, { larghezza: 760, max: 64, min: 40, fattore: 0.48 });
  const dAnello = Math.min(rigaFig, 200);
  const rAnello = dAnello / 2 - 8;
  const L_ANELLO = +(2 * Math.PI * rAnello).toFixed(2);

  const schede = voci.map((v, i) => {
    const k = i + 1;
    const valore = pulito(v.valore);
    const unita = unitaDi(v);
    const g = GRAFICI.includes(v.grafico) ? v.grafico : 'nessuno';
    const dec = (valore.split('.')[1] || '').length;
    const sep = valore.includes(',');
    const y = V.alto + i * (h + V.spazio);
    const maxN = Math.min(160, Math.floor(rigaFig * 0.95));
    const fNum = misuraNumero(valore, unita, g === 'nessuno' ? interna : 520, maxN);
    // larghezza del grafico: quello che resta accanto al numero (stima larga del numero, così avanza spazio)
    const lGraf = Math.max(200, Math.floor(interna - V.spazioFig - fNum * ems(valore, unita)));
    const cifra = `<div class="${px}cifra" style="font-size:${fNum}px"><span id="${px}num-${k}" class="${px}num">${(0).toFixed(dec)}</span>${unita ? `<span id="${px}unita-${k}" class="${px}unita">${esc(unita)}</span>` : ''}</div>`;
    let grafico = '';
    if (g === 'barra') grafico = `<div class="${px}pista" style="width:${lGraf}px"><div id="${px}riempi-${k}" class="${px}riempi"></div></div>`;
    if (g === 'anello') {
      const c = dAnello / 2;
      grafico = `<svg class="${px}anello" width="${dAnello}" height="${dAnello}" viewBox="0 0 ${dAnello} ${dAnello}"><circle class="${px}anello-fondo" cx="${c}" cy="${c}" r="${rAnello}"/><circle id="${px}anello-${k}" class="${px}anello-pieno" cx="${c}" cy="${c}" r="${rAnello}" transform="rotate(-90 ${c} ${c})" stroke-dasharray="${L_ANELLO}" stroke-dashoffset="${L_ANELLO}"/></svg>`;
    }
    if (g === 'linea') {
      const fine = lGraf - 4;
      grafico = `<svg class="${px}tempo" width="${lGraf}" height="84" viewBox="0 0 ${lGraf} 84">
              <path id="${px}asse-${k}" class="${px}asse" d="M 4 34 L ${fine} 34" stroke-dasharray="${fine - 4}" stroke-dashoffset="${fine - 4}"/>
              <path id="${px}inizio-${k}" class="${px}asse" d="M 4 24 L 4 44"/>
              <line id="${px}tacca-${k}" class="${px}tacca" x1="4" y1="52" x2="4" y2="10"/>
              <text id="${px}zero-${k}" class="${px}zero" x="0" y="84">0</text>
            </svg>`;
    }
    const corpo = `
      <div id="${px}scheda-${k}" class="${px}scheda" style="top:${y}px;height:${h}px">
        <div class="${px}testata"><span class="${px}tag">${String(k).padStart(2, '0')}</span><span id="${px}etichetta-${k}" class="${px}etichetta">${esc(pulito(v.etichetta))}</span></div>
        <div class="${px}figura${g === 'nessuno' ? ` ${px}sola` : ''}">${cifra}${grafico}</div>
      </div>`;
    const frazione = unita === '%' && numeroDi(valore) <= 100 ? numeroDi(valore) / 100 : 1;
    const a = arrivi[i];
    const conta = Math.max(0.6, Math.min(1.5, durata - a - 0.5));
    let js = `
      tl.fromTo(q("#${px}scheda-${k}"), { opacity: 0, y: 56 }, { opacity: 1, y: 0, duration: 0.8, ease: "power3.out" }, ${s3(a)});
      conta(q("#${px}num-${k}"), ${numeroDi(valore)}, ${dec}, ${sep}, ${JSON.stringify(valore)}, ${s3(a + 0.2)}, ${s3(conta)});
      tl.fromTo(q("#${px}num-${k}"), { scale: 0.55 }, { scale: 1, duration: ${s3(conta)}, ease: "power3.out" }, ${s3(a + 0.2)});
      tl.fromTo(q("#${px}etichetta-${k}"), { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" }, ${s3(a + 0.5)});`;
    if (unita) js += `
      tl.fromTo(q("#${px}unita-${k}"), { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.45, ease: "power3.out" }, ${s3(a + 0.2 + conta * 0.7)});`;
    if (g === 'barra') js += `
      tl.fromTo(q("#${px}riempi-${k}"), { scaleX: 0 }, { scaleX: ${frazione}, duration: ${s3(conta)}, ease: "power3.out" }, ${s3(a + 0.2)});`;
    if (g === 'anello') js += `
      tl.fromTo(q("#${px}anello-${k}"), { strokeDashoffset: ${L_ANELLO} }, { strokeDashoffset: ${+(L_ANELLO * (1 - frazione)).toFixed(2)}, duration: ${s3(conta)}, ease: "power3.out" }, ${s3(a + 0.2)});`;
    if (g === 'linea') {
      const xt = Math.round(4 + (lGraf - 8) * 0.4);
      js += `
      tl.fromTo(q("#${px}asse-${k}"), { strokeDashoffset: ${lGraf - 8} }, { strokeDashoffset: 0, duration: 0.8, ease: "power2.out" }, ${s3(a + 0.3)});
      tl.fromTo(q("#${px}zero-${k}"), { opacity: 0 }, { opacity: 1, duration: 0.4, ease: "power1.out" }, ${s3(a + 0.4)});
      tl.fromTo(q("#${px}tacca-${k}"), { attr: { x1: 4, x2: 4 } }, { attr: { x1: ${xt}, x2: ${xt} }, duration: ${s3(conta)}, ease: "power3.out" }, ${s3(a + 0.2)});`;
    }
    return { corpo, js };
  });

  const css = `
    #${px}testa { position: absolute; left: ${V.M}px; right: ${V.M}px; top: 150px; height: 130px; display: flex; justify-content: center; align-items: center; gap: 28px; }
    #${px}conto { font-weight: 500; font-size: 128px; line-height: 0.92; letter-spacing: -0.02em; color: ${C.accento}; font-variant-numeric: tabular-nums; display: inline-block; }
    #${px}titolo { font-weight: 400; font-size: ${fTitolo}px; line-height: 1.1; color: ${C.crema}; white-space: nowrap; display: inline-block; }
    .${px}casella, .${px}scheda { position: absolute; left: ${V.M}px; width: ${larga}px; border-radius: 6px; box-sizing: border-box; }
    .${px}casella { border: 2px solid ${C.pannello}; }
    .${px}scheda { background: ${C.pannello}; padding: ${V.padY}px ${V.pad}px; display: flex; flex-direction: column; overflow: hidden; }
    .${px}testata { height: ${V.riga}px; box-sizing: border-box; display: flex; align-items: flex-start; gap: 28px; border-bottom: 2px solid ${C.accento};
      font-family: "JetBrains Mono", monospace; font-weight: 500; font-size: 40px; line-height: 1.2; text-transform: uppercase; white-space: nowrap; }
    .${px}tag { letter-spacing: 0.08em; color: ${C.accento}; }
    .${px}etichetta { display: inline-block; letter-spacing: 0.04em; color: ${C.crema}; }
    .${px}figura { flex: 1; margin-top: ${V.stacco}px; min-height: 0; display: flex; align-items: center; justify-content: space-between; gap: ${V.spazioFig}px; }
    .${px}sola { justify-content: center; }
    .${px}cifra { display: flex; align-items: baseline; font-weight: 500; line-height: 0.92; letter-spacing: -0.03em; color: ${C.accento}; white-space: nowrap; }
    .${px}num { display: inline-block; font-variant-numeric: tabular-nums; transform-origin: left bottom; }
    .${px}sola .${px}num { transform-origin: center bottom; }
    .${px}unita { display: inline-block; font-size: 0.6em; margin-left: 0.08em; letter-spacing: -0.01em; }
    .${px}pista { height: 18px; border-radius: 3px; background: ${C.scuro}; overflow: hidden; flex: none; }
    .${px}riempi { width: 100%; height: 100%; background: ${C.accento}; transform-origin: left center; }
    .${px}anello { flex: none; }
    .${px}anello-fondo { fill: none; stroke: ${C.scuro}; stroke-width: 14; }
    .${px}anello-pieno { fill: none; stroke: ${C.accento}; stroke-width: 14; stroke-linecap: round; }
    .${px}tempo { flex: none; overflow: visible; }
    .${px}asse { fill: none; stroke: ${C.crema2}; stroke-width: 2; stroke-linecap: round; }
    .${px}tacca { stroke: ${C.accento}; stroke-width: 6; stroke-linecap: round; }
    .${px}zero { font-family: "JetBrains Mono", monospace; font-weight: 500; font-size: 40px; fill: ${C.crema2}; }`;

  const caselle = voci.map((_, i) => `<div id="${px}casella-${i + 1}" class="${px}casella" style="top:${V.alto + i * (h + V.spazio)}px;height:${h}px"></div>`).join('\n      ');
  const corpo = `
      <div id="${px}testa"><span id="${px}conto">${n}</span><span id="${px}titolo">${esc(titolo)}</span></div>
      ${caselle}
      ${schede.map((s) => s.corpo).join('')}`;
  const anima = `${CONTA}
      tl.fromTo(q("#${px}titolo"), { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.6, ease: "power3.out" }, ${s3(tTitolo)});
      tl.fromTo(q("#${px}conto"), { opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1, duration: 0.7, ease: "expo.out" }, ${s3(tTitolo + 0.25)});
      ${voci.map((_, i) => `tl.fromTo(q("#${px}casella-${i + 1}"), { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" }, ${s3(tTitolo + 0.6 + i * 0.12)});`).join('\n      ')}
      ${schede.map((s) => s.js).join('')}`;
  return scena({ id, px, durata, etichetta, numero, css, corpo, anima, formato });
}
