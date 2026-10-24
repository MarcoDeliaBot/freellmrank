// Stampo «barre»: grafico a barre orizzontali (24/10/2026, CONTRATTO.md «Lo stampo `barre`»). Serve per la classifica della
// settimana (punti Arena, scala da 1400, linea tratteggiata del miglior modello a pagamento), per la memoria che serve a un
// modello sulle schede video (GB, segno ✓/✕ = entra o no) e per la velocità su una scheda (tok/s).
// Ogni riga: nome (mono) a sinistra, eventuale nota in crema2, eventuale segno; la barra cresce dall'inizio della scala quando
// la voce nomina la riga (una dopo l'altra), il testo del valore viaggia con la sua punta. La riga «evidenza» è in accento.
// Due formati: orizzontale (nome a sinistra della barra) e verticale (nome sopra la barra; con molte righe, nome a sinistra
// in righe compatte). Tutte le misure si decidono qui con impagina(), che valida() prova in entrambi i formati: se una cosa
// non entra in uno dei due, valida() la rifiuta.
import { C, scena, s3, esc, misura, attacchi, formatoDi } from '../base.mjs';

const MONO = 0.6; // JetBrains Mono: ogni carattere 0.6 em
const SERIF = 0.55; // Source Serif 4, media prudente per testi misti
const CIFRE = 0.6; // valore a destra della barra (serif, cifre tabulari, unità comprese), prudente
const ETICHETTA = 0.65; // etichette della scala e del riferimento: mono con letter-spacing 0.04em
const LIM = { titolo: 40, sotto: 50, nome: 28, testo: 12, nota: 34 };
const NUMERO = /^-?\d+(\.\d+)?$/;

const pulito = (v) => (v == null ? '' : String(v).trim());
const numeroDi = (v) => (typeof v === 'number' ? v : typeof v === 'string' && NUMERO.test(v.trim()) ? Number(v.trim()) : NaN);
const testoDi = (v) => pulito(v.testo) || String(numeroDi(v.valore));
const segnoDi = (v) => (v.segno === 'si' || v.segno === 'no' ? v.segno : '');
const daDi = (dati) => (dati.scala && dati.scala.da != null ? numeroDi(dati.scala.da) : 0);
const rifDi = (dati) => (dati.riferimento && typeof dati.riferimento === 'object' && pulito(dati.riferimento.nome) ? dati.riferimento : null);
const etichettaRif = (r) => `${pulito(r.nome)} · ${pulito(r.testo) || String(numeroDi(r.valore))}`;
const larg = (s, f, fattore) => String(s).length * f * fattore;
const maxLarg = (testi, f, fattore) => Math.max(0, ...testi.map((s) => larg(s, f, fattore)));
const r = Math.round;

