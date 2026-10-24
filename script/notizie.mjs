// Notizie del blog (decise da Marco il 22/10/2026): tutto il mondo AI, non solo i modelli gratis (LLM a pagamento,
// hardware, software, guide), da fonti ufficiali e siti di notizie. Si pubblicano da sole «dopo il controllo dei fatti».
// 1. legge i feed (FONTI), tiene le voci degli ultimi 3 giorni che parlano di AI
// 2. raggruppa le voci sulla stessa storia: vince quella citata da più fonti, con un bonus se c'è una fonte ufficiale
// 3. scarica il testo delle pagine e chiede a Workers AI un articolo in inglese basato SOLO su quelle pagine
// 4. controlli in codice, frase per frase: ogni numero e ogni nome devono stare nelle fonti (o nei dati del sito),
//    e nessuna frase può copiare 10 parole di fila da una fonte (diritto d'autore). Le frasi che non passano si tolgono;
//    se ne resta troppo poco, l'articolo non esce.
// Scrive contenuti/notizie/<data>-<slug>.json, che script/sito/blog.mjs trasforma in post.
// Uso: BOZZE_KEY=… node script/notizie.mjs [--max 2] [--prova]   (--prova: scrive in /tmp, non pubblica)
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { RADICE } from './sito/comune.mjs';
import { chiediModello, REGOLE_SCRITTURA } from './bozze.mjs';
import { numeri } from './video-post.mjs';

const FONTI = [
  { nome: 'OpenAI', url: 'https://openai.com/news/rss.xml', ufficiale: true },
  { nome: 'Google DeepMind', url: 'https://deepmind.google/blog/rss.xml', ufficiale: true },
  { nome: 'Hugging Face', url: 'https://huggingface.co/blog/feed.xml', ufficiale: true },
  { nome: 'NVIDIA', url: 'https://blogs.nvidia.com/feed/', ufficiale: true },
  { nome: 'Qwen', url: 'https://qwenlm.github.io/blog/index.xml', ufficiale: true },
  { nome: 'The Verge', url: 'https://www.theverge.com/rss/ai-artificial-intelligence/index.xml' },
  { nome: 'TechCrunch', url: 'https://techcrunch.com/category/artificial-intelligence/feed/' },
  { nome: 'Ars Technica', url: 'https://feeds.arstechnica.com/arstechnica/technology-lab' },
  { nome: 'MarkTechPost', url: 'https://www.marktechpost.com/feed/' },
  { nome: 'Simon Willison', url: 'https://simonwillison.net/atom/everything/' },
  // 24/10/2026: Kimi K3.1 Pro e Claude Duet non erano usciti; SiliconANGLE e The Decoder li avevano entrambi (Unite.AI risponde 403 al nostro programma)
  { nome: 'SiliconANGLE', url: 'https://siliconangle.com/category/ai/feed/' },
  { nome: 'The Decoder', url: 'https://the-decoder.com/feed/' },
  // 24/10/2026, Marco: «perché tutte queste informazioni non me le hai trovate? dobbiamo stare sul pezzo». Timestral era
  // nel feed di Mistral, che non leggevamo; le altre fonti qui sotto le ho provate una per una (Reddit e VentureBeat
  // bloccano il programma, X non si legge gratis, il feed di AINews è fermo a settembre)
  { nome: 'Mistral', url: 'https://mistral.ai/rss.xml', ufficiale: true },
  { nome: 'Google', url: 'https://blog.google/technology/ai/rss/', ufficiale: true },
  { nome: 'Google Developers', url: 'https://developers.googleblog.com/feeds/posts/default', ufficiale: true },
  { nome: 'NVIDIA Developer', url: 'https://developer.nvidia.com/blog/feed', ufficiale: true },
  { nome: 'TestingCatalog', url: 'https://www.testingcatalog.com/rss/' },
  { nome: 'ZDNet', url: 'https://www.zdnet.com/topic/artificial-intelligence/rss.xml' },
  { nome: 'Latent Space', url: 'https://www.latent.space/feed' },
  { nome: 'Interconnects', url: 'https://www.interconnects.ai/feed' },
  { nome: 'LessWrong', url: 'https://www.lesswrong.com/feed.xml?view=curated-rss' },
];
// laboratori senza feed: si legge la pagina delle notizie e la data dentro ogni articolo
const PAGINE = [
  { nome: 'Anthropic', url: 'https://www.anthropic.com/news', base: 'https://www.anthropic.com', link: /href="(\/news\/[a-z0-9-]+)"/g, ufficiale: true },
  { nome: 'Meta AI', url: 'https://ai.meta.com/blog/', base: '', link: /href="(https:\/\/ai\.meta\.com\/blog\/[a-z0-9-]+\/)"/g, ufficiale: true },
];
// radar: ciò che esce prima su Hugging Face e GitHub che sui giornali (modelli, framework come DeepInfer)
const ORG_HF = { mistralai: 'Mistral AI', 'deepseek-ai': 'DeepSeek', Qwen: 'Qwen', google: 'Google', 'meta-llama': 'Meta', facebook: 'Meta', MiniMaxAI: 'MiniMax',
  tencent: 'Tencent', inclusionAI: 'Ant Group', RecursiveSI: 'Recursive', 'black-forest-labs': 'Black Forest Labs', nvidia: 'NVIDIA', LiquidAI: 'Liquid AI',
  moonshotai: 'Moonshot AI', 'zai-org': 'Z.ai', XiaomiMiMo: 'Xiaomi', 'ibm-granite': 'IBM', microsoft: 'Microsoft', openai: 'OpenAI', 'stepfun-ai': 'StepFun',
  'ByteDance-Seed': 'ByteDance', baidu: 'Baidu', Lightricks: 'Lightricks', allenai: 'Ai2', HuggingFaceTB: 'Hugging Face', 'meituan-longcat': 'Meituan' };
