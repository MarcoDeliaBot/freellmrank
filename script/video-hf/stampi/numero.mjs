// Stampo «numero»: un numero che colpisce, che sale dentro un quadrante a tacche che si disegna da solo; sotto l'unità
// (etichetta) e il dettaglio, sopra la fonte in un riquadro, a destra un timbro inclinato facoltativo.
// Dalla prova DeepInfer del 24/10/2026, quadro 1 («155T tokens / day»), reso guidato dai dati.
import { C, scena, s3, esc, misura, attacchi } from '../base.mjs';

// quadrante: raggio delle tacche, spessore, anello sottile interno
const RT = 356, SW = 26, RI = 326;
// geometria per formato: centro del quadrante, raggio utile per i testi, dimensioni massime e minime dei testi;
// in orizzontale la fonte sta dentro il quadrante, in verticale (Short) sta sopra e il timbro sotto
const GEOMETRIE = {
  orizzontale: { k: 1, CX: 960, CY: 486, RU: 308, W: 1920, fsN: 250, fsE: 52, fsD: 40, min: 28, chipDentro: true },
  verticale: { k: 0.94, CX: 540, CY: 620, RU: 290, W: 1080, fsN: 250, fsE: 60, fsD: 48, min: 34, chipDentro: false },
};
const NUMERO = /^(\d{1,3}(,\d{3})+|\d+)(\.\d{1,2})?$/;

// larghezza stimata di un testo in em (Source Serif 4): cifre tabellari, maiuscole, minuscole, spazi
function em(testo, { cifre = 0.56 } = {}) {
  let w = 0;
  for (const ch of String(testo)) {
    if (/\d/.test(ch)) w += cifre;
    else if (/[.,]/.test(ch)) w += 0.27;
    else if (ch === ' ') w += 0.25;
    else if (ch === '%') w += 0.86;
    else if (/[mwMW]/.test(ch)) w += 0.86;
    else if (/[A-Z]/.test(ch)) w += 0.68;
    else if (/[il|/]/.test(ch)) w += 0.3;
    else w += 0.52;
  }
  return Math.max(w, 0.5);
}
// dimensione perché il testo stia in «larghezza», col fattore medio del testo stesso (misura() della base)
const taglia = (testo, larghezza, max, min = 28) => misura(testo, { larghezza, max, min, fattore: em(testo) / Math.max(1, String(testo).length) });

// corda del cerchio utile fra le quote y1 e y2: la larghezza disponibile per una riga che sta fra le due
function corda(G, y1, y2) {
  const d = Math.max(Math.abs(y1 - G.CY), Math.abs(y2 - G.CY));
  return d >= G.RU ? 0 : 2 * Math.sqrt(G.RU * G.RU - d * d);
}

