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
- Do not write one sentence per line for a whole post. Write paragraphs.`;

export async function chiediModello(messaggi, { json = false, max = 2500 } = {}) {
  // GitHub Models è stato chiuso il 30/7/2026: si scrive con Workers AI attraverso la funzione protetta del sito
  const r = await fetch(`${process.env.SCRIVI_URL || 'https://freellmarena.com'}/api/scrivi`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.BOZZE_KEY || ''}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaggi: json ? [...messaggi, { role: 'user', content: 'Reply with only the JSON object, no other text.' }] : messaggi, max }),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`/api/scrivi ${r.status}: ${d.errore || ''}`);
  if (!json) return d.testo;
  const m = d.testo.match(/\{[\s\S]*\}/);
  if (!m) throw new Error(`Risposta senza JSON: ${d.testo.slice(0, 200)}`);
  return JSON.parse(m[0]);
}

// pulizia di sicurezza: anche se il modello sbaglia, niente lineette lunghe
export const senzaLineette = (s) => String(s).replace(/\s*—\s*/g, ', ').replace(/\s*–\s*/g, ' to ');

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
  const esistenti = await gh('GET', `/issues?state=all&labels=${etichette[0]}&per_page=100`);
  const gia = esistenti.find((i) => i.title === titolo);
  if (gia) { console.log('Già aperta:', gia.html_url); return gia; }
  const i = await gh('POST', '/issues', { title: titolo, body: corpo, labels: etichette });
  console.log('Aperta:', i.html_url);
  return i;
}

// post per X e Reddit, con le regole delle skill «social» (X) e «reddit-posts» (Reddit)
export async function postSocial({ argomento, dati, link }) {
  const p = await chiediModello([
    { role: 'system', content: `You write social posts for FreeLLMArena (freellmarena.com), a free site that ranks only the AI models you can use for free, using Arena's blind human votes, and checks which models fit your GPU. The owner posts from his own account.\n${REGOLE_SCRITTURA}\nX rules: state a specific claim in the first 8 words and name the topic in the first 10 words. Write something a reader would send to a friend. Max 270 characters. Do NOT put a link in the post: the link goes in the first reply.\nReddit rules (r/LocalLLaMA): factual title with no clickbait; body leads with value or a real experience; markdown allowed (one small table is fine); end with one genuine question you want answered; add a one-line disclosure that it is the poster's own free site with no ads.` },
    { role: 'user', content: `TOPIC: ${argomento}\nLINK: ${link}\nDATA:\n${dati}\n\nReturn JSON: {"x": "...", "x_reply": "one short line with the link", "reddit_title": "...", "reddit_body": "...", "reddit_flair": "Discussion or Resources or News"}` },
  ], { json: true, max: 1500 });
  for (const k of Object.keys(p)) p[k] = senzaLineette(p[k]);
  return p;
}

export const testoPost = (p, contesto) => {
  const dubbi = numeriDaControllare([p.x, p.reddit_title, p.reddit_body].join(' '), contesto);
  return `### X\n\n${p.x}\n\n*Prima risposta:* ${p.x_reply}\n\n*(${p.x.length} caratteri)*\n\n### Reddit · r/LocalLLaMA · flair «${p.reddit_flair}»\n\n**${p.reddit_title}**\n\n${p.reddit_body}\n\n${dubbi.length ? `> ⚠️ Numeri da controllare (non li trovo nei dati): ${dubbi.join(', ')}\n\n` : ''}*Prima di pubblicare su Reddit: leggi le regole del gruppo.*`;
};