const SCARTA_HF = /awq|gptq|fp8|fp4|nvfp4|int4|int8|gguf|mlx|onnx|bnb|uncensored|abliterat|quantized|-comfy|lora/i;
// lanci dei grandi laboratori: passano davanti (Marco, 24/10/2026: «oggi è uscito Kimi K3.1, Anthropic ha annunciato
// Claude Duet e non hai fatto neanche un post»; erano nei feed ma perdevano contro storie citate da più siti)
export const LABORATORI = /\b(Anthropic|Claude|OpenAI|GPT[-\w.]*|ChatGPT|Gemini|Gemma|DeepMind|Meta|Llama|Kimi|Moonshot|DeepSeek|Qwen|Alibaba|Mistral|GLM|Zhipu|Z\.ai|MiniMax|xAI|Grok|Nemotron|Phi-\d|Granite|Hunyuan|Tencent|ERNIE|Liquid AI|Ant Group|Ling|Xiaomi|MiMo|ByteDance|StepFun|Black Forest Labs|FLUX|Recursive)\b/i; // NVIDIA no: ogni articolo del suo blog sembrava un lancio
export const LANCIO = /\b(launch|launches|launched|release[sd]?|introduc\w*|unveil\w*|announc\w*|debut\w*|open[- ]sourc\w*|open[- ]weights?|new model|rolls? out)\b/i;
const GIORNI = 3;
const AI = /\b(AI|A\.I\.|LLMs?|GPT[-\w.]*|Gemini|Claude|Llama|Qwen|DeepSeek|Mistral|Grok|Copilot|ChatGPT|OpenAI|Anthropic|DeepMind|Hugging Face|NVIDIA|GPUs?|chatbots?|agents?|agentic|neural|machine learning|model weights|open[- ]weights?|inference|transformer|diffusion)\b/i;
const UA = { 'User-Agent': 'Mozilla/5.0 (compatible; FreeLLMArenaBot/1.0; +https://freellmarena.com/about)' };
const arg = (n, d) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d; };
const MAX = Number(arg('--max', 3));
const PROVA = process.argv.includes('--prova');
const DIR = PROVA ? path.join(os.tmpdir(), 'notizie-prova') : path.join(RADICE, 'contenuti', 'notizie');