// impaginazione dentro il quadrante, decisa qui: la pila (fonte, numero, etichetta, dettaglio) centrata sul quadrante;
// se un pezzo non sta nella sua corda, il numero rimpicciolisce e la pila si accorcia
function impagina(G, { valore, unita, etichetta, dettaglio, fonte: fonteVera }) {
  const testoNumero = valore + unita;
  const fonte = G.chipDentro ? fonteVera : '';
  const CY = G.CY, corda2 = (a, b) => corda(G, a, b);
  let fsN = G.fsN;
  const chipH = 56, gapChip = 30, gapE = 24, gapD = 8;
  let ris;
  for (let giro = 0; giro < 80; giro++) {
    const fsE = G.fsE, fsD = G.fsD;
    // prima passata con le dimensioni massime, poi le righe si adattano alla loro corda
    const pila = (fe, fd) => {
      const hN = fsN * 0.92, hE = fe * 1.2, hD = dettaglio ? fd * 1.2 : 0;
      const tot = (fonte ? chipH + gapChip : 0) + hN + gapE + hE + (dettaglio ? gapD + hD : 0);
      let y = CY - tot / 2 + 6;
      const p = {};
      if (fonte) { p.chip = [y, y + chipH]; y += chipH + gapChip; }
      p.num = [y, y + hN]; y += hN + gapE;
      p.eti = [y, y + hE]; y += hE + gapD;
      if (dettaglio) p.det = [y, y + hD];
      return p;
    };
    let p = pila(fsE, fsD);
    const fe = taglia(etichetta, corda2(...p.eti) - 24, fsE, G.min);
    const fd = dettaglio ? taglia(dettaglio, corda2(...p.det) - 24, fsD, G.min) : fsD;
    p = pila(fe, fd);
    let ok = true;
    // numero: deve stare nella sua corda
    const largN = corda2(...p.num) - 20;
    if (em(testoNumero) * fsN * 0.97 > largN) ok = false;
    if (em(etichetta) * fe > corda2(...p.eti) - 16) ok = false;
    if (dettaglio && em(dettaglio) * fd > corda2(...p.det) - 16) ok = false;
    // fonte: carattere fisso 28 px, spaziatura che si stringe se serve
    let spazio = 0.14;
    if (fonte) {
      const largC = corda2(...p.chip);
      const chip = (ls) => String(fonte).length * (0.6 + ls) * 28 + 48;
      spazio = [0.14, 0.08, 0.02].find((ls) => chip(ls) <= largC);
      if (spazio == null) { ok = false; spazio = 0.02; }
    }
    ris = { fsN, fe, fd, p, spazio };
    if (ok || fsN <= 72) break;
    fsN = Math.floor(fsN * 0.95);
  }
  return ris;
}

