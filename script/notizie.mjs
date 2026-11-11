// Notizie del blog (decise da Marco il 22/10/2026): tutto il mondo AI, non solo i modelli gratis (LLM a pagamento,
// hardware, software, guide), da fonti ufficiali e siti di notizie. Si pubblicano da sole «dopo il controllo dei fatti».
// 1. legge i feed (FONTI), tiene le voci degli ultimi 3 giorni che parlano di AI
// 2. raggruppa le voci sulla stessa storia: vince quella citata da più fonti, con un bonus se c'è una fonte ufficiale
//    una storia con una sola fonte non ufficiale passa solo se si trova anche la fonte primaria (cercaPrimaria)
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
export const testoDa = (html) => entita(String(html).replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<noscript[\s\S]*?<\/noscript>|<nav[\s\S]*?<\/nav>|<footer[\s\S]*?<\/footer>|<header[\s\S]*?<\/header>/gi, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
const campo = (xml, nomi) => { for (const n of nomi) { const m = xml.match(new RegExp(`<${n}[^>]*>([\\s\\S]*?)</${n}>`, 'i')); if (m) return entita(m[1]).trim(); } return ''; };

// 1. feed: RSS (<item>) o Atom (<entry>)
async function leggiFeed(f) {
  const xml = await scarica(f.url);
  const voci = [...xml.matchAll(/<(item|entry)[\s>][\s\S]*?<\/\1>/gi)].map((m) => m[0]);
  return voci.map((v) => {
    const link = (v.match(/<link[^>]*href="([^"]+)"/i) || [])[1] || campo(v, ['link']);
    const data = new Date(campo(v, ['pubDate', 'published', 'updated', 'dc:date']));
    return { fonte: f.nome, ufficiale: !!f.ufficiale, titolo: testoDa(campo(v, ['title'])), link: link.trim(), data, sommario: testoDa(campo(v, ['description', 'summary', 'content:encoded', 'content'])).slice(0, 1500),
      grezzo: campo(v, ['content:encoded', 'content', 'description', 'summary']) }; // con i link: MarkTechPost risponde 403 alle pagine, il feed no
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
const COMUNI = /^(introducing|announcing|releases?|launch\w*|hugging|face|github|google|cloud|model|models|agent|agents|agentic|open|source|today|update|security|research|developers?|enterprise|platform|coding|reasoning|policy|frontier|national|global|america\w*|europe\w*|china|chinese|world|new|first|best|faster|better|smaller|larger|week|year|startup|series|funding|billion|million|study|report|paper|benchmark|safety|preview|beta|available|generally|support|now|with|what|how|why|when|audio|video|image|images|voice|speech|vision|music|earth)$/i;
// nomi «forti»: con maiuscola interna (DeepInfer) o con cifre (Timestral-209M); il nome nudo nell'altro titolo basta
const forti = (t) => [...String(t).matchAll(/\b([A-Z][a-z]+[A-Z]\w*|[A-Za-z]{5,}[-.]?\d[\w.-]*)\b/g)].map((m) => m[1].toLowerCase().split(/[-.]?\d/)[0])
  .filter((w) => w.length >= 5 && !COMUNI.test(w) && !LABORATORI.test(w));
const tutteParole = (t) => new Set(String(t).toLowerCase().split(/[^a-z0-9]+/));
// il nome forte vale solo scritto da nome: «Audio8» diventava «audio» e univa ogni titolo con «native audio» (30/10/2026:
// Edge0, Genie 4 e Nemotron in una storia sola). Maiuscola, oppure dentro un percorso (org/nome di GitHub e Hugging Face)
export const nomina = (nome, testo) => [...String(testo).matchAll(new RegExp(`(?<![a-z0-9])${nome}(?![a-z0-9])`, 'gi'))].some((m) => /[A-Z]/.test(m[0][0]) || testo[m.index - 1] === '/');
const simili = (a, b) => {
  const A = parole(a), B = parole(b); let c = 0, propria = false; for (const w of A) if (B.has(w)) { c++; propria ||= !COMUNI.test(w); }
  if (forti(a).some((w) => nomina(w, b)) || forti(b).some((w) => nomina(w, a))) return 1;
  // serve almeno una parola non comune: «frontier model» da solo univa OpenAI e Gemini 4 Carbon, «on Hugging Face» ogni modello del radar
  return c >= 2 && propria ? c / Math.max(1, Math.min(A.size, B.size)) : 0;
};

// 2c. storia già pubblicata (4/11/2026: FlashProve uscì due volte, alle 00:53 da TechCrunch e alle 06:41 da MarkTechPost.
// Il titolo di TechCrunch non nomina FlashProve e si confrontava solo con quello; il link GitHub del progetto, fonte di
// entrambi, differiva per una «/» finale). Ora contano tutti i titoli dei post recenti (del post, della fonte, delle fonti),
// i link senza differenze di forma e il nome del prodotto dello stesso laboratorio anche nel sommario della voce
const GIORNI_DOPPIONI = 14; // il radar guarda 10 giorni indietro
export const linkNorma = (u) => {
  try { const x = new URL(u); return (x.hostname.replace(/^www\./, '') + x.pathname.replace(/\/+$/, '')).toLowerCase(); } catch { return String(u).trim().toLowerCase(); }
};
const labDi = (t) => (String(t).match(new RegExp(LABORATORI.source, 'gi')) || []).map((x) => x.toLowerCase());
// restituisce il nome del post che racconta già la storia, o null
export function doppione(voci, fatte, ora = Date.now()) {
  const linkVoci = new Set(voci.map((v) => linkNorma(v.link)));
  for (const n of fatte) {
    if ((n.fonti || []).some((f) => linkVoci.has(linkNorma(f.url)))) return n.nome;
    // come prima: le parole in comune col titolo della fonte
    if (voci.some((v) => simili(n.titoloFonte || n.titolo, v.titolo) >= 0.5)) return n.nome;
    if (ora - new Date(n.pubblicato || 0) >= GIORNI_DOPPIONI * 864e5) continue;
    // post recenti: lo stesso nome forte di prodotto (FlashProve) nel titolo del post e nel titolo della voce; se la voce
    // lo nomina solo nel sommario («Anthropic is working on a system to prove AI models' identity»), serve anche lo stesso
    // laboratorio nei due titoli. Solo nomi forti e solo il titolo del post: le parole comuni univano Kimi K3.1 Pro e
    // Claude Opus 5.5, i titoli delle fonti AnyModelBot e Grok Bot («alternative to Grok Bot»)
    const prodotti = forti(n.titolo), labs = labDi(n.titolo);
    const stesso = (v) => prodotti.some((w) => nomina(w, v.titolo))
      || (labDi(v.titolo).some((l) => labs.includes(l)) && prodotti.some((w) => nomina(w, v.sommario || '')));
    if (voci.some(stesso)) return n.nome;
  }
  return null;
}

// 2b. fonte primaria (Marco, 30/10/2026: «Ma stai rubando notizie dai competitors?»; 46 notizie su 99 riscrivevano il
// lavoro di una sola testata). Se la storia ha una sola fonte non ufficiale, si cerca fra i link dell'articolo la pagina
// del laboratorio, il modello, il codice o la ricerca: se c'è e parla della stessa storia diventa una fonte, se no la
// storia non esce. Il progetto GitHub del radar è già la fonte primaria di se stesso
const HOST_PRIMARI = /(^|\.)(openai\.com|anthropic\.com|deepmind\.google|blog\.google|ai\.google\.dev|ai\.meta\.com|about\.fb\.com|mistral\.ai|nvidia\.com|microsoft\.com|qwen\.ai|qwenlm\.github\.io|deepseek\.com|moonshot\.ai|kimi\.com|x\.ai|z\.ai|minimax\.io|arxiv\.org|europa\.eu|[a-z0-9-]+\.gov)$/i;
const SENZA_SITO = /^(twitter|linkedin|facebook|youtube|reddit|instagram|threads|medium|substack|google|github|huggingface)$/i;
const etichetta = (host) => host.split('.').at(-2) || '';
const TESTATE = new Set(FONTI.filter((f) => !f.ufficiale).map((f) => etichetta(new URL(f.url).hostname)));
const primario = (u, titolo) => {
  const percorso = u.pathname.replace(/\/+$/, '');
  if (!percorso) return false;
  if (u.hostname === 'huggingface.co' || u.hostname === 'github.com') return /^\/[\w.-]+\/[\w.-]+/.test(percorso);
  if (HOST_PRIMARI.test(u.hostname)) return true;
  // il sito di chi è nel titolo: «Cursor raises…» -> cursor.com
  const e = etichetta(u.hostname);
  return e.length >= 4 && !TESTATE.has(e) && !SENZA_SITO.test(e) && titolo.has(e);
};
export function linkPrimari(html, titolo) {
  const corpo = (html.match(/<article[\s>][\s\S]*<\/article>/i) || [html])[0].replace(/<nav[\s\S]*?<\/nav>|<footer[\s\S]*?<\/footer>|<aside[\s\S]*?<\/aside>/gi, ' ');
  const parti = tutteParole(titolo), uscita = new Set();
  for (const m of corpo.matchAll(/href=["'](https?:\/\/[^"'#\s]+)/gi)) {
    try {
      const u = new URL(entita(m[1]));
      if (!primario(u, parti)) continue;
      uscita.add(u.href.replace(/^https:\/\/arxiv\.org\/pdf\//, 'https://arxiv.org/abs/').replace(/\.pdf$/, ''));
    } catch { /* link non valido */ }
  }
  return [...uscita].slice(0, 6);
}
// stessa storia: un nome forte del titolo, oppure almeno 3 parole distintive e metà di quelle del titolo
export function riguarda(titolo, testo) {
  if (forti(titolo).some((w) => nomina(w, testo))) return true;
  const pagina = tutteParole(testo);
  const chiavi = [...tutteParole(titolo)].filter((w) => w.length > 2 && !VUOTE.has(w) && !COMUNI.test(w) && !LABORATORI.test(w));
  const dentro = chiavi.filter((w) => pagina.has(w)).length;
  return dentro >= 3 && dentro >= chiavi.length / 2;
}
export async function cercaPrimaria(v, leggi = scarica) {
  let html = '';
  try { html = await leggi(v.link); } catch (e) { console.log(`notizie: pagina chiusa ${v.link} (${e.message})`); }
  for (const link of new Set([...linkPrimari(v.grezzo || '', v.titolo), ...linkPrimari(html, v.titolo)])) {
    try {
      const pagina = await leggi(link, 10000);
      const testo = testoDa(pagina);
      if (testo.length < 300 || !riguarda(v.titolo, testo)) continue;
      const data = dataDa(pagina);
      return { fonte: new URL(link).hostname.replace(/^www\./, ''), ufficiale: true, titolo: testoDa(campo(pagina, ['title'])).slice(0, 200) || v.titolo, link, data: Number.isNaN(data.getTime()) ? v.data : data, sommario: '' };
    } catch (e) { console.log(`notizie: fonte primaria chiusa ${link} (${e.message})`); }
  }
  return null;
}

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

// 5. la storia giusta (8/11/2026: uscì «Meta releases Llama 4 Scout and Maverick», ma Llama 4 è di aprile 2025. L'unica
// fonte era la guida di MarkTechPost «MoE Routing Strategies Explained», che usa Llama 4 solo come esempio; la «fonte
// primaria» trovata fra i suoi link era il blog di Meta del 2025. Lo stesso il 1/11 con «NVIDIA releases gds-diag», da una
// guida «How to Check and Configure…» del 30/10 su uno strumento pubblicato su GitHub il 14/9)
// a. una guida o una spiegazione non diventa mai un lancio
// «how to», «what is» contano solo a inizio titolo o dopo i due punti: «GPT-6 Cyber can break into systems and propose how
// to fix them» (the-decoder, 5/11) è un lancio vero (controllo di tutti i post, 11/11/2026)
export const GUIDA = /\b(explained|explainer|guide|tutorial|walkthrough|deep[- ]dive|primer|cheat[- ]?sheet|vs\.?|versus|top \d+|\d+ best|best \d+)\b|(^|:\s*)(how[- ]to|what is|introduction to)\b/i;
// se il titolo scritto dice anch'esso che è una guida («…can be run locally with llama.cpp, guide released», 7/11) è onesto
export const guidaDiventataLancio = (titoloScritto, titoloFonte) => GUIDA.test(titoloFonte) && LANCIO.test(titoloScritto) && !GUIDA.test(titoloScritto);
// d. la fonte dice «in preparazione», il titolo dice «esce» (1/11/2026: «SpaceXSI releases Grok Bot 1.0.0» da TestingCatalog
// «SpaceXSI prepares Texting and Tasks hub support for Grok Bot»; Grok Bot esisteva dall'11/8). Passa se fra le fonti c'è
// il codice o il modello pubblicato (FlashProve, 4/11: TechCrunch «is working on», il repo GitHub era uscito il 30/10)
export const NON_ANCORA = /\b(prepares?|preparing|plans? to|planning to|tests?|testing|spotted|working on|could|may|might|reportedly|rumou?r\w*|leak\w*|upcoming|coming soon|in the works)\b/i;
const FUTURO = /\b(to (launch|release|introduce|unveil|debut|roll out)|will|plans?|prepares?)\b/i;
export function annuncioNonAncora(titoloScritto, voci) {
  if (!LANCIO_VERBO.test(titoloScritto) || FUTURO.test(titoloScritto) || !NON_ANCORA.test(voci[0]?.titolo || '')) return false;
  return !voci.slice(1).some((v) => /^https:\/\/(github\.com|huggingface\.co)\/[^/]+\/[^/]+/.test(v.link || v.url || ''));
}
// trattini e spazi tipografici (il modello scrive «17B‑parameter» con U+2011) come quelli normali
const piano = (s) => String(s).replace(/[‐-―−]/g, '-').replace(/[   ]/g, ' ');
// b. il titolo scritto parla della storia della fonte principale: almeno 2 parole in comune col suo titolo (223 dei 253
// post usciti fino al 10/11), oppure il suo soggetto (nome di modello come «Llama 4 Scout» o «Qwen3.8-27B», nome di
// prodotto come FlashProve) sta nel titolo o nel testo della fonte: i blog ufficiali hanno titoli come «A
// thousand fewer paths to root». Senza un soggetto riconoscibile decidono gli altri controlli: sigle generiche come «MoE»
// stanno in mille testi e non provano niente (la guida su Llama 4 passava proprio per «MoE»)
// nomi di modello: con una cifra, anche con spazi («Llama 4 Scout») o con pezzi dopo il numero («Qwen3.8-27B-DSpine-b16»)
export const nomiModello = (titolo) => [...new Set([...piano(titolo).matchAll(/\b([A-Z][A-Za-z]*(?:[- ]?\d[\w.]*)+(?:-[A-Za-z0-9][\w.]*)*(?: [A-Z][a-z]+)?)/g)].map((m) => m[1].replace(/[.-]+$/, '').replace(/ /g, '-')))];
export const LANCIO_VERBO = /\b(launch(es|ed)?|releases?|released|introduc(es|ed|ing)|unveil(s|ed)?|debut(s|ed)?|open[- ]sourc(es|ed)|rolls? out|announc(es|ed))\b/i;
const compatto = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '');
export const soggetti = (titolo) => [...new Set([...nomiModello(titolo), ...forti(piano(titolo))].map(compatto).filter((n) => n.length >= 4))];
export function stessaStoria(titoloScritto, fonte) {
  const A = parole(piano(titoloScritto)), B = parole(piano(fonte.titolo));
  if ([...A].filter((w) => B.has(w)).length >= 2) return true;
  const nomi = soggetti(titoloScritto);
  if (!nomi.length) return true;
  // tutto il testo letto (al massimo 6000 caratteri): nelle notizie buone il soggetto compare entro i primi 3000,
  // nella guida di MarkTechPost «Llama 4 Scout» non compariva mai
  const testo = compatto(piano(`${fonte.titolo} ${fonte.testo || ''}`));
  return nomi.some((n) => testo.includes(n));
}
// c. l'uscita di un modello è notizia solo nei primi 30 giorni: data nei dati del sito (modelli nuovi e piccoli) e prima
// pubblicazione su Hugging Face del nome (la copia più vecchia è l'originale; le quantizzate arrivano dopo)
const GIORNI_LANCIO = 30;
export async function uscitaVecchia(titoloScritto, dati, leggi = scarica, ora = Date.now()) {
  // solo i verbi di lancio: «Open-weight GLM-5.3 builds exploit chains» non annuncia un modello (misura del 10/11)
  if (!LANCIO_VERBO.test(titoloScritto)) return null;
  const soglia = ora - GIORNI_LANCIO * 864e5;
  const norma = (s) => String(s).toLowerCase().replace(/[\s_]+/g, '-');
  // stesso nome, o il nome seguito da un separatore (Llama-4-Scout-17B-16E): «hy4Q43Y7» non è Hy4, «ml4se» non è ML4
  // un'anteprima uscita prima non toglie la notizia dell'uscita vera (Hy4-preview del 27/8, Hy4 il 4/11)
  const eLui = (candidato, n) => { const c = norma(candidato); return c === n || (c.startsWith(n) && /[-.]/.test(c[n.length]) && !/(^|-)(preview|beta|alpha|exp|experimental|rc\d*)(-|$)/.test(c.slice(n.length))); };
  const conData = [...(dati?.nuovi || []), ...(dati?.piccoli || [])];
  // solo il primo nome: è il modello che esce; gli altri sono spesso la base (10/11: «Arete-27B, a Qwen3.8-27B fine-tune»)
  for (const nome of nomiModello(titoloScritto).slice(0, 1)) {
    const n = norma(nome);
    for (const m of conData) {
      if (m.creato && eLui(m.nome, n) && Date.parse(m.creato) < soglia) return `${m.nome} è nei dati del sito dal ${m.creato}`;
    }
    try {
      // solo i laboratori: su Hugging Face chiunque può avere un repo «genie-4» del 2024 (misura del 10/11 sui post usciti)
      const lista = JSON.parse(await leggi(`https://huggingface.co/api/models?search=${encodeURIComponent(nome)}&sort=createdAt&direction=1&limit=50`, 15000));
      // vecchio solo se anche la copia ufficiale più recente lo è: la serie LFM3 è uscita fra il 19 e il 27/10 anche se
      // LFM3-Audio-2B era dell'8/9 (controllo di tutti i post, 11/11/2026); di Llama 4 Scout l'ultima è del 3/4/2025
      const ufficiali = lista.filter((m) => ORG_HF[m.id.split('/')[0]] && eLui(m.id.split('/')[1] || '', n) && m.createdAt).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
      const ultimo = ufficiali[0];
      if (ultimo && Date.parse(ultimo.createdAt) < soglia) return `${ultimo.id} è su Hugging Face dal ${ufficiali.at(-1).createdAt.slice(0, 10)}, l'ultima copia ufficiale dal ${ultimo.createdAt.slice(0, 10)}`;
    } catch (e) { console.log(`notizie: Hugging Face non risponde per ${nome} (${e.message})`); }
  }
  return null;
}

const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 70);

async function main() {
  fs.mkdirSync(DIR, { recursive: true });
  // già pubblicate: non si riscrive la stessa storia
  const fatte = fs.readdirSync(DIR).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8')));
  const linkFatti = new Set(fatte.flatMap((n) => n.fonti.map((f) => linkNorma(f.url))));
  const limite = Date.now() - GIORNI * 864e5;
  const voci = [];
  for (const f of FONTI) {
    try { const v = await leggiFeed(f); voci.push(...v.filter((x) => x.data.getTime() > limite && !linkFatti.has(linkNorma(x.link)) && AI.test(`${x.titolo} ${x.sommario}`))); }
    catch (e) { console.log(`notizie: salto ${f.nome} (${e.message})`); }
  }
  const recenti = (x) => x.data.getTime() > limite && !linkFatti.has(linkNorma(x.link));
  for (const p of PAGINE) {
    try { voci.push(...(await leggiPagina(p, linkFatti)).filter(recenti)); } catch (e) { console.log(`notizie: salto ${p.nome} (${e.message})`); }
  }
  // il radar guarda una settimana: un modello di tendenza è notizia anche se è uscito 5 giorni fa e nessun giornale l'ha scritto
  voci.push(...(await radar()).filter((x) => !linkFatti.has(linkNorma(x.link)) &&x.data.getTime() > Date.now() - 10 * 864e5));
  const perFonte = {};
  for (const v of voci) perFonte[v.fonte] = (perFonte[v.fonte] || 0) + 1;
  console.log(`notizie: voci per fonte ${JSON.stringify(perFonte)}`);
  // 2. storie: voci simili di fonti diverse
  const storie = [];
  for (const v of voci.sort((a, b) => b.data - a.data)) {
    const s = storie.find((x) => x.voci.some((y) => simili(y.titolo, v.titolo) >= 0.5));
    if (s) { if (!s.voci.some((y) => y.fonte === v.fonte)) s.voci.push(v); } else storie.push({ voci: [v] });
  }
  // conta soprattutto quante fonti diverse ne parlano; una fonte ufficiale aiuta poco (i comunicati commerciali sono tanti)
  const lancio = (s) => s.voci.some((v) => LABORATORI.test(v.titolo) && LANCIO.test(`${v.titolo} ${v.sommario}`));
  // i creator che Marco segue: se ne parlano, la storia sale (+3 per canale, al massimo +6). Non sono fonti dei fatti
  const titoliCreator = await segnali();
  // per i creator serve un nome forte in comune (DeepInfer, Timestral-209M) o 3 parole: «Claude Code» da solo è in mille titoli
  const comuni = (a, b) => { const B = parole(b); return [...parole(a)].filter((w) => B.has(w)).length; };
  const tocca = (a, b) => forti(a).some((w) => nomina(w, b)) || forti(b).some((w) => nomina(w, a)) || comuni(a, b) >= 3;
  const creator = (s) => titoliCreator.filter((c) => c.titoli.some((t) => s.voci.some((v) => tocca(v.titolo, t)))).map((c) => c.nome);
  const punti = (s) => s.voci.length * 4 + (lancio(s) ? 10 : 0) + (s.voci.some((v) => v.ufficiale) ? 1 : 0) + (Date.now() - s.voci[0].data < 864e5 ? 1 : 0) + Math.min(6, creator(s).length * 3);
  const usate = new Set();
  const scelte = [];
  const inizio = Date.now();
  for (const s of storie.sort((a, b) => punti(b) - punti(a))) {
    if (scelte.length >= MAX) break;
    if (usate.has(s.voci[0].fonte)) continue; // una storia per fonte a giro
    const gia = doppione(s.voci, fatte);
    if (gia) { console.log(`notizie: già raccontata in ${gia}: salto «${s.voci[0].titolo}» (${s.voci[0].fonte})`); continue; }
    if (s.voci.length === 1 && !s.voci[0].ufficiale && s.voci[0].fonte !== 'GitHub trending') {
      // la ricerca ha un tetto di tempo: il lavoro su GitHub muore dopo 15 minuti e deve ancora scrivere gli articoli
      const primaria = Date.now() - inizio < 4 * 6e4 ? await cercaPrimaria(s.voci[0]) : null;
      if (!primaria) { console.log(`notizie: una sola fonte, nessuna primaria: salto «${s.voci[0].titolo}» (${s.voci[0].fonte})`); continue; }
      // la fonte primaria può essere quella di un post già uscito (il progetto GitHub di FlashProve, 4/11/2026)
      const giaPrimaria = doppione([primaria], fatte);
      if (giaPrimaria) { console.log(`notizie: fonte primaria già in ${giaPrimaria}: salto «${s.voci[0].titolo}» (${s.voci[0].fonte})`); continue; }
      s.voci.push(primaria);
    }
    usate.add(s.voci[0].fonte);
    scelte.push(s);
    // le storie scelte in questo giro valgono come pubblicate per le successive
    fatte.push({ nome: `(questo giro) ${s.voci[0].titolo}`, pubblicato: new Date().toISOString().slice(0, 10), titolo: s.voci[0].titolo, titoloFonte: s.voci[0].titolo,
      fonti: s.voci.map((v) => ({ url: v.link, titolo: v.titolo })) });
  }
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
    if (annuncioNonAncora(titolo, s.voci)) { console.log(`notizie: NON pubblicata «${titolo}»: la fonte dice che è in preparazione («${s.voci[0].titolo}»)`); continue; }
    if (guidaDiventataLancio(titolo, s.voci[0].titolo)) { console.log(`notizie: NON pubblicata «${titolo}»: la fonte è una guida («${s.voci[0].titolo}»), non un lancio`); continue; }
    if (!stessaStoria(titolo, fonti[0])) { console.log(`notizie: NON pubblicata «${titolo}»: non è la storia della fonte «${fonti[0].titolo}»`); continue; }
    const vecchia = await uscitaVecchia(titolo, dati);
    if (vecchia) { console.log(`notizie: NON pubblicata «${titolo}»: uscita di più di ${GIORNI_LANCIO} giorni fa (${vecchia})`); continue; }
    const giorno = new Date().toISOString().slice(0, 10);
    const nome = `${giorno}-${slug(titolo)}`;
    const uscita = { nome, titolo, descr, tema: r.tema || 'LLMs', paragrafi: corpo.paragrafi, perche: perche.paragrafi, pubblicato: giorno, titoloFonte: s.voci[0].titolo,
      fonti: fonti.map((f) => ({ nome: f.fonte, url: f.link, titolo: f.titolo, ufficiale: f.ufficiale, data: f.data.toISOString().slice(0, 10) })), frasiTolte: tolte.length };
    fs.writeFileSync(path.join(DIR, `${nome}.json`), JSON.stringify(uscita, null, 1) + '\n');
    console.log(`notizie: pubblicata ${nome} (${fonti.map((f) => f.fonte).join(', ')}; frasi tolte dal controllo: ${tolte.length})`);
  }
}

if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) await main();
