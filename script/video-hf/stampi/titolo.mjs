// Stampo «titolo»: l'apertura di ogni notizia (24/10/2026). Una riga piccola in alto (data, rubrica), il titolo grande che
// si compone parola per parola seguendo la voce, su 1–3 righe decise qui, una riga verde che si disegna sotto e le parole
// in evidenza che si accendono di verde quando la voce le nomina. Stile dalla prova DeepInfer (quadri 01 e 02).
import { C, scena, s3, esc, misura, attacchi } from '../base.mjs';

const FATTORE = 0.44; // larghezza media di un carattere di Source Serif 4 (peso 500) in em, misurata nei fotogrammi
// per formato: larghezza a cui punta la riga più lunga, carattere massimo per numero di righe (altezza del blocco),
// soglia sotto la quale si va a capo, minimo leggibile (valida() rifiuta sotto)
const IMPAGINA = {
  // ~65% dello schermo; il blocco sta fra la barra e y 860
  orizzontale: { larghezza: 1250, max: { 1: 220, 2: 200, 3: 165 }, soglia: 120, minimo: 72 },
  // Short: righe corte e impilate (fino a 5) nei 936 px fra i margini; il blocco sta fra y 150 e 1180
  verticale: { larghezza: 880, max: { 1: 170, 2: 160, 3: 150, 4: 140, 5: 120 }, soglia: 104, minimo: 56 },
};

const parole = (testo) => String(testo ?? '').trim().split(/\s+/).filter(Boolean);
// lunghezza «pesata»: maiuscole e cifre sono più larghe delle minuscole (un titolo in maiuscole non deve uscire dallo schermo)
const lunghezza = (s) => s.length + 0.25 * (s.match(/[\p{Lu}\p{N}]/gu) || []).length;
const norma = (w) => String(w).toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');

// tutte le divisioni di n parole in k righe consecutive (k ≤ 3, poche parole: si provano tutte)
function divisioni(n, k) {
  if (k === 1) return [[n]];
  const out = [];
  for (let a = 1; a <= n - k + 1; a++) for (const resto of divisioni(n - a, k - 1)) out.push([a, ...resto]);
  return out;
}

// righe e misura del titolo: il minor numero di righe che dà un carattere ≥ SOGLIA, altrimenti quello col carattere più grande
export function impagina(testo, formato = 'orizzontale') {
  const { larghezza: LARGHEZZA, max: MAX_RIGHE, soglia: SOGLIA } = IMPAGINA[formato] || IMPAGINA.orizzontale;
  const w = parole(testo);
  let scelta = null;
  for (let k = 1; k <= Math.min(Object.keys(MAX_RIGHE).length, w.length); k++) {
    let migliore = null;
    for (const d of divisioni(w.length, k)) {
      const righe = [];
      let i = 0;
      for (const m of d) { righe.push(w.slice(i, i + m)); i += m; }
      const lunga = Math.max(...righe.map((r) => lunghezza(r.join(' '))));
      if (!migliore || lunga < migliore.lunga) migliore = { righe, lunga };
    }
    const px = misura('x'.repeat(Math.ceil(migliore.lunga)), { larghezza: LARGHEZZA, max: MAX_RIGHE[k], min: 28, fattore: FATTORE });
    const cand = { righe: migliore.righe, px };
    if (px >= SOGLIA) return cand;
    if (!scelta || px > scelta.px) scelta = cand;
  }
  return scelta;
}

// posizione (indice della prima parola) dell'evidenza nel titolo, o -1
function trovaEvidenza(testo, evidenza) {
  const w = parole(testo).map(norma), e = parole(evidenza).map(norma).filter(Boolean);
  if (!e.length) return -1;
  for (let i = 0; i + e.length <= w.length; i++) if (e.every((p, k) => w[i + k] === p)) return i;
  return -1;
}

// i pezzi del titolo che entrano insieme: le righe; un titolo su una riga di 4+ parole entra in due metà
function pezzi(testo) {
  const { righe } = impagina(testo);
  if (righe.length === 1 && righe[0].length >= 4) {
    const m = Math.ceil(righe[0].length / 2);
    return [righe[0].slice(0, m), righe[0].slice(m)];
  }
  return righe;
}

