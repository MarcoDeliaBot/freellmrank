// Stampo «lista»: cosa contiene / cosa serve (dalla prova DeepInfer del 24/10/2026, quadro 4 «What's inside»).
// A sinistra (60%) un pannello scuro: intestazione mono che si scrive con il cursore, blocchi che si posano.
// A destra (40%) la lista con le spunte che si disegnano da sole e, in fondo, le alternative separate da «or».
// Senza pannello e senza blocchi la lista va al centro dello schermo, più grande.
import { C, scena, s3, esc, misura, attacchi } from '../base.mjs';

const str = (x) => (x == null ? '' : String(x).trim());
const lista = (x) => (Array.isArray(x) ? x : []);

// i dati ripuliti, uguali per parole() e html()
function pezzi(dati) {
  return {
    pannello: str(dati.pannello),
    blocchi: lista(dati.blocchi).map((b) => ({ nome: str(b?.nome), tipo: str(b?.tipo) })),
    titolo: str(dati.titoloLista),
    righe: lista(dati.righe).map(str),
    alternative: lista(dati.alternative).map((a) => ({ testo: str(a?.testo), nota: str(a?.nota) })),
  };
}

function testo(problemi, nome, v, max, obbligatorio) {
  if (v == null || (typeof v === 'string' && !v.trim())) { if (obbligatorio) problemi.push(`${nome}: manca`); return; }
  if (typeof v !== 'string') { problemi.push(`${nome}: deve essere un testo`); return; }
  if (/[\r\n\t]/.test(v)) problemi.push(`${nome}: niente a capo`);
  if (v.trim().length > max) problemi.push(`${nome}: ${v.trim().length} caratteri, massimo ${max}`);
}

