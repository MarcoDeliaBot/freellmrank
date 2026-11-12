// Stampo «scontrino» (carta, 12/11/2026): uno scontrino esce a scatti come da una stampante, le voci compaiono quando la
// voce le nomina, in fondo un totale grande che un cerchio rosso disegnato a mano circonda, con una nota scritta a mano.
// Dalla prova dei movimenti del video EarnixLab iO2sNuzaCxU (Marco: «Sì, fai gli stampi»).
import { scena, s3, esc, misura, attacchi, CARTA } from '../base.mjs';

const ZIGZAG = 'polygon(0 0,100% 0,100% 97%,' + Array.from({ length: 25 }, (_, i) => `${100 - (i + 1) * 4}% ${i % 2 ? 97 : 100}%`).join(',') + ')';

export default {
  nome: 'scontrino',
  descrizione: 'paper receipt that prints line by line, with a big total circled by hand and a handwritten aside; use for what a product does or includes (2-4 short lines) and one key figure at the bottom',
  schema: '{ "sopra": "small header, max 24, e.g. GOOGLE · NOV 2026", "titolo": "max 22, e.g. Gemini Decisions", "righe": ["max 22 each, 2-4 lines, e.g. Multiple choice"], "totale": { "nome": "max 10, e.g. PASSES", "valore": "max 6, e.g. 1 or $0.10" }, "nota": "optional handwritten aside, max 16, e.g. all at once!" }',
  valida(d) {
    const e = [];
    const tx = (v) => (v == null ? '' : String(v).trim());
    if (!tx(d?.titolo)) e.push('titolo mancante');
    for (const [k, max] of [['sopra', 24], ['titolo', 22], ['nota', 16]]) {
      if (d?.[k] != null && typeof d[k] !== 'string') e.push(`${k} deve essere un testo`);
      else if (tx(d?.[k]).length > max) e.push(`${k} oltre ${max} caratteri`);
    }
    if (!Array.isArray(d?.righe) || d.righe.length < 2 || d.righe.length > 4) e.push('righe: da 2 a 4');
    else d.righe.forEach((r, i) => { if (typeof r !== 'string' || !r.trim()) e.push(`riga ${i + 1} vuota`); else if (r.trim().length > 22) e.push(`riga ${i + 1} oltre 22 caratteri`); });
    if (!d?.totale || typeof d.totale !== 'object') e.push('totale mancante');
    else {
      if (!tx(d.totale.nome) || tx(d.totale.nome).length > 10) e.push('totale.nome: 1-10 caratteri');
      if (!tx(d.totale.valore) || tx(d.totale.valore).length > 6) e.push('totale.valore: 1-6 caratteri');
    }
    return e;
  },
  parole(d) {
    return attacchi(d, [...(d.righe || []).map((r, i) => [`r${i}`, r]), ['totale', d.totale?.valore ?? ''], ['nota', d.nota]]);
  },
  html({ id, px, dati, durata, t, etichetta, numero, formato = 'orizzontale' }) {
    const V = formato === 'verticale';
    const tx = (v) => (v == null ? '' : String(v).trim());
    const sopra = tx(dati.sopra).toUpperCase(), titolo = tx(dati.titolo), righe = dati.righe.map(tx), nota = tx(dati.nota);
    const totNome = tx(dati.totale.nome).toUpperCase(), totVal = tx(dati.totale.valore);
    const W = V ? 860 : 700, L = V ? 110 : 610, T = V ? 170 : 140;
    const fsR = V ? 42 : 34, fsTit = misura(titolo, { larghezza: W - 120, max: V ? 64 : 54, min: 34, fattore: 0.56 });
    const fsTot = misura(totVal, { larghezza: (W - 120) * 0.5, max: V ? 150 : 120, min: 60, fattore: 0.62 });
    const hRiga = Math.round(fsR * 1.25 + 30);
    const H = Math.round(56 + 32 + fsTit * 1.3 + 34 + righe.length * hRiga + 44 + fsTot * 1.05 + 70);
    // il totale: a destra in fondo; il cerchio gli sta intorno
    const wTot = Math.round(totVal.length * fsTot * 0.62), hTot = Math.round(fsTot * 1.05);
    const xTot = W - 60 - wTot, yTot = H - 70 - hTot;
    const pad = Math.round(fsTot * 0.35);
    const cW = wTot + 2 * pad + 20, cH = hTot + 2 * pad;
    const cX = xTot - pad - 10, cY = yTot - pad + 6;

    const fine = Math.max(0, durata - 0.6);
    const tempo = (x) => s3(Math.min(x, fine));
    const tR = righe.map((r, i) => Math.max(1.3 + i * 0.5, t(`r${i}`, 1.3 + (durata * 0.55 - 1.3) * (i / Math.max(1, righe.length - 1)))));
    const tTot = Math.max(tR.at(-1) + 0.6, t('totale', durata * 0.72));
    const tNota = Math.max(tTot + 0.9, t('nota', tTot + 1.0));

    const css = `
    #${px}sc { position: absolute; left: ${L}px; top: ${T}px; width: ${W}px; height: ${H}px; filter: ${CARTA.ombra}; }
    #${px}foglio { position: absolute; inset: 0; background: ${CARTA.foglio}; clip-path: ${ZIGZAG}; }
    #${px}righe { position: absolute; left: 60px; right: 60px; top: 56px; font-family: "JetBrains Mono", monospace; font-weight: 700; font-size: ${fsR}px; color: ${CARTA.inchiostro}; }
    .${px}capo { text-align: center; color: ${CARTA.grigio}; font-size: ${V ? 32 : 28}px; letter-spacing: 0.24em; }
    .${px}tit { text-align: center; font-family: "Inter", sans-serif; font-size: ${fsTit}px; margin: 16px 0 34px; white-space: nowrap; }
    .${px}riga { display: flex; justify-content: space-between; height: ${hRiga}px; align-items: center; border-bottom: 3px dashed ${CARTA.riga}; white-space: nowrap; }
    .${px}ok { color: ${CARTA.verde}; }
    #${px}totnome { position: absolute; left: 60px; top: ${yTot + hTot * 0.35}px; font-family: "JetBrains Mono", monospace; font-weight: 700; font-size: ${V ? 40 : 34}px; color: ${CARTA.inchiostro}; }
    #${px}totval { position: absolute; left: ${xTot}px; top: ${yTot}px; width: ${wTot}px; height: ${hTot}px; font-family: "Inter", sans-serif; font-weight: 700;
      font-size: ${fsTot}px; line-height: 1.05; color: ${CARTA.rosso}; text-align: center; white-space: nowrap; }
    #${px}cerchio { position: absolute; left: ${cX}px; top: ${cY}px; width: ${cW}px; height: ${cH}px; overflow: visible; }
    #${px}nota { position: absolute; ${V ? `left: 0; width: 1080px; text-align: center; top: ${T + H + 40}px;` : `left: ${L + W + 40}px; top: ${T + yTot + 10}px;`}
      font-family: "Caveat", cursive; font-weight: 700; font-size: ${V ? 72 : 64}px; color: ${CARTA.rosso}; white-space: nowrap; }
    #${px}nota span { display: inline-block; transform: rotate(-6deg); }`;
    // ellisse a mano: un giro e un pezzo, un po' storta (forma fissa, scalata sul totale)
    const ell = `M ${cW * 0.15} ${cH * 0.52} C ${cW * 0.1} ${cH * 0.12}, ${cW * 0.5} ${-cH * 0.05}, ${cW * 0.78} ${cH * 0.1} C ${cW * 1.02} ${cH * 0.22}, ${cW * 1.0} ${cH * 0.8}, ${cW * 0.72} ${cH * 0.95} C ${cW * 0.42} ${cH * 1.06}, ${cW * 0.04} ${cH * 0.92}, ${cW * 0.06} ${cH * 0.5} C ${cW * 0.08} ${cH * 0.26}, ${cW * 0.3} ${cH * 0.1}, ${cW * 0.5} ${cH * 0.06}`;
    const corpo = `
      <div id="${px}sc"><div id="${px}foglio"></div>
        <div id="${px}righe">
          ${sopra ? `<div class="${px}capo">${esc(sopra)}</div>` : ''}
          <div class="${px}tit">${esc(titolo)}</div>
          ${righe.map((r, i) => `<div class="${px}riga" id="${px}r${i}"><span>${esc(r)}</span><span class="${px}ok">✓</span></div>`).join('')}
        </div>
        <div id="${px}totnome">${esc(totNome)}</div>
        <div id="${px}totval">${esc(totVal)}</div>
        <svg id="${px}cerchio" viewBox="0 0 ${cW} ${cH}"><path id="${px}ell" d="${ell}" fill="none" stroke="${CARTA.rosso}" stroke-width="${V ? 10 : 9}" stroke-linecap="round"/></svg>
      </div>
      ${nota ? `<div id="${px}nota"><span>${esc(nota)}</span></div>` : ''}`;
    const anima = `
      tl.fromTo(q("#${px}sc"), { clipPath: "inset(0 0 100% 0)" }, { clipPath: "inset(0 0 0% 0)", duration: 1.1, ease: "steps(14)" }, 0.1);
      tl.set(q("#${px}sc"), { clipPath: "none" }, 1.25);
      ${righe.map((_, i) => `tl.fromTo(q("#${px}r${i}"), { x: -40, opacity: 0 }, { x: 0, opacity: 1, duration: 0.35, ease: "power2.out" }, ${tempo(tR[i])});`).join('\n      ')}
      tl.fromTo([q("#${px}totnome"), q("#${px}totval")], { opacity: 0 }, { opacity: 1, duration: 0.25 }, ${tempo(tTot - 0.15)});
      tl.fromTo(q("#${px}totval"), { scale: 3 }, { scale: 1, duration: 0.4, ease: "back.out(2)" }, ${tempo(tTot - 0.15)});
      { const p = q("#${px}ell"); const l = p.getTotalLength() * 1.02;
        tl.fromTo(p, { strokeDasharray: l, strokeDashoffset: l, opacity: 0 }, { strokeDashoffset: 0, opacity: 1, duration: 0.7, ease: "power2.inOut" }, ${tempo(tTot + 0.35)}); }
      ${nota ? `tl.fromTo(q("#${px}nota span"), { opacity: 0, rotation: -20, scale: 0.6 }, { opacity: 1, rotation: -6, scale: 1, duration: 0.45, ease: "back.out(2)" }, ${tempo(tNota)});` : ''}`;
    return scena({ id, px, durata, etichetta, numero, css, corpo, anima, formato: V ? 'verticale' : 'orizzontale', carta: true });
  },
};