const scarica = async (url, ms = 20000) => {
  const r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(ms), redirect: 'follow' });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.text();
};
const entita = (s) => String(s).replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#0?39;|&apos;|&#8217;/g, "'").replace(/&#8211;|&#8212;/g, '-').replace(/&#8220;|&#8221;/g, '"').replace(/&nbsp;/g, ' ').replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
const testoDa = (html) => entita(String(html).replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<noscript[\s\S]*?<\/noscript>|<nav[\s\S]*?<\/nav>|<footer[\s\S]*?<\/footer>|<header[\s\S]*?<\/header>/gi, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
const campo = (xml, nomi) => { for (const n of nomi) { const m = xml.match(new RegExp(`<${n}[^>]*>([\\s\\S]*?)</${n}>`, 'i')); if (m) return entita(m[1]).trim(); } return ''; };

// 1. feed: RSS (<item>) o Atom (<entry>)
async function leggiFeed(f) {
  const xml = await scarica(f.url);
  const voci = [...xml.matchAll(/<(item|entry)[\s>][\s\S]*?<\/\1>/gi)].map((m) => m[0]);
  return voci.map((v) => {
    const link = (v.match(/<link[^>]*href="([^"]+)"/i) || [])[1] || campo(v, ['link']);
    const data = new Date(campo(v, ['pubDate', 'published', 'updated', 'dc:date']));
    return { fonte: f.nome, ufficiale: !!f.ufficiale, titolo: testoDa(campo(v, ['title'])), link: link.trim(), data, sommario: testoDa(campo(v, ['description', 'summary', 'content:encoded', 'content'])).slice(0, 1500) };
  }).filter((v) => v.titolo && v.link && !Number.isNaN(v.data.getTime()));
}

// data di un articolo: meta del sito, JSON-LD o la prima data scritta per esteso («October 23, 2026», «Oct 23, 2026»)
const MESI = 'January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec';
function dataDa(html) {
  const m = html.match(/article:published_time"\s+content="([^"]+)"/i) || html.match(/"datePublished"\s*:\s*"([^"]+)"/i)
    || html.match(new RegExp(`\\b((?:${MESI})\\.? \\d{1,2}, 20\\d\\d)\\b`));
  return m ? new Date(m[1].replace(/^Sept\b/, 'Sep')) : new Date(NaN);
}

// 1b. pagine delle notizie senza feed: i primi articoli della pagina, con titolo e data letti dall'articolo
async function leggiPagina(p, linkFatti) {
  const html = await scarica(p.url);
  const link = [...new Set([...html.matchAll(p.link)].map((m) => p.base + m[1]))].filter((u) => !linkFatti.has(u) && u !== p.url).slice(0, 12);
  const voci = [];
  for (const u of link) {
    try {
      const a = await scarica(u);
      const titolo = testoDa(campo(a, ['title'])).replace(/\s*[|\\-]\s*(Anthropic|AI at Meta|Meta AI)\s*$/i, '');
      const sommario = entita((a.match(/<meta[^>]+(?:name|property)="(?:og:)?description"[^>]+content="([^"]*)"/i) || [])[1] || '');
      voci.push({ fonte: p.nome, ufficiale: !!p.ufficiale, titolo, link: u, data: dataDa(a), sommario });
    } catch (e) { console.log(`notizie: salto ${u} (${e.message})`); }
  }
  return voci.filter((v) => v.titolo && !Number.isNaN(v.data.getTime()));
}

// 1c. radar: modelli di tendenza su Hugging Face (dei laboratori, non le copie quantizzate) e nuovi progetti AI su GitHub
// 1d. segnali: i titoli degli ultimi video dei canali YouTube che Marco segue (24/10/2026: ci ha mandato i loro video su
// DeepInfer, Timestral, Flint, Strata, TimesFM). Il feed RSS dei canali risponde 404: si legge la pagina «Video».
// Non diventano notizie da soli (un titolo di video non è una fonte dei fatti): fanno solo salire le storie di cui parlano
const CREATOR = [
  { nome: 'Julian Goldie SEO', id: 'UCGpsgNbzdF7BECCVbB1COHw' }, { nome: 'Julian Goldie AI', id: 'UCX9_0hjELAj1RAb2s3S5gpA' },
  { nome: "Luke's Dev Lab", id: 'UC6YL31AicZzw1-gap7zBm9A' }, { nome: 'Sam Witteveen', id: 'UC55ODQSvARtgSyc8ThfiepQ' },
  { nome: 'Prompt Engineering', id: 'UCDq7SjbgRKty5TgGafW8Clg' }, { nome: 'Brendan Jowett', id: 'UCzIsviqoJc-VcWqF5Pp8iLw' },
  { nome: 'Matthew Berman', id: 'UCzi5kcwU8aT4aLR7LcYhfWQ' }, { nome: 'AICodeKing', id: 'UC0m81bQuthaQZmFbXEY9QSw' }, { nome: 'Wes Roth', id: 'UCqcbQf6yw5KzRoDDcZ_wBSw' },
];
async function segnali() {
  const uscita = [];
  for (const c of CREATOR) {
    try {
      const r = await fetch(`https://www.youtube.com/channel/${c.id}/videos`, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 'Accept-Language': 'en', Cookie: 'SOCS=CAI' }, signal: AbortSignal.timeout(20000) });
      const html = await r.text();
      const titoli = [...html.matchAll(/"lockupMetadataViewModel":\{"title":\{"content":"((?:[^"\\]|\\.)*)"/g)].map((m) => entita(JSON.parse(`"${m[1]}"`))).slice(0, 10);
      if (titoli.length) uscita.push({ nome: c.nome, titoli });
    } catch (e) { console.log(`notizie: salto il canale ${c.nome} (${e.message})`); }
  }
  console.log(`notizie: segnali da ${uscita.length} canali YouTube su ${CREATOR.length}`);
  return uscita;
}

async function radar() {
  const voci = [];
  try {
    const lista = JSON.parse(await scarica('https://huggingface.co/api/models?sort=trendingScore&limit=40'));
    for (const m of lista) {
      const [org, nome] = m.id.split('/');
      const giorni = (Date.now() - new Date(m.createdAt)) / 864e5;
      if (giorni > 7 || SCARTA_HF.test(nome) || !(ORG_HF[org] ? m.likes >= 100 : m.likes >= 500)) continue;
      const lab = ORG_HF[org] || org;
      voci.push({ fonte: 'Hugging Face trending', ufficiale: true, titolo: `${lab} releases ${nome} on Hugging Face`, link: `https://huggingface.co/${m.id}`,
        data: new Date(m.createdAt), sommario: `${lab} published the model ${nome} (${m.pipeline_tag || 'model'}) on Hugging Face. ${m.likes} likes.` });
    }
  } catch (e) { console.log(`notizie: salto Hugging Face trending (${e.message})`); }
  // ricerche del giorno su Hugging Face Papers: quelle dei grandi laboratori o molto votate (es. il lavoro di Meta sui byte al posto dei token)
  const ORG_PAPER = /^(google|google-deepmind|facebook|meta|metaresearch|MicrosoftResearch|microsoft|nvidia|deepseek-ai|Qwen|openai|anthropic|tencent|TencentARC|mistralai|allenai|LiquidAI|moonshotai|zai-org|ByteDance-Seed|inclusionAI|apple)$/i;
  for (const g of [0, 1]) {
    const giorno = new Date(Date.now() - g * 864e5).toISOString().slice(0, 10);
    try {
      for (const p of JSON.parse(await scarica(`https://huggingface.co/api/daily_papers?date=${giorno}&limit=100`))) {
        const org = p.paper?.organization?.name || '';
        if (!(ORG_PAPER.test(org) ? p.paper.upvotes >= 20 : p.paper.upvotes >= 150)) continue;
        const lab = ORG_HF[org] || p.paper.organization?.fullname || org || 'Researchers';
        voci.push({ fonte: 'Hugging Face Papers', ufficiale: true, titolo: `${lab} paper: ${p.title}`.slice(0, 200), link: `https://huggingface.co/papers/${p.paper.id}`,
          data: new Date(p.publishedAt || giorno), sommario: String(p.paper.summary || '').slice(0, 1500) });
      }
    } catch (e) { console.log(`notizie: salto Hugging Face Papers ${giorno} (${e.message})`); }
  }
  try {
    const da = new Date(Date.now() - 10 * 864e5).toISOString().slice(0, 10);
    const q = encodeURIComponent(`created:>${da} stars:>800`);
    const h = { ...UA, Accept: 'application/vnd.github+json', ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}) };
    const r = await fetch(`https://api.github.com/search/repositories?q=${q}&sort=stars&order=desc&per_page=50`, { headers: h, signal: AbortSignal.timeout(20000) });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    // solo progetti di AI (descrizione o argomenti), non i tanti progetti di moda della settimana
    const RADAR_AI = /\b(LLMs?|AI|agents?|agentic|inference|model|transformer|diffusion|Claude|GPT|Gemini|Qwen|DeepSeek|MCP|RAG|fine-?tun\w*|embedding|speech|TTS)\b/i;
    for (const p of (await r.json()).items || []) {
      const testo = `${p.description || ''} ${(p.topics || []).join(' ')}`;
      if (!RADAR_AI.test(testo)) continue;
      voci.push({ fonte: 'GitHub trending', ufficiale: ORG_HF[p.owner.login] !== undefined || /^(deepseek-ai|QwenLM|openai|anthropics|google|google-deepmind|facebookresearch|meta-llama|microsoft|NVIDIA|mistralai|huggingface|MoonshotAI|NousResearch|Liquid4All)$/i.test(p.owner.login),
        titolo: `${p.full_name}: ${p.description || 'new open-source project'}`.slice(0, 200), link: p.html_url, data: new Date(p.created_at),
        sommario: `${p.description || ''} Open-source project on GitHub with ${p.stargazers_count} stars, created ${p.created_at.slice(0, 10)}.` });
    }
  } catch (e) { console.log(`notizie: salto GitHub trending (${e.message})`); }
  return voci;
}