// l'impaginazione completa (posizioni e dimensioni in px) o { problemi }
function impagina(dati, formato, dueEtichette = false) {
  const vert = formato === 'verticale';
  const { W, margine: M } = formatoDi(formato);
  const largo = W - 2 * M;
  const fondo = vert ? 1176 : 852;
  const voci = dati.voci;
  const n = voci.length;
  const nomi = voci.map((v) => pulito(v.nome));
  const note = voci.map((v) => pulito(v.nota));
  const testi = voci.map(testoDi);
  const segni = voci.map(segnoDi);
  const haNota = note.some(Boolean);
  const haSegno = segni.some(Boolean);
  const da = daDi(dati);
  const rif = rifDi(dati);

  // testa: titolo (in verticale anche su due righe) e riga piccola
  // verticale con più di 6 righe: testa più bassa e spazi più stretti, perché 10 righe (anche con le note) entrino
  const compatto = vert && n > 6;
  const titolo = pulito(dati.titolo);
  let fT = misura(titolo, { larghezza: largo, max: compatto ? 52 : n > 6 ? 60 : 72, min: 40, fattore: SERIF });
  let righeT = 1;
  if (vert && fT < 48) { fT = misura(titolo, { larghezza: largo * 0.8, righe: 2, max: compatto ? 48 : 68, min: 44, fattore: SERIF }); righeT = 2; }
  const lhT = r(fT * 1.1);
  const yT = vert ? 164 : 138;
  let y = yT + righeT * lhT;
  const sotto = pulito(dati.sotto);
  const fS = vert ? 38 : 28;
  const lhS = r(fS * 1.25);
  const righeS = sotto ? (larg(sotto, fS, 0.62) > largo ? 2 : 1) : 0;
  const yS = y + 8;
  if (sotto) y = yS + righeS * lhS;
  y += compatto ? 20 : vert ? 36 : 28;
  const testaFine = y;

  // riga delle etichette sopra le barre: inizio della scala (se non è 0) e riferimento
  const fL = vert ? 36 : 28;
  const lhL = r(fL * 1.2);
  const nL = rif || da !== 0 ? (dueEtichette ? 2 : 1) : 0;
  const etichetteH = nL ? nL * lhL + (nL - 1) * 4 + (compatto ? 6 : 12) : 0;
  const h = (fondo - testaFine - etichetteH) / n;

  const segW = (f) => (haSegno ? r(f * 0.8) + 14 : 0);

  // verticale, righe alte: nome sopra la barra, barra larga quanto lo schermo
  function pila() {
    for (let s = 1.25; s >= 0.7; s -= 0.025) {
      const fN = Math.min(56, r(46 * s)), fNota = Math.max(36, r(38 * s)), fV = Math.max(40, r(46 * s)), b = r(44 * s), gap = r(22 * s), inner = r(8 * s);
      if (fN < 40) break;
      const lhN = r(fN * 1.12), lhNota = haNota ? r(fNota * 1.15) : 0, lhV = r(fV * 1.1), lineC = Math.max(b, lhV);
      const alta = lhN + lhNota + inner + lineC + gap;
      if (alta > h) continue;
      if (segW(fN) + maxLarg(nomi, fN, MONO) > largo) continue;
      if (haNota && maxLarg(note, fNota, SERIF) > largo) continue;
      const barL = r(largo - maxLarg(testi, fV, CIFRE) - 20);
      if (barL < 420) continue;
      return { modo: 'pila', nota: haNota ? 'sotto' : '', fN, fNota, fV, b, lhN, lhNota, lhV, lineC, inner, rowH: Math.min(h, alta + 14), segW: segW(fN), asseX: M, barL };
    }
    return null;
  }
  // nome a sinistra della barra (sempre in orizzontale; in verticale con molte righe)
  function lato() {
    const minF = vert ? 36 : 28, maxF = vert ? 44 : 46;
    const colMax = vert ? largo * 0.5 : largo * 0.45;
    const barMin = vert ? 300 : 560;
    for (let fN = maxF; fN >= minF; fN--) {
      for (const nota of haNota ? ['sotto', 'linea'] : ['']) {
        const fNota = nota ? Math.max(minF, r(fN * 0.82)) : 0;
        const lhN = r(fN * (nota === 'sotto' ? (compatto ? 1.0 : 1.08) : 1.15));
        const lhNota = nota === 'sotto' ? r(fNota * (compatto ? 1.0 : 1.1)) : 0;
        const contenuto = lhN + (nota === 'sotto' ? lhNota + 4 : 0);
        const gapMin = nota === 'sotto' ? 2 : vert ? 12 : 10;
        if (contenuto + gapMin > h) continue;
        const sw = segW(fN);
        const nw = nomi.map((x) => larg(x, fN, MONO));
        const tw = note.map((x) => (x ? larg(x, fNota, SERIF) : 0));
        const colW = r(nota === 'linea' ? Math.max(...nw.map((w, i) => sw + w + (tw[i] ? 20 + tw[i] : 0))) : sw + Math.max(...nw, ...tw));
        if (colW > colMax) continue;
        const fV = r(fN * 1.05);
        const lhV = r(fV * 1.15);
        const asseX = M + colW + (vert ? 24 : 36);
        const barL = r(W - M - maxLarg(testi, fV, CIFRE) - 18 - asseX);
        if (barL < barMin) continue;
        const rowH = Math.min(h, vert ? 130 : 112);
        const b = r(Math.min(rowH * (nota === 'sotto' ? 0.5 : 0.6), fN * 1.25));
        return { modo: 'lato', nota, fN, fNota, fV, b, lhN, lhNota, lhV, contenuto, rowH, segW: sw, asseX, barL };
      }
    }
    return null;
  }

  const g = (vert && pila()) || lato();
  if (!g) {
    return { problemi: [`${vert ? 'verticale' : 'orizzontale'}: ${n} righe${haNota ? ' con le note' : ''}${sotto ? ' e la riga «sotto»' : ''} non entrano (nomi o note troppo lunghi, o troppe righe)`] };
  }

  // blocco (etichette + righe) centrato nello spazio sotto la testa
  const righeH = n * g.rowH;
  const libero = Math.max(0, fondo - testaFine - etichetteH - righeH);
  const bloccoY = r(testaFine + libero * (vert ? 0.4 : 0.5));
  const righeY = bloccoY + etichetteH;
  const valori = voci.map((v) => numeroDi(v.valore));
  const alto = Math.max(...valori, rif ? numeroDi(rif.valore) : -Infinity);
  const quota = (v) => (alto > da ? (v - da) / (alto - da) : 1);
  const lunghe = valori.map((v) => Math.max(6, r(quota(v) * g.barL)));

  // etichette: inizio scala a sinistra dell'asse, riferimento centrato sulla sua linea (dentro i margini)
  const scalaTesto = da !== 0 ? `from ${da}` : '';
  const scalaW = scalaTesto ? larg(scalaTesto, fL, ETICHETTA) : 0;
  let rifX = 0, rifTesto = '', rifLX = 0, rifW = 0;
  if (rif) {
    rifX = g.asseX + r(quota(numeroDi(rif.valore)) * g.barL);
    rifTesto = etichettaRif(rif);
    rifW = larg(rifTesto, fL, ETICHETTA);
    if (rifW > largo) return { problemi: [`${vert ? 'verticale' : 'orizzontale'}: l'etichetta del riferimento («${rifTesto}») è troppo lunga, accorciare nome o testo`] };
    rifLX = r(Math.max(M, Math.min(W - M - rifW, rifX - rifW / 2)));
    if (scalaTesto && !dueEtichette && rifLX < g.asseX + scalaW + 28 && rifLX + rifW > g.asseX - 28) return impagina(dati, formato, true);
  }
  return {
    ...g, vert, W, M, n, fT, lhT, yT, righeT, fS, lhS, yS, righeS, fL, lhL, bloccoY, righeY, righeH, etichetteH,
    lunghe, scalaTesto, rifX, rifTesto, rifLX, dueEtichette, nomi, note, testi, segni, haSegno,
  };
}

