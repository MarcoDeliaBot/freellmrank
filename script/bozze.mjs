// Pezzi comuni delle bozze automatiche (articoli del blog e post social), 20/10/2026.
// Il testo lo scrive gpt-oss-120b su Workers AI (quota gratis del sito) tramite /api/scrivi, protetta dal segreto BOZZE_KEY.
// Le bozze diventano issue con l'etichetta «bozza»: n8n le manda a Marco per mail (n8n/bozze-da-approvare.json).
// Nessuna bozza si pubblica da sola.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const RADICE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
export const REPO = process.env.GITHUB_REPOSITORY || 'MarcoDeliaBot/freellmrank';
const TOKEN = () => process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '';
export const MODELLO = 'gpt-oss-120b (Workers AI)';

export const leggiDati = () => JSON.parse(fs.readFileSync(path.join(RADICE, 'sito', 'data.json'), 'utf8'));
export const gratis = (m) => m.aperto || m.or?.gratis;

// Regole di scrittura prese dalle skill «social» e «copywriting» (coreyhaines31/marketingskills): niente frasi da IA.
export const REGOLE_SCRITTURA = `Writing rules (strict):
- Plain, specific English, the way a knowledgeable person talks. Short sentences. Active voice.
- Use ONLY numbers, names and facts that appear in DATA. If a fact is not in DATA, leave it out. Never invent prices, dates, benchmarks or quotes.
- Never use: em dashes; "It's not X, it's Y" or "Not because X. Because Y."; self-answered questions ("The result? ..."); colon reveals ("The best part: ..."); negation lists ("No X, no Y, no Z").
- Never use stock phrases: "unlock", "game-changer", "revolutionary", "delve", "leverage", "say goodbye to", "take it to the next level", "here's the thing", "in today's fast-paced world", "worth noting".
- No emoji. No hashtags. No engagement bait ("Thoughts?", "Agree?", "Let that sink in").
- Do not write one sentence per line for a whole post. Write paragraphs.
- Never work out yourself which hardware runs which model: use only the "fits fully on" field in DATA. If it says "no single home machine", say so.
- Describe apps and tools only with the text given in DATA. Do not add features, integrations, commands, ports, settings or install steps that are not in DATA.
- Do not claim how many models the site ranks unless that exact number is in DATA.`;

// Chi scrive, in ordine (25/10/2026, Marco: «trova un altro sistema per fare video gratuiti»): il tetto giornaliero di
// Workers AI finiva quasi a ogni corsa e i video uscivano col piano di riserva. Se uno risponde con un errore (tetto,
// 5xx, rete, risposta senza JSON) si passa al successivo. Tutti gratuiti:
// - workers: gpt-oss-120b su Workers AI, quota gratis del sito, tramite /api/scrivi (segreto BOZZE_KEY);
// - groq: gpt-oss-120b sul piano gratuito di Groq (segreto GROQ_KEY, account di Marco), API compatibile OpenAI;
// - locale: un modello aperto via Ollama, senza tetti: LLM_LOCALE_URL e LLM_LOCALE_MODELLO. Provato il 25/10/2026 sul computer
//   di GitHub (4 CPU, 15 GB, niente GPU, corsa 40240521010): gpt-oss:20b scrive 4,5 token/s, un piano richiede oltre 10 minuti
//   e i 3 tentativi sono falliti (tempo scaduto, JSON rotto, fatti inventati). Serve una scheda video (es. il PC di Marco).
// SCRITTORI cambia l'ordine o ne sceglie alcuni (es. «locale» per una prova). Chi non è configurato si salta.
const SCRITTORI = () => (process.env.SCRITTORI || 'workers,groq,locale').split(',').map((s) => s.trim()).filter(Boolean);
export let ultimoScrittore = '';

async function compatibileOpenAI(url, chiave, modello, messaggi, max, attesa, tentativo = 1, ragionamento = 'low') {
  const r = await fetch(`${url}/chat/completions`, {
    method: 'POST',
    headers: { ...(chiave ? { Authorization: `Bearer ${chiave}` } : {}), 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: modello, messages: messaggi, max_tokens: max, reasoning_effort: ragionamento }),
    signal: AbortSignal.timeout(attesa),
  });
  const d = await r.json().catch(() => ({}));
  // limite al minuto (Groq gratis: 8.000 token al minuto, una nostra richiesta ne usa circa 4.000): si aspetta e si riprova
  // fino a 2 volte; se l'attesa chiesta è lunga (tetto del giorno) si passa al successivo
  const dopo = Number(r.headers.get('retry-after'));
  if (r.status === 429 && tentativo < 3 && dopo > 0 && dopo <= 90) {
    await new Promise((ok) => setTimeout(ok, dopo * 1000 + 500));
    return compatibileOpenAI(url, chiave, modello, messaggi, max, attesa, tentativo + 1, ragionamento);
  }
  if (!r.ok) throw new Error(`${r.status}: ${String(d.error?.message || d.error || '').slice(0, 160)}`);
  return String(d.choices?.[0]?.message?.content || '').replace(/<think>[\s\S]*?<\/think>/g, '').trim();
}

