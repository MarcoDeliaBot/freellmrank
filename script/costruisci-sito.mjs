// Genera le pagine statiche in sito/ a partire da sito/dati.json.
// Uso: node script/costruisci-sito.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RADICE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITO = path.join(RADICE, 'sito');
const SORGENTE = path.join(RADICE, 'sorgente');
const dati = JSON.parse(fs.readFileSync(path.join(SITO, 'dati.json'), 'utf8'));

// Nome di lavoro: si cambia qui e basta.
const NOME = { testa: 'FreeLLM', coda: 'Rank' };
const NOME_PIENO = NOME.testa + NOME.coda;

// Chat web ufficiali dei laboratori (raggiungibili il 18/10/2026).
export const CHAT_WEB = {
  deepseek: 'https://chat.deepseek.com', moonshot: 'https://www.kimi.com', zai: 'https://chat.z.ai',
  alibaba: 'https://chat.qwen.ai', minimax: 'https://agent.minimax.io', tencent: 'https://yuanbao.tencent.com',
  google: 'https://aistudio.google.com', nvidia: 'https://build.nvidia.com',
};

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const gb = (b, bpp) => Math.ceil(b * bpp * 1.1 + 1.5);

function pagina({ file, titolo, descr, attiva, corpo, script }) {
  const voci = [['index.html', 'Free ranking'], ['compare.html', 'Try & compare'], ['home.html', 'Run at home']];
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(titolo)}</title>
<meta name="description" content="${esc(descr)}">
<link rel="stylesheet" href="stile.css">
</head>
<body>
<header class="top"><div class="wrap">
  <a class="logo" href="index.html">${NOME.testa}<span>${NOME.coda}</span></a>
  <nav>${voci.map(([h, t]) => `<a href="${h}"${h === attiva ? ' aria-current="page"' : ''}>${t}</a>`).join('')}</nav>
</div></header>
<main class="wrap">
${corpo}
</main>
<footer><div class="wrap">
  <p>Rankings: <a href="https://huggingface.co/datasets/lmarena-ai/leaderboard-dataset">Arena leaderboard dataset</a> by Arena Intelligence, licensed <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>. We filtered it to models you can use for free and added sizes from Hugging Face. ${esc(NOME_PIENO)} is not affiliated with Arena.</p>
  <p>Free models: <a href="https://openrouter.ai/models">OpenRouter</a> public list. Data updated ${esc(dati.aggiornato)}.</p>
</div></footer>
${script ? `<script src="${script}" defer></script>` : ''}
</body>
</html>
`;
  fs.writeFileSync(path.join(SITO, file), html);
}

// ---------- classifica ----------
function cellaGratis(m) {
  const t = [];
  if (m.or?.gratis) t.push(`<a class="tag free" href="compare.html#${encodeURIComponent(m.or.id)}">Free API · try it</a>`);
  if (m.aperto && CHAT_WEB[m.org]) t.push(`<a class="tag web" href="${CHAT_WEB[m.org]}" rel="noopener">Lab chat</a>`);
  return t.join('') || '<span class="muted small">—</span>';
}
function cellaCasa(m) {
  if (!m.aperto) return '<span class="muted small">Not downloadable</span>';
  if (!m.hf) return '<span class="muted small">Size unknown</span>';
  const q4 = gb(m.hf.b, 0.6);
  const schede = Math.ceil(q4 / 24);
  const dove = schede === 1 ? '1 GPU of 24 GB' : schede <= 10 ? `${schede} GPUs of 24 GB` : `server: ${Math.ceil(q4 / 80)} GPUs of 80 GB`;
  return `<span class="tag home">${m.hf.b} B</span><span class="small">~${q4} GB at 4-bit · ${dove}</span>`;
}
const usabileGratis = (m) => m.aperto || m.or?.gratis;

const sezioni = dati.categorie.map((c, i) => {
  const lista = c.modelli.filter(usabileGratis);
  const righe = lista.slice(0, 60).map((m, j) => `<tr data-api="${m.or?.gratis ? 1 : 0}" data-open="${m.aperto ? 1 : 0}">
