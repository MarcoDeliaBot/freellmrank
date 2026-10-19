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
const CATEGORIE = { chat: 'text', code: 'webdev', vision: 'vision', image: 'text_to_image', video: 'text_to_video', edit: 'image_edit' };

async function righe(config) {
  const file = path.join(DIR, `${config}.parquet`);
  if (!OFFLINE) {
    const r = await fetch(`https://huggingface.co/datasets/lmarena-ai/leaderboard-dataset/resolve/main/${config}/full-00000-of-00001.parquet`);
    if (!r.ok) throw new Error(`Arena ${config} full: HTTP ${r.status}`);
    fs.writeFileSync(file, Buffer.from(await r.arrayBuffer()));
  }
  const b = fs.readFileSync(file);
  const tutte = await parquetReadObjects({ file: b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength), columns: ['model_name', 'license', 'rating', 'category', 'leaderboard_publish_date'] });
  return tutte.filter((x) => x.category === 'overall');
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
  for (const x of ov) {
    const d = x.leaderboard_publish_date, n = x.model_name;
    if (!primo[n] || d < primo[n]) primo[n] = d;
    const i = indice.get(d);
    if (i === undefined) continue;
    const v = Math.round(x.rating);
    if (x.license === 'Proprietary') { if (pagato[i] == null || v > pagato[i]) pagato[i] = v; continue; }
    (serie[n] ||= recenti.map(() => null))[i] = v;
  }
  uscita.categorie[id] = { date: recenti, primo, serie, pagato };
  console.log(`${id}: ${date.length} aggiornamenti in tutto, ${recenti.length} negli ultimi ${GIORNI} giorni, ${Object.keys(serie).length} modelli aperti con andamento`);
}
fs.mkdirSync(path.join(RADICE, 'sito'), { recursive: true });
fs.writeFileSync(path.join(RADICE, 'sito', 'history.json'), JSON.stringify(uscita));
console.log('history.json', (fs.statSync(path.join(RADICE, 'sito', 'history.json')).size / 1e3).toFixed(0), 'KB');
