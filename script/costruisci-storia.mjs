// Storico dei voti Arena (split "full" del dataset, CC-BY-4.0): andamento dei punteggi,
// data del primo arrivo di ogni modello, miglior modello a pagamento a ogni data.
// Scrive sito/history.json. Uso: node script/costruisci-storia.mjs [--offline]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parquetReadObjects } from 'hyparquet';

const RADICE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = path.join(RADICE, 'dati', 'arena-storia');
fs.mkdirSync(DIR, { recursive: true });
const OFFLINE = process.argv.includes('--offline');
const GIORNI = 182; // andamento degli ultimi sei mesi
const CATEGORIE = { chat: 'text_style_control', code: 'webdev', vision: 'vision_style_control', image: 'text_to_image', video: 'text_to_video', edit: 'image_edit', document: 'document_style_control', search: 'search_style_control', i2v: 'image_to_video', vedit: 'video_edit', agent: 'agent' };

async function righe(config) {
  const file = path.join(DIR, `${config}.parquet`);
  if (!OFFLINE) {
    const r = await fetch(`https://huggingface.co/datasets/lmarena-ai/leaderboard-dataset/resolve/main/${config}/full-00000-of-00001.parquet`);
    if (!r.ok) throw new Error(`Arena ${config} full: HTTP ${r.status}`);
    fs.writeFileSync(file, Buffer.from(await r.arrayBuffer()));
  }
  const b = fs.readFileSync(file);
  const tutte = await parquetReadObjects({ file: b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength), columns: config === 'agent' ? ['model_name', 'license', 'score', 'category', 'leaderboard_publish_date'] : ['model_name', 'license', 'rating', 'category', 'leaderboard_publish_date'] });
  // gli agenti hanno score da 0 a 1: ×100 con un decimale, come in costruisci-dati.mjs
  return tutte.filter((x) => x.category === 'overall').map((x) => (config === 'agent' ? { ...x, rating: Number(x.score) * 100 } : x));
}

const uscita = { aggiornato: new Date().toISOString().slice(0, 10), categorie: {} };
for (const [id, config] of Object.entries(CATEGORIE)) {
  const ov = await righe(config);
  const date = [...new Set(ov.map((x) => x.leaderboard_publish_date))].sort();
  const ultima = date.at(-1);
  const soglia = new Date(Date.parse(ultima) - GIORNI * 864e5).toISOString().slice(0, 10);
  const recenti = date.filter((d) => d >= soglia);
  const indice = new Map(recenti.map((d, i) => [d, i]));
  const primo = {}, serie = {}, pagato = recenti.map(() => null);
  // dal 20/10/2026 Arena scrive i nomi in un altro modo ("mimo-v2.6-pro" -> "MiMo-V2.6-Pro"):
  // le righe vecchie e nuove dello stesso modello vanno sotto il nome dell'ultima data
  const chiave = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');
  const nomeAttuale = new Map();
  for (const x of ov) { const k = chiave(x.model_name), p = nomeAttuale.get(k); if (!p || x.leaderboard_publish_date >= p.d) nomeAttuale.set(k, { n: x.model_name, d: x.leaderboard_publish_date }); }
  for (const x of ov) {
    const d = x.leaderboard_publish_date, n = nomeAttuale.get(chiave(x.model_name)).n;
    if (!primo[n] || d < primo[n]) primo[n] = d;
    const i = indice.get(d);
    if (i === undefined) continue;
    const v = config === 'agent' ? Math.round(x.rating * 10) / 10 : Math.round(x.rating);
    if (x.license === 'Proprietary') { if (pagato[i] == null || v > pagato[i]) pagato[i] = v; continue; }
    (serie[n] ||= recenti.map(() => null))[i] = v;
  }
  uscita.categorie[id] = { date: recenti, primo, serie, pagato };
  console.log(`${id}: ${date.length} aggiornamenti in tutto, ${recenti.length} negli ultimi ${GIORNI} giorni, ${Object.keys(serie).length} modelli aperti con andamento`);
}
fs.mkdirSync(path.join(RADICE, 'sito'), { recursive: true });
fs.writeFileSync(path.join(RADICE, 'sito', 'history.json'), JSON.stringify(uscita));
console.log('history.json', (fs.statSync(path.join(RADICE, 'sito', 'history.json')).size / 1e3).toFixed(0), 'KB');