<td class="n">${j + 1}</td>
<td class="m"><b>${esc(m.nome)}</b><div class="org">${esc(m.org || '—')} · ${esc(m.licenza)}</div></td>
<td class="n">${m.punti}<div class="org">#${m.pos} of ${c.totale}</div></td>
<td>${cellaGratis(m)}</td>
<td>${cellaCasa(m)}</td></tr>`).join('');
  const migliore = lista[0];
  return `<section class="cat" id="${c.id}" ${i ? 'hidden' : ''}>
<p class="small muted">${lista.length} of ${c.totale} models in Arena's ${esc(c.nome)} ranking are free to use. Votes as of ${esc(c.data)}. Best free: <b>${esc(migliore?.nome)}</b>, #${migliore?.pos} overall.</p>
<div class="tw"><table>
<thead><tr><th>Free rank</th><th>Model</th><th>Arena score</th><th>Use free online</th><th>Run at home</th></tr></thead>
<tbody>${righe}</tbody></table></div>
</section>`;
}).join('\n');

pagina({
  file: 'index.html', attiva: 'index.html',
  titolo: `Best Free LLMs, Ranked by Real Votes · ${NOME_PIENO}`,
  descr: 'The best free and open-weight AI models for chat, coding, vision, image and video, ranked by millions of human votes from Arena. See where to use each one free and what GPU you need.',
  corpo: `<div style="display:grid;gap:.5rem">
<h1>The best free AI models, ranked by real votes</h1>
<p class="lead">Only models you can use without paying: free online, or downloaded to your own GPU. Scores come from millions of blind human votes on Arena.</p>
</div>
<div class="panel">
<div class="tabs" role="group" aria-label="Category">${dati.categorie.map((c, i) => `<button type="button" data-cat="${c.id}" aria-pressed="${i === 0}">${esc(c.nome)}</button>`).join('')}</div>
<div class="row">
<label class="chk"><input type="checkbox" id="f-api"> Free API right now</label>
<label class="chk"><input type="checkbox" id="f-open"> Downloadable (open weights)</label>
</div>
</div>
${sezioni}`,
  script: 'classifica.js',
});

// ---------- prova a confronto ----------
pagina({
  file: 'compare.html', attiva: 'compare.html',
  titolo: `Try Free LLMs Side by Side · ${NOME_PIENO}`,
  descr: 'Send one prompt to two free AI models and compare the answers. Blind mode hides the names until you vote. Runs on your own free OpenRouter account.',
  corpo: `<div style="display:grid;gap:.5rem">
<h1>Try two free models side by side</h1>
<p class="lead">One prompt, two answers. Vote for the better one, then see which models they were.</p>
</div>
<div class="panel" id="conto">
<h2>1. Connect your free OpenRouter account</h2>
<p class="small muted">Your prompts go from your browser straight to OpenRouter, on your own free quota (OpenRouter limits free models per account, about 50 requests a day without credit). We never see your key or your prompts.</p>
<div class="row"><button class="btn primary" id="accedi" type="button">Connect with OpenRouter</button><span id="stato-conto" class="small"></span></div>
<details class="small"><summary>I already have a key</summary><div class="row" style="margin-top:.5rem"><input type="password" id="chiave" autocomplete="off" placeholder="sk-or-..." aria-label="OpenRouter key"><button class="btn" id="salva-chiave" type="button">Use this key</button></div></details>
</div>
<div class="panel">
<h2>2. Pick the models</h2>
<div class="row">
<label class="chk"><input type="checkbox" id="cieco" checked> Blind (random pair, names hidden)</label>
</div>
<div class="row" id="scelta" hidden>
<label class="small">Model A <select id="mod-a"></select></label>
<label class="small">Model B <select id="mod-b"></select></label>
</div>
</div>
<div class="panel">
<h2>3. Ask</h2>
<label for="domanda" class="small muted">Your prompt</label>
<textarea id="domanda">Explain in three short sentences why the sky is blue, for a ten-year-old.</textarea>
<div class="row"><button class="btn primary" id="invia" type="button">Send to both</button><span id="stato-invio" class="small muted"></span></div>
</div>
<div class="grid2">
<div class="panel"><h2 id="nome-a">Model A</h2><div class="answer" id="risp-a"></div></div>
<div class="panel"><h2 id="nome-b">Model B</h2><div class="answer" id="risp-b"></div></div>
</div>
<div class="panel" id="voto" hidden>
<h2>Which answer is better?</h2>
<div class="vote">
<button class="btn" data-v="a" type="button">A is better</button>
<button class="btn" data-v="b" type="button">B is better</button>
<button class="btn" data-v="tie" type="button">Tie</button>
<button class="btn" data-v="bad" type="button">Both bad</button>
</div>
<p id="esito" class="small"></p>
</div>
<div class="panel"><h2>Your votes</h2><div id="miei-voti" class="small muted">No votes yet.</div></div>`,
  script: 'confronto.js',
});

// ---------- in casa ----------
pagina({
  file: 'home.html', attiva: 'home.html',
  titolo: `Best Free LLM for Your GPUs (1 to 10 cards) · ${NOME_PIENO}`,
  descr: 'Pick how many GPUs you have and how much memory each one has. See the best free open-weight models that fit, ranked by Arena votes, for chat, coding, vision, image and video.',
  corpo: `<div style="display:grid;gap:.5rem">
