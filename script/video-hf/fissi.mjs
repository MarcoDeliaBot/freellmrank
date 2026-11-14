// Testi fissi delle guide (14/11/2026). Una guida (contenuti/video-guide/*.json) può avere un campo facoltativo «fissi» che
// toglie al modello il titolo, la frase d'apertura e le frasi di trasparenza: stanno nel file della guida e il codice li
// mette nel video e li controlla. Prima li riscriveva il modello a ogni corsa (corsa 43579848323 di freeduet: titolo con
// «for free», frase «made by the same author» mai pronunciata, «eleven specialists» al posto di undici assistenti in tutto).
//   "fissi": {
//     "titolo": "titolo del video lungo, usato così com'è; lo Short ha lo stesso + « #Shorts» (al massimo 92 caratteri)",
//     "apertura": "la prima frase pronunciata, nel video lungo e nello Short (una frase sola)",
//     "obbligatorie": ["frasi da pronunciare parola per parola nel video lungo (una frase l'una)"],
//     "obbligatorieBreve": ["lo stesso per lo Short; se manca vale «obbligatorie»"],
//     "rigaDescrizione": "una riga che deve stare nella descrizione di YouTube, del video lungo e dello Short",
//     "vietate": ["frasi che non devono comparire in titolo, descrizione e voce (maiuscole e minuscole non contano)"]
//   }
// Senza «fissi» non cambia niente. Le regole sono in script/video-hf/CONTRATTO.md.
// Il controllo finale (riga di comando, sotto) legge i file veri che finiscono in release: .json (titolo, descrizione) e .srt
// (il testo del copione, quello pronunciato). Se qualcosa non regge esce con 1 e la guida non va in release.
// Uso: node script/video-hf/fissi.mjs <guida.json> <lungo|breve> <info.json del video> <video.srt>
import fs from 'node:fs';
import path from 'node:path';

export const MAX_TITOLO_FISSO = 92; // con « #Shorts» (8) il titolo dello Short resta entro i 100 caratteri di YouTube
const CAMPI = ['titolo', 'apertura', 'obbligatorie', 'obbligatorieBreve', 'rigaDescrizione', 'vietate'];
const SHORTS = ' #Shorts';