// parole che distinguono una storia (nomi propri, nomi di modelli con numeri), per riconoscere la stessa notizia su più siti
const VUOTE = new Set('the a an and or of to in on for with from by is are was be this that new its at as how why what will can now your our their it after into over says said launches launched release released introduces announces using use more than about up out just'.split(' '));
const parole = (s) => new Set(String(s).toLowerCase().replace(/[^a-z0-9.\- ]/g, ' ').split(/\s+/).filter((w) => w.length > 2 && !VUOTE.has(w)));
// stessa storia: almeno 2 parole in comune e metà delle parole del titolo più corto («programming» da sola non basta)
// nomi propri di prodotto («DeepInfer», «Timestral-209M» -> «timestral», «Flint»): basta uno in comune per dire stessa storia,
// perché il radar scrive «Mistral AI releases Timestral-209M» e il blog di Mistral «Introducing Timestral» (24/10/2026).
// I nomi dei laboratori e le parole da titolo non contano: due notizie diverse su Claude non sono la stessa storia
const COMUNI = /^(introducing|announcing|releases?|launch\w*|hugging|face|github|google|cloud|model|models|agent|agents|agentic|open|source|today|update|security|research|developers?|enterprise|platform|coding|reasoning|policy|frontier|national|global|america\w*|europe\w*|china|chinese|world|new|first|best|faster|better|smaller|larger|week|year|startup|series|funding|billion|million|study|report|paper|benchmark|safety|preview|beta|available|generally|support|now|with|what|how|why|when)$/i;
// nomi «forti»: con maiuscola interna (DeepInfer) o con cifre (Timestral-209M); il nome nudo nell'altro titolo basta
const forti = (t) => [...String(t).matchAll(/\b([A-Z][a-z]+[A-Z]\w*|[A-Za-z]{5,}[-.]?\d[\w.-]*)\b/g)].map((m) => m[1].toLowerCase().split(/[-.]?\d/)[0])
  .filter((w) => w.length >= 5 && !COMUNI.test(w) && !LABORATORI.test(w));