export default {
  nome: 'titolo',
  descrizione: 'opening headline of the news, always the first scene: the headline builds word by word with 2-3 key words highlighted in green',
  schema: '{ "testo": "the headline, max 60 chars, no line breaks", "evidenza": "optional: 2-3 consecutive words copied exactly from testo, to highlight", "sopra": "small line above, e.g. AI news · 24 October 2026, max 40 chars" }',
  valida(dati) {
    const p = [];
    const testo = dati?.testo, ev = dati?.evidenza, sopra = dati?.sopra;
    if (typeof testo !== 'string' || !testo.trim()) return ['titolo: «testo» mancante'];
    if (/[\r\n\t]/.test(testo)) p.push('titolo: «testo» contiene a capo o tabulazioni');
    if (testo.trim().length > 60) p.push(`titolo: «testo» troppo lungo (${testo.trim().length} > 60)`);
    if (testo.trim().length < 8) p.push('titolo: «testo» troppo corto (< 8)');
    const n = parole(testo).length;
    if (n < 2 || n > 14) p.push(`titolo: «testo» deve avere 2–14 parole (${n})`);
    if (parole(testo).some((w) => w.length > 22)) p.push('titolo: una parola di «testo» supera 22 caratteri');
    else for (const f of Object.keys(IMPAGINA)) if (impagina(testo, f).px < IMPAGINA[f].minimo) p.push(`titolo: «testo» non entra a una misura leggibile (${f})`);
    // evidenza facoltativa (il piano di riserva costruito nel codice non ce l'ha): mancante = nessuna parola accesa
    if (ev == null || (typeof ev === 'string' && !ev.trim())) { /* niente evidenza */ }
    else if (typeof ev !== 'string') p.push('titolo: «evidenza» non è un testo');
    else {
      const ne = parole(ev).length;
      if (ne < 1 || ne > 3) p.push(`titolo: «evidenza» deve avere 1–3 parole (${ne})`);
      if (typeof testo === 'string' && trovaEvidenza(testo, ev) < 0) p.push('titolo: «evidenza» non è una sequenza di parole di «testo»');
    }
    if (sopra != null && sopra !== '') {
      if (typeof sopra !== 'string') p.push('titolo: «sopra» non è un testo');
      else if (sopra.trim().length > 40) p.push(`titolo: «sopra» troppo lungo (${sopra.trim().length} > 40)`);
      else if (/[\r\n\t]/.test(sopra)) p.push('titolo: «sopra» contiene a capo');
    }
    return p;
  },
  parole(dati) {
    const ps = pezzi(dati.testo);
    const iEv = trovaEvidenza(dati.testo, dati.evidenza);
    const coppie = [];
    let i = 0;
    ps.forEach((r, k) => {
      coppie.push([`pezzo${k + 1}`, r.join(' ')]);
      // l'evidenza subito dopo il pezzo che la contiene: è l'ordine in cui la voce la nomina
      if (iEv >= i && iEv < i + r.length) coppie.push(['evidenza', dati.evidenza]);
      i += r.length;
    });
    return attacchi(dati, coppie);
  },
  html({ id, px, dati, durata, t, etichetta, numero, formato = 'orizzontale' }) {
    const V = formato === 'verticale';
    // i pezzi (e quindi i tempi) sono gli stessi nei due formati; cambiano solo le righe e le misure
    const { righe, px: fs } = impagina(dati.testo, V ? 'verticale' : 'orizzontale');
    const ps = pezzi(dati.testo);
    const nEv = parole(dati.evidenza).length;
    const iEv = trovaEvidenza(dati.testo, dati.evidenza);
    const sopra = String(dati.sopra ?? '').trim();

    // tempi: ogni pezzo quando la voce lo nomina, in ordine e distanziati; il primo entro 0,8 s (è l'apertura)
    const STAGGER = 0.09, ENTRATA = 0.75;
    const passo = Math.min(1.4, (durata * 0.55) / Math.max(1, ps.length - 1));
    const tp = [];
    ps.forEach((r, k) => {
      let x = t(`pezzo${k + 1}`, 0.25 + k * passo);
      if (k === 0) x = Math.min(x, 0.8);
      else x = Math.max(x, tp[k - 1] + Math.min(0.5, (ps[k - 1].length * STAGGER)));
      tp.push(Math.min(x, durata - 1.2));
    });
    // indice della parola → pezzo e posizione nel pezzo
    const dove = [];
    ps.forEach((r, k) => r.forEach((_, j) => dove.push({ k, j })));
    const finePezzo = (k) => tp[k] + (ps[k].length - 1) * STAGGER + ENTRATA;
    const ultimaFine = finePezzo(ps.length - 1);
    // evidenza: quando la voce la nomina, ma solo dopo che le sue parole sono comparse
    let tEv = null;
    if (iEv >= 0) {
      const ultimaEv = dove[iEv + nEv - 1];
      const comparsa = tp[ultimaEv.k] + ultimaEv.j * STAGGER + 0.45;
      tEv = Math.min(Math.max(t('evidenza', comparsa + 0.3), comparsa), durata - 0.9);
    }
    const tRiga = Math.min(ultimaFine - 0.3, durata - 1);

    // altezze: il blocco (riga piccola, titolo, riga verde) centrato fra la barra (110) e i sottotitoli (860)
    const LH = 1.06;
    // riga piccola: in verticale più grande (≥ 32 px anche a 40 caratteri, spaziatura stretta) e misurata per stare nei margini
    const fsS = V ? Math.max(32, Math.min(44, Math.floor(820 / (Math.max(1, sopra.length) * 0.65)))) : 30;
    const spS = V ? 0.05 : 0.14;
    const hSopra = sopra ? fsS + 2 * 12 + 4 + 44 : 0;
    const hTitolo = righe.length * fs * LH;
    const hTot = hSopra + hTitolo + 44 + 2;
    // orizzontale: fra la barra e y 860; verticale: centro del blocco a y 650, mai sopra 170 né sotto 1180
    const top = V ? Math.round(Math.min(1180 - hTot, Math.max(170, 650 - hTot / 2))) : Math.round(150 + Math.max(0, (690 - hTot) * 0.45));

    const css = `
    #${px}colonna { position: absolute; left: 0; right: 0; top: ${top}px; display: flex; flex-direction: column; align-items: center; }
    #${px}sopra { display: inline-flex; align-items: center; gap: 18px; padding: 12px 26px; margin-bottom: 44px; border: 2px solid ${C.accento}; border-radius: 6px;
      font-family: "JetBrains Mono", monospace; font-weight: 500; font-size: ${fsS}px; line-height: ${fsS}px; letter-spacing: ${spS}em; text-transform: uppercase; color: ${C.accento}; white-space: nowrap; }
    #${px}punto { width: 12px; height: 12px; border-radius: 50%; background: ${C.accento}; }
    #${px}blocco { display: inline-flex; flex-direction: column; align-items: stretch; }
    #${px}titolo { font-family: "Source Serif 4", Georgia, serif; font-weight: 500; font-size: ${fs}px; line-height: ${LH}; letter-spacing: -0.015em;
      font-variation-settings: "opsz" 60; color: ${C.crema}; text-align: center; }
    .${px}linea { display: block; white-space: nowrap; }
    .${px}p { display: inline-block; position: relative; isolation: isolate; }
    .${px}evg { display: inline-block; position: relative; isolation: isolate; }
    .${px}box { position: absolute; left: -0.08em; right: -0.08em; top: 0.16em; bottom: -0.08em; background: ${C.scuro}; border-radius: 0.06em; transform-origin: left center; }
    #${px}riga { height: 2px; margin-top: 44px; background: ${C.accento}; transform-origin: center center; }`;

    let i = 0;
    // le parole in evidenza di una stessa riga stanno in un gruppo con un solo fondo scuro (niente buchi fra le parole)
    const html = righe.map((r) => {
      const pezziRiga = [];
      let gruppo = null;
      for (const w of r) {
        const { k } = dove[i];
        const ev = iEv >= 0 && i >= iEv && i < iEv + nEv;
        i++;
        const span = `<span class="${px}p ${px}c${k + 1}${ev ? ` ${px}ev` : ''}">${esc(w)}</span>`;
        if (ev) { if (!gruppo) { gruppo = []; pezziRiga.push(gruppo); } gruppo.push(span); } else { gruppo = null; pezziRiga.push(span); }
      }
      const dentro = pezziRiga.map((x) => (Array.isArray(x) ? `<span class="${px}evg"><span class="${px}box"></span>${x.join(' ')}</span>` : x)).join(' ');
      return `<span class="${px}linea">${dentro}</span>`;
    }).join('');
    const corpo = `
      <div id="${px}colonna">
        ${sopra ? `<div id="${px}sopra"><span id="${px}punto"></span><span>${esc(sopra)}</span></div>` : ''}
        <div id="${px}blocco">
          <div id="${px}titolo">${html}</div>
          <div id="${px}riga"></div>
        </div>
      </div>`;

    const anima = [
      sopra ? `tl.fromTo(q("#${px}sopra"), { opacity: 0, y: 22 }, { opacity: 1, y: 0, duration: 0.6, ease: "power3.out" }, 0.1);` : '',
      ...ps.map((_, k) => `tl.fromTo(qa(".${px}c${k + 1}"), { opacity: 0, y: ${Math.round(fs * 0.4)} }, { opacity: 1, y: 0, duration: ${ENTRATA}, ease: "power3.out", stagger: ${STAGGER} }, ${s3(tp[k])});`),
      `tl.fromTo(q("#${px}riga"), { scaleX: 0 }, { scaleX: 1, duration: 0.8, ease: "power3.out" }, ${s3(tRiga)});`,
      tEv != null ? `tl.fromTo(qa(".${px}box"), { scaleX: 0 }, { scaleX: 1, duration: 0.5, ease: "power3.out", stagger: 0.08 }, ${s3(tEv)});` : '',
      tEv != null ? `tl.fromTo(qa(".${px}ev"), { color: "${C.crema}" }, { color: "${C.accento}", duration: 0.45, ease: "power2.out", stagger: 0.08 }, ${s3(tEv + 0.05)});` : '',
    ].filter(Boolean).join('\n      ');
    return scena({ id, px, durata, etichetta, numero, css, corpo, anima, formato: V ? 'verticale' : 'orizzontale' });
  },
};
