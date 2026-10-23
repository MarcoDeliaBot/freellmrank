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
  // 24/10/2026: Kimi K3.1 Pro e Claude Duet non erano usciti; queste tre fonti li avevano entrambi
  { nome: 'SiliconANGLE', url: 'https://siliconangle.com/category/ai/feed/' },
  { nome: 'Unite.AI', url: 'https://www.unite.ai/feed/' },
  { nome: 'The Decoder', url: 'https://the-decoder.com/feed/' },
];
// lanci dei grandi laboratori: passano davanti (Marco, 24/10/2026: «oggi è uscito Kimi K3.1, Anthropic ha annunciato
// Claude Duet e non hai fatto neanche un post»; erano nei feed ma perdevano contro storie citate da più siti)
const LABORATORI = /\b(Anthropic|Claude|OpenAI|GPT[-\w.]*|ChatGPT|Gemini|Gemma|DeepMind|Meta AI|Llama|Kimi|Moonshot|DeepSeek|Qwen|Alibaba|Mistral|GLM|Zhipu|Z\.ai|MiniMax|xAI|Grok|Nemotron|Phi-\d|Granite|Hunyuan|ERNIE)\b/i;
const LANCIO = /\b(launch|launches|launched|release[sd]?|introduc\w*|unveil\w*|announc\w*|debut\w*|open[- ]sourc\w*|open[- ]weights?|new model|rolls? out)\b/i;
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

// parole che distinguono una storia (nomi propri, nomi di modelli con numeri), per riconoscere la stessa notizia su più siti
const VUOTE = new Set('the a an and or of to in on for with from by is are was be this that new its at as how why what will can now your our their it after into over says said launches launched release released introduces announces using use more than about up out just'.split(' '));
const parole = (s) => new Set(String(s).toLowerCase().replace(/[^a-z0-9.\- ]/g, ' ').split(/\s+/).filter((w) => w.length > 2 && !VUOTE.has(w)));
// stessa storia: almeno 2 parole in comune e metà delle parole del titolo più corto («programming» da sola non basta)
const simili = (a, b) => { const A = parole(a), B = parole(b); let c = 0; for (const w of A) if (B.has(w)) c++; return c >= 2 ? c / Math.max(1, Math.min(A.size, B.size)) : 0; };

// 4. controlli in codice
// una frase finisce con . ! ? seguiti da spazio e maiuscola: «GPT-5.6» e «400,000» restano interi
const frasi = (t) => String(t).trim().split(/(?<=[.!?]["')]?)\s+(?=["'(]?[A-Z0-9])/).map((s) => s.trim()).filter(Boolean);
// nomi da controllare: parole con maiuscola non a inizio frase, sigle e nomi con cifre (GPT-5, H200, Llama-4)
const NOTI = /^(I|AI|The|This|That|It|In|On|For|And|But|If|What|Why|How|FreeLLMArena|Arena|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|January|February|March|April|May|June|July|August|September|October|November|December|English|US|EU|UK)$/;
function nomiDi(frase) {
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
  // 2. storie: voci simili di fonti diverse
  const storie = [];
  for (const v of voci.sort((a, b) => b.data - a.data)) {
    const s = storie.find((x) => x.voci.some((y) => simili(y.titolo, v.titolo) >= 0.5));
    if (s) { if (!s.voci.some((y) => y.fonte === v.fonte)) s.voci.push(v); } else storie.push({ voci: [v] });
  }
  const fatteTitoli = fatte.map((n) => n.titoloFonte || n.titolo);
  // conta soprattutto quante fonti diverse ne parlano; una fonte ufficiale aiuta poco (i comunicati commerciali sono tanti)
  const lancio = (s) => s.voci.some((v) => LABORATORI.test(v.titolo) && LANCIO.test(`${v.titolo} ${v.sommario}`));
  const punti = (s) => s.voci.length * 4 + (lancio(s) ? 10 : 0) + (s.voci.some((v) => v.ufficiale) ? 1 : 0) + (Date.now() - s.voci[0].data < 864e5 ? 1 : 0);
  const usate = new Set();
  const scelte = storie.filter((s) => !fatteTitoli.some((t) => simili(t, s.voci[0].titolo) >= 0.5)).sort((a, b) => punti(b) - punti(a))
    .filter((s) => { if (usate.has(s.voci[0].fonte)) return false; usate.add(s.voci[0].fonte); return true; }).slice(0, MAX); // una storia per fonte a giro
  console.log(`notizie: ${voci.length} voci nuove, ${storie.length} storie, scelte ${scelte.length}`);
  for (const s of scelte) console.log(`  scelta (${punti(s)} punti): ${s.voci.map((v) => `${v.fonte}: ${v.titolo}`).join(' | ')}`);

  const dati = JSON.parse(fs.readFileSync(path.join(RADICE, 'sito', 'data.json'), 'utf8'));
  const gratis = dati.categorie.find((c) => c.id === 'chat')?.modelli.filter((m) => m.aperto || m.or?.gratis).slice(0, 5) || [];
  const pagato = dati.categorie.find((c) => c.id === 'chat')?.modelli.find((m) => !m.aperto && !m.or?.gratis);
  const contesto = `FreeLLMArena data (Arena blind votes, ${dati.aggiornato}): best free chat models: ${gratis.map((m, i) => `#${i + 1} ${m.nome} (${m.punti})`).join(', ')}. Best paid chat model: ${pagato?.nome} (${pagato?.punti}).`;

  for (const s of scelte) {
    // 3. il testo delle pagine (al massimo 3 fonti); se la pagina non si apre, vale il sommario del feed
    const fonti = [];
    for (const v of s.voci.slice(0, 3)) {
      let testo = '';
      try { testo = testoDa(await scarica(v.link)).slice(0, 9000); } catch (e) { console.log(`notizie: pagina chiusa ${v.link} (${e.message})`); }
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
