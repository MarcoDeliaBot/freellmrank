// Dati della pagina /3d-models: download degli ultimi 30 giorni e like su Hugging Face per i modelli
// di dati/3d-modelli.json. Arena non vota i modelli 3D, quindi l'ordine è per download, non per qualità.
// Segnala anche i modelli image-to-3d / text-to-3d di laboratori noti che non sono ancora nell'elenco.
// Uscita: dati/3d.json. Se Hugging Face non risponde resta il file di ieri.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RADICE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const elenco = JSON.parse(fs.readFileSync(path.join(RADICE, 'dati', '3d-modelli.json'), 'utf8'));
const prendi = async (url) => {
  const r = await fetch(url, { headers: { 'User-Agent': 'freellmarena.com data job' }, signal: AbortSignal.timeout(30000) });
  if (!r.ok) throw new Error(`${url} → HTTP ${r.status}`);
  return r.json();
};
process.on('unhandledRejection', (e) => { console.warn(`3d: saltata (${e.message}), resta dati/3d.json di prima`); process.exit(0); });

const CAMPI = ['downloads', 'likes', 'createdAt', 'lastModified', 'safetensors'].map((c) => `expand[]=${c}`).join('&');
const modelli = [];
for (const m of elenco.modelli) {
  const h = await prendi(`https://huggingface.co/api/models/${m.repo}?${CAMPI}`);
  modelli.push({ ...m, download: h.downloads || 0, like: h.likes || 0, creato: (h.createdAt || '').slice(0, 10), b: h.safetensors?.total ? +(h.safetensors.total / 1e9).toFixed(1) : null });
}
modelli.sort((a, b) => b.download - a.download);

// candidati: laboratori noti, repository originali, non ancora in elenco (da valutare a mano)
const LAB = /^(microsoft|stabilityai|tencent|TencentARC|VAST-AI|openai|facebook|apple|nvidia|google|alibaba|Qwen|bytedance|ByteDance-Seed)\//;
const visti = new Set(elenco.modelli.map((m) => m.repo));
const nuovi = [];
for (const tag of ['image-to-3d', 'text-to-3d']) {
  for (const h of await prendi(`https://huggingface.co/api/models?pipeline_tag=${tag}&sort=downloads&direction=-1&limit=60&expand[]=downloads`)) {
    if (LAB.test(h.id) && !visti.has(h.id) && h.downloads >= 1000) nuovi.push(`${h.id} (${h.downloads})`);
  }
}
if (nuovi.length) console.log(`3d: da valutare per dati/3d-modelli.json: ${nuovi.join(', ')}`);

fs.writeFileSync(path.join(RADICE, 'dati', '3d.json'), JSON.stringify({ aggiornato: new Date().toISOString().slice(0, 10), licenze: elenco.licenze, modelli }, null, 1) + '\n');
console.log(`3d: ${modelli.length} modelli → dati/3d.json`);
