// Titoli, capitoli e descrizioni di YouTube secondo le regole del pacchetto open source
// github.com/Jakeschincariol/youtube-agent-skill (Marco, 26/10/2026: adottarne le parti utili nel generatore automatico):
//   yt-package  → titolo entro 60 caratteri (oltre, la ricerca da computer lo taglia), nome principale nei primi 40
//                 (quanto mostra il telefono nella home), niente parole vaghe, al massimo 2 parole tutte maiuscole;
//                 negli Short «#Shorts» intero in fondo (un vecchio Short finiva in «#Short»: .slice(0, 100) l'aveva tagliato);
//   yt-chapters → capitoli nella descrizione: il primo a 0:00, almeno 3, ognuno di almeno 10 secondi;
//   yt-seo      → prima riga della descrizione entro 160 caratteri, al massimo 15 tag e 500 caratteri di tag.
// «best» e «free» NON sono parole vaghe qui: sono le parole chiave del sito (free llm, free ai, best ai free, best llm free).
// Modulo: titoloYT, capitoliYT, conCapitoli, controllaYT. Nessuna dipendenza.
// Riga di comando: node script/brag/controllo-yt.mjs <cartelle o file .json…>
//   rapporto breve per ogni video e riepilogo con i conteggi; esce sempre con 0 (serve a vedere, non a fermare).
import fs from 'node:fs';
import path from 'node:path';

export const MAX_TITOLO = 60;
export const LIMITE_TITOLO = 100;
export const MAX_NOME = 40;
export const MAX_APERTURA = 160;
export const MAX_TAG = 15;
export const MAX_CARATTERI_TAG = 500;
export const MAX_DESCRIZIONE = 5000;
export const MIN_CAPITOLO = 10;
export const MAX_TITOLO_CAPITOLO = 40;
const SHORTS = ' #Shorts';
// parole che non possono chiudere un titolo (segno di un taglio)
const PENDENTI = new Set(['and', 'or', 'the', 'of', 'a', 'an', 'to', 'with', 'for', 'in', 'on', 'at', 'by', 'from', '&']);
const VAGHE = ['amazing', 'incredible', 'insane', 'crazy', 'huge', 'massive', 'ultimate', 'secret', 'revolutionary', 'mindblowing', 'mind-blowing', 'epic'];
// sigle tecniche: maiuscole per nome, non per gridare
const SIGLE = new Set(['GPU', 'GPUS', 'CPU', 'NPU', 'API', 'APIS', 'LLM', 'LLMS', 'RAM', 'VRAM', 'NVIDIA', 'AMD', 'RTX', 'GTX', 'AWS', 'MIT', 'GGUF', 'MLX', 'OSS', 'MOE', 'SOTA']);

