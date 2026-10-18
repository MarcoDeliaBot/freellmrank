// Modelli piccoli (0,5–16 miliardi di parametri) dai repository ufficiali su Hugging Face.
// Arena ne vota pochi: qui li prendiamo per download, e il sito li segna "senza voti Arena".
// Scrive dati/piccoli.json.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RADICE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const AUTORI = ['Qwen', 'google', 'meta-llama', 'mistralai', 'microsoft', 'deepseek-ai', 'ibm-granite',
  'HuggingFaceTB', 'allenai', 'nvidia', 'LiquidAI', 'zai-org', 'XiaomiMiMo', 'tencent', 'CohereLabs',
  'ServiceNow-AI', 'baidu', 'swiss-ai', 'utter-project', 'openbmb', 'moonshotai', 'stepfun-ai', 'inclusionAI'];
const PER_AUTORE = 6;
const MIN_B = 0.5, MAX_B = 16;
const MIN_DOWNLOAD = 3000;
const DAL = '2025-01-01';
// confezioni, modelli di servizio, specialistici e versioni base / di ricerca
const SCARTA = /awq|gptq|fp8|fp4|nvfp4|int4|int8|gguf|mlx|onnx|bnb|embed|rerank|tts|asr|speech|audio|guard|safety|reward|prm|-base$|base-|classifier|ocr|retriev|colpali|siglip|vae|dflash|eagle|draft|mtp|parse|parsing|locate|prover|formaliz|ui-venus|gelab|medgemma|gsm8k|glyph|zwz|rlvr|pacore|bitnet|cosmos-reason|t5gemma|diffusion|olmo-3-1025|-pt$|-sft|-preview$/i;
// "Modello-8B-2509" si scarta se esiste "Modello-8B-Instruct-2509"
const senzaChat = (n) => n.replace(/-(instruct|it|chat)(?=-|$)/i, '');

async function elenco(autore) {
  const u = `https://huggingface.co/api/models?author=${encodeURIComponent(autore)}&sort=downloads&limit=100&expand[]=safetensors&expand[]=downloads&expand[]=likes&expand[]=pipeline_tag&expand[]=createdAt&expand[]=gated`;
  const r = await fetch(u);
  if (!r.ok) throw new Error(`${autore}: HTTP ${r.status}`);
  return r.json();
}

const uscita = [];
for (const a of AUTORI) {
  let lista;
  try { lista = await elenco(a); } catch (e) { console.log('salto', e.message); continue; }
  const candidati = lista.filter((m) => {
    const b = (m.safetensors?.total || 0) / 1e9;
    return b >= MIN_B && b <= MAX_B && m.downloads >= MIN_DOWNLOAD
      && ['text-generation', 'image-text-to-text'].includes(m.pipeline_tag)
      && (m.createdAt || '') >= DAL
      && !SCARTA.test(m.id.split('/')[1]);
  });
  const nomiChat = new Set(candidati.map((m) => m.id.split('/')[1]).filter((n) => senzaChat(n) !== n).map(senzaChat));
  const buoni = candidati.filter((m) => !nomiChat.has(m.id.split('/')[1])).slice(0, PER_AUTORE);
  for (const m of buoni) {
    const nome = m.id.split('/')[1];
    const cat = ['chat'];
    if (/coder|code|devstral/i.test(nome)) cat.push('code');
    if (m.pipeline_tag === 'image-text-to-text') cat.push('vision');
    uscita.push({
      repo: m.id, nome, org: a, parametri: m.safetensors.total, download: m.downloads, like: m.likes,
      tipo: m.pipeline_tag, creato: m.createdAt.slice(0, 10), gated: !!m.gated, cat,
    });
  }
}
uscita.sort((x, y) => y.download - x.download);
fs.writeFileSync(path.join(RADICE, 'dati', 'piccoli.json'), JSON.stringify(uscita, null, 1));
console.log(`modelli piccoli: ${uscita.length}`);
for (const m of uscita) console.log(`${m.repo.padEnd(52)} ${(m.parametri / 1e9).toFixed(1).padStart(5)}B ${String(m.download).padStart(9)} ${m.creato} ${m.cat.join(',')}${m.gated ? ' (gated)' : ''}`);
