// Stampo «confronto»: due schede che entrano dai lati opposti, leggermente inclinate (aperto/chiuso, prima/dopo, A/B),
// e una striscia di conclusione in basso con le parole in evidenza. Dal quadro 5 della prova DeepInfer (24/10/2026).
// Con destra.chiuso la scheda destra è scura, col lucchetto che si disegna e le voci spente e barrate;
// senza, le due schede sono pari (A contro B) con un «vs» fra le due.
import { C, scena, s3, esc, misura, attacchi, attacco } from '../base.mjs';

const MAX_TITOLO = 16, MAX_VOCE = 28, MAX_CONCLUSIONE = 70;

// il pezzo di conclusione prima dell'evidenza (o le prime parole): la voce lo dice per primo
const testaConclusione = (c, ev) => {
  const i = ev ? c.toLowerCase().indexOf(ev.toLowerCase()) : -1;
  const testa = i > 0 ? c.slice(0, i) : c;
  return testa.split(/\s+/).filter(Boolean).slice(0, 5).join(' ');
};
// il titolo si aggancia alla sua PRIMA parola («Closed training» → «Closed»): la più lunga («training») può tornare
// nella conclusione e far saltare le parole che seguono
const titolo = (dati, chiave, testo) => {
  const prima = String(testo ?? '').split(/\s+/).map((w) => w.replace(/[^\w.%-]/g, '')).find((w) => w.length >= 2);
  const parola = dati?.quando?.[chiave] || prima;
  return parola ? [{ chiave, parola }] : [];
};
const voci = (lato) => (Array.isArray(lato?.voci) ? lato.voci : []);

