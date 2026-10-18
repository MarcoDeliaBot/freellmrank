// Scarica i voti di Arena (Hugging Face, CC-BY-4.0) e il listino OpenRouter,
// li collega per nome e scrive sito/dati.json.
// Uso: node script/costruisci-dati.mjs [--offline]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parquetReadObjects } from 'hyparquet';

const RADICE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR_ARENA = path.join(RADICE, 'dati', 'arena');
fs.mkdirSync(DIR_ARENA, { recursive: true });
const OFFLINE = process.argv.includes('--offline');

// Arena config -> categoria del sito
const CATEGORIE = [
  { id: 'chat', arena: 'text', nome: 'Chat' },
  { id: 'code', arena: 'webdev', nome: 'Coding' },
  { id: 'vision', arena: 'vision', nome: 'Vision' },
  { id: 'image', arena: 'text_to_image', nome: 'Image' },
  { id: 'video', arena: 'text_to_video', nome: 'Video' },
  { id: 'edit', arena: 'image_edit', nome: 'Image edit' },
];

async function scaricaArena(config) {
  const file = path.join(DIR_ARENA, `${config}.parquet`);
  if (!OFFLINE) {
    const url = `https://huggingface.co/datasets/lmarena-ai/leaderboard-dataset/resolve/main/${config}/latest-00000-of-00001.parquet`;
    const r = await fetch(url);
    if (!r.ok) throw new Error(`Arena ${config}: HTTP ${r.status}`);
    fs.writeFileSync(file, Buffer.from(await r.arrayBuffer()));
  }
  const b = fs.readFileSync(file);
  return parquetReadObjects({ file: b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) });
}

async function scaricaOpenRouter() {
  const file = path.join(RADICE, 'dati', 'or.json');
  if (!OFFLINE) {
    const r = await fetch('https://openrouter.ai/api/v1/models');
    if (!r.ok) throw new Error(`OpenRouter: HTTP ${r.status}`);
    fs.writeFileSync(file, await r.text());
  }
  return JSON.parse(fs.readFileSync(file, 'utf8')).data;
}

// "Kimi K3 (Max)" -> "kimik3" ; "moonshotai/kimi-k3:free" -> "kimik3"
const norma = (s) => String(s).toLowerCase()
  .replace(/^[^/]+\//, '')
  .replace(/:free$/, '')
  .replace(/\((max|high|xhigh|low|medium|thinking)\)/g, '')
  .replace(/-(max|high|xhigh|instruct|it|preview)$/g, '')
  .replace(/[^a-z0-9.]/g, '')
  .replace(/\./g, '');

const libero = (m) => Number(m.pricing?.prompt) === 0 && Number(m.pricing?.completion) === 0;

const orModelli = await scaricaOpenRouter();
const indiceOR = new Map();
for (const m of orModelli) {
  for (const k of [norma(m.id), norma(m.name)]) {
    const prima = indiceOR.get(k);
    // a parità di nome tiene la variante gratuita
    if (!prima || (libero(m) && !libero(prima))) indiceOR.set(k, m);
  }
}

// parametri letti da Hugging Face con script/costruisci-pesi.mjs
const filePesi = path.join(RADICE, 'dati', 'pesi.json');
const pesi = fs.existsSync(filePesi) ? JSON.parse(fs.readFileSync(filePesi, 'utf8')) : {};

const uscita = { aggiornato: new Date().toISOString().slice(0, 10), fonte: 'Arena leaderboard dataset (CC-BY-4.0) + OpenRouter', categorie: [] };
const nonCollegati = [];

for (const c of CATEGORIE) {
  const righe = (await scaricaArena(c.arena)).filter((r) => r.category === 'overall')
    .sort((a, b) => Number(a.rank) - Number(b.rank));
  const modelli = righe.map((r) => {
    const or = indiceOR.get(norma(r.model_name));
    const aperto = r.license !== 'Proprietary';
    if (aperto && !or && Number(r.rank) <= 80) nonCollegati.push(`${c.arena}: ${r.model_name}`);
    return {
      nome: r.model_name,
      org: r.organization || '',
      licenza: r.license,
      aperto,
      pos: Number(r.rank),
      punti: Math.round(r.rating),
      voti: Number(r.vote_count),
      or: or ? { id: or.id, gratis: libero(or) } : null,
      hf: aperto && pesi[r.model_name] ? { repo: pesi[r.model_name].repo, b: +(pesi[r.model_name].parametri / 1e9).toFixed(1) } : null,
    };
  });
  uscita.categorie.push({ id: c.id, nome: c.nome, data: righe[0]?.leaderboard_publish_date, totale: modelli.length, modelli });
}

// modelli gratuiti di OpenRouter, anche quelli che Arena non vota
const SCARTA = /^openrouter\/free$|lyria|content-safety/;
uscita.openrouterGratis = orModelli.filter((m) => libero(m) && !SCARTA.test(m.id))
  .map((m) => ({ id: m.id, nome: m.name, contesto: m.context_length }));

fs.mkdirSync(path.join(RADICE, 'sito'), { recursive: true });
fs.writeFileSync(path.join(RADICE, 'sito', 'dati.json'), JSON.stringify(uscita));
for (const c of uscita.categorie) {
  const ap = c.modelli.filter((m) => m.aperto);
  console.log(`${c.id}: ${c.totale} modelli, ${ap.length} aperti, ${c.modelli.filter((m) => m.or?.gratis).length} gratis su OpenRouter, ${c.modelli.filter((m) => m.or).length} collegati a OpenRouter`);
}
console.log(`OpenRouter gratis (testo): ${uscita.openrouterGratis.length}`);
console.log(`Aperti nei primi 80 senza collegamento: ${nonCollegati.length}`);
console.log(nonCollegati.slice(0, 40).join('\n'));
