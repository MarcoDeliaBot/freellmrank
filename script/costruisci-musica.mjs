// Classifica della musica fatta dall'IA (sezione /music, decisa da Marco il 20/10/2026).
// Fonte: Music Arena (CMU, LMArena, Sony AI), dataset pubblico dei voti ciechi, licenza CC BY 4.0:
// https://huggingface.co/datasets/music-arena/music-arena-dataset (letto a pagine dall'API datasets-server).
// Il punteggio lo calcoliamo noi con Bradley-Terry (sorgente/bt.mjs), come per le voci e per la Free Arena.
// «Entrambe male» e «pari» contano mezzo punto a testa. Uscita: dati/musica.json. I dati dei modelli
// (aperto o no, licenza, dove provarlo) stanno a mano in dati/musica-modelli.json.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { classifica } from '../sorgente/bt.mjs';

const RADICE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DS = 'music-arena/music-arena-dataset';
const API = 'https://datasets-server.huggingface.co';
const pausa = () => new Promise((s) => setTimeout(s, 1200)); // una richiesta ogni ~1,2 s: l'API ha un limite
const prendi = async (url, prove = 6) => {
  await pausa();
  for (let i = 0; ; i++) {
    const r = await fetch(url, { headers: { 'User-Agent': 'freellmarena.com data job' }, signal: AbortSignal.timeout(60000) }).catch((e) => ({ ok: false, status: e.name }));
    if (r.ok) return r.json();
    if (i >= prove) throw new Error(`${url} → ${r.status}`);
    // 429 = troppe richieste: si aspetta quanto dice il server, o almeno 20 secondi in più a ogni prova
    const attesa = Number(r.headers?.get?.('retry-after')) * 1000 || 20000 * (i + 1);
    await new Promise((s) => setTimeout(s, attesa));
  }
};

// se Hugging Face non risponde, si tiene il file di ieri: l'aggiornamento notturno del resto non si ferma
process.on('unhandledRejection', (e) => { console.warn(`musica: saltata (${e.message}), resta dati/musica.json di prima`); process.exit(0); });
const config = (await prendi(`${API}/splits?dataset=${encodeURIComponent(DS)}`)).splits.map((s) => s.config);
const righe = [];
// esempi da ascoltare e coppie per l'arena del sito: solo sfide con i due brani pubblici e un testo della lista
// predefinita di Music Arena (is_prebaked), mai i testi scritti dagli utenti
const candidate = [];
const AUDIO = 'https://huggingface.co/datasets/music-arena/music-arena-dataset/resolve/main/';
const tempi = {}; // secondi di calcolo per secondo di musica, per modello
const ultimo = {};
for (const c of config) {
  for (let offset = 0; ; offset += 100) {
    const d = await prendi(`${API}/rows?dataset=${encodeURIComponent(DS)}&config=${c}&split=train&offset=${offset}&length=100`);
    for (const { row: r } of d.rows) {
      if (!r.system_a || !r.system_b || r.system_a === r.system_b) continue;
      const esito = { A: 'a', B: 'b', TIE: 'pari', BOTH_BAD: 'male' }[r.preference];
      if (!esito) continue;
      righe.push({ a: r.system_a, b: r.system_b, esito });
      if (r.is_prebaked && r.audio_a && r.audio_b && r.prompt && (esito === 'a' || esito === 'b')) candidate.push({ id: r.battle_uuid, data: (r.date || '').slice(0, 10), prompt: String(r.prompt).slice(0, 300), a: { s: r.system_a, url: AUDIO + r.audio_a, d: Math.round(r.duration_a || 0) }, b: { s: r.system_b, url: AUDIO + r.audio_b, d: Math.round(r.duration_b || 0) }, vinse: esito });
      for (const [s, t, du] of [[r.system_a, r.system_time_a, r.duration_a], [r.system_b, r.system_time_b, r.duration_b]]) {
        if (t > 0 && du > 0) (tempi[s] = tempi[s] || []).push(t / du);
        if (!ultimo[s] || r.date > ultimo[s]) ultimo[s] = r.date;
      }
    }
    if (offset + 100 >= d.num_rows_total) break;
  }
  console.log(`musica: ${c} letto, ${righe.length} sfide finora`);
}

const mediana = (v) => { const s = [...v].sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : null; };
const voti = classifica(righe).map((m) => ({ ...m, ultimo: (ultimo[m.id] || '').slice(0, 10), lentezza: tempi[m.id] ? Math.round(mediana(tempi[m.id]) * 100) / 100 : null }));
// fino a 3 esempi per modello, i più recenti, con testi diversi
candidate.sort((x, y) => y.data.localeCompare(x.data));
const esempi = {};
for (const c of candidate) for (const lato of [c.a, c.b]) {
  const l = (esempi[lato.s] = esempi[lato.s] || []);
  if (l.length < 3 && !l.some((e) => e.prompt === c.prompt)) l.push({ prompt: c.prompt, url: lato.url, durata: lato.d, data: c.data });
}
// 80 coppie per l'arena del sito: le più recenti, al massimo 6 per ogni coppia di modelli
const quante = {};
const coppie = candidate.filter((c) => { const k = [c.a.s, c.b.s].sort().join('|'); quante[k] = (quante[k] || 0) + 1; return quante[k] <= 6; }).slice(0, 80);
const uscita = {
  aggiornato: new Date().toISOString().slice(0, 10),
  fonte: { nome: 'Music Arena', url: 'https://huggingface.co/datasets/music-arena/music-arena-dataset', licenza: 'CC BY 4.0', mesi: config },
  sfide: righe.length,
  modelli: voti,
  esempi,
  coppie,
};
fs.writeFileSync(path.join(RADICE, 'dati', 'musica.json'), JSON.stringify(uscita, null, 1) + '\n');
console.log(`musica: ${righe.length} sfide, ${voti.length} modelli, esempi per ${Object.keys(esempi).length} modelli, ${coppie.length} coppie → dati/musica.json`);
