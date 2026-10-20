// Classifiche audio (aggiunte il 20/10/2026): Arena non ne ha, quindi due fonti diverse.
// - Voce → testo (ASR): Open ASR Leaderboard di Hugging Face (hf-audio), errore sulle parole (WER).
// - Testo → voce (TTS): voti alla cieca della TTS Spaces Arena (Pendrokar), solo modelli aperti; la classifica
//   la calcoliamo noi con Bradley-Terry (sorgente/bt.mjs). In più, per riferimento, i modelli aperti di TTS Arena V2.
// Nessuna delle fonti dichiara una licenza per riusare i dati: le citiamo e mettiamo il link.
// Scrive dati/audio.json. Uso: node script/costruisci-audio.mjs [--offline]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { classifica } from '../sorgente/bt.mjs';

const RADICE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = path.join(RADICE, 'dati', 'audio');
fs.mkdirSync(DIR, { recursive: true });
const OFFLINE = process.argv.includes('--offline');

async function scarica(url, nome) {
  const file = path.join(DIR, nome);
  if (!OFFLINE) {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`${nome}: HTTP ${r.status}`);
    fs.writeFileSync(file, Buffer.from(await r.arrayBuffer()));
  }
  return file;
}

// ---------- voce → testo ----------
const FONTE_ASR = 'https://huggingface.co/datasets/hf-audio/open-asr-leaderboard-results/resolve/main/english_short_latest.csv';
// le 8 prove che hanno tutti i modelli aperti: la media su queste è confrontabile (la colonna "avg" del file no)
const PROVE = ['AMI-Cleaned WER', 'Earnings22-Cleaned-AA-chunked WER', 'Gigaspeech-Cleaned WER', 'LS Clean WER', 'LS Other WER', 'SPGISpeech WER', 'Voice Arena Monsoon WER', 'Voxpopuli-AA-Cleaned WER'];

function leggiCsv(testo) {
  const righe = []; let campo = '', riga = [], virgolette = false;
  for (let i = 0; i < testo.length; i++) {
    const c = testo[i];
    if (virgolette) { if (c === '"' && testo[i + 1] === '"') { campo += '"'; i++; } else if (c === '"') virgolette = false; else campo += c; }
    else if (c === '"') virgolette = true;
    else if (c === ',') { riga.push(campo); campo = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && testo[i + 1] === '\n') i++; riga.push(campo); righe.push(riga); riga = []; campo = ''; }
    else campo += c;
  }
  if (campo || riga.length) { riga.push(campo); righe.push(riga); }
  const [testa, ...corpo] = righe.filter((r) => r.length > 1);
  return corpo.map((r) => Object.fromEntries(testa.map((k, i) => [k, r[i] ?? ''])));
}

const asrGrezzi = leggiCsv(fs.readFileSync(await scarica(FONTE_ASR, 'asr.csv'), 'utf8'));
const asr = asrGrezzi.filter((r) => r.License && r.License.toLowerCase() !== 'proprietary')
  .map((r) => {
    const valori = PROVE.map((k) => Number(r[k]));
    if (valori.some((v) => !Number.isFinite(v) || r[PROVE[valori.indexOf(v)]] === '')) return null;
    return {
      repo: r.model, wer: Math.round((valori.reduce((a, b) => a + b, 0) / valori.length) * 100) / 100,
      b: Number(r['Size (B)']) || null, lingue: Number(r['# Languages']) || null, rtfx: Number(r.RTFx) || null,
      licenza: r.License, commerciale: !/nc/i.test(r.License),
    };
  }).filter(Boolean).sort((a, b) => a.wer - b.wer);