export default {
  nome: 'numero',
  descrizione: 'one striking number counting up inside a circular gauge, with what it measures, an optional detail, source and stamp; use when the news has one big figure',
  schema: '{ "valore": "the number only, digits with optional thousands commas and up to 2 decimals, e.g. 155, 2.8, 1,200,000", "unita": "short suffix glued to the number, max 4, e.g. T, %, B, ms, x, or empty", "etichetta": "what the number counts, max 24, e.g. tokens / day", "dettaglio": "optional, max 24, e.g. on one cluster", "fonte": "optional, who says it, max 28, e.g. DeepSeek reports", "timbro": "optional stamp, max 16, e.g. Open source" }',
  valida(d) {
    const e = [];
    const testo = (k) => (d?.[k] == null ? '' : String(d[k]).trim());
    const v = testo('valore');
    if (!v) e.push('valore mancante');
    else if (!NUMERO.test(v)) e.push(`valore non numerico o in forma non ammessa: «${v}» (solo cifre, virgole delle migliaia, al massimo 2 decimali)`);
    else if (v.replace(/[^\d]/g, '').length > 9) e.push(`valore troppo lungo: «${v}»`);
    if (d?.unita != null && typeof d.unita !== 'string') e.push('unita deve essere un testo');
    else if (testo('unita').length > 4) e.push(`unita oltre 4 caratteri: «${testo('unita')}»`);
    else if (/\d/.test(testo('unita'))) e.push('unita non deve contenere cifre');
    if (!testo('etichetta')) e.push('etichetta mancante');
    for (const [k, max] of [['etichetta', 24], ['dettaglio', 24], ['fonte', 28], ['timbro', 16]]) {
      if (d?.[k] != null && typeof d[k] !== 'string') e.push(`${k} deve essere un testo`);
      else if (testo(k).length > max) e.push(`${k} oltre ${max} caratteri (${testo(k).length})`);
    }
    return e;
  },
  parole(d) {
    // il timbro si attacca alla sua prima parola piena («Open source» → «Open»): arriva spesso in coda alla voce
    const primo = String(d.timbro ?? '').split(/\s+/).find((w) => w.replace(/[^\w]/g, '').length >= 3) || d.timbro;
    return attacchi(d, [['etichetta', d.etichetta], ['dettaglio', d.dettaglio], ['fonte', d.fonte], ['timbro', primo]]);
  },
  html({ id, px, dati, durata, t, etichetta: titolo, numero, formato = 'orizzontale' }) {
    const V = formato === 'verticale';
    const G = V ? GEOMETRIE.verticale : GEOMETRIE.orizzontale;
    const { CX, CY, k } = G;
    const tx = (k) => (dati[k] == null ? '' : String(dati[k]).trim());
    const valore = tx('valore'), unita = tx('unita'), etichetta = tx('etichetta'), dettaglio = tx('dettaglio'), fonte = tx('fonte'), timbro = tx('timbro');
    const L = impagina(G, { valore, unita, etichetta, dettaglio, fonte });

    // il conteggio: cifre, decimali e virgole delle migliaia come in «valore»
    const decimali = (valore.split('.')[1] || '').length;
    const migliaia = valore.includes(',');
    const fine = Number(valore.replace(/,/g, ''));
    const formatta = (x) => {
      let [i, f] = x.toFixed(decimali).split('.');
      if (migliaia) i = i.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      return f ? `${i}.${f}` : i;
    };

    // tempi: il numero sale subito (la voce lo dice per primo), poi ogni pezzo quando la voce lo nomina
    const C0 = 0.15, CD = s3(Math.min(2.0, durata * 0.35));
    const tE = Math.max(0.5, t('etichetta', Math.min(C0 + CD, durata * 0.3)));
    const tD = Math.max(tE + 0.5, t('dettaglio', durata * 0.42));
    const tF = Math.max((dettaglio ? tD : tE) + 0.5, t('fonte', durata * 0.58));
    const tT = Math.max((fonte ? tF : dettaglio ? tD : tE) + 0.5, t('timbro', durata * 0.75));
    const tFine = Math.max(0, durata - 0.6);
    const tempo = (x) => s3(Math.min(x, tFine));
    // se il timbro arriva in coda alla scena, il suo disegno si accorcia per finire prima del taglio
    const kT = s3(Math.max(0.45, Math.min(1, (durata - 0.15 - Math.min(tT, tFine)) / 1.0)));

    // timbro: dimensione e riquadro in base al testo
    // orizzontale: in alto a destra, fuori dal quadrante; verticale: centrato sotto il quadrante (fra il quadrante e y 1180)
    const fsT = timbro ? misura(timbro, V ? { larghezza: 560, max: 48, min: 34, fattore: 0.74 } : { larghezza: 380, max: 40, min: 28, fattore: 0.74 }) : 40;
    const wT = Math.round(Math.max(260, timbro.length * 0.74 * fsT + 76)), hT = 120;
    const xT = V ? Math.round(CX - wT / 2) : 1800 - wT;
    const yT = V ? Math.round((CY + 400 * k * 0.92 + 1180) / 2 - hT / 2) : 160;
    // verticale: la fonte sta sopra il quadrante, in una riga sua
    const fsC = V && fonte ? misura(fonte, { larghezza: G.W - 2 * 72 - 60, max: 44, min: 34, fattore: 0.74 }) : 28;
    const hC = Math.round(fsC * 1.1 + 26);

    const top = (r) => Math.round(r[0]);
    const css = `
    #${px}alone { position: absolute; left: ${CX - 500}px; top: ${CY - 500}px; width: 1000px; height: 1000px; border-radius: 50%;
      background: radial-gradient(circle at 50% 50%, rgba(76,203,139,0.20) 0%, rgba(76,203,139,0.07) 38%, rgba(76,203,139,0) 68%); }
    #${px}quadrante { position: absolute; left: ${CX - 400 * k}px; top: ${CY - 400 * k}px; width: ${800 * k}px; height: ${800 * k}px; overflow: visible; }
    .${px}tacche { fill: none; stroke: ${C.accentoScuro}; stroke-width: ${SW}; stroke-dasharray: 3 ${(2 * Math.PI * RT / 120 - 3).toFixed(2)}; }
    .${px}anello { fill: none; stroke: ${C.accento}; stroke-width: 2; stroke-linecap: round; }
    .${px}riga { position: absolute; left: 0; width: ${G.W}px; display: flex; justify-content: center; align-items: center; white-space: nowrap; }
    #${px}chip { padding: 11px 22px 11px; border: 2px solid ${C.accento}; border-radius: 6px; background: ${C.fondo};
      font-family: "JetBrains Mono", monospace; font-weight: 500; font-size: ${fsC}px; line-height: 1.1; letter-spacing: ${V ? 0.14 : L.spazio}em; text-transform: uppercase; color: ${C.crema}; }
    #${px}cifra { display: flex; align-items: baseline; justify-content: center; font-weight: 500; font-optical-sizing: auto; line-height: 0.92;
      letter-spacing: -0.03em; color: ${C.accento}; font-size: ${L.fsN}px; }
    #${px}conta { display: inline-block; font-variant-numeric: tabular-nums lining-nums; transform-origin: 50% 70%; }
    #${px}unita { display: inline-block; }
    #${px}eti { gap: ${Math.round(L.fe * 0.28)}px; font-weight: 400; font-size: ${L.fe}px; line-height: 1.2; color: ${C.crema}; }
    .${px}parola { display: inline-block; }
    #${px}det { font-family: "Source Serif 4", serif; font-style: italic; font-weight: 400; font-size: ${L.fd}px; line-height: 1.2; color: ${C.crema2}; }
    #${px}timbro { position: absolute; left: ${xT}px; top: ${yT}px; width: ${wT}px; height: ${hT}px; transform: rotate(-7deg); }
    #${px}timbro-svg { position: absolute; inset: 0; width: ${wT}px; height: ${hT}px; overflow: visible; }
    .${px}timbro-linea { fill: none; stroke: ${C.accento}; stroke-width: 2.5; stroke-linecap: round; stroke-linejoin: round; }
    #${px}timbro-testo { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; white-space: nowrap;
      font-family: "JetBrains Mono", monospace; font-weight: 500; font-size: ${fsT}px; letter-spacing: 0.14em; text-transform: uppercase; color: ${C.accento}; }`;

    const parole = etichetta.split(/\s+/).map((w) => `<span class="${px}parola">${esc(w)}</span>`).join('');
    const corpo = `
      <div id="${px}alone"></div>
      <svg id="${px}quadrante" viewBox="0 0 800 800" xmlns="http://www.w3.org/2000/svg">
        <defs><mask id="${px}maschera" maskUnits="userSpaceOnUse" x="0" y="0" width="800" height="800">
          <circle id="${px}anello-maschera" cx="400" cy="400" r="${RT}" fill="none" stroke="#fff" stroke-width="60" transform="rotate(-90 400 400)"/>
        </mask></defs>
        <circle class="${px}tacche" cx="400" cy="400" r="${RT}" transform="rotate(-90 400 400)" mask="url(#${px}maschera)"/>
        <circle id="${px}anello" class="${px}anello" cx="400" cy="400" r="${RI}" transform="rotate(-90 400 400)"/>
      </svg>
      ${!fonte ? '' : V ? `<div class="${px}riga" style="top: 160px; height: ${hC}px"><div id="${px}chip">${esc(fonte)}</div></div>` : `<div class="${px}riga" style="top: ${top(L.p.chip)}px; height: ${Math.round(L.p.chip[1] - L.p.chip[0])}px"><div id="${px}chip">${esc(fonte)}</div></div>`}
      <div class="${px}riga" style="top: ${top(L.p.num)}px; height: ${Math.round(L.p.num[1] - L.p.num[0])}px"><div id="${px}cifra"><span id="${px}conta">${formatta(0)}</span>${unita ? `<span id="${px}unita">${esc(unita)}</span>` : ''}</div></div>
      <div id="${px}eti" class="${px}riga" style="top: ${top(L.p.eti)}px">${parole}</div>
      ${dettaglio ? `<div id="${px}det" class="${px}riga" style="top: ${top(L.p.det)}px">${esc(dettaglio)}</div>` : ''}
      ${timbro ? `<div id="${px}timbro">
        <svg id="${px}timbro-svg" viewBox="0 0 ${wT} ${hT}" xmlns="http://www.w3.org/2000/svg">
          <path id="${px}timbro-fuori" class="${px}timbro-linea" d="M 8 2 L ${wT - 8} 2 Q ${wT - 2} 2 ${wT - 2} 8 L ${wT - 2} ${hT - 8} Q ${wT - 2} ${hT - 2} ${wT - 8} ${hT - 2} L 8 ${hT - 2} Q 2 ${hT - 2} 2 ${hT - 8} L 2 8 Q 2 2 8 2 Z"/>
          <path id="${px}timbro-dentro" class="${px}timbro-linea" d="M 16 12 L ${wT - 16} 12 L ${wT - 16} ${hT - 12} L 16 ${hT - 12} Z"/>
        </svg>
        <div id="${px}timbro-testo">${esc(timbro)}</div>
      </div>` : ''}`;

    const anima = `
      // conteggio deterministico: il testo dipende solo dall'avanzamento del tween (si può saltare a qualsiasi istante)
      const conta = q("#${px}conta");
      const FINE = ${JSON.stringify(fine)}, DEC = ${decimali}, MIG = ${migliaia}, TESTO = ${JSON.stringify(valore)};
      const fmt = (x) => { const s = x.toFixed(DEC).split("."); let i = s[0]; if (MIG) i = i.replace(/\\B(?=(\\d{3})+(?!\\d))/g, ","); return s[1] ? i + "." + s[1] : i; };
      const stato = { v: 0 };
      tl.to(stato, { v: FINE, duration: ${CD}, ease: "power3.out", onUpdate: function () {
        const s = this.progress() >= 1 ? TESTO : fmt(stato.v);
        if (conta.textContent !== s) conta.textContent = s;
      } }, ${C0});
      tl.fromTo(conta, { scale: 0.5 }, { scale: 1, duration: ${CD}, ease: "power3.out" }, ${C0});
      ${unita ? `tl.fromTo(q("#${px}unita"), { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.45, ease: "power3.out" }, ${s3(C0 + CD - 0.1)});` : ''}
      tl.fromTo(q("#${px}alone"), { opacity: 0 }, { opacity: 1, duration: 1.2, ease: "power2.out" }, ${C0});
      [q("#${px}anello-maschera"), q("#${px}anello")].forEach((c) => {
        const l = c.getTotalLength() * 1.02;
        tl.fromTo(c, { strokeDasharray: l, strokeDashoffset: l }, { strokeDashoffset: 0, duration: ${CD}, ease: "power3.out" }, ${C0});
      });
      tl.fromTo(qa(".${px}parola"), { opacity: 0, y: 34 }, { opacity: 1, y: 0, duration: 0.5, ease: "power3.out", stagger: 0.12 }, ${tempo(tE)});
      ${dettaglio ? `tl.fromTo(q("#${px}det"), { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.55, ease: "power3.out" }, ${tempo(tD)});` : ''}
      ${fonte ? `tl.fromTo(q("#${px}chip"), { opacity: 0, y: -26 }, { opacity: 1, y: 0, duration: 0.7, ease: "power3.out" }, ${tempo(tF)});` : ''}
      ${timbro ? `tl.fromTo(q("#${px}timbro"), { opacity: 0 }, { opacity: 1, duration: 0.05, ease: "none" }, ${tempo(tT)});
      [[q("#${px}timbro-fuori"), 0, 0.7], [q("#${px}timbro-dentro"), 0.5, 0.5]].forEach(([p, a, d]) => {
        const l = p.getTotalLength() * 1.02;
        tl.fromTo(p, { strokeDasharray: l, strokeDashoffset: l }, { strokeDashoffset: 0, duration: d * ${kT}, ease: "power2.out" }, ${tempo(tT)} + a * ${kT});
      });
      tl.fromTo(q("#${px}timbro-testo"), { opacity: 0, scale: 1.12 }, { opacity: 1, scale: 1, duration: ${s3(0.45 * kT)}, ease: "power2.out" }, ${s3(tempo(tT) + 0.55 * kT)});` : ''}`;
    return scena({ id, px, durata, etichetta: titolo, numero, css, corpo, anima, formato: V ? 'verticale' : 'orizzontale' });
  },
};
