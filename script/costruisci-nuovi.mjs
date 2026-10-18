// Modelli nuovi che Arena non vota ancora: gli ultimi pubblicati dai laboratori ufficiali
// su Hugging Face (qualunque dimensione) e i nuovi modelli gratis di OpenRouter.
// Quando Arena li vota, escono da qui ed entrano nella classifica.
// Scrive dati/nuovi.json.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RADICE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const leggi = (f, vuoto) => { const p = path.join(RADICE, f); return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : vuoto; };
const pesi = leggi('dati/pesi.json', {});
const piccoli = leggi('dati/piccoli.json', []);
const dati = leggi('sito/dati.json', { categorie: [], openrouterGratis: [] });

const AUTORI = ['Qwen', 'google', 'meta-llama', 'mistralai', 'microsoft', 'deepseek-ai', 'ibm-granite', 'HuggingFaceTB',
  'allenai', 'nvidia', 'LiquidAI', 'zai-org', 'XiaomiMiMo', 'tencent', 'CohereLabs', 'ServiceNow-AI', 'baidu', 'swiss-ai',
  'openbmb', 'moonshotai', 'stepfun-ai', 'inclusionAI', 'MiniMaxAI', 'meituan-longcat', 'ByteDance-Seed', 'openai',
  'black-forest-labs', 'Lightricks', 'Wan-AI', 'Tongyi-MAI', 'HiDream-ai', 'kandinskylab', 'utter-project'];
const GIORNI = 60;
const TIPI = { 'text-generation': ['chat'], 'image-text-to-text': ['chat', 'vision'], 'text-to-image': ['image'], 'image-to-image': ['edit'], 'text-to-video': ['video'], 'image-to-video': ['video'] };
const SCARTA = /awq|gptq|fp8|fp4|nvfp4|int4|int8|gguf|mlx|onnx|bnb|embed|rerank|guard|safety|reward|prm|-base$|base-|classifier|retriev|dflash|eagle|draft|mtp|-pt$|-sft|gsm8k|lora|dspark|staged|pretrain|midtrain|w8a8|w4a16|lilicorr|parse|parsing|ocr/i;
const soglia = new Date(Date.now() - GIORNI * 864e5).toISOString().slice(0, 10);

// già votati da Arena o già fra i piccoli
const noti = new Set([...Object.values(pesi).map((p) => p.repo), ...piccoli.map((p) => p.repo)]);
const nomiArena = new Set(dati.categorie.flatMap((c) => c.modelli.map((m) => m.nome.toLowerCase().replace(/[^a-z0-9]/g, ''))));
const votato = (nome) => {
  const k = nome.toLowerCase().replace(/[^a-z0-9]/g, '').replace(/instruct|it$|chat$/g, '');
  return [...nomiArena].some((a) => a.startsWith(k) || k.startsWith(a));
};

const uscita = [];
const famiglie = new Set(), perAutore = {};
for (const a of AUTORI) {
  const u = `https://huggingface.co/api/models?author=${encodeURIComponent(a)}&sort=createdAt&direction=-1&limit=40&expand[]=createdAt&expand[]=downloads&expand[]=likes&expand[]=pipeline_tag&expand[]=safetensors&expand[]=gated`;
  let lista;
  try { const r = await fetch(u); if (!r.ok) throw new Error(`HTTP ${r.status}`); lista = await r.json(); } catch (e) { console.log('salto', a, e.message); continue; }
  for (const m of lista) {
    const nome = m.id.split('/')[1];
    if ((m.createdAt || '') < soglia || !TIPI[m.pipeline_tag] || SCARTA.test(nome) || noti.has(m.id)) continue;
    if (!m.safetensors?.total) continue;
    if (m.downloads < 2000 && m.likes < 15) continue; // prove, checkpoint di ricerca e repository vuoti
    if (m.safetensors.total < 0.5e9) continue; // pezzi di supporto (draft, adattatori)
    const famiglia = nome.toLowerCase().replace(/-(distill|instruct|it|chat|bf16|thinking|preview)(?=-|$)/g, '').replace(/-d+s-diffusers$/, '');
    if (famiglie.has(famiglia) || (perAutore[a] || 0) >= 4) continue;
    famiglie.add(famiglia); perAutore[a] = (perAutore[a] || 0) + 1;
    if (votato(nome)) continue;
    let cat = [...TIPI[m.pipeline_tag]];
    // alcuni modelli di immagini sono etichettati come "image-text-to-text": decide il nome
    if (/flux|-image|stable-diffusion|hidream/i.test(nome) && cat.includes('chat')) cat = ['image'];
    if (/coder|code|devstral/i.test(nome)) cat.push('code');
    uscita.push({ repo: m.id, nome, org: a, parametri: m.safetensors.total, download: m.downloads, like: m.likes, tipo: m.pipeline_tag, creato: m.createdAt.slice(0, 10), gated: !!m.gated, cat, fonte: 'hf' });
  }
}

// modelli gratis di OpenRouter che Arena non vota
const collegati = new Set(dati.categorie.flatMap((c) => c.modelli.map((m) => m.or?.id)).filter(Boolean));
const nucleo = (s) => s.toLowerCase().replace(/^(nvidia|google|qwen|meta|microsoft)[-/ ]/, '').replace(/:free$/, '').replace(/-(bf16|fp8|instruct|it)$/g, '').replace(/[^a-z0-9]/g, '');
for (const m of dati.openrouterGratis || []) {
  if (collegati.has(m.id)) continue;
  // stesso modello già trovato su Hugging Face: si aggiunge solo l'API gratis
  const k = nucleo(m.id.split('/')[1]);
  const gemello = uscita.find((x) => x.fonte === 'hf' && k.length > 6 && nucleo(x.nome).includes(k));
  if (gemello) { gemello.or = m.id; continue; }
  uscita.push({ repo: null, nome: m.nome.replace(/\s*\(free\)\s*$/i, ''), org: m.id.split('/')[0], or: m.id, contesto: m.contesto, cat: ['chat'], fonte: 'openrouter' });
}

uscita.sort((x, y) => (y.creato || '').localeCompare(x.creato || ''));
fs.writeFileSync(path.join(RADICE, 'dati', 'nuovi.json'), JSON.stringify(uscita, null, 1));
console.log(`nuovi non votati: ${uscita.length} (Hugging Face ${uscita.filter((x) => x.fonte === 'hf').length}, OpenRouter ${uscita.filter((x) => x.fonte === 'openrouter').length})`);
for (const m of uscita) console.log(`${(m.creato || '—').padEnd(10)} ${(m.repo || m.or).padEnd(50)} ${m.parametri ? (m.parametri / 1e9).toFixed(1) + 'B' : ''} ${m.cat.join(',')}`);