// ---------- testo → voce ----------
const FONTE_TTS = 'https://huggingface.co/datasets/Pendrokar/TTS_Arena/resolve/main/database.db';
// servizi a pagamento presenti nell'arena: fuori, perché qui ci sono solo modelli gratis
const CHIUSI = /^(innoai\/Edge-TTS|smallestai\/|CAMB-AI\/)/;
// stesso modello in due Space diverse: un nome solo
const UNISCI = { 'hexgrad/Kokoro-API': 'hexgrad/kokoro' };
const db = new DatabaseSync(await scarica(FONTE_TTS, 'tts-arena.db'), { readOnly: true });
const coppie = db.prepare('SELECT chosen, rejected, COUNT(*) AS n FROM votelog GROUP BY chosen, rejected').all();
// data dell'ultimo voto di ogni modello (per i modelli uniti, la più recente delle due Space)
const ultimi = {};
for (const r of db.prepare('SELECT m, MAX(t) AS t FROM (SELECT chosen AS m, timestamp AS t FROM votelog UNION ALL SELECT rejected, timestamp FROM votelog) GROUP BY m').all()) {
  const k = UNISCI[r.m] || r.m;
  if (!ultimi[k] || String(r.t) > String(ultimi[k])) ultimi[k] = r.t;
}
db.close();
const nome = (x) => UNISCI[x] || x;
const righeTts = coppie.filter((r) => !CHIUSI.test(r.chosen) && !CHIUSI.test(r.rejected) && nome(r.chosen) !== nome(r.rejected))
  .map((r) => ({ a: nome(r.chosen), b: nome(r.rejected), esito: 'a', n: Number(r.n) }));
const tts = classifica(righeTts).map((r) => ({
  space: r.id, punteggio: r.punteggio, ic: r.ic, voti: r.voti, vinte: r.vinte, ultimo: String(ultimi[r.id] || '').slice(0, 10),
}));

// ---------- TTS Arena V2: solo i modelli aperti (quasi tutti gli altri sono servizi a pagamento) ----------
const APERTI_V2 = { 'kokoro-v1': 'hexgrad/Kokoro-82M', chatterbox: 'ResembleAI/chatterbox', maya1: 'maya-research/maya1', veena: 'maya-research/Veena' };
let v2 = [];
try {
  const f = await scarica('https://tts-agi-tts-arena-v2.hf.space/api/leaderboard?type=tts&preliminary=1', 'tts-arena-v2.json');
  const righe = JSON.parse(fs.readFileSync(f, 'utf8')).rows || [];
  v2 = righe.filter((r) => APERTI_V2[r.id] || r.open).map((r) => ({ nome: r.name, repo: APERTI_V2[r.id] || null, elo: r.elo, ic: r.uncertainty, voti: r.totalVotes, attivo: !!r.active }))
    .sort((a, b) => b.elo - a.elo);
} catch (e) { console.log('TTS Arena V2 non raggiungibile:', e.message); }

const uscita = {
  aggiornato: new Date().toISOString().slice(0, 10),
  fonti: {
    asr: { nome: 'Open ASR Leaderboard (Hugging Face)', url: 'https://huggingface.co/spaces/hf-audio/open_asr_leaderboard', dati: FONTE_ASR, prove: PROVE.map((p) => p.replace(/ WER$/, '')) },
    tts: { nome: 'TTS Spaces Arena (Pendrokar)', url: 'https://huggingface.co/spaces/Pendrokar/TTS-Spaces-Arena', dati: FONTE_TTS },
    v2: { nome: 'TTS Arena V2', url: 'https://huggingface.co/spaces/TTS-AGI/TTS-Arena-V2' },
  },
  asr, tts, v2,
};
fs.writeFileSync(path.join(RADICE, 'dati', 'audio.json'), JSON.stringify(uscita, null, 1));
console.log(`audio: ${asr.length} modelli voce→testo aperti, ${tts.length} modelli testo→voce (${righeTts.reduce((s, r) => s + r.n, 0)} voti), ${v2.length} aperti in TTS Arena V2`);
console.log('ASR migliori:', asr.slice(0, 5).map((x) => `${x.repo} ${x.wer}%`).join(' | '));
console.log('TTS migliori:', tts.slice(0, 5).map((x) => `${x.space} ${x.punteggio}±${x.ic} (${x.voti})`).join(' | '));