const pulito = (t) => String(t ?? '').replace(/\s+/g, ' ').trim();
const senzaShorts = (t) => pulito(t).replace(/\s*#Shorts?$/i, '').trim();

// toglie in fondo punteggiatura e parole pendenti (anche più di una: «Top 10 and the»)
function rifinisci(t) {
  let s = pulito(t);
  for (let giro = 0; giro < 10; giro++) {
    const prima = s;
    s = s.replace(/[\s,:;.\-–—([{/|&+…]+$/u, '').trim();
    const w = s.split(' ');
    if (w.length > 1 && PENDENTI.has(w.at(-1).toLowerCase())) s = w.slice(0, -1).join(' ');
    if (s === prima) break;
  }
  return s;
}

// accorcia a parola intera entro max, senza lasciare segni, parole pendenti o parentesi aperte
export function tagliaParole(t, max) {
  const s = pulito(t);
  if (s.length <= max) return s;
  let out = '';
  for (const w of s.split(' ')) { const p = out ? `${out} ${w}` : w; if (p.length > max) break; out = p; }
  if (!out) out = s.slice(0, max); // una sola parola più lunga del massimo
  out = rifinisci(out);
  if ((out.match(/\(/g) || []).length > (out.match(/\)/g) || []).length) out = rifinisci(out.slice(0, out.lastIndexOf('(')));
  return out;
}

// il primo candidato che sta entro max; se nessuno, l'ultimo accorciato a parola intera.
// shorts: «#Shorts» si aggiunge DOPO il taglio, quindi non si taglia mai; mai oltre 100 caratteri in tutto
export function titoloYT(candidati, { shorts = false, max = MAX_TITOLO } = {}) {
  const lim = Math.min(max, shorts ? LIMITE_TITOLO - SHORTS.length : LIMITE_TITOLO);
  const lista = (Array.isArray(candidati) ? candidati : [candidati]).map((c) => (shorts ? senzaShorts(c) : pulito(c))).filter(Boolean);
  if (!lista.length) return '';
  const base = lista.find((c) => c.length <= lim) ?? tagliaParole(lista.at(-1), lim);
  return shorts ? base + SHORTS : base;
}

// ---------- capitoli ----------
const orario = (s) => {
  const x = Math.max(0, Math.floor(s));
  const h = Math.floor(x / 3600), m = Math.floor((x % 3600) / 60), sec = String(x % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`;
};
const secondi = (t) => t.split(':').reduce((a, x) => a * 60 + Number(x), 0);
export const titoloCapitolo = (t) => tagliaParole(String(t ?? '').replace(/…/g, ' '), MAX_TITOLO_CAPITOLO);

// capitoli = [{ inizio: secondi, titolo }], durata = secondi del video. Un capitolo sotto i 10 s si unisce al precedente
// (il primo, che parte sempre da 0:00, si tiene il seguente). Restituisce le righe «0:00 Titolo» solo se valgono le regole
// di YouTube (primo a 0:00, almeno 3, ognuno di almeno 10 s); se no ''.
export function capitoliYT(capitoli, durata) {
  const fine = Math.floor(Number(durata) || 0);
  let c = (Array.isArray(capitoli) ? capitoli : [])
    .map((x) => ({ inizio: Math.floor(Number(x?.inizio)), titolo: titoloCapitolo(x?.titolo) }))
    .filter((x) => Number.isFinite(x.inizio) && x.inizio >= 0 && x.inizio < fine)
    .sort((a, b) => a.inizio - b.inizio);
  if (!c.length) return '';
  c[0].inizio = 0;
  c = c.map((x, i) => ({ ...x, titolo: x.titolo || (i === 0 ? 'Intro' : `Part ${i + 1}`) }));
  // due scene di seguito con lo stesso titolo: un capitolo solo
  c = c.filter((x, i) => i === 0 || x.titolo.toLowerCase() !== c[i - 1].titolo.toLowerCase());
  const lung = (i) => (i + 1 < c.length ? c[i + 1].inizio : fine) - c[i].inizio;
  for (let i; c.length > 1 && (i = c.findIndex((_, j) => lung(j) < MIN_CAPITOLO)) >= 0;) c.splice(i === 0 ? 1 : i, 1);
  const ok = c.length >= 3 && c[0].inizio === 0 && c.every((_, j) => lung(j) >= MIN_CAPITOLO);
  return ok ? c.map((x) => `${orario(x.inizio)} ${x.titolo}`).join('\n') : '';
}

const RIGA_CAPITOLO = /^\s*\(?((?:\d{1,2}:)?\d{1,2}:\d{2})\)?\s*[-–—:]?\s+(\S.*)$/;
export const capitoliDi = (descrizione) => String(descrizione || '').split(/\r?\n/).map((r) => RIGA_CAPITOLO.exec(r)).filter(Boolean)
  .map((m) => ({ inizio: secondi(m[1]), titolo: m[2].trim() }));

function problemiCapitoli(c, durata) {
  const p = [];
  if (c[0].inizio !== 0) p.push('il primo non parte da 0:00');
  if (c.length < 3) p.push(`solo ${c.length} (ne servono almeno 3)`);
  for (let i = 0; i < c.length; i++) {
    const fine = i + 1 < c.length ? c[i + 1].inizio : durata;
    if (fine != null && fine - c[i].inizio < MIN_CAPITOLO) p.push(`«${c[i].titolo}» dura ${Math.round(fine - c[i].inizio)} s (minimo 10)`);
  }
  return p;
}

// il blocco dei capitoli dopo il primo paragrafo (le prime righe restano quelle per la ricerca); niente se ci sono già
// capitoli o se la descrizione supererebbe i 5000 caratteri
export function conCapitoli(descrizione, blocco) {
  const d = String(descrizione || '');
  if (!blocco || capitoliDi(d).length) return d;
  const k = d.indexOf('\n\n');
  const j = d.indexOf('\n');
  const testo = k >= 0 ? `${d.slice(0, k)}\n\nChapters:\n${blocco}\n\n${d.slice(k + 2)}`
    : j >= 0 ? `${d.slice(0, j)}\n\nChapters:\n${blocco}\n\n${d.slice(j + 1)}`
      : `${d}\n\nChapters:\n${blocco}`;
  return testo.length <= MAX_DESCRIZIONE ? testo : d;
}

// ---------- controllo ----------
export const eShort = (info) => (info?.formato?.w && info?.formato?.h ? info.formato.h > info.formato.w
  : /^(breve|nuovo|settimana|gpu|corto)-/.test(info?.nome || '') || /#Shorts?\b/i.test(info?.titolo || ''));
export const eLungoOrizzontale = (info) => !eShort(info) && ((info?.formato?.w > info?.formato?.h) || /^(modello|notizia|guida|lungo)-/.test(info?.nome || ''));

// il nome principale: ciò che sta prima di «:», « - » o «,» se sono al massimo 3 parole, se no le prime due parole
function nomePrincipale(t) {
  const s = senzaShorts(t);
  const m = /^(.+?)(?::|\s[-–—|]\s|,)/.exec(s);
  if (m && m[1].trim().split(' ').length <= 3) return m[1].trim();
  return s.split(' ').slice(0, 2).join(' ');
}

const caratteriTag = (tag) => tag.reduce((s, t) => s + String(t).length + (/\s/.test(t) ? 2 : 0), 0) + Math.max(0, tag.length - 1);

// [{ codice, testo }]; info = il .json del video, info.durata (secondi) facoltativa
export function controlli(info) {
  const out = [];
  const p = (codice, testo) => out.push({ codice, testo });
  const titolo = pulito(info?.titolo);
  const short = eShort(info);
  const base = senzaShorts(titolo);
  if (!titolo) p('titolo-vuoto', 'titolo vuoto');
  if (titolo.length > LIMITE_TITOLO) p('titolo-100', `titolo di ${titolo.length} caratteri: oltre 100, YouTube non lo accetta`);
  else if (titolo.length > MAX_TITOLO) p('titolo-60', `titolo di ${titolo.length} caratteri: oltre 60, tagliato nella ricerca da computer`);
  if (short && !/ #Shorts$/.test(titolo)) p('shorts-rotto', `Short senza « #Shorts» intero in fondo al titolo («…${titolo.slice(-12)}»)`);
  const ultima = base.split(' ').at(-1) || '';
  if (/[,:;\-–—(&/]$/.test(base)) p('tagliato', `il titolo sembra tagliato: finisce con «${base.slice(-1)}»`);
  else if (base.split(' ').length > 1 && PENDENTI.has(ultima.toLowerCase())) p('tagliato', `il titolo sembra tagliato: finisce con «${ultima}»`);
  else if (!/ #Shorts$/.test(titolo) && (titolo.length === LIMITE_TITOLO || /#\w*$/.test(titolo))) p('tagliato', 'il titolo sembra tagliato a metà parola');
  const nome = nomePrincipale(titolo);
  const finisce = titolo.indexOf(nome) + nome.length;
  if (nome && finisce > MAX_NOME) p('nome-40', `il nome principale («${nome}») finisce al carattere ${finisce}: il telefono ne mostra 40`);
  const maiuscole = base.split(/\s+/).map((w) => w.replace(/^[^A-Za-z]+|[^A-Za-z]+$/g, '')).filter((w) => /^[A-Z]{3,}$/.test(w) && !SIGLE.has(w));
  if (maiuscole.length > 2) p('maiuscole', `${maiuscole.length} parole tutte maiuscole (${maiuscole.join(', ')}): al massimo 2`);
  const vaghe = VAGHE.filter((v) => new RegExp(`\\b${v}\\b`, 'i').test(base));
  if (vaghe.length) p('vaghe', `parole vaghe nel titolo: ${vaghe.join(', ')}`);
  const descrizione = String(info?.descrizione || '');
  const prima = descrizione.split(/\r?\n/)[0] || '';
  if (prima.length > MAX_APERTURA) p('apertura-160', `prima riga della descrizione di ${prima.length} caratteri: oltre 160, la ricerca la taglia`);
  if (descrizione.length > MAX_DESCRIZIONE) p('descrizione-5000', `descrizione di ${descrizione.length} caratteri: oltre 5000`);
  const tag = Array.isArray(info?.tag) ? info.tag : [];
  if (tag.length > MAX_TAG) p('tag', `${tag.length} tag: al massimo 15`);
  if (caratteriTag(tag) > MAX_CARATTERI_TAG) p('tag', `${caratteriTag(tag)} caratteri di tag: al massimo 500`);
  const cap = capitoliDi(descrizione);
  if (cap.length) {
    const pc = problemiCapitoli(cap, info?.durata);
    if (pc.length) p('capitoli-errati', `capitoli che YouTube non accetta: ${pc.join('; ')}`);
  } else if (eLungoOrizzontale(info) && (info?.durata == null || info.durata >= 60)) {
    p('senza-capitoli', `video orizzontale di ${info?.durata != null ? `${Math.round(info.durata)} s` : 'durata sconosciuta'} senza capitoli nella descrizione`);
  }
  return out;
}

// problemi in italiano; vuoto = va bene
export const controllaYT = (info) => controlli(info).map((x) => x.testo);

// ---------- riga di comando ----------
// durata: fine dell'ultima riga del .srt accanto al .json; se manca, la somma delle durate minime delle scene
function durataDi(file, info) {
  const srt = file.replace(/\.json$/i, '.srt');
  if (fs.existsSync(srt)) {
    const fini = [...fs.readFileSync(srt, 'utf8').matchAll(/-->\s*(\d+):(\d+):(\d+)[,.](\d+)/g)].map((m) => +m[1] * 3600 + +m[2] * 60 + +m[3] + +m[4] / 1000);
    if (fini.length) return Math.max(...fini);
  }
  const min = (info.scene || []).reduce((s, x) => s + (Number(x.min) || 0), 0);
  return min || null;
}

function fileJson(p, out = []) {
  if (!fs.existsSync(p)) return out;
  if (fs.statSync(p).isDirectory()) for (const f of fs.readdirSync(p).sort()) fileJson(path.join(p, f), out);
  else if (/\.json$/i.test(p)) out.push(p);
  return out;
}

if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) {
  try {
    const file = process.argv.slice(2).flatMap((p) => fileJson(p));
    const conti = {};
    let video = 0, short = 0, lunghi = 0, puliti = 0;
    for (const f of file) {
      let info;
      try { info = JSON.parse(fs.readFileSync(f, 'utf8')); } catch { continue; }
      if (typeof info?.titolo !== 'string' || typeof info?.descrizione !== 'string') continue; // non è il .json di un video
      info.durata ??= durataDi(f, info);
      video++;
      if (eShort(info)) short++; else if (eLungoOrizzontale(info)) lunghi++;
      const c = controlli(info);
      for (const k of new Set(c.map((x) => x.codice))) conti[k] = (conti[k] || 0) + 1;
      if (!c.length) { puliti++; continue; }
      console.log(`${info.nome || path.basename(f)} (${eShort(info) ? 'Short' : 'lungo'}, ${pulito(info.titolo).length} car.): ${c.map((x) => x.testo).join(' · ')}`);
    }
    const n = (k) => conti[k] || 0;
    console.log(`\nRiepilogo: ${video} video (${lunghi} lunghi orizzontali, ${short} Short), ${puliti} senza problemi`);
    console.log(`- titoli oltre 60 caratteri: ${n('titolo-60') + n('titolo-100')} (oltre 100: ${n('titolo-100')})`);
    console.log(`- Short con « #Shorts» tagliato o mancante: ${n('shorts-rotto')}`);
    console.log(`- titoli che sembrano tagliati: ${n('tagliato')}`);
    console.log(`- nome principale oltre i primi 40 caratteri: ${n('nome-40')}`);
    console.log(`- più di 2 parole tutte maiuscole: ${n('maiuscole')} · parole vaghe: ${n('vaghe')}`);
    console.log(`- prima riga della descrizione oltre 160 caratteri: ${n('apertura-160')} · descrizione oltre 5000: ${n('descrizione-5000')}`);
    console.log(`- tag oltre 15 o 500 caratteri: ${n('tag')}`);
    console.log(`- video lunghi orizzontali senza capitoli: ${n('senza-capitoli')} · capitoli non validi: ${n('capitoli-errati')}`);
  } catch (e) {
    console.log(`Controllo non riuscito: ${e.message}`);
  }
  process.exitCode = 0;
}
