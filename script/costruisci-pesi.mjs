// Cerca su Hugging Face il repository ufficiale di ogni modello aperto votato da Arena
// e ne legge il numero di parametri (metadati safetensors, senza scaricare i pesi).
// Scrive dati/pesi.json: { "<nome arena>": { repo, parametri, fonte } }.
// Le righe in dati/pesi-manuali.json vincono su quelle automatiche.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RADICE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dati = JSON.parse(fs.readFileSync(path.join(RADICE, 'sito', 'data.json'), 'utf8'));
const fileOut = path.join(RADICE, 'dati', 'pesi.json');
const vecchi = fs.existsSync(fileOut) ? JSON.parse(fs.readFileSync(fileOut, 'utf8')) : {};

// organizzazione Arena -> autori ufficiali su Hugging Face
const AUTORI = {
  xiaomi: ['XiaomiMiMo'], moonshot: ['moonshotai'], zai: ['zai-org'], deepseek: ['deepseek-ai'],
  alibaba: ['Qwen', 'Wan-AI', 'Tongyi-MAI'], google: ['google'], nvidia: ['nvidia'], tencent: ['tencent'],
  minimax: ['MiniMaxAI'], meta: ['meta-llama'], mistral: ['mistralai'], bfl: ['black-forest-labs'],
  ibm: ['ibm-granite'], microsoft: ['microsoft'], openai: ['openai'], ai2: ['allenai'],
  stepfun: ['stepfun-ai'], bytedance: ['ByteDance-Seed', 'ByteDance'], kandinsky: ['kandinskylab', 'ai-forever'],
  hidream: ['HiDream-ai'], krea: ['krea'], genmo: ['genmo'], cohere: ['CohereLabs'], '': ['Lightricks'],
};

const pulisci = (n) => n.replace(/\((max|high|xhigh|low|thinking|instant|nvfp4|bf16|fp8)[^)]*\)/gi, '')
  .replace(/-(max|high|xhigh)$/i, '').replace(/preview/i, '').trim();

// nome repository senza autore e senza suffissi di confezione
const base = (s) => s.toLowerCase().replace(/^[^/]+\//, '')
  .replace(/-sft-.*$/, '').replace(/-(it|instruct|rl|fp8|bf16|nvfp4|diffusers|base)$/, '')
  .replace(/-(it|instruct|rl|fp8|bf16|nvfp4|diffusers|base)$/, '').replace(/[^a-z0-9]/g, '');

async function cerca(autore, testo) {
  const u = `https://huggingface.co/api/models?author=${encodeURIComponent(autore)}&search=${encodeURIComponent(testo)}&sort=downloads&limit=5&expand[]=safetensors`;
  const r = await fetch(u);
  if (!r.ok) return [];
  return (await r.json()).filter((m) => m.safetensors?.total);
}

const nomi = new Map();
// le prime 120 della classifica GRATIS (non di quella generale): il sito mostra quella
for (const c of dati.categorie) for (const m of c.modelli.filter((x) => x.aperto).slice(0, 120)) nomi.set(m.nome, m.org);

const out = { ...vecchi };
let nuovi = 0;
for (const [nome, org] of nomi) {
  if (out[nome]) continue;
  const testo = pulisci(nome);
  let trovato = null;
  for (const a of AUTORI[org] || []) {
    const ris = await cerca(a, testo);
    // i pesi a 4 bit (NVFP4) mettono due parametri in un byte: safetensors ne conta la metà
    const uguali = ris.filter((m) => base(m.id) === base(testo));
    const giusto = uguali.find((m) => !/nvfp4/i.test(m.id));
    if (giusto) { trovato = giusto; break; }
  }
  if (trovato) {
    out[nome] = { repo: trovato.id, parametri: trovato.safetensors.total, fonte: 'hf-auto' };
    nuovi++;
  }
}
const manuali = path.join(RADICE, 'dati', 'pesi-manuali.json');
if (fs.existsSync(manuali)) Object.assign(out, JSON.parse(fs.readFileSync(manuali, 'utf8')));
fs.writeFileSync(fileOut, JSON.stringify(out, null, 1));
const mancano = [...nomi.keys()].filter((n) => !out[n]);
console.log(`modelli aperti: ${nomi.size}, con parametri: ${Object.keys(out).filter((k) => nomi.has(k)).length}, nuovi: ${nuovi}`);
for (const [n, v] of Object.entries(out)) if (nomi.has(n)) console.log(`${n} -> ${v.repo} ${(v.parametri / 1e9).toFixed(1)}B`);
console.log('\nSENZA:', mancano.join(' | '));