<h1>The best model your hardware can run</h1>
<p class="lead">Choose your GPUs. We show the highest-voted open models that fit, from one card up to ten.</p>
</div>
<div class="panel">
<div class="row">
<label class="small">GPUs <select id="n-gpu">${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => `<option${n === 1 ? ' selected' : ''}>${n}</option>`).join('')}</select></label>
<label class="small">Memory per GPU <select id="gb-gpu">${[4, 6, 8, 10, 12, 16, 20, 24, 32, 48, 80, 96, 141, 192].map((g) => `<option value="${g}"${g === 24 ? ' selected' : ''}>${g} GB</option>`).join('')}</select></label>
<label class="small">Precision <select id="quant"><option value="0.6" selected>4-bit (Q4_K_M)</option><option value="0.75">5-bit (Q5_K_M)</option><option value="1.07">8-bit (Q8_0)</option><option value="2.0">16-bit (full)</option></select></label>
<label class="small">System RAM for offload <select id="ram"><option value="0" selected>None</option><option>32</option><option>64</option><option>128</option><option>256</option><option>512</option></select></label>
</div>
<div class="tabs" role="group" aria-label="Category">${dati.categorie.map((c, i) => `<button type="button" data-cat="${c.id}" aria-pressed="${i === 0}">${esc(c.nome)}</button>`).join('')}</div>
<p class="small muted" id="totale"></p>
</div>
<div id="esito-casa"></div>
<p class="small muted">Estimate: parameters × bytes per weight, plus 10% and 1.5 GB for context and runtime. Long contexts need more. Splitting across GPUs works with llama.cpp, vLLM and Ollama, but each card adds some overhead. Image and video models also load text encoders: add a few GB.</p>`,
  script: 'casa.js',
});

for (const f of fs.readdirSync(SORGENTE)) fs.copyFileSync(path.join(SORGENTE, f), path.join(SITO, f));

// Per Google: robots.txt e sitemap.xml. Indirizzo del sito: variabile SITO_URL, oppure quello di Cloudflare Pages.
const URL_SITO = (process.env.SITO_URL || 'https://freellmrank.pages.dev').replace(/\/$/, '');
fs.writeFileSync(path.join(SITO, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${URL_SITO}/sitemap.xml\n`);
fs.writeFileSync(path.join(SITO, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${['', 'compare', 'home'].map((p) => `<url><loc>${URL_SITO}/${p}</loc><lastmod>${dati.aggiornato}</lastmod></url>`).join('\n')}
</urlset>
`);
console.log('pagine scritte in', SITO, fs.readdirSync(SITO).join(' '));