export default {
  nome: 'lista',
  descrizione: 'what something contains and/or what you need to use it: an optional dark panel (folder or repo name plus up to 3 named parts such as kernels or modules) beside a checklist of requirements, optionally ending with 1-2 alternatives ("CUDA 13" or "CANN 9.2")',
  schema: '{ "pannello": "deepinfer /, optional mono header, max 22", "blocchi": [{ "nome": "FlashMLA, max 14", "tipo": "kernel, max 12" }], "titoloLista": "To build, max 22", "righe": ["Linux", "GCC 13", "max 22 each, 1-5"], "alternative": [{ "testo": "CUDA 13, max 14", "nota": "NVIDIA, max 12" }] } (blocchi 0-3, alternative 0-2; without pannello and blocchi the list fills the centre)',
  valida(dati) {
    const p = [];
    if (!dati || typeof dati !== 'object' || Array.isArray(dati)) return ['dati: deve essere un oggetto'];
    testo(p, 'pannello', dati.pannello, 22, false);
    testo(p, 'titoloLista', dati.titoloLista, 22, true);
    for (const [k, min, max] of [['blocchi', 0, 3], ['righe', 1, 5], ['alternative', 0, 2]]) {
      const v = dati[k];
      if (v == null) { if (min) p.push(`${k}: manca`); continue; }
      if (!Array.isArray(v)) { p.push(`${k}: deve essere un elenco`); continue; }
      if (v.length < min || v.length > max) p.push(`${k}: ${v.length} voci, ne servono ${min}-${max}`);
    }
    lista(dati.blocchi).forEach((b, i) => {
      if (!b || typeof b !== 'object') { p.push(`blocchi[${i}]: deve essere un oggetto`); return; }
      testo(p, `blocchi[${i}].nome`, b.nome, 14, true);
      testo(p, `blocchi[${i}].tipo`, b.tipo, 12, false);
    });
    lista(dati.righe).forEach((r, i) => testo(p, `righe[${i}]`, r, 22, true));
    lista(dati.alternative).forEach((a, i) => {
      if (!a || typeof a !== 'object') { p.push(`alternative[${i}]: deve essere un oggetto`); return; }
      testo(p, `alternative[${i}].testo`, a.testo, 14, true);
      testo(p, `alternative[${i}].nota`, a.nota, 12, false);
    });
    if (dati.quando != null && (typeof dati.quando !== 'object' || Array.isArray(dati.quando))) p.push('quando: deve essere un oggetto');
    return p;
  },
  parole(dati) {
    const d = pezzi(dati);
    return attacchi(dati, [
      ['pannello', d.pannello],
      ...d.blocchi.map((b, i) => [`blocco${i + 1}`, b.nome]),
      ['titoloLista', d.titolo],
      ...d.righe.map((r, i) => [`riga${i + 1}`, r]),
      ...d.alternative.map((a, i) => [`alternativa${i + 1}`, a.testo]),
    ]);
  },
  html({ id, px, dati, durata, t, etichetta, numero }) {
    const d = pezzi(dati);
    // il pannello scuro solo con dei blocchi; senza blocchi l'intestazione diventa un occhiello sopra il titolo della lista
    const conPannello = d.blocchi.length > 0;
    const occhiello = !!d.pannello && !conPannello;
    const occF = occhiello ? misura(d.pannello, { larghezza: 1100, max: 40, min: 32, fattore: 0.6 }) : 0;
    const occH = occhiello ? Math.round(occF * 1.2) + 14 : 0;

    // tempi: ogni pezzo quando la voce lo nomina; riserve distribuite sulla durata, nell'ordine della voce
    const ordine = [
      ...(d.pannello ? ['pannello'] : []), ...d.blocchi.map((_, i) => `blocco${i + 1}`), 'titoloLista',
      ...d.righe.map((_, i) => `riga${i + 1}`), ...d.alternative.map((_, i) => `alternativa${i + 1}`),
    ];
    const T = {};
    ordine.forEach((k, i) => { T[k] = t(k, i === 0 ? 0.15 : durata * (0.06 + (0.8 * i) / Math.max(1, ordine.length - 1))); });
    const tLista = T.titoloLista;

    // ---------- geometria, decisa qui ----------
    const ALTO = 150, FONDO = 840; // spazio utile: sotto la barra, sopra i sottotitoli (860) con margine
    const g = {};
    if (conPannello) {
      g.colX = 1116; g.colW = 708; g.colY = 176;
      g.titF = misura(d.titolo, { larghezza: g.colW, max: 84, fattore: 0.52 });
      g.chk = 46; g.rowMax = 88; g.rowFMax = 48;
    } else {
      g.colW = 1100;
      g.titF = misura(d.titolo, { larghezza: g.colW, max: 104, fattore: 0.52 });
      g.chk = 56; g.rowMax = 100; g.rowFMax = 64;
    }
    const nA = d.alternative.length;
    // le alternative: senza note («nota» vuota = assente) il riquadro è basso e lascia spazio alle righe
    const conNote = d.alternative.some((a) => a.nota);
    const orW = 54, gapA = 22;
    const optW = nA === 2 ? Math.floor((g.colW - orW - 2 * gapA) / 2) : Math.min(g.colW, conPannello ? 420 : 520);
    const optF = Math.min(...d.alternative.map((a) => misura(a.testo, { larghezza: optW - 52, max: 40, fattore: 0.6 })), 40);
    const optH = nA ? (conNote ? 140 : optF + 52) : 0, altH = nA ? 30 + optH : 0;
    const testa = occH + g.titF + 26 + 26; // titolo, riga verde con i suoi margini
    const disponibile = (conPannello ? FONDO - g.colY : FONDO - ALTO) - testa - altH;
    const rowH = Math.min(g.rowMax, Math.floor(disponibile / d.righe.length));
    const lunga = d.righe.reduce((a, r) => (r.length > a.length ? r : a), '');
    const chk = Math.min(g.chk, rowH - 18);
    const gapR = Math.round(chk * 0.6);
    const rowF = Math.max(28, Math.min(misura(lunga, { larghezza: g.colW - chk - gapR - 8, max: g.rowFMax, fattore: 0.6 }), Math.floor(rowH * 0.72)));
    const altoTot = testa + rowH * d.righe.length + altH;
    if (!conPannello) {
      // colonna centrata: larga quanto serve, mai meno di 760
      const titW = Math.max(d.titolo.length * 0.52 * g.titF, [...d.pannello].length * 0.6 * occF);
      const rigW = chk + gapR + lunga.length * 0.6 * rowF + 8;
      const altW = nA === 2 ? 2 * optW + orW + 2 * gapA : nA ? optW : 0;
      g.colW = Math.min(1100, Math.max(760, Math.ceil(Math.max(titW, rigW, altW))));
      g.colX = Math.round((1920 - g.colW) / 2);
      g.colY = Math.round(ALTO + Math.max(0, (FONDO - ALTO - altoTot) / 2));
    }

    // pannello
    const P = { x: 96, y: 176, w: 960, h: 664, pad: 52 };
    const inW = P.w - 2 * P.pad;
    const conTesta = !!d.pannello;
    const nB = d.blocchi.length;
    const testaF = d.pannello ? misura(d.pannello, { larghezza: inW - 40, max: nB ? 44 : 72, fattore: 0.6 }) : 0;
    const testaY = nB ? 44 : Math.round((P.h - testaF * 1.4) / 2) - 40;
    const zonaY = conTesta ? 176 : P.pad, zonaH = P.h - P.pad - zonaY;
    const righeB = nB === 3; // tre blocchi: uno sotto l'altro
    const bW = righeB || nB === 1 ? inW : Math.floor((inW - 40) / 2);
    const bH = righeB ? Math.floor((zonaH - 2 * 24) / 3) : Math.min(260, zonaH);
    const bY = righeB ? zonaY : zonaY + Math.round((zonaH - bH) / 2);
    const tipoW = 270;
    const nomeF = Math.min(...d.blocchi.map((b) => misura(b.nome, { larghezza: righeB ? inW - tipoW - 90 : bW - 96, max: 56, fattore: 0.6 })), 56);

    // la parte dell'intestazione dall'ultima «/» in poi va in verde, come nella prova
    const barra = d.pannello.lastIndexOf('/');
    const taglio = barra >= 0 ? (d.pannello.slice(0, barra).endsWith(' ') ? barra - 1 : barra) : d.pannello.length;

    const css = `
    #${px}pannello { position: absolute; left: ${P.x}px; top: ${P.y}px; width: ${P.w}px; height: ${P.h}px; background: ${C.pannello}; border-radius: 8px; overflow: hidden; opacity: 0; }
    .${px}testa { position: absolute; left: ${P.pad}px; right: ${P.pad}px; top: ${testaY}px; display: flex; align-items: center; height: ${Math.round(testaF * 1.4)}px;
      font-family: "JetBrains Mono", monospace; font-weight: 500; font-size: ${testaF}px; white-space: pre; color: ${C.crema}; }
    .${px}car { display: none; } .${px}car-acc { color: ${C.accento}; }
    #${px}cursore { display: inline-block; width: ${Math.round(testaF * 0.5)}px; height: ${Math.round(testaF * 0.9)}px; margin-left: 6px; background: ${C.crema}; opacity: 0; }
    #${px}prega { position: absolute; left: ${P.pad}px; right: ${P.pad}px; top: 132px; height: 2px; background: ${C.scuro}; transform-origin: 0 50%; }
    .${px}blocco { position: absolute; width: ${bW}px; height: ${bH}px; background: ${C.scuro}; border-radius: 6px; overflow: hidden; opacity: 0; }
    .${px}bbarra { position: absolute; left: 0; top: 0; bottom: 0; width: 10px; background: ${C.accento}; transform-origin: 50% 0; }
    .${px}btipo { position: absolute; font-family: "JetBrains Mono", monospace; font-weight: 500; font-size: 28px; line-height: 1; letter-spacing: 0.14em; text-transform: uppercase; color: ${C.accento}; white-space: nowrap; }
    .${px}bnome { position: absolute; font-family: "JetBrains Mono", monospace; font-weight: 500; font-size: ${nomeF}px; line-height: 1; letter-spacing: -0.01em; color: ${C.crema}; white-space: nowrap; }
    ${righeB ? `.${px}btipo { left: 48px; top: 50%; margin-top: -14px; } .${px}bnome { left: ${48 + tipoW}px; top: 50%; margin-top: -${Math.round(nomeF / 2)}px; }`
    : `.${px}btipo { left: 48px; top: 42px; } .${px}bnome { left: 46px; bottom: 46px; }`}
    #${px}colonna { position: absolute; left: ${g.colX}px; top: ${g.colY}px; width: ${g.colW}px; }
    #${px}occhiello { font-family: "JetBrains Mono", monospace; font-weight: 500; font-size: ${occF}px; line-height: 1.2; margin-bottom: 14px; white-space: pre; color: ${C.crema2}; }
    .${px}occ { display: none; }
    #${px}titolo { font-weight: 500; font-size: ${g.titF}px; line-height: 1; letter-spacing: -0.02em; color: ${C.crema}; white-space: nowrap; opacity: 0; }
    #${px}trega { margin-top: 24px; height: 2px; background: ${C.accento}; transform-origin: 0 50%; }
    .${px}righe { margin-top: 26px; }
    .${px}riga { display: flex; align-items: center; height: ${rowH}px; gap: ${gapR}px; opacity: 0; }
    .${px}spunta { width: ${chk}px; height: ${chk}px; flex: none; }
    .${px}spunta rect { fill: none; stroke: ${C.crema2}; stroke-width: 2; }
    .${px}spunta path { fill: none; stroke: ${C.accento}; stroke-width: 5; stroke-linecap: round; stroke-linejoin: round; stroke-dasharray: 1; stroke-dashoffset: 1; }
    .${px}rtesto { white-space: pre; font-family: "JetBrains Mono", monospace; font-weight: 500; font-size: ${rowF}px; line-height: 1; color: ${C.crema}; }
    .${px}rc { opacity: 0; }
    .${px}alt { margin-top: 30px; display: flex; align-items: center; gap: ${gapA}px; }
    .${px}opz { width: ${optW}px; height: ${optH}px; border: 2px solid ${C.accento}; border-radius: 6px; padding: 24px 26px; box-sizing: border-box;
      display: flex; flex-direction: column; justify-content: ${conNote ? 'space-between' : 'center'}; opacity: 0; }
    .${px}onome { font-family: "JetBrains Mono", monospace; font-weight: 500; font-size: ${optF}px; line-height: 1; white-space: nowrap; color: ${C.crema}; }
    .${px}onota { font-family: "JetBrains Mono", monospace; font-weight: 500; font-size: 28px; line-height: 1; letter-spacing: 0.1em; text-transform: uppercase; white-space: nowrap; color: ${C.accento}; }
    #${px}or { width: ${orW}px; text-align: center; font-weight: 500; font-size: 44px; color: ${C.crema2}; opacity: 0; }`;

    const caratteri = (s, da, cls) => [...s].map((ch, i) => `<span class="${px}${cls}${da != null && i >= da ? ` ${px}car-acc` : ''}">${esc(ch)}</span>`).join('');
    const blocchi = d.blocchi.map((b, i) => {
      const x = righeB || nB === 1 ? 0 : i * (bW + 40);
      const y = righeB ? bY + i * (bH + 24) : bY;
      return `<div id="${px}b${i + 1}" class="${px}blocco" style="left:${P.pad + x}px; top:${y}px"><div id="${px}bb${i + 1}" class="${px}bbarra"></div>${b.tipo ? `<div class="${px}btipo">${esc(b.tipo)}</div>` : ''}<div class="${px}bnome">${esc(b.nome)}</div></div>`;
    }).join('');
    const pannello = conPannello ? `
      <div id="${px}pannello">
        ${conTesta ? `<div class="${px}testa"><span>${caratteri(d.pannello, taglio, 'car')}</span><span id="${px}cursore"></span></div>${nB ? `<div id="${px}prega"></div>` : ''}` : ''}
        ${blocchi}
      </div>` : '';
    const righe = d.righe.map((r, i) => `
          <div id="${px}r${i + 1}" class="${px}riga">
            <svg class="${px}spunta" viewBox="0 0 46 46"><rect x="1" y="1" width="44" height="44" rx="6" /><path id="${px}k${i + 1}" pathLength="1" d="M 11 24 L 20 33 L 36 13" /></svg>
            <span class="${px}rtesto">${caratteri(r, null, `rc ${px}rc${i + 1}`)}</span>
          </div>`).join('');
    const alt = d.alternative.map((a, i) => `${i ? `<div id="${px}or">or</div>` : ''}<div id="${px}o${i + 1}" class="${px}opz"><div class="${px}onome">${esc(a.testo)}</div>${a.nota ? `<div class="${px}onota">${esc(a.nota)}</div>` : conNote ? '<div></div>' : ''}</div>`).join('');
    const corpo = `${pannello}
      <div id="${px}colonna">
        ${occhiello ? `<div id="${px}occhiello">${caratteri(d.pannello, taglio, 'occ')}</div>` : ''}
        <div id="${px}titolo">${esc(d.titolo)}</div>
        <div id="${px}trega"></div>
        <div class="${px}righe">${righe}
        </div>
        ${nA ? `<div class="${px}alt">${alt}</div>` : ''}
      </div>`;

    // ---------- animazione: solo tl.fromTo / tl.set, tutto sulla linea del tempo ----------
    const A = [];
    if (conPannello) {
      A.push(`tl.fromTo(q("#${px}pannello"), { opacity: 0, y: 28, clipPath: "inset(0% 0% 100% 0% round 8px)" }, { opacity: 1, y: 0, clipPath: "inset(0% 0% 0% 0% round 8px)", duration: 0.8, ease: "power3.out" }, 0.1);`);
      if (conTesta) {
        // il cursore: compare, la scritta si compone lettera per lettera, poi lampeggia finché parte la lista
        const n = [...d.pannello].length;
        const inizio = Math.max(0.6, T.pannello + 0.25);
        const fineMax = nB ? T.blocco1 - 0.15 : tLista - 0.3;
        const passo = Math.max(0.03, Math.min(0.09, (fineMax - inizio) / n));
        const fine = inizio + passo * n;
        A.push(`tl.set(q("#${px}cursore"), { opacity: 1 }, ${s3(inizio - 0.25)});`);
        A.push(`(function () { var c = qa(".${px}car"); for (var i = 0; i < c.length; i++) tl.set(c[i], { display: "inline" }, ${s3(inizio)} + i * ${s3(passo)}); })();`);
        A.push(`tl.set(q("#${px}cursore"), { backgroundColor: "${C.accento}" }, ${s3(inizio + passo * taglio)});`);
        const stop = Math.max(fine, tLista);
        for (let x = fine + 0.45, acceso = false; x < stop - 0.05; x += 0.4, acceso = !acceso) A.push(`tl.set(q("#${px}cursore"), { opacity: ${acceso ? 1 : 0} }, ${s3(x)});`);
        A.push(`tl.set(q("#${px}cursore"), { opacity: 0 }, ${s3(stop)});`);
        if (nB) A.push(`tl.fromTo(q("#${px}prega"), { scaleX: 0 }, { scaleX: 1, duration: 0.8, ease: "power2.out" }, ${s3(fine)});`);
      }
      d.blocchi.forEach((_, i) => {
        const b = T[`blocco${i + 1}`];
        A.push(`tl.fromTo(q("#${px}b${i + 1}"), { opacity: 0, y: 46 }, { opacity: 1, y: 0, duration: 0.75, ease: "power3.out" }, ${s3(b)});`);
        A.push(`tl.fromTo(q("#${px}bb${i + 1}"), { scaleY: 0 }, { scaleY: 1, duration: 0.55, ease: "power2.out" }, ${s3(b + 0.2)});`);
      });
      // la lista prende la scena: il pannello si sfoca un poco
      A.push(`tl.fromTo(q("#${px}pannello"), { filter: "blur(0px)" }, { filter: "blur(2.5px)", opacity: 0.6, duration: 0.9, ease: "power2.inOut", immediateRender: false }, ${s3(tLista + 0.2)});`);
    }
    if (occhiello) {
      // l'occhiello si scrive lettera per lettera quando la voce lo nomina (o all'inizio)
      const n = [...d.pannello].length;
      const inizio = Math.max(0.3, T.pannello);
      const passo = Math.max(0.03, Math.min(0.06, (tLista - 0.15 - inizio) / n));
      A.push(`(function () { var c = qa(".${px}occ"); for (var i = 0; i < c.length; i++) tl.set(c[i], { display: "inline" }, ${s3(inizio)} + i * ${s3(passo)}); })();`);
    }
    A.push(`tl.fromTo(q("#${px}titolo"), { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.7, ease: "power3.out" }, ${s3(tLista)});`);
    A.push(`tl.fromTo(q("#${px}trega"), { scaleX: 0 }, { scaleX: 1, duration: 0.7, ease: "power2.out" }, ${s3(tLista + 0.3)});`);
    d.righe.forEach((r, i) => {
      const x = T[`riga${i + 1}`];
      const passo = 0.045;
      A.push(`tl.fromTo(q("#${px}r${i + 1}"), { opacity: 0, x: 24 }, { opacity: 1, x: 0, duration: 0.4, ease: "power2.out" }, ${s3(x)});`);
      A.push(`(function () { var c = qa(".${px}rc${i + 1}"); for (var i = 0; i < c.length; i++) tl.set(c[i], { opacity: 1 }, ${s3(x + 0.08)} + i * ${passo}); })();`);
      A.push(`tl.fromTo(q("#${px}k${i + 1}"), { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.45, ease: "power2.out" }, ${s3(x + 0.22)});`);
    });
    d.alternative.forEach((_, i) => {
      const a = T[`alternativa${i + 1}`];
      A.push(`tl.fromTo(q("#${px}o${i + 1}"), { opacity: 0, y: 34 }, { opacity: 1, y: 0, duration: 0.65, ease: "power3.out" }, ${s3(a)});`);
      if (i === 1) A.push(`tl.fromTo(q("#${px}or"), { opacity: 0 }, { opacity: 1, duration: 0.4, ease: "power1.out" }, ${s3(Math.max(T.alternativa1 + 0.3, a - 0.45))});`);
    });

    return scena({ id, px, durata, etichetta, numero, css, corpo, anima: A.join('\n      ') });
  },
};
