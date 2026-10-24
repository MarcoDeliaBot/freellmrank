// Stampo «nome»: presenta un prodotto o un modello. Il nome compare lettera per lettera girando in 3D e
// «decifrandosi» (simboli a caso che diventano la lettera vera), la riga d'accento si disegna sotto, sopra c'è «by …»,
// sotto le etichette in pillole (dalla prova DeepInfer del 24/10/2026, quadro 2).
// La decifrazione regge la ricerca del fotogramma senza callback: per ogni lettera i simboli e la lettera vera sono
// span sovrapposti, accesi e spenti con tl.set a tempi fissi; i simboli dipendono solo dalla posizione della lettera.
import { C, scena, s3, esc, misura, attacchi } from '../base.mjs';

const MAX_NOME = 18, MAX_SOPRA = 30, MAX_ETICHETTA = 34, MAX_ETICHETTE = 3;
// simboli di larghezza simile alla lettera che sostituiscono (niente M o W larghe sopra una «f» stretta)
const SIMBOLI_MAIUSC = 'ABCDEFGHKLNPRSTUVXYZ0123456789#&';
const SIMBOLI_MINUSC = 'abcdeghknopqrsuvxyz0123456789';
const SIMBOLI_STRETTI = 'fijlrt1!';
const PASSI = 3; // simboli mostrati prima della lettera vera
const PASSO = 0.1; // secondi per simbolo
const SFALSA = 0.06; // ritardo fra una lettera e la successiva
const GIRO = 0.7; // durata della rotazione di ogni lettera

// misure delle pillole (JetBrains Mono: ogni carattere è 0.6 em, quindi le larghezze si calcolano qui)
const P_FONT = 34, P_PADX = 32, P_PALLINO = 14 + 18, P_ALTEZZA = Math.round(P_FONT * 1.2) + 20 + 22;
const P_LARGHEZZA = 1728, P_GAPX = 28, P_GAPY = 20;

const testo = (x) => (typeof x === 'string' ? x.trim() : '');
const etichetteDi = (dati) => (Array.isArray(dati?.etichette) ? dati.etichette.map(testo).filter(Boolean) : []);

function righePillole(etichette) {
  let righe = 0, usata = 0;
  for (const e of etichette) {
    const w = e.length * P_FONT * 0.6 + 2 * P_PADX + P_PALLINO;
    if (righe === 0 || usata + P_GAPX + w > P_LARGHEZZA) { righe++; usata = w; } else usata += P_GAPX + w;
  }
  return righe;
}