const tutteParole = (t) => new Set(String(t).toLowerCase().split(/[^a-z0-9]+/));
const simili = (a, b) => {
  const A = parole(a), B = parole(b); let c = 0; for (const w of A) if (B.has(w)) c++;
  const pa = tutteParole(a), pb = tutteParole(b);
  if (forti(a).some((w) => pb.has(w)) || forti(b).some((w) => pa.has(w))) return 1;
  return c >= 2 ? c / Math.max(1, Math.min(A.size, B.size)) : 0;
};

// 4. controlli in codice
// una frase finisce con . ! ? seguiti da spazio e maiuscola: «GPT-5.6» e «400,000» restano interi
const frasi = (t) => String(t).trim().split(/(?<=[.!?]["')]?)\s+(?=["'(]?[A-Z0-9])/).map((s) => s.trim()).filter(Boolean);
// nomi da controllare: parole con maiuscola non a inizio frase, sigle e nomi con cifre (GPT-5, H200, Llama-4)
const NOTI = /^(I|AI|The|This|That|It|In|On|For|And|But|If|What|Why|How|FreeLLMArena|Arena|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|January|February|March|April|May|June|July|August|September|October|November|December|English|US|EU|UK)$/;
export function nomiDi(frase) {
  const t = frase.replace(/^["'(\s]*\S+/, ''); // la prima parola della frase ha la maiuscola comunque
  return [...t.matchAll(/\b([A-Z][\w.\-]*[A-Za-z0-9]|[A-Za-z]+-?\d[\w.\-]*)\b/g)].map((m) => m[1]).filter((n) => !NOTI.test(n));
}
const copia = (frase, fonteMin) => {
  const w = frase.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(Boolean);
  for (let i = 0; i + 10 <= w.length; i++) if (fonteMin.includes(' ' + w.slice(i, i + 10).join(' ') + ' ')) return true;
  return false;
};
export function controlla(paragrafi, fontiTesto) {
  const tutto = fontiTesto.join(' \n ');
  const basso = tutto.toLowerCase();
  const min = ' ' + basso.replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ') + ' ';
  const visti = numeri(tutto);
  const tolte = [];
  const tenuti = paragrafi.map((p) => frasi(p).filter((s) => {
    const n = [...numeri(s)].filter((x) => !visti.has(x));
    const nomi = nomiDi(s).filter((x) => !basso.includes(x.toLowerCase()));
    const c = copia(s, min);
    if (n.length || nomi.length || c) { tolte.push({ s, n, nomi, copia: c }); return false; }
    return true;
  }).join(' ')).filter((p) => p.length > 40);
  return { paragrafi: tenuti, tolte };
}

const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 70);

async function main() {
  fs.mkdirSync(DIR, { recursive: true });
  // già pubblicate: non si riscrive la stessa storia
  const fatte = fs.readdirSync(DIR).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8')));
  const linkFatti = new Set(fatte.flatMap((n) => n.fonti.map((f) => f.url)));
  const limite = Date.now() - GIORNI * 864e5;
  const voci = [];
  for (const f of FONTI) {
    try { const v = await leggiFeed(f); voci.push(...v.filter((x) => x.data.getTime() > limite && !linkFatti.has(x.link) && AI.test(`${x.titolo} ${x.sommario}`))); }
    catch (e) { console.log(`notizie: salto ${f.nome} (${e.message})`); }
  }
  const recenti = (x) => x.data.getTime() > limite && !linkFatti.has(x.link);
  for (const p of PAGINE) {
    try { voci.push(...(await leggiPagina(p, linkFatti)).filter(recenti)); } catch (e) { console.log(`notizie: salto ${p.nome} (${e.message})`); }
  }
  // il radar guarda una settimana: un modello di tendenza è notizia anche se è uscito 5 giorni fa e nessun giornale l'ha scritto
  voci.push(...(await radar()).filter((x) => !linkFatti.has(x.link) && x.data.getTime() > Date.now() - 10 * 864e5));
  const perFonte = {};
  for (const v of voci) perFonte[v.fonte] = (perFonte[v.fonte] || 0) + 1;
  console.log(`notizie: voci per fonte ${JSON.stringify(perFonte)}`);
  // 2. storie: voci simili di fonti diverse
  const storie = [];
  for (const v of voci.sort((a, b) => b.data - a.data)) {
    const s = storie.find((x) => x.voci.some((y) => simili(y.titolo, v.titolo) >= 0.5));
    if (s) { if (!s.voci.some((y) => y.fonte === v.fonte)) s.voci.push(v); } else storie.push({ voci: [v] });
  }
  const fatteTitoli = fatte.map((n) => n.titoloFonte || n.titolo);
  // conta soprattutto quante fonti diverse ne parlano; una fonte ufficiale aiuta poco (i comunicati commerciali sono tanti)
  const lancio = (s) => s.voci.some((v) => LABORATORI.test(v.titolo) && LANCIO.test(`${v.titolo} ${v.sommario}`));
  // i creator che Marco segue: se ne parlano, la storia sale (+3 per canale, al massimo +6). Non sono fonti dei fatti
  const titoliCreator = await segnali();
  // per i creator serve un nome forte in comune (DeepInfer, Timestral-209M) o 3 parole: «Claude Code» da solo è in mille titoli
  const comuni = (a, b) => { const B = parole(b); return [...parole(a)].filter((w) => B.has(w)).length; };
  const tocca = (a, b) => { const pa = tutteParole(a), pb = tutteParole(b); return forti(a).some((w) => pb.has(w)) || forti(b).some((w) => pa.has(w)) || comuni(a, b) >= 3; };
  const creator = (s) => titoliCreator.filter((c) => c.titoli.some((t) => s.voci.some((v) => tocca(v.titolo, t)))).map((c) => c.nome);
  const punti = (s) => s.voci.length * 4 + (lancio(s) ? 10 : 0) + (s.voci.some((v) => v.ufficiale) ? 1 : 0) + (Date.now() - s.voci[0].data < 864e5 ? 1 : 0) + Math.min(6, creator(s).length * 3);
  const usate = new Set();
  const scelte = storie.filter((s) => !fatteTitoli.some((t) => simili(t, s.voci[0].titolo) >= 0.5)).sort((a, b) => punti(b) - punti(a))
    .filter((s) => { if (usate.has(s.voci[0].fonte)) return false; usate.add(s.voci[0].fonte); return true; }).slice(0, MAX); // una storia per fonte a giro
  console.log(`notizie: ${voci.length} voci nuove, ${storie.length} storie, scelte ${scelte.length}`);
  for (const s of scelte) console.log(`  scelta (${punti(s)} punti): ${s.voci.map((v) => `${v.fonte}: ${v.titolo}`).join(' | ')}${creator(s).length ? ` [creator: ${creator(s).join(', ')}]` : ''}`);

  const dati = JSON.parse(fs.readFileSync(path.join(RADICE, 'sito', 'data.json'), 'utf8'));
  const gratis = dati.categorie.find((c) => c.id === 'chat')?.modelli.filter((m) => m.aperto || m.or?.gratis).slice(0, 5) || [];
  const pagato = dati.categorie.find((c) => c.id === 'chat')?.modelli.find((m) => !m.aperto && !m.or?.gratis);
  const contesto = `FreeLLMArena data (Arena blind votes, ${dati.aggiornato}): best free chat models: ${gratis.map((m, i) => `#${i + 1} ${m.nome} (${m.punti})`).join(', ')}. Best paid chat model: ${pagato?.nome} (${pagato?.punti}).`;

  for (const s of scelte) {
    // 3. il testo delle pagine (al massimo 3 fonti); se la pagina non si apre, vale il sommario del feed
    const fonti = [];
    for (const v of s.voci.slice(0, 3)) {
      let testo = '';
      try { testo = testoDa(await scarica(v.link)).slice(0, 6000); } catch (e) { console.log(`notizie: pagina chiusa ${v.link} (${e.message})`); }
      fonti.push({ ...v, testo: testo.length > 600 ? testo : `${v.titolo}. ${v.sommario}` });
    }
    const blocco = fonti.map((f, i) => `SOURCE ${i + 1} (${f.fonte}${f.ufficiale ? ', official' : ''}, ${f.data.toISOString().slice(0, 10)}): ${f.titolo}\n${f.testo}`).join('\n\n');
    let r;
    try {
      r = await chiediModello([
        { role: 'system', content: `You write short news articles for FreeLLMArena, a site about AI models (free and paid), AI hardware and AI software. Write in your own words, in English, using ONLY facts from SOURCES. Never copy sentences from SOURCES; at most one quote under 15 words, in quotation marks, with who said it. Every number, name, product and date must appear in SOURCES. Do not guess prices, dates, benchmarks or availability. If SOURCES disagree, say so. ${REGOLE_SCRITTURA.replace('DATA', 'SOURCES')}` },
        { role: 'user', content: `SOURCES:\n${blocco}\n\nSITE DATA (you may use it only in "perche", and only if it is relevant):\n${contesto}\n\nReturn JSON: {"titolo": "headline, max 90 characters, factual", "descr": "one sentence summary, max 155 characters", "tema": "one of: LLMs, Hardware, Software, Research, Business, Policy, Guides", "paragrafi": ["4 to 6 short paragraphs: what happened, the key facts, the context"], "perche": "1 or 2 short paragraphs: what it means for people who use AI, and for people who want free or local models"}` },
      ], { json: true, max: 1800, scopo: 'notizie' });
    } catch (e) { console.log(`notizie: scrittura non riuscita (${e.message})`); if (/429/.test(e.message)) break; continue; }
    const testiFonti = [...fonti.map((f) => `${f.fonte} ${f.titolo} ${f.testo}`), contesto];
    const corpo = controlla([...(r.paragrafi || [])], testiFonti);
    const perche = controlla([r.perche || ''], testiFonti);
    const cTitolo = controlla([r.titolo || ''], testiFonti), cDescr = controlla([r.descr || ''], testiFonti);
    // il 22/10 la notizia su Flint aveva 4 paragrafi buoni ma il titolo no: invece di buttarla, titolo della fonte
    // più ripresa e prima frase già controllata come riassunto
    const titolo = cTitolo.paragrafi[0] || s.voci[0].titolo.replace(/[⁠​]/g, '').slice(0, 110);
    const descr = cDescr.paragrafi[0] || (frasi(corpo.paragrafi[0] || '')[0] || '').slice(0, 160);
    const tolte = [...corpo.tolte, ...perche.tolte, ...cTitolo.tolte, ...cDescr.tolte];
    for (const t of tolte) console.log(`  tolta: «${t.s.slice(0, 110)}» ${t.n.length ? 'numeri ' + t.n.join(',') : ''} ${t.nomi.length ? 'nomi ' + t.nomi.join(',') : ''} ${t.copia ? 'copiata' : ''}`);
    if (!titolo || !descr || corpo.paragrafi.length < 3) { console.log(`notizie: NON pubblicata «${s.voci[0].titolo}» (dopo il controllo restano ${corpo.paragrafi.length} paragrafi)`); continue; }
    const giorno = new Date().toISOString().slice(0, 10);
    const nome = `${giorno}-${slug(titolo)}`;
    const uscita = { nome, titolo, descr, tema: r.tema || 'LLMs', paragrafi: corpo.paragrafi, perche: perche.paragrafi, pubblicato: giorno, titoloFonte: s.voci[0].titolo,
      fonti: fonti.map((f) => ({ nome: f.fonte, url: f.link, titolo: f.titolo, ufficiale: f.ufficiale, data: f.data.toISOString().slice(0, 10) })), frasiTolte: tolte.length };
    fs.writeFileSync(path.join(DIR, `${nome}.json`), JSON.stringify(uscita, null, 1) + '\n');
    console.log(`notizie: pubblicata ${nome} (${fonti.map((f) => f.fonte).join(', ')}; frasi tolte dal controllo: ${tolte.length})`);
  }
}

if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) await main();