const pulito = (t) => String(t ?? '').replace(/[\u00a0\u2009\u202f]/g, ' ').replace(/\s+/g, ' ').trim();
// frasi come in piano.mjs: il punto fermo seguito da una maiuscola o da una cifra chiude la frase
export const frasi = (t) => pulito(t).split(/(?<=[.!?])\s+(?=[A-Z0-9"])/).filter(Boolean);

// testo confrontabile: minuscolo, solo lettere e cifre, punteggiatura e trattini (anche U+2011) come spazi
export const norma = (t) => String(t ?? '').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
// la frase sta nel testo (parole intere, in quell'ordine)? vero anche se cambiano maiuscole e punteggiatura
export const contiene = (testo, frase) => { const f = norma(frase); return !!f && ` ${norma(testo)} `.includes(` ${f} `); };
export const comincia = (testo, frase) => { const f = norma(frase); const t = norma(testo); return !!f && (t === f || t.startsWith(`${f} `)); };
export const trovaVietate = (testo, vietate = []) => vietate.filter((v) => contiene(testo, v));

const lista = (v) => (Array.isArray(v) ? v.map(pulito).filter(Boolean) : []);

// Legge e controlla «fissi» di una guida. null se il campo non c'è. Se c'è ma non va (campo con un errore di battitura,
// frase che sono due, testo fisso che contiene una frase vietata) lancia un errore in italiano: la guida non parte.
export function leggiFissi(guida) {
  const f = guida?.fissi;
  if (f == null) return null;
  if (typeof f !== 'object' || Array.isArray(f)) throw new Error('«fissi» deve essere un oggetto');
  const errori = [];
  for (const k of Object.keys(f)) if (!CAMPI.includes(k)) errori.push(`campo sconosciuto «${k}» (ammessi: ${CAMPI.join(', ')})`);
  const una = (nome, t) => { if (frasi(t).length !== 1) errori.push(`«${nome}» deve essere una frase sola: «${pulito(t).slice(0, 60)}»`); };
  const elenco = (nome) => {
    if (f[nome] == null) return [];
    if (!Array.isArray(f[nome]) || f[nome].some((x) => typeof x !== 'string' || !pulito(x))) { errori.push(`«${nome}» deve essere un elenco di testi non vuoti`); return []; }
    return lista(f[nome]);
  };
  const testo = (nome, max) => {
    if (f[nome] == null) return '';
    if (typeof f[nome] !== 'string' || !pulito(f[nome])) { errori.push(`«${nome}» deve essere un testo non vuoto`); return ''; }
    const t = pulito(f[nome]);
    if (max && t.length > max) errori.push(`«${nome}» di ${t.length} caratteri (al massimo ${max})`);
    return t;
  };
  const titolo = testo('titolo', MAX_TITOLO_FISSO);
  const apertura = testo('apertura');
  const rigaDescrizione = testo('rigaDescrizione', 200);
  const obbligatorie = elenco('obbligatorie');
  const breve = elenco('obbligatorieBreve');
  const vietate = elenco('vietate');
  if (apertura) una('apertura', apertura);
  obbligatorie.forEach((x) => una('obbligatorie', x));
  breve.forEach((x) => una('obbligatorieBreve', x));
  const fissi = { titolo, apertura, obbligatorie, obbligatorieBreve: f.obbligatorieBreve == null ? obbligatorie : breve, rigaDescrizione, vietate };
  // un testo fisso che contiene una frase vietata non si potrebbe mai rispettare
  for (const [nome, t] of [['titolo', titolo], ['apertura', apertura], ['rigaDescrizione', rigaDescrizione], ...obbligatorie.map((x) => ['obbligatorie', x]), ...breve.map((x) => ['obbligatorieBreve', x])]) {
    for (const v of trovaVietate(t, vietate)) errori.push(`«${nome}» contiene la frase vietata «${v}»: «${t.slice(0, 60)}»`);
  }
  if (errori.length) throw new Error(`campo «fissi» non valido: ${errori.join('; ')}`);
  return fissi;
}

// Mette la frase d'apertura per prima nella prima scena e le frasi obbligatorie che mancano subito dopo (senza apertura fissa
// la prima frase della scena resta quella del modello). scene: le scene con la voce, senza la chiusura.
// Restituisce { scene: copia, inserite: [frasi aggiunte dal codice] }.
// Della prima scena si tengono le frasi dopo la prima (la prima è quella che il modello aveva scritto come gancio: la sostituisce
// l'apertura fissa); le frasi che sono già fisse non si ripetono.
export function conFissi(scene, { apertura = '', obbligatorie = [], tutte = obbligatorie }) {
  if (!scene.length || (!apertura && !obbligatorie.length)) return { scene, inserite: [] };
  const [prima, ...altre] = scene;
  const fissa = (x) => [apertura, ...tutte].some((m) => m && norma(m) === norma(x));
  const sue = frasi(prima.voce);
  const testa = apertura ? [apertura] : sue.slice(0, 1);
  const resto = sue.slice(1).filter((x) => !fissa(x));
  const detto = [...testa, ...resto, ...altre.map((s) => s.voce || '')].join(' ');
  const inserite = obbligatorie.filter((m) => !contiene(detto, m));
  return { scene: [{ ...prima, voce: [...testa, ...inserite, ...resto].join(' ') }, ...altre], inserite };
}

// Il testo del copione di un file .srt (le righe dei sottotitoli, senza numeri e tempi)
export const parlatoDaSrt = (srt) => String(srt).split(/\r?\n/).filter((r) => r.trim() && !/^\d+$/.test(r.trim()) && !/-->/.test(r)).join(' ');

// Il controllo: restituisce i problemi in italiano (vuoto = va bene).
//   tipo: 'lungo' | 'breve'; titolo e descrizione: quelli che vanno su YouTube; parlato: il testo pronunciato;
//   chiusure: testi fissi del canale (la chiusura dei video) da non contare fra le frasi vietate: promuovono il canale, non la guida.
export function controllaFissi({ fissi, tipo = 'lungo', titolo = '', descrizione = '', parlato = '', chiusure = [] }) {
  if (!fissi) return [];
  const dove = tipo === 'breve' ? 'Short' : 'video lungo';
  const p = [];
  const atteso = tipo === 'breve' ? `${fissi.titolo}${SHORTS}` : fissi.titolo;
  if (fissi.titolo && pulito(titolo) !== atteso) p.push(`Titolo (${dove}) diverso da quello fisso: trovato «${pulito(titolo)}», atteso «${atteso}»`);
  if (fissi.rigaDescrizione && !String(descrizione).split(/\r?\n/).some((r) => pulito(r) === fissi.rigaDescrizione)) {
    p.push(`Descrizione (${dove}) senza la riga fissa «${fissi.rigaDescrizione}»`);
  }
  if (fissi.apertura && !comincia(parlato, fissi.apertura)) {
    p.push(`Parlato (${dove}) che non comincia con la frase d'apertura fissa «${fissi.apertura}»: comincia con «${pulito(parlato).slice(0, 70)}»`);
  }
  const obbligatorie = tipo === 'breve' ? fissi.obbligatorieBreve : fissi.obbligatorie;
  for (const m of obbligatorie) if (!contiene(parlato, m)) p.push(`Frase obbligatoria non pronunciata (${dove}): «${m}»`);
  // le chiusure fisse del canale si tolgono dal parlato prima di cercare le frasi vietate
  let voce = ` ${norma(parlato)} `;
  for (const c of chiusure) { const x = norma(c); if (x) voce = voce.split(` ${x} `).join(' '); }
  for (const [nome, testo] of [['nel titolo', titolo], ['nella descrizione', descrizione], ['nel parlato', voce]]) {
    for (const v of trovaVietate(testo, fissi.vietate)) p.push(`Frase vietata «${v}» trovata ${nome} (${dove})`);
  }
  return p;
}

// ---------- riga di comando ----------
if (process.argv[1] && import.meta.url.endsWith(`/${path.basename(process.argv[1])}`)) {
  const [fileGuida, tipo, fileInfo, fileSrt] = process.argv.slice(2);
  try {
    if (!['lungo', 'breve'].includes(tipo) || !fileInfo || !fileSrt) throw new Error('uso: fissi.mjs <guida.json> <lungo|breve> <info.json> <video.srt>');
    const fissi = leggiFissi(JSON.parse(fs.readFileSync(fileGuida, 'utf8')));
    if (!fissi) { console.log(`Testi fissi: ${path.basename(fileGuida)} non ne ha, niente da controllare`); process.exit(0); }
    const info = JSON.parse(fs.readFileSync(fileInfo, 'utf8'));
    const { default: chiusura } = await import('./stampi/chiusura.mjs');
    const chiusure = [chiusura.voceFissa({}, 'orizzontale'), chiusura.voceFissa({}, 'verticale'), chiusura.voceFissa({ invito: 'canale' }, 'verticale')];
    const problemi = controllaFissi({ fissi, tipo, titolo: info.titolo, descrizione: info.descrizione, parlato: parlatoDaSrt(fs.readFileSync(fileSrt, 'utf8')), chiusure });
    if (problemi.length) { console.error(`Testi fissi NON rispettati (${info.nome || fileInfo}):\n- ${problemi.join('\n- ')}`); process.exit(1); }
    console.log(`Testi fissi rispettati (${info.nome || fileInfo}, ${tipo}): titolo, apertura, frasi obbligatorie, descrizione e frasi vietate controllati`);
  } catch (e) {
    console.error(`Controllo dei testi fissi non riuscito: ${e.message}`);
    process.exit(1);
  }
}