export default {
  nome: 'nome',
  descrizione: 'introduce a product, model or tool by name: big name that decodes letter by letter, "by <maker>" above, up to 3 short tags below',
  schema: '{ "nome": "DeepInfer (the name, max 18 chars)", "evidenza": "Infer (optional: the END of nome, shown in accent color)", "sopra": "by DeepSeek (optional, max 30)", "etichette": ["inference engine · V4.1 Flash", "code is public", "0-3 tags, max 34 chars each"] }',

  valida(dati) {
    const p = [];
    if (!dati || typeof dati !== 'object') return ['dati mancanti'];
    const nome = testo(dati.nome);
    if (typeof dati.nome !== 'string' || !nome) p.push('nome mancante');
    else if (nome.length > MAX_NOME) p.push(`nome troppo lungo (${nome.length} > ${MAX_NOME})`);
    if (/[\n\r\t]/.test(String(dati.nome ?? ''))) p.push('nome con a capo o tabulazioni');
    if (dati.evidenza != null && dati.evidenza !== '') {
      const ev = testo(dati.evidenza);
      if (typeof dati.evidenza !== 'string' || !ev) p.push('evidenza non è un testo');
      else if (!nome.endsWith(ev)) p.push(`evidenza «${ev}» non è la fine del nome «${nome}»`);
    }
    if (dati.sopra != null && dati.sopra !== '') {
      if (typeof dati.sopra !== 'string') p.push('sopra non è un testo');
      else if (testo(dati.sopra).length > MAX_SOPRA) p.push(`sopra troppo lungo (${testo(dati.sopra).length} > ${MAX_SOPRA})`);
    }
    if (dati.etichette != null) {
      if (!Array.isArray(dati.etichette)) p.push('etichette non è un elenco');
      else {
        if (dati.etichette.length > MAX_ETICHETTE) p.push(`troppe etichette (${dati.etichette.length} > ${MAX_ETICHETTE})`);
        dati.etichette.forEach((e, i) => {
          if (typeof e !== 'string' || !e.trim()) p.push(`etichetta ${i + 1} vuota o non testo`);
          else if (e.trim().length > MAX_ETICHETTA) p.push(`etichetta ${i + 1} troppo lunga (${e.trim().length} > ${MAX_ETICHETTA})`);
          else if (/[\n\r\t]/.test(e)) p.push(`etichetta ${i + 1} con a capo`);
        });
      }
    }
    return p;
  },

  parole(dati) {
    const et = etichetteDi(dati);
    // per «sopra» conta il produttore (prima parte, senza «by»/«from»): la voce lo nomina subito dopo il nome
    const produttore = testo(dati.sopra).split(/[·|,]/)[0].replace(/^(by|from|made by)s+/i, '');
    return attacchi(dati, [['nome', testo(dati.nome)], ['sopra', produttore], ...et.map((e, i) => [`e${i + 1}`, e])]);
  },

  html({ id, px, dati, durata, t, etichetta, numero }) {
    const nome = testo(dati.nome);
    const ev = testo(dati.evidenza);
    const daAccento = ev && nome.endsWith(ev) ? nome.length - ev.length : nome.length;
    const sopra = testo(dati.sopra);
    const et = etichetteDi(dati).slice(0, MAX_ETICHETTE);

    // tempi: ognuno quando la voce lo nomina, altrimenti distribuiti sulla durata
    const tNome = t('nome', 0.1);
    const fineDecodifica = tNome + (nome.length - 1) * SFALSA + GIRO;
    const tSopra = t('sopra', Math.min(durata * 0.3, fineDecodifica));
    let prima = Math.max(tNome + 0.6, sopra ? tSopra : 0);
    const tEt = et.map((_, i) => {
      const x = Math.max(t(`e${i + 1}`, Math.max(prima + 0.6, durata * (0.45 + 0.17 * i))), prima + 0.3);
      prima = x;
      return Math.min(x, durata - 0.6);
    });

    // dimensioni decise qui: il nome entra nell'80% della larghezza, ma non diventa enorme se è corto
    const fs = misura(nome, { larghezza: 1536, max: 270, min: 96, fattore: 0.56 });
    const righe = righePillole(et);
    const hSopra = sopra ? Math.round(46 * 1.2) + 22 : 0;
    const hNome = Math.round(fs * 0.92);
    const scendi = 30 + Math.round(fs * 0.12); // spazio per le discendenti (p, g, y) sopra la riga
    const hRiga = scendi + 2;
    const hPill = righe ? 56 + righe * P_ALTEZZA + (righe - 1) * P_GAPY : 0;
    const alto = hSopra + hNome + hRiga + hPill;
    const cima = Math.max(150, Math.round(150 + (680 - alto) / 2)); // centrato fra la barra e i sottotitoli

    const css = `
    #${px}colonna { position: absolute; left: 0; right: 0; top: ${cima}px; display: flex; flex-direction: column; align-items: center; }
    #${px}sopra { font-weight: 400; font-size: 46px; line-height: 1.2; color: ${C.crema2}; margin-bottom: 22px; white-space: nowrap; }
    #${px}marchio { display: inline-flex; flex-direction: column; align-items: stretch; }
    #${px}nome { font-weight: 500; font-variation-settings: "opsz" 60; font-size: ${fs}px; line-height: 0.92; letter-spacing: -0.02em;
      white-space: nowrap; color: ${C.crema}; perspective: 1500px; }
    .${px}c { position: relative; display: inline-block; transform-origin: 50% 100%; transform-style: preserve-3d; white-space: pre; }
    .${px}c.${px}acc { color: ${C.accento}; }
    .${px}fant { visibility: hidden; }
    .${px}g, .${px}v { position: absolute; left: -40px; right: -40px; top: 0; text-align: center; opacity: 0; }
    #${px}riga { height: 2px; margin-top: ${scendi}px; background: ${C.accento}; transform-origin: left center; }
    #${px}pillole { display: flex; flex-wrap: wrap; justify-content: center; column-gap: ${P_GAPX}px; row-gap: ${P_GAPY}px;
      max-width: ${P_LARGHEZZA}px; margin-top: 56px; }
    .${px}pill { display: inline-flex; align-items: center; gap: 18px; padding: 20px ${P_PADX}px 22px; border-radius: 6px; background: ${C.pannello};
      white-space: pre; font-family: "JetBrains Mono", monospace; font-weight: 500; font-size: ${P_FONT}px; line-height: 1.2; color: ${C.crema}; }
    .${px}pallino { width: 14px; height: 14px; border-radius: 3px; background: ${C.accento}; flex: none; }`;

    const lettere = [...nome].map((ch, i) => {
      const acc = i >= daAccento ? ` ${px}acc` : '';
      if (ch === ' ') return `<span class="${px}c${acc}"><span class="${px}fant">&nbsp;</span></span>`;
      const code = ch.codePointAt(0);
      const set = /[fijlrtI1.,:;'!|]/.test(ch) ? SIMBOLI_STRETTI : /[a-z]/.test(ch) ? SIMBOLI_MINUSC : SIMBOLI_MAIUSC;
      const sim = Array.from({ length: PASSI }, (_, k) => set[(i * 7 + k * 13 + code * 3) % set.length]);
      return `<span class="${px}c${acc}"><span class="${px}fant">${esc(ch)}</span>${sim.map((g) => `<span class="${px}g">${esc(g)}</span>`).join('')}<span class="${px}v">${esc(ch)}</span></span>`;
    }).join('');

    const corpo = `
      <div id="${px}colonna">
        ${sopra ? `<div id="${px}sopra">${esc(sopra)}</div>` : ''}
        <div id="${px}marchio">
          <div id="${px}nome">${lettere}</div>
          <div id="${px}riga"></div>
        </div>
        ${et.length ? `<div id="${px}pillole">${et.map((e, i) => `<div class="${px}pill" id="${px}p${i + 1}"><span class="${px}pallino"></span><span>${esc(e)}</span></div>`).join('')}</div>` : ''}
      </div>`;

    const anima = `
      qa(".${px}c").forEach(function (cella, i) {
        var s = ${s3(tNome)} + i * ${SFALSA};
        tl.fromTo(cella, { rotationX: 90, opacity: 0 }, { rotationX: 0, opacity: 1, duration: ${GIRO}, ease: "power3.out" }, s);
        var g = cella.querySelectorAll(".${px}g");
        for (var k = 0; k < g.length; k++) {
          tl.set(g[k], { opacity: 1 }, s + k * ${PASSO});
          tl.set(g[k], { opacity: 0 }, s + (k + 1) * ${PASSO});
        }
        var v = cella.querySelector(".${px}v");
        if (v) tl.set(v, { opacity: 1 }, s + g.length * ${PASSO});
      });
      tl.fromTo(q("#${px}riga"), { scaleX: 0 }, { scaleX: 1, duration: 0.7, ease: "power2.out" }, ${s3(tNome + Math.max(0, nome.length - 1) * SFALSA + 0.4)});
      ${sopra ? `tl.fromTo(q("#${px}sopra"), { opacity: 0, y: 26 }, { opacity: 1, y: 0, duration: 0.6, ease: "power3.out" }, ${s3(tSopra)});` : ''}
      ${tEt.map((x, i) => `tl.fromTo(q("#${px}p${i + 1}"), { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.65, ease: "power3.out" }, ${s3(x)});`).join('\n      ')}`;

    return scena({ id, px, durata, etichetta, numero, css, corpo, anima });
  },
};