function testoCampo(p, nome, v, max, obbligatorio) {
  if (v == null || (typeof v === 'string' && !v.trim())) { if (obbligatorio) p.push(`${nome}: manca`); return; }
  if (typeof v !== 'string' && typeof v !== 'number') { p.push(`${nome}: deve essere un testo`); return; }
  const s = String(v);
  if (/[\r\n\t]/.test(s)) p.push(`${nome}: niente a capo`);
  if (s.trim().length > max) p.push(`${nome}: ${s.trim().length} caratteri, massimo ${max}`);
}

const SPUNTA = (f, colore) => `<svg width="${f}" height="${f}" viewBox="0 0 24 24" fill="none"><path d="M4 12.5 L9.5 18 L20 6.5" stroke="${colore}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const CROCE = (f, colore) => `<svg width="${f}" height="${f}" viewBox="0 0 24 24" fill="none"><path d="M6 6 L18 18 M18 6 L6 18" stroke="${colore}" stroke-width="3" stroke-linecap="round"/></svg>`;

export default {
  nome: 'barre',
  descrizione: 'horizontal bar chart of 2-10 items with one number each: weekly ranking of free models by Arena points (scala.da 1400, riferimento = best paid model as a dashed line), memory a model needs vs graphics cards (GB, segno si/no = fits or not), speed on one card (tok/s); the voice names the title, then the items in order',
  schema: '{ "titolo": "max 40", "sotto": "optional small line, max 50", "voci": [{ "nome": "max 28", "valore": 1491, "testo": "shown at the bar end, e.g. 1491 or 6 GB or 49 tok/s, max 12", "nota": "optional, max 34", "segno": "si|no|" }] (2-10 voci; valore is a number), "riferimento": { "nome": "max 28", "valore": 1532, "testo": "max 12" } (optional: dashed line, e.g. the best paid model), "scala": { "da": 1400 } (optional: where the axis starts, below every valore; without it, 0), "evidenza": 0 (optional: index of the highlighted voce) }',

  // formato: 'orizzontale' o 'verticale' per provare l'impaginazione solo in quello; senza, in entrambi
  valida(dati, formato) {
    const p = [];
    if (!dati || typeof dati !== 'object' || Array.isArray(dati)) return ['dati: deve essere un oggetto'];
    if (formato !== undefined && formato !== 'orizzontale' && formato !== 'verticale') return [`formato sconosciuto «${formato}» (orizzontale o verticale)`];
    testoCampo(p, 'titolo', dati.titolo, LIM.titolo, true);
    testoCampo(p, 'sotto', dati.sotto, LIM.sotto, false);
    if (dati.quando != null && (typeof dati.quando !== 'object' || Array.isArray(dati.quando))) p.push('quando: deve essere un oggetto');
    const voci = dati.voci;
    if (!Array.isArray(voci) || voci.length < 2 || voci.length > 10) {
      p.push(`voci: ne servono da 2 a 10 (ricevute ${Array.isArray(voci) ? voci.length : 'nessuna'})`);
      return p;
    }
    let da = 0;
    if (dati.scala != null) {
      if (typeof dati.scala !== 'object' || Array.isArray(dati.scala)) p.push('scala: deve essere un oggetto { da }');
      else if (dati.scala.da != null) {
        da = numeroDi(dati.scala.da);
        if (!Number.isFinite(da)) { p.push('scala.da: deve essere un numero'); da = 0; }
      }
    }
    voci.forEach((v, i) => {
      const n = `voci[${i}]`;
      if (!v || typeof v !== 'object' || Array.isArray(v)) { p.push(`${n}: deve essere un oggetto`); return; }
      testoCampo(p, `${n}.nome`, v.nome, LIM.nome, true);
      testoCampo(p, `${n}.testo`, v.testo, LIM.testo, false);
      testoCampo(p, `${n}.nota`, v.nota, LIM.nota, false);
      const x = numeroDi(v.valore);
      if (!Number.isFinite(x)) p.push(`${n}.valore: deve essere un numero`);
      else if (!(x > da)) p.push(`${n}.valore: ${x} non è sopra l'inizio della scala (${da})`);
      else if (v.testo == null && String(x).length > LIM.testo) p.push(`${n}.valore: troppe cifre senza «testo»`);
      if (v.segno != null && !['si', 'no', ''].includes(v.segno)) p.push(`${n}.segno: «si», «no» o vuoto`);
    });
    if (dati.riferimento != null) {
      const rf = dati.riferimento;
      if (!rf || typeof rf !== 'object' || Array.isArray(rf)) p.push('riferimento: deve essere un oggetto');
      else {
        testoCampo(p, 'riferimento.nome', rf.nome, LIM.nome, true);
        testoCampo(p, 'riferimento.testo', rf.testo, LIM.testo, false);
        const x = numeroDi(rf.valore);
        if (!Number.isFinite(x)) p.push('riferimento.valore: deve essere un numero');
        else if (!(x > da)) p.push(`riferimento.valore: ${x} non è sopra l'inizio della scala (${da})`);
      }
    }
    if (dati.evidenza != null && !(Number.isInteger(dati.evidenza) && dati.evidenza >= 0 && dati.evidenza < voci.length)) {
      p.push(`evidenza: indice di una voce (da 0 a ${voci.length - 1})`);
    }
    if (p.length) return p;
    // entra nei due formati?
    for (const f of formato ? [formato] : ['orizzontale', 'verticale']) p.push(...(impagina(dati, f).problemi || []));
    return p;
  },

  // titolo, poi le voci nell'ordine (attacco: il nome), poi il riferimento. dati.quando = { titolo, v1..v10, riferimento }
  parole(dati) {
    const voci = Array.isArray(dati.voci) ? dati.voci : [];
    const rf = rifDi(dati);
    return attacchi(dati, [['titolo', dati.titolo], ...voci.map((v, i) => [`v${i + 1}`, pulito(v?.nome)]), ['riferimento', rf ? pulito(rf.nome) : '']]);
  },

  html({ id, px, dati, durata, t, etichetta, numero, formato = 'orizzontale' }) {
    const G = impagina(dati, formato === 'verticale' ? 'verticale' : 'orizzontale');
    const { vert, W, M, n } = G;
    const ev = Number.isInteger(dati.evidenza) ? dati.evidenza : -1;
    const rif = rifDi(dati);

    // tempi: titolo all'inizio, le barre una dopo l'altra sul loro nome, il riferimento quando la voce lo nomina
    const tTit = Math.min(t('titolo', 0.1), 0.6);
    const arrivi = [];
    let prima = tTit + 0.5;
    for (let i = 0; i < n; i++) {
      const riserva = durata * (0.14 + (0.62 * i) / Math.max(1, n - 1));
      const a = Math.min(durata - 1.2, Math.max(prima, t(`v${i + 1}`, riserva)));
      arrivi.push(a);
      prima = a + 0.22;
    }
    const tAsse = Math.max(tTit + 0.2, arrivi[0] - 0.35);
    const tRif = rif ? Math.min(durata - 1.0, Math.max(tTit + 0.4, t('riferimento', durata * 0.8))) : 0;

    // posizioni
    const yEt1 = G.bloccoY;
    const yEt2 = G.bloccoY + G.lhL + 4;
    const yScala = G.dueEtichette ? yEt2 : yEt1;
    const lineaDa = G.righeY - 6;
    const lineaA = r(G.righeY + G.righeH) - (G.modo === 'pila' ? r(G.rowH - G.lhN - G.lhNota - G.inner - G.lineC) : 0);
    const rifDa = G.dueEtichette ? yEt1 + G.lhL + 4 : lineaDa;

    const segmenti = []; // in pila la linea del riferimento passa solo sulle barre, non sui nomi
    const righe = dati.voci.map((v, i) => {
      const k = i + 1;
      const y0 = r(G.righeY + i * G.rowH);
      const accesa = i === ev;
      const nome = G.nomi[i], nota = G.note[i], segno = G.segni[i];
      const fSeg = r(G.fN * 0.8);
      let yNome, yNota, xNota, yBar, yVal;
      if (G.modo === 'pila') {
        yNome = y0;
        yNota = y0 + G.lhN;
        xNota = M + G.segW;
        const yC = y0 + G.lhN + G.lhNota + G.inner;
        yBar = yC + r((G.lineC - G.b) / 2);
        yVal = yC + r((G.lineC - G.lhV) / 2);
        // la linea scende senza interruzioni dove nome e nota della riga le restano a sinistra; altrimenti solo sulla barra
        const libera = rif && M + G.segW + Math.max(larg(nome, G.fN, MONO), nota ? larg(nota, G.fNota, SERIF) : 0) + 16 < G.rifX - 2;
        const su = libera ? (i ? segmenti[i - 1][0] + segmenti[i - 1][1] : rifDa) : yC - 8;
        segmenti.push([su, yC + G.lineC + 8 - su]);
      } else {
        const blocco = G.nota === 'sotto' && nota ? G.lhN + 4 + G.lhNota : G.lhN;
        yNome = y0 + r((G.rowH - blocco) / 2);
        yNota = G.nota === 'sotto' ? yNome + G.lhN + 4 : yNome;
        xNota = G.nota === 'sotto' ? M + G.segW : M + G.segW + r(larg(nome, G.fN, MONO)) + 20;
        yBar = y0 + r((G.rowH - G.b) / 2);
        yVal = y0 + r((G.rowH - G.lhV) / 2);
      }
      const lung = G.lunghe[i];
      // il testo del valore non sta sotto la linea del riferimento: se la toccherebbe, va subito dopo la linea
      let valX = G.asseX + lung + 18;
      const valW = larg(G.testi[i], G.fV, CIFRE);
      if (rif && valX < G.rifX + 14 && valX + valW > G.rifX - 12) valX = G.rifX + 16;
      const lhNotaRiga = G.nota === 'linea' ? G.lhN : G.lhNota;
      const corpo = `
      <div id="${px}nome-${k}" class="${px}nome${accesa ? ` ${px}acceso` : ''}" style="left:${M + G.segW}px;top:${yNome}px;font-size:${G.fN}px;line-height:${G.lhN}px">${esc(nome)}</div>
      ${segno ? `<div id="${px}segno-${k}" class="${px}segno" style="left:${M}px;top:${yNome + r((G.lhN - fSeg) / 2)}px;width:${fSeg}px;height:${fSeg}px">${segno === 'si' ? SPUNTA(fSeg, C.accento) : CROCE(fSeg, C.crema2)}</div>` : ''}
      ${nota ? `<div id="${px}nota-${k}" class="${px}nota" style="left:${xNota}px;top:${yNota}px;font-size:${G.fNota}px;line-height:${lhNotaRiga}px">${esc(nota)}</div>` : ''}
      <div id="${px}barra-${k}" class="${px}barra${accesa ? ` ${px}barra-accesa` : ''}" style="left:${G.asseX}px;top:${yBar}px;width:${lung}px;height:${G.b}px"></div>
      <div id="${px}valore-${k}" class="${px}valore${accesa ? ` ${px}valore-acceso` : ''}" style="left:${valX}px;top:${yVal}px;font-size:${G.fV}px;line-height:${G.lhV}px">${esc(G.testi[i])}</div>`;
      const a = arrivi[i];
      const durBarra = Math.max(0.7, Math.min(1.2, durata - a - 0.2));
      let js = `
      tl.fromTo(q("#${px}nome-${k}"), { opacity: 0, x: -24 }, { opacity: 1, x: 0, duration: 0.5, ease: "power3.out" }, ${s3(a)});
      tl.fromTo(q("#${px}barra-${k}"), { scaleX: 0 }, { scaleX: 1, duration: ${s3(durBarra)}, ease: "power3.out" }, ${s3(a + 0.05)});
      tl.fromTo(q("#${px}valore-${k}"), { opacity: 0, x: ${-(valX - G.asseX - 18)} }, { opacity: 1, x: 0, duration: ${s3(durBarra)}, ease: "power3.out" }, ${s3(a + 0.05)});`;
      if (nota) js += `
      tl.fromTo(q("#${px}nota-${k}"), { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.45, ease: "power2.out" }, ${s3(a + 0.2)});`;
      if (segno) js += `
      tl.fromTo(q("#${px}segno-${k}"), { opacity: 0, scale: 0.4 }, { opacity: 1, scale: 1, duration: 0.5, ease: "expo.out" }, ${s3(Math.min(durata - 0.5, a + 0.55))});`;
      return { corpo, js };
    });

    const linee = G.modo === 'pila' ? segmenti : [[rifDa, lineaA - rifDa]];
    const titolo = pulito(dati.titolo);
    const sotto = pulito(dati.sotto);
    const css = `
    #${px}titolo { position: absolute; left: ${M}px; right: ${M}px; top: ${G.yT}px; font-weight: 500; font-size: ${G.fT}px; line-height: ${G.lhT}px;
      letter-spacing: -0.015em; color: ${C.crema}; ${G.righeT === 1 ? 'white-space: nowrap;' : ''} }
    #${px}sotto { position: absolute; left: ${M}px; right: ${M}px; top: ${G.yS}px; font-family: "JetBrains Mono", monospace; font-weight: 500;
      font-size: ${G.fS}px; line-height: ${G.lhS}px; letter-spacing: 0.02em; color: ${C.crema2}; ${G.righeS === 1 ? 'white-space: nowrap;' : ''} }
    .${px}nome, .${px}nota, .${px}valore, .${px}segno, .${px}barra, .${px}etichetta { position: absolute; }
    .${px}nome { font-family: "JetBrains Mono", monospace; font-weight: 500; color: ${C.crema}; white-space: nowrap; }
    .${px}acceso { color: ${C.accento}; font-weight: 700; }
    .${px}nota { font-weight: 400; font-style: italic; color: ${C.crema2}; white-space: nowrap; }
    .${px}segno svg { display: block; }
    .${px}barra { background: ${C.pannello}; border-radius: 0 6px 6px 0; transform-origin: left center; }
    .${px}barra-accesa { background: ${C.accento}; }
    .${px}valore { font-weight: 600; color: ${C.crema}; white-space: nowrap; font-variant-numeric: tabular-nums; }
    .${px}valore-acceso { color: ${C.accento}; }
    #${px}asse { position: absolute; left: ${G.asseX - 2}px; top: ${lineaDa}px; width: 2px; height: ${lineaA - lineaDa}px; background: ${C.crema2}; opacity: 0.55; transform-origin: center top; }
    .${px}rif { position: absolute; left: ${G.rifX - 2}px; width: 0; border-left: 4px dashed ${C.crema}; transform-origin: center top; }
    .${px}etichetta { font-family: "JetBrains Mono", monospace; font-weight: 500; font-size: ${G.fL}px; line-height: ${G.lhL}px; letter-spacing: 0.04em; white-space: nowrap; }
    #${px}scala { color: ${C.crema2}; left: ${G.asseX}px; top: ${yScala}px; }
    #${px}rif-et { color: ${C.crema}; left: ${G.rifLX}px; top: ${yEt1}px; }`;

    const corpo = `
      <div id="${px}titolo">${esc(titolo)}</div>
      ${sotto ? `<div id="${px}sotto">${esc(sotto)}</div>` : ''}
      ${G.modo === 'lato' ? `<div id="${px}asse"></div>` : ''}
      ${G.scalaTesto ? `<div id="${px}scala" class="${px}etichetta">${esc(G.scalaTesto)}</div>` : ''}
      ${rif ? `<div id="${px}rif-et" class="${px}etichetta">${esc(G.rifTesto)}</div>` : ''}
      ${righe.map((x) => x.corpo).join('')}
      ${rif ? linee.map(([y, alto], j) => `<div id="${px}rif-${j}" class="${px}rif" style="top:${y}px;height:${alto}px"></div>`).join('') : ''}`;

    const anima = `
      tl.fromTo(q("#${px}titolo"), { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.6, ease: "power3.out" }, ${s3(tTit)});
      ${sotto ? `tl.fromTo(q("#${px}sotto"), { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" }, ${s3(tTit + 0.3)});` : ''}
      ${G.modo === 'lato' ? `tl.fromTo(q("#${px}asse"), { scaleY: 0 }, { scaleY: 1, duration: 0.7, ease: "power3.out" }, ${s3(tAsse)});` : ''}
      ${G.scalaTesto ? `tl.fromTo(q("#${px}scala"), { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.45, ease: "power2.out" }, ${s3(tAsse + 0.1)});` : ''}
      ${rif ? `tl.fromTo(qa(".${px}rif"), { scaleY: 0 }, { scaleY: 1, duration: ${linee.length > 1 ? 0.5 : 0.9}, ease: "power3.out", stagger: 0.08 }, ${s3(tRif)});
      tl.fromTo(q("#${px}rif-et"), { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.5, ease: "power3.out" }, ${s3(tRif + 0.15)});` : ''}
      ${righe.map((x) => x.js).join('')}`;

    return scena({ id, px, durata, etichetta, numero, css, corpo, anima, formato: vert ? 'verticale' : 'orizzontale' });
  },
};