// Shared Workers transport also returns quota evidence for skill/tutorial slides.
export async function scriviWorkers(messaggi,max,scopo) {
  if(!process.env.BOZZE_KEY&&!process.env.SCRIVI_URL)throw Error('Workers AI not configured');
  const url=`${process.env.SCRIVI_URL || 'https://freellmarena.com'}/api/scrivi`;
  if(['skill','tutorial'].includes(scopo)) {
    const preflight=await fetch(url,{headers:{Authorization:`Bearer ${process.env.BOZZE_KEY||''}`},signal:AbortSignal.timeout(20000)});
    const policy=await preflight.json().catch(()=>({}));
    if(!preflight.ok||policy.budgetPolicy!=='skill-tutorial-20261031'||!(policy.caps?.[scopo]>0))
      throw Object.assign(Error('Dedicated Workers AI budget contract is not deployed at this endpoint'),{status:preflight.status});
  }
  const r=await fetch(url,{
    method:'POST',headers:{Authorization:`Bearer ${process.env.BOZZE_KEY||''}`,'Content-Type':'application/json'},
    body:JSON.stringify({messaggi,max,scopo}),signal:AbortSignal.timeout(90000)});
  const d=await r.json().catch(()=>({}));
  if(!r.ok)throw Object.assign(Error(`/api/scrivi ${r.status}: ${d.errore||''}`),{status:r.status});
  return d;
}
const SCRIVONO = {
  // GitHub Models è stato chiuso il 30/7/2026: si scrive con Workers AI attraverso la funzione protetta del sito
  workers: async (messaggi, max, scopo) => {
    if (!process.env.BOZZE_KEY && !process.env.SCRIVI_URL) return null;
    const d = await scriviWorkers(messaggi,max,scopo);
    return d.testo;
  },
  groq: (messaggi, max) => (process.env.GROQ_KEY
    // ragionamento «medium» (26/10/2026): con «low» i piani uscivano corti e con frasi contraddittorie
    ? compatibileOpenAI('https://api.groq.com/openai/v1', process.env.GROQ_KEY, process.env.GROQ_MODELLO || 'openai/gpt-oss-120b', messaggi, max + 1500, 120000, 1, process.env.GROQ_RAGIONAMENTO || 'medium')
    : null),
  // sul computer della corsa può metterci minuti: attesa lunga
  locale: (messaggi, max) => (process.env.LLM_LOCALE_URL
    ? compatibileOpenAI(process.env.LLM_LOCALE_URL, '', process.env.LLM_LOCALE_MODELLO || 'gpt-oss:20b', messaggi, max, 900000)
    : null),
};

export async function chiediModello(messaggi, { json = false, max = 2500, scopo = 'bozze' } = {}) {
  const lista = json ? [...messaggi, { role: 'user', content: 'Reply with only the JSON object, no other text.' }] : messaggi;
  const errori = [];
  for (const nome of SCRITTORI()) {
    if (!SCRIVONO[nome]) continue;
    try {
      const testo = await SCRIVONO[nome](lista, max, scopo);
      if (testo == null) continue; // non configurato
      ultimoScrittore = nome;
      if (errori.length) console.log(`Scritto da ${nome} (prima: ${errori.join(' | ')})`);
      if (!json) return testo;
      const m = testo.match(/\{[\s\S]*\}/);
      if (!m) throw new Error(`risposta senza JSON: ${testo.slice(0, 120)}`);
      return JSON.parse(m[0]);
    } catch (e) {
      errori.push(`${nome}: ${e.message}`);
    }
  }
  throw new Error(errori.length ? errori.join(' | ') : 'nessuno scrittore configurato (BOZZE_KEY, GROQ_KEY o LLM_LOCALE_URL)');
}

// secondo passaggio: il modello rilegge la bozza contro i dati e toglie o corregge ciò che non è sostenuto
export async function rivedi(testo, contesto, max = 3000) {
  return chiediModello([
    { role: 'system', content: `You are a strict fact checker for FreeLLMArena. Compare the DRAFT with DATA. Remove or fix every sentence, table cell or claim that DATA does not support: hardware that fits a model, numbers, app features, commands, ports, install steps, counts. Keep everything that DATA supports, keep the Markdown format and headings, and do not add new content. ${REGOLE_SCRITTURA}` },
    { role: 'user', content: `DATA:
${contesto}

DRAFT:
${testo}

Return only the corrected Markdown.` },
  ], { max });
}

// pulizia di sicurezza: anche se il modello sbaglia, niente lineette lunghe
export const senzaLineette = (s) => String(s)
  .replace(/[‐‑‒]/g, '-')                 // trattini speciali nei nomi dei modelli
  .replace(/(\d)\s*[–—]\s*(\d)/g, '$1 to $2')           // 5–10 → 5 to 10
  .replace(/\|\s*[–—-]\s*(?=\|)/g, '| n/a ')           // celle vuote delle tabelle
  .replace(/\*\*([^*]+)\*\*\s*[–—]\s*/g, '**$1**: ')   // **Nome** – testo
  .replace(/\s*[—–]\s*/g, ', ');

