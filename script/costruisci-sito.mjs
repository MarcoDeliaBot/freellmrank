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
  const alto = c.modelli[0]?.punti || 1, basso = Math.min(...lista.slice(0, 60).map((m) => m.punti)) - 20;
  const barra = (p) => `<span class="punti" title="Best paid model: ${alto}"><i style="width:${Math.round((100 * (p - basso)) / (alto - basso))}%"></i></span>`;
  const righe = lista.slice(0, 60).map((m, j) => `<tr data-api="${m.or?.gratis ? 1 : 0}" data-open="${m.aperto ? 1 : 0}">
<td class="n">${j + 1}</td>
<td class="m"><b>${esc(m.nome)}</b><div class="org">${esc(m.org || '—')} · ${esc(m.licenza)}</div></td>
<td class="n">${m.punti}${barra(m.punti)}<div class="org">#${m.pos} of ${c.totale}</div></td>
<td>${cellaGratis(m)}</td>
<td>${cellaCasa(m)}</td></tr>`).join('');
  const migliore = lista[0];
  // modelli piccoli senza voti Arena, in una tabella a parte
  const piccoli = (dati.piccoli || []).filter((p) => p.cat.includes(c.id)).slice(0, 20);
  const fmtD = (n) => (n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : Math.round(n / 1e3) + 'K');
  const parteSenzaVoti = piccoli.length ? `<h2 style="margin-top:1rem">Small models, no Arena votes yet</h2>
<p class="small muted">Official models from the labs' Hugging Face pages, 0.5 to 16 billion parameters. Arena has not voted on them, so they are ordered by downloads, which shows popularity, not quality. They run on 4 to 12 GB of GPU memory.</p>
<div class="tw"><table>
<thead><tr><th>Model</th><th>Downloads/month</th><th>Size</th><th>Run at home</th></tr></thead>
<tbody>${piccoli.map((p) => `<tr><td class="m"><b>${esc(p.nome)}</b><div class="org">${esc(p.org)} · <a href="https://huggingface.co/${esc(p.hf.repo)}" rel="noopener">model</a>${p.gated ? ' · license to accept' : ''}</div></td>
<td class="n">${fmtD(p.download)}</td><td class="n">${p.hf.b} B${p.hf.att && p.hf.att < p.hf.b ? `<div class="org">${p.hf.att} B active</div>` : ''}</td>
<td><span class="small">~${gb(p.hf.b, 0.6)} GB at 4-bit</span> · <a class="small" href="home.html">simulate</a></td></tr>`).join('')}</tbody></table></div>` : '';
  return `<section class="cat" id="${c.id}" ${i ? 'hidden' : ''}>
<p class="small muted">${lista.length} of ${c.totale} models in Arena's ${esc(c.nome)} ranking are free to use. Votes as of ${esc(c.data)}. Best free: <b>${esc(migliore?.nome)}</b>, #${migliore?.pos} overall.</p>
<div class="tw"><table>
<thead><tr><th>Free rank</th><th>Model</th><th>Arena score</th><th>Use free online</th><th>Run at home</th></tr></thead>
<tbody>${righe}</tbody></table></div>
${parteSenzaVoti}
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
<p class="lead">Pick your graphics card, how many you have, and your system RAM. See which top-voted open models fit, how the memory splits, and how fast they will write.</p>
</div>
<div class="panel sim">
<div class="campi">
<label>Graphics card<select id="scheda">${(() => {
    const gruppi = {};
    for (const s of dati.schede.schede) (gruppi[s.marca] ||= []).push(s);
    return Object.entries(gruppi).map(([m, l]) => `<optgroup label="${esc(m)}">${l.map((s) => `<option value="${s.id}"${s.id === 'rtx4090' ? ' selected' : ''}>${esc(s.nome)} · ${s.gb} GB</option>`).join('')}</optgroup>`).join('') + '<optgroup label="Other"><option value="custom">Custom card…</option></optgroup>';
  })()}</select></label>
<label>How many<select id="n-gpu">${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => `<option${n === 1 ? ' selected' : ''}>${n}</option>`).join('')}</select></label>
<label id="campo-gb" hidden>Memory per card (GB)<input type="number" id="gb-custom" min="2" max="512" value="24" inputmode="numeric"></label>
<label id="campo-banda" hidden>Bandwidth (GB/s)<input type="number" id="banda-custom" min="50" max="8000" value="1000" inputmode="numeric"></label>
<label>System RAM<select id="ram">${[0, 16, 32, 64, 96, 128, 192, 256, 512].map((g) => `<option value="${g}"${g === 64 ? ' selected' : ''}>${g ? g + ' GB' : 'Do not use'}</option>`).join('')}</select></label>
<label>RAM type<select id="ram-tipo">${dati.schede.ram.map((r) => `<option value="${r.banda}"${r.id === 'ddr5' ? ' selected' : ''}>${esc(r.nome)}</option>`).join('')}</select></label>
<label>Precision<select id="quant"><option value="0.606" selected>4-bit · Q4_K_M</option><option value="0.711">5-bit · Q5_K_M</option><option value="0.82">6-bit · Q6_K</option><option value="1.0625">8-bit · Q8_0</option><option value="2">16-bit · full</option></select></label>
<label>Context cache<select id="kvq"><option value="1" selected>16-bit (default)</option><option value="0.53">8-bit</option><option value="0.28">4-bit</option></select></label>
</div>
<div class="contesto" id="riga-contesto">
<label for="ctx">Context length <b id="ctx-val">32K tokens</b></label>
<input type="range" id="ctx" min="0" max="7" step="1" value="4">
<div class="scala small muted">${['2K', '4K', '8K', '16K', '32K', '64K', '128K', '256K'].map((t, i) => `<span style="left:${(100 * i) / 7}%">${t}</span>`).join('')}</div>
</div>
<div class="tabs" role="group" aria-label="Category">${dati.categorie.map((c, i) => `<button type="button" data-cat="${c.id}" aria-pressed="${i === 0}">${esc(c.nome)}</button>`).join('')}</div>
</div>
<div class="tiles" id="tiles"></div>
<div id="migliore"></div>
<div id="grafico"></div>
<div id="tabella"></div>
<details class="panel small"><summary><b>How we estimate</b></summary>
<p><b>Memory</b> = weights (parameters × bytes per weight at the chosen precision) + context cache (computed from each model's real architecture on Hugging Face: layers, attention heads, sliding windows) + about 0.6 GB per card for the runtime. Image and video models get 3 GB more for text encoders and decoders.</p>
<p><b>Speed</b>: writing a token reads the active weights and the cache once, so tokens per second ≈ memory bandwidth × 70% ÷ data read. Mixture-of-experts models read only their active experts. With several cards (llama.cpp and Ollama split layers across them), speed stays near one card's speed; with weights in system RAM, the RAM part is far slower. Real numbers vary by about ±30%.</p>
<p>Apple, AMD Ryzen AI Max and DGX Spark share memory with the system: we count 75% of it.</p>
</details>`,
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