export default {
  nome: 'confronto',
  descrizione: 'two side-by-side cards: open vs closed, before vs after, A vs B; optional one-line conclusion below',
  schema: '{ "sinistra": { "titolo": "Open, max 16", "voci": ["max 28 chars each, 1-4"] }, "destra": { "titolo": "Closed, max 16", "voci": ["max 28 chars each, 1-4"], "chiuso": true }, "conclusione": "optional, max 70", "evidenza": "optional, words copied exactly from conclusione to color" }',
  valida(dati) {
    const p = [];
    for (const lato of ['sinistra', 'destra']) {
      const l = dati?.[lato];
      if (!l || typeof l !== 'object') { p.push(`${lato}: manca`); continue; }
      const tit = typeof l.titolo === 'string' ? l.titolo.trim() : '';
      if (!tit) p.push(`${lato}.titolo: manca`);
      else if (tit.length > MAX_TITOLO) p.push(`${lato}.titolo: ${tit.length} caratteri (max ${MAX_TITOLO})`);
      if (!Array.isArray(l.voci) || l.voci.length < 1 || l.voci.length > 4) p.push(`${lato}.voci: servono da 1 a 4 voci`);
      else l.voci.forEach((v, i) => {
        if (typeof v !== 'string' || !v.trim()) p.push(`${lato}.voci[${i}]: vuota o non testo`);
        else if (v.trim().length > MAX_VOCE) p.push(`${lato}.voci[${i}]: ${v.trim().length} caratteri (max ${MAX_VOCE})`);
      });
    }
    if (dati?.destra && dati.destra.chiuso != null && typeof dati.destra.chiuso !== 'boolean') p.push('destra.chiuso: deve essere true o false');
    const c = dati?.conclusione;
    if (c != null && c !== '') {
      if (typeof c !== 'string' || !c.trim()) p.push('conclusione: non è un testo');
      else if (c.trim().length > MAX_CONCLUSIONE) p.push(`conclusione: ${c.trim().length} caratteri (max ${MAX_CONCLUSIONE})`);
    }
    const ev = dati?.evidenza;
    if (ev != null && ev !== '') {
      if (typeof ev !== 'string' || !ev.trim()) p.push('evidenza: non è un testo');
      else if (typeof c !== 'string' || !c.trim()) p.push('evidenza: senza conclusione');
      else if (!c.toLowerCase().includes(ev.trim().toLowerCase())) p.push(`evidenza: «${ev}» non è nella conclusione`);
      else if (ev.trim().length >= c.trim().length) p.push('evidenza: è tutta la conclusione');
    }
    return p;
  },
  // ordine: per ogni lato prima le voci e poi il titolo. La voce può nominare il titolo prima («Before: ...») o dopo
  // le voci («parts of KV cache and load balancing stay closed»): cercando il titolo dopo le voci, una parola del titolo
  // detta tardi non fa saltare le voci; la scheda entra comunque al primo dei due (vedi html)
  parole(dati) {
    const sx = dati?.sinistra || {}, dx = dati?.destra || {};
    const c = typeof dati?.conclusione === 'string' ? dati.conclusione.trim() : '';
    const ev = c && typeof dati?.evidenza === 'string' ? dati.evidenza.trim() : '';
    return [
      ...attacchi(dati, voci(sx).map((v, i) => [`sx${i}`, v])),
      ...titolo(dati, 'sx', sx.titolo),
      ...attacchi(dati, voci(dx).map((v, i) => [`dx${i}`, v])),
      ...titolo(dati, 'dx', dx.titolo),
      ...(c ? [{ chiave: 'conclusione', parola: dati?.quando?.conclusione || attacco({}, 'conclusione', testaConclusione(c, ev)) }] : []),
      ...attacchi(dati, [['evidenza', ev]]),
    ].filter((x) => x.parola);
  },
  html({ id, px, dati, durata, t, etichetta, numero }) {
    const sx = dati.sinistra, dx = dati.destra;
    const chiuso = dx.chiuso === true;
    const vs = voci(sx).map((v) => String(v).trim()), vd = voci(dx).map((v) => String(v).trim());
    const conc = typeof dati.conclusione === 'string' ? dati.conclusione.trim() : '';
    const ev = conc && typeof dati.evidenza === 'string' ? dati.evidenza.trim() : '';
    const fine = durata - 0.6;
    const trovato = (k) => { const x = t(k, -1); return x >= 0 ? x : null; };

    // ---- tempi: le parole trovate comandano; quelle mancanti si distribuiscono fra le vicine trovate
    const riempi = (arr, da, a, passo = 0.45) => {
      const out = arr.slice();
      for (let i = 0; i < out.length;) {
        if (out[i] != null) { i++; continue; }
        let k = i; while (k < out.length && out[k] == null) k++;
        const prima = i > 0 ? out[i - 1] : da;
        const dopo = k < out.length ? out[k] : Math.min(a, prima + passo * (k - i + 1));
        for (let m = i; m < k; m++) out[m] = prima + ((dopo - prima) * (m - i + 1)) / (k - i + 1);
        i = k;
      }
      // mai prima della voce precedente
      for (let i = 1; i < out.length; i++) out[i] = Math.max(out[i], out[i - 1] + 0.12);
      return out;
    };
    const fSx = vs.map((_, i) => trovato(`sx${i}`)), fDx = vd.map((_, i) => trovato(`dx${i}`));
    const fTitSx = trovato('sx'), fTitDx = trovato('dx'), fConc = trovato('conclusione'), fEv = trovato('evidenza');
    const minimo = (...xs) => { const v = xs.filter((x) => x != null); return v.length ? Math.min(...v) : null; };

    // titolo non trovato dopo le voci = probabilmente detto prima di esse («After the update, it boots...»):
    // la scheda entra un secondo prima della prima voce; trovato dopo = la scheda entra appena prima della prima voce
    const anticipo = (tit) => (tit == null ? 1.0 : 0.4);
    const cardSx = Math.max(0.1, minimo(fTitSx, fSx[0] != null ? fSx[0] - anticipo(fTitSx) : null) ?? 0.15);
    const primoDx = minimo(fTitDx, fDx[0] != null ? Math.max(fDx[0] - anticipo(fTitDx), Math.max(cardSx, ...fSx.filter((x) => x != null)) + 0.3) : null);
    const ultimoSxNoto = Math.max(cardSx, ...fSx.filter((x) => x != null));
    const cardDx = Math.min(fine - 1, Math.max(cardSx + 0.35, primoDx ?? Math.max(ultimoSxNoto + 0.4 * (vs.length + 1), durata * 0.3)));
    const tSx = riempi(fSx.map((x) => (x == null ? null : Math.max(x, cardSx + 0.35))), cardSx + 0.25, cardDx - 0.1, 0.4);
    const tDx = riempi(fDx.map((x) => (x == null ? null : Math.max(x, cardDx + 0.35))), cardDx + 0.25, fine - 0.5, 0.5);
    const ultimaVoce = Math.max(...tSx, ...tDx);
    const strip = conc ? Math.min(fine - 0.4, Math.max(ultimaVoce + 0.5, minimo(fConc, fEv != null ? fEv - 0.9 : null) ?? Math.max(ultimaVoce + 1, durata * 0.65))) : null;
    const regola = ev ? Math.min(fine, Math.max(strip + 0.6, fEv ?? strip + 0.9)) : null;
    const lucchetto = cardDx + 0.45;
    const scatto = Math.min(fine, Math.max(lucchetto + 1.2, fTitDx ?? (tDx[tDx.length - 1] + 1.0)));

    // ---- misure (decise qui): schede 760 di larghezza; con la conclusione y 170-600, senza 170-800
    const ST_TOP = 170, ST_W = 1640, CW = 760, ALTA = conc ? 430 : 630;
    const TESTA = conc ? 104 : 124;
    const n = Math.max(vs.length, vd.length);
    const lunga = [...vs, ...vd].reduce((a, b) => (b.length > a.length ? b : a), '');
    const spazioRiga = (ALTA - TESTA - 60) / n; // altezza per voce
    const fVoce = Math.min(misura(lunga, { larghezza: CW - 88 - 40 - 24, max: conc ? 50 : 60, min: 40, fattore: 0.54 }), Math.floor(spazioRiga / 1.3));
    const titoloLungo = [sx.titolo, dx.titolo].reduce((a, b) => (String(b).length > String(a).length ? b : a), '');
    const fTitolo = misura(titoloLungo, { larghezza: CW - 88 - 90, max: conc ? 58 : 66, min: 40, fattore: 0.55 });
    const fCs = conc ? misura(conc, { larghezza: ST_W - 120, max: 52, min: 34, fattore: 0.52 }) : 0;

    const css = `
    #${px}palco3d { position: absolute; left: ${(1920 - ST_W) / 2}px; top: ${ST_TOP}px; width: ${ST_W}px; height: ${ALTA}px; display: flex; justify-content: space-between;
      perspective: 1800px; perspective-origin: 50% 50%; }
    .${px}card { position: relative; width: ${CW}px; height: ${ALTA}px; box-sizing: border-box; border: 2.5px solid ${C.accento}; border-radius: 8px; overflow: hidden;
      background: ${C.pannello}; }
    #${px}card-sx { transform-origin: right center; }
    #${px}card-dx { transform-origin: left center; }
    .${px}chiusa { background: ${C.scuro}; border-color: ${C.crema2}; }
    .${px}testa { height: ${TESTA}px; box-sizing: border-box; padding: 0 44px; display: flex; align-items: center; justify-content: space-between;
      background: ${C.accento}; color: ${C.inchiostro}; }
    .${px}chiusa .${px}testa { background: ${C.crema2}; }
    .${px}titolo { font-size: ${fTitolo}px; font-weight: 500; line-height: 1; letter-spacing: -0.01em; white-space: nowrap; }
    .${px}lucchetto { width: 56px; height: 66px; overflow: visible; flex: none; }
    .${px}lucchetto path, .${px}lucchetto rect { fill: none; stroke: ${C.scuro}; stroke-width: 6; stroke-linecap: round; stroke-linejoin: round;
      stroke-dasharray: 1; stroke-dashoffset: 1; }
    .${px}lista { position: absolute; left: 44px; right: 40px; top: ${TESTA}px; bottom: 0; display: flex; flex-direction: column; justify-content: space-evenly;
      padding: 14px 0 22px; box-sizing: border-box; }
    .${px}voce { display: flex; align-items: center; gap: 24px; font-size: ${fVoce}px; font-weight: 500; line-height: 1.12; letter-spacing: -0.01em;
      color: ${C.crema}; white-space: nowrap; opacity: 0; }
    .${px}chiusa .${px}voce { color: ${C.crema2}; }
    .${px}punto { width: 16px; height: 16px; border-radius: 3px; background: ${C.accento}; flex: none; }
    .${px}chiusa .${px}punto { background: ${C.crema2}; }
    .${px}barrabile { position: relative; display: inline-block; }
    .${px}barra-voce { position: absolute; left: -6px; right: -6px; top: 54%; height: 3px; background: ${C.crema}; transform-origin: left center; transform: scaleX(0); }
    #${px}vs { position: absolute; left: 50%; top: 50%; width: 92px; height: 92px; margin: -46px 0 0 -46px; border-radius: 50%; box-sizing: border-box;
      border: 2px solid ${C.accento}; background: ${C.scuro}; display: flex; align-items: center; justify-content: center;
      font-family: "JetBrains Mono", monospace; font-weight: 500; font-size: 30px; letter-spacing: 0.06em; color: ${C.accento}; opacity: 0; }
    #${px}striscia { position: absolute; left: ${(1920 - ST_W) / 2}px; width: ${ST_W}px; top: 650px; height: 140px; box-sizing: border-box; padding: 0 60px;
      display: flex; align-items: center; background: ${C.scuro}; border: 2px solid ${C.pannello}; border-radius: 6px; overflow: hidden; opacity: 0; }
    #${px}testo-c { font-size: ${fCs}px; font-weight: 400; line-height: 1.2; color: ${C.crema}; white-space: nowrap; }
    .${px}accento { position: relative; display: inline-block; color: ${C.accento}; }
    #${px}regola { position: absolute; left: 0; right: 0; bottom: -4px; height: 3px; background: ${C.accento}; transform-origin: left center; transform: scaleX(0); }`;

    const lista = (arr, lato, barra) => arr.map((v, i) => barra
      ? `<div class="${px}voce" id="${px}${lato}${i}"><span class="${px}punto" id="${px}${lato}${i}p"></span><span class="${px}barrabile"><span id="${px}${lato}${i}t">${esc(v)}</span><span class="${px}barra-voce" id="${px}${lato}${i}b"></span></span></div>`
      : `<div class="${px}voce" id="${px}${lato}${i}"><span class="${px}punto"></span><span>${esc(v)}</span></div>`).join('');
    const lucchettoSvg = chiuso ? `<svg class="${px}lucchetto" viewBox="0 0 64 76" xmlns="http://www.w3.org/2000/svg">
            <g id="${px}arco-g"><path id="${px}arco" pathLength="1" d="M 16 34 L 16 22 A 16 16 0 0 1 48 22 L 48 34" /></g>
            <rect id="${px}corpo-l" pathLength="1" x="6" y="34" width="52" height="38" rx="6" />
            <path id="${px}buco" pathLength="1" d="M 32 48 L 32 58" /></svg>` : '';
    let testoC = '';
    if (conc) {
      const i = ev ? conc.toLowerCase().indexOf(ev.toLowerCase()) : -1;
      testoC = i < 0 ? esc(conc)
        : `${esc(conc.slice(0, i))}<span class="${px}accento">${esc(conc.slice(i, i + ev.length))}<span id="${px}regola"></span></span>${esc(conc.slice(i + ev.length))}`;
    }
    const corpo = `
      <div id="${px}palco3d">
        <div class="${px}card" id="${px}card-sx">
          <div class="${px}testa"><span class="${px}titolo">${esc(String(sx.titolo).trim())}</span></div>
          <div class="${px}lista">${lista(vs, 'sx', false)}</div>
        </div>
        <div class="${px}card${chiuso ? ` ${px}chiusa` : ''}" id="${px}card-dx">
          <div class="${px}testa"><span class="${px}titolo">${esc(String(dx.titolo).trim())}</span>${lucchettoSvg}</div>
          <div class="${px}lista">${lista(vd, 'dx', chiuso)}</div>
        </div>
        ${chiuso ? '' : `<div id="${px}vs">vs</div>`}
      </div>
      ${conc ? `<div id="${px}striscia"><span id="${px}testo-c">${testoC}</span></div>` : ''}`;

    const TILT = 7, OLTRE = 6;
    const righe = [
      `tl.fromTo(q("#${px}card-sx"), { x: -360, rotationY: ${TILT + OLTRE}, scale: 0.88, opacity: 0 }, { x: 0, rotationY: ${TILT}, scale: 1, opacity: 1, duration: 0.95, ease: "power3.out" }, ${s3(cardSx)});`,
      `tl.fromTo(q("#${px}card-dx"), { x: 360, rotationY: ${-TILT - OLTRE}, scale: 0.88, opacity: 0 }, { x: 0, rotationY: ${-TILT}, scale: 1, opacity: 1, duration: 0.95, ease: "power3.out" }, ${s3(cardDx)});`,
      ...tSx.map((x, i) => `tl.fromTo(q("#${px}sx${i}"), { opacity: 0, x: -24 }, { opacity: 1, x: 0, duration: 0.45, ease: "power2.out" }, ${s3(x)});`),
      ...tDx.map((x, i) => `tl.fromTo(q("#${px}dx${i}"), { opacity: 0, x: 24 }, { opacity: 1, x: 0, duration: 0.45, ease: "power2.out" }, ${s3(x)});`),
    ];
    if (chiuso) {
      righe.push(
        `tl.fromTo(q("#${px}arco"), { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.55, ease: "power2.out" }, ${s3(lucchetto)});`,
        `tl.fromTo(q("#${px}corpo-l"), { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.6, ease: "power2.out" }, ${s3(lucchetto + 0.4)});`,
        `tl.fromTo(q("#${px}buco"), { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.3, ease: "power2.out" }, ${s3(lucchetto + 0.85)});`,
        `tl.fromTo(q("#${px}arco-g"), { y: -6 }, { y: 0, duration: 0.25, ease: "power2.in" }, ${s3(scatto)});`,
        ...tDx.flatMap((x, i) => [
          `tl.fromTo(q("#${px}dx${i}b"), { scaleX: 0 }, { scaleX: 1, duration: 0.4, ease: "power2.out" }, ${s3(Math.min(fine, x + 0.55))});`,
          `tl.fromTo([q("#${px}dx${i}t"), q("#${px}dx${i}p")], { opacity: 1 }, { opacity: 0.55, duration: 0.45, ease: "power1.out" }, ${s3(Math.min(fine, x + 0.6))});`,
        ]),
      );
    } else {
      righe.push(`tl.fromTo(q("#${px}vs"), { opacity: 0, scale: 0.7 }, { opacity: 1, scale: 1, duration: 0.5, ease: "power3.out" }, ${s3(cardDx + 0.3)});`);
    }
    if (conc) {
      righe.push(
        `tl.fromTo(q("#${px}striscia"), { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.6, ease: "power3.out" }, ${s3(strip)});`,
        `tl.fromTo(q("#${px}testo-c"), { opacity: 0, x: -20 }, { opacity: 1, x: 0, duration: 0.5, ease: "power2.out" }, ${s3(strip + 0.2)});`,
      );
      if (ev) righe.push(`tl.fromTo(q("#${px}regola"), { scaleX: 0 }, { scaleX: 1, duration: 0.45, ease: "power2.out" }, ${s3(regola)});`);
    }
    return scena({ id, px, durata, etichetta, numero, css, corpo, anima: righe.join('\n      ') });
  },
};