// numeri del testo che non compaiono nei dati: Marco li controlla prima di approvare
export function numeriDaControllare(testo, contesto) {
  const visti = new Set();
  for (const m of String(testo).replace(/\{\{[^}]*\}\}/g, '').matchAll(/\d[\d,.]*/g)) {
    const n = m[0].replace(/[.,]$/, '');
    const nudo = n.replace(/,/g, '');
    if (Number(nudo) <= 12 || /^(19|20)\d\d$/.test(nudo)) continue; // numeri piccoli e anni
    if (!contesto.includes(n) && !contesto.includes(nudo)) visti.add(n);
  }
  return [...visti];
}

async function gh(metodo, percorso, corpo) {
  const r = await fetch(`https://api.github.com/repos/${REPO}${percorso}`, {
    method: metodo,
    headers: { Authorization: `Bearer ${TOKEN()}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'Content-Type': 'application/json' },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  if (!r.ok) throw new Error(`GitHub ${metodo} ${percorso} ${r.status}: ${(await r.text()).slice(0, 300)}`);
  return r.status === 204 ? null : r.json();
}

export async function apriIssue(titolo, corpo, etichette = ['bozza']) {
  const esistenti = await gh('GET', `/issues?state=open&labels=${etichette[0]}&per_page=100`);
  const gia = esistenti.find((i) => i.title === titolo);
  if (gia) { console.log('Già aperta:', gia.html_url); return gia; }
  const i = await gh('POST', '/issues', { title: titolo, body: corpo, labels: etichette });
  console.log('Aperta:', i.html_url);
  return i;
}

// post per X e Reddit, con le regole delle skill «social» (X) e «reddit-posts» (Reddit)
export async function postSocial({ argomento, dati, link }) {
  const p = await chiediModello([
    { role: 'system', content: `You write social posts for FreeLLMArena (freellmarena.com), a free site that ranks only the AI models you can use for free, using Arena's blind human votes, and checks which models fit your GPU. The owner posts from his own account.\n${REGOLE_SCRITTURA}\nTwo examples of the style Marco approved (match the tone, not the facts):
X: "Gemini 4 Argon leads Arena's chat ranking at 1532. The best model you can download for free, Xiaomi's mimo-v2.6-pro, sits at 1491, and the next four free ones are within 21 points of it. On Arena a 50-point gap is clear and 10 is noise."
Reddit title: "The top 5 open models on Arena chat are within 21 points of each other". Body: a short intro, a table from the data, one paragraph on what the numbers mean, one genuine question, a one-line disclosure.
Never start an X post with "Check out", "New guide", "We just" or "Excited".
X rules: state a specific claim in the first 8 words and name the topic in the first 10 words. Write something a reader would send to a friend. Between 160 and 270 characters: give the claim, then one or two facts that back it and what they mean for the reader. Do NOT put a link in the post: the link goes in the first reply.\nReddit rules (r/LocalLLaMA): factual title with no clickbait; body leads with the most useful finding from DATA (never invent a personal experience, never write \"I tried\" or \"I tested\"); markdown allowed (one small table is fine); end with one genuine question you want answered; add a one-line disclosure that it is the poster's own free site with no ads.` },
    { role: 'user', content: `TOPIC: ${argomento}\nLINK: ${link}\nDATA:\n${dati}\n\nReturn JSON: {"x": "...", "x_reply": "one short line with the link", "reddit_title": "...", "reddit_body": "...", "reddit_flair": "Discussion or Resources or News"}` },
  ], { json: true, max: 1500 });
  // verifica: stesse regole del fact check degli articoli, sul testo dei due post
  const v = await chiediModello([
    { role: 'system', content: `You are a strict fact checker and editor. Fix every claim in these posts that DATA does not support (numbers, counts like "top 10", hardware fits, experiences the author never had). Keep the meaning, the JSON keys and the X length between 160 and 270 characters (do not shorten a correct post). ${REGOLE_SCRITTURA}` },
    { role: 'user', content: `DATA:
${dati}

POSTS JSON:
${JSON.stringify(p)}

Return the corrected JSON with the same keys.` },
  ], { json: true, max: 1500 }).catch(() => p);
  Object.assign(p, v);
  for (const k of Object.keys(p)) p[k] = senzaLineette(p[k]);
  return p;
}

export const testoPost = (p, contesto) => {
  const dubbi = numeriDaControllare([p.x, p.reddit_title, p.reddit_body].join(' '), contesto);
  return `### X\n\n${p.x}\n\n*Prima risposta:* ${p.x_reply}\n\n*(${p.x.length} caratteri)*\n\n### Reddit · r/LocalLLaMA · flair «${p.reddit_flair}»\n\n**${p.reddit_title}**\n\n${p.reddit_body}\n\n${dubbi.length ? `> ⚠️ Numeri da controllare (non li trovo nei dati): ${dubbi.join(', ')}\n\n` : ''}*Prima di pubblicare su Reddit: leggi le regole del gruppo.*`;
};
