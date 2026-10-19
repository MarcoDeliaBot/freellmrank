// Genera il sito statico in sito/ da sito/dati.json e sito/storia.json.
// Uso: node script/costruisci-sito.mjs
import fs from 'node:fs';
import path from 'node:path';
import { RADICE, SITO, URL_SITO, NOME_PIENO, CHAT_WEB, esc, fmtData, pagina, pagineScritte } from './sito/comune.mjs';
import { barre, dispersione, linee, matrice } from './sito/grafici.mjs';
import { unisci, paginaCatalogo, pagineModelli } from './sito/modelli.mjs';
import { preparaBlog, pagineBlog } from './sito/blog.mjs';
import { paginaDecisioni } from './sito/decisioni.mjs';
import { simula, daScheda, kvGB, perditaQualita, giudizio, QUANTI } from '../sorgente/calcolo.mjs';

const SORGENTE = path.join(RADICE, 'sorgente');
const dati = JSON.parse(fs.readFileSync(path.join(SITO, 'dati.json'), 'utf8'));
const fileStoria = path.join(SITO, 'storia.json');
const storia = fs.existsSync(fileStoria) ? JSON.parse(fs.readFileSync(fileStoria, 'utf8')) : null;

// pulizia delle cartelle generate
for (const d of ['model', 'blog']) fs.rmSync(path.join(SITO, d), { recursive: true, force: true });

const modelli = unisci(dati, storia);
const perNome = new Map();
for (const m of modelli) for (const n of Object.values(m.nomi)) perNome.set(n, m);
const blog = preparaBlog(dati, storia, modelli);
const usabileGratis = (m) => m.aperto || m.or?.gratis;
// riferimento per la colonna velocità: RTX 4090, 4 bit, 8K di contesto, 64 GB di DDR5
const RIF = daScheda(dati.schede.schede.find((x) => x.id === 'rtx4090'), { n: 1, ram: 64, bandaRam: 96, ctx: 8192 });
const Q4 = QUANTI.find((q) => q.id === 'Q4_K_M');
const fmtVel = (v) => (v >= 100 ? Math.round(v) : v >= 10 ? v.toFixed(0) : v.toFixed(1));

// ---------- classifica ----------
function cellaGratis(m) {
  const t = [];
  if (m.or?.gratis) t.push(`<a class="tag free" href="/compare.html#${encodeURIComponent(m.or.id)}">Free API · try it</a>`);
  if (m.aperto && CHAT_WEB[m.org]) t.push(`<a class="tag web" href="${CHAT_WEB[m.org]}" rel="noopener">Lab chat</a>`);
  return t.join('') || '<span class="muted small">—</span>';
}
const hrefDi = (nome) => perNome.get(nome)?.href || '/models.html';

const sezioni = dati.categorie.map((c, i) => {
  const lista = c.modelli.filter(usabileGratis);
  const pagato = c.modelli.find((m) => !usabileGratis(m));
  const alto = c.modelli[0]?.punti || 1, basso = Math.min(...lista.slice(0, 60).map((m) => m.punti)) - 20;
  const barra = (p) => `<span class="punti" title="Best model overall: ${alto}"><i style="width:${Math.round((100 * (p - basso)) / (alto - basso))}%"></i></span>`;
  const soloPesi = ['image', 'video', 'edit'].includes(c.id);
  const righe = lista.slice(0, 60).map((m, j) => {
    // colonne calcolate: tutto quello che serve per scegliere, nella stessa riga
    const q4 = m.hf ? m.hf.b * 0.606 + (soloPesi ? 3 : kvGB(m.hf, 8192)) + 0.6 : null;
    const sim = m.hf ? simula(m.hf, { ...RIF, bpp: 0.606 }, soloPesi) : null;
    const perdita = m.hf && !soloPesi ? perditaQualita(Q4, m.hf.b) : null;
    const dove = !sim ? '—' : sim.dove === 'gpu' ? `<b>${soloPesi ? 'fits' : fmtVel(sim.vel) + ' tok/s'}</b>` : sim.dove === 'ram' ? `${soloPesi ? 'with RAM' : fmtVel(sim.vel) + ' tok/s'}<div class="org">GPU + RAM</div>` : '<span class="muted">does not fit</span>';
    return `<tr data-api="${m.or?.gratis ? 1 : 0}" data-open="${m.aperto ? 1 : 0}">
<td class="n">${j + 1}</td>
<td class="m"><a class="nome-modello" href="${hrefDi(m.nome)}">${esc(m.nome)}</a><div class="org">${esc(m.org || '—')}</div></td>
<td class="n">${m.punti}${barra(m.punti)}<div class="org">#${m.pos} of ${c.totale}</div></td>
<td class="n">${m.hf ? `${m.hf.b} B${m.hf.att && m.hf.att < m.hf.b ? `<div class="org">${m.hf.att} B active</div>` : ''}` : '—'}</td>
<td>${m.aperto ? '<span class="tag home">Yes</span>' : '<span class="muted small">No</span>'}<div class="org">${esc(m.licenza)}</div></td>
<td class="n">${q4 ? (q4 >= 100 ? Math.round(q4) : q4.toFixed(q4 >= 10 ? 0 : 1)) + ' GB' : '—'}</td>
<td class="n">${perdita != null ? '+' + perdita.toFixed(1) + '%' : '—'}${perdita != null ? `<div class="org">${giudizio(perdita)}</div>` : ''}</td>
<td class="n">${dove}</td>
<td>${cellaGratis(m)}</td></tr>`;
  }).join('');
  const migliore = lista[0];

  // grafico 1: le prime 15 gratis, con il miglior modello a pagamento come riferimento
  const prime = [];
  const visti = new Set();
  for (const m of lista) { const k = perNome.get(m.nome)?.chiave || m.nome; if (visti.has(k)) continue; visti.add(k); prime.push(m); if (prime.length === 15) break; }
  const graficoBarre = barre(prime.map((m) => ({ nome: m.nome, valore: m.punti, href: hrefDi(m.nome), nota: `#${m.pos} of ${c.totale}` })), pagato ? { riferimento: { valore: pagato.punti, nome: pagato.nome } } : {});

  // grafico 2: punteggio contro dimensione (modelli aperti con dimensione nota)
  const punti = [];
  const vistiD = new Set();
  for (const m of lista) { if (!m.aperto || !m.hf || vistiD.has(m.hf.repo)) continue; vistiD.add(m.hf.repo); punti.push({ x: m.hf.b, y: m.punti, nome: m.nome, href: hrefDi(m.nome) }); }
  const graficoDisp = dispersione(punti);

  // grafico 3: andamento delle prime 5 aperte negli ultimi sei mesi
  const st = storia?.categorie[c.id];
  let graficoLinee = '';
  if (st) {
    const cinque = prime.filter((m) => m.aperto && st.serie[m.nome]).slice(0, 5);
    graficoLinee = linee(st.date, cinque.map((m) => ({ nome: m.nome, valori: st.serie[m.nome], href: hrefDi(m.nome) })), st.pagato);
  }

  const piccoli = (dati.piccoli || []).filter((p) => p.cat.includes(c.id)).slice(0, 20);
  const fmtD = (n) => (n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : Math.round(n / 1e3) + 'K');
  const parteSenzaVoti = piccoli.length ? `<div class="panel"><h2>Small models, no Arena votes yet</h2>
<p class="small muted">Official models from the labs' Hugging Face pages, 0.5 to 16 billion parameters. Arena has not voted on them, so they are ordered by downloads, which shows popularity, not quality. They run on 4 to 12 GB of GPU memory.</p>
<div class="tw"><table>
<thead><tr><th>Model</th><th>Downloads/month</th><th>Size</th><th>Run at home</th></tr></thead>
<tbody>${piccoli.map((p) => { const u = modelli.find((x) => x.chiave === p.hf.repo); return `<tr><td class="m"><a class="nome-modello" href="${u?.href || '#'}">${esc(p.nome)}</a><div class="org">${esc(p.org)}${p.gated ? ' · license to accept' : ''}</div></td>
<td class="n">${fmtD(p.download)}</td><td class="n">${p.hf.b} B${p.hf.att && p.hf.att < p.hf.b ? `<div class="org">${p.hf.att} B active</div>` : ''}</td>
<td><span class="small">~${Math.ceil(p.hf.b * 0.606 * 1.1 + 1.5)} GB at 4-bit</span> · <a class="small" href="/home.html">simulate</a></td></tr>`; }).join('')}</tbody></table></div></div>` : '';

  return `<section class="cat" id="${c.id}" ${i ? 'hidden' : ''}>
<p class="small muted">${lista.length} of ${c.totale} models in Arena's ${esc(c.nome)} ranking are free to use. Votes as of ${fmtData(c.data)}. Best free: <a href="${hrefDi(migliore?.nome)}"><b>${esc(migliore?.nome)}</b></a>, #${migliore?.pos} overall.</p>
<div class="panel"><h2>Full free ranking</h2>
<div class="tw"><table>
<thead><tr><th>Free rank</th><th>Model</th><th>Arena score</th><th>Size</th><th>Download</th><th>4-bit needs</th><th>Quality at 4-bit</th><th>Speed on RTX 4090</th><th>Use free online</th></tr></thead>
<tbody>${righe}</tbody></table></div>
<p class="small muted">Size: parameters (and active parameters for mixture-of-experts). 4-bit needs: GPU memory at Q4_K_M${soloPesi ? ' plus about 3 GB for encoders' : ' with 8K of context'}. ${soloPesi ? '' : 'Quality at 4-bit: perplexity increase against the full model, from llama.cpp tests scaled by size. '}Speed: estimate on one RTX 4090 (24 GB) with 64 GB of DDR5, at 4-bit. <a href="/home.html">Simulate your own hardware</a>.</p></div>
<div class="grafici">
<div class="panel"><h2>Top 15 free ${esc(c.nome.toLowerCase())} models</h2>${graficoBarre}</div>
${graficoDisp ? `<div class="panel"><h2>Score against size</h2>${graficoDisp}</div>` : ''}
${graficoLinee ? `<div class="panel largo"><h2>Top free models over the last six months</h2>${graficoLinee}</div>` : ''}
<div class="panel largo"><h2>Who beats whom</h2>${matrice([...(pagato ? [{ nome: pagato.nome, valore: pagato.punti, pagato: true }] : []), ...prime.slice(0, 12).map((m) => ({ nome: m.nome, valore: m.punti, href: hrefDi(m.nome) }))])}</div>
</div>
${parteSenzaVoti}
</section>`;
}).join('\n');

// nuovi arrivi: modelli gratis entrati di recente nelle classifiche Arena
const nuovi = [];
if (storia) {
  for (const c of dati.categorie) {
    const st = storia.categorie[c.id];
    for (const m of c.modelli.filter(usabileGratis)) {
      const d = st?.primo[m.nome];
      if (d) nuovi.push({ m, c, d });
    }
  }
  nuovi.sort((a, b) => b.d.localeCompare(a.d) || a.m.pos - b.m.pos);
}
const vistiN = new Set();
const ultimi = nuovi.filter((x) => { const k = perNome.get(x.m.nome)?.chiave || x.m.nome; if (vistiN.has(k)) return false; vistiN.add(k); return true; }).slice(0, 4);

// modelli nuovi che Arena non vota ancora
const NOMI_CAT = Object.fromEntries(dati.categorie.map((c) => [c.id, c.nome]));
const inAttesa = modelli.filter((m) => m.nuovo).sort((a, b) => (b.primo || '').localeCompare(a.primo || ''));
const sezioneNuovi = inAttesa.length ? `<div class="panel" id="new"><h2>New, waiting for Arena votes</h2>
<p class="small muted">Released in the last 60 days by the labs' official Hugging Face pages, or new free models on OpenRouter, that Arena has not voted on yet. We check every night; once Arena votes, a model moves into the ranking above.</p>
<div class="tw"><table><thead><tr><th>Released</th><th>Model</th><th>Type</th><th>Size</th><th>4-bit needs</th><th>Use it free</th></tr></thead><tbody>
${inAttesa.map((m) => `<tr><td class="n">${m.primo ? fmtData(m.primo) : 'free API'}</td>
<td class="m"><a class="nome-modello" href="${m.href}">${esc(m.nome)}</a><div class="org">${esc(m.org)}</div></td>
<td class="small">${[...new Set(m.catPiccoli || [])].map((c) => esc(NOMI_CAT[c] || c)).join(', ')}</td>
<td class="n">${m.hf ? m.hf.b + ' B' : '—'}${m.hf?.att && m.hf.att < m.hf.b ? `<div class="org">${m.hf.att} B active</div>` : ''}</td>
<td class="n">${m.hf ? Math.ceil(m.hf.b * 0.606 * 1.1 + 1.5) + ' GB' : '—'}</td>
<td>${m.or?.gratis ? `<a class="tag free" href="/compare.html#${encodeURIComponent(m.or.id)}">Free API · try it</a>` : ''}${m.hf ? '<span class="tag home">Download</span>' : ''}</td></tr>`).join('')}
</tbody></table></div></div>` : '';

const FAQ = [
  ['What about brand-new models?', 'Arena takes a few days or weeks to collect enough votes. Meanwhile, new models from the labs’ official pages appear in “New, waiting for Arena votes”, with their size, memory needs and speed. When Arena votes, they move into the ranking automatically.'],
  ['What counts as a free model?', 'A model with open weights that you can download and run yourself, or a model you can call through a free API today (we check OpenRouter every night). Paid-only models are left out of the rankings, but we show the best paid score as a reference line.'],
  ['Where do the scores come from?', 'From Arena (formerly LMSYS Chatbot Arena), where people compare two anonymous answers and vote for the better one. Arena publishes its leaderboard as an open dataset under the CC BY 4.0 license; we filter it to free models. We are not affiliated with Arena.'],
  ['How often is it updated?', 'Every night. A scheduled job downloads the latest Arena data, the free model list from OpenRouter and model sizes from Hugging Face, then rebuilds the whole site, including the weekly report on the blog.'],
  ['Can I run these models on my computer?', 'Open models, yes, if they fit in your GPU memory. The Run at home page estimates memory and speed for your exact card, from one to ten cards, using each model\'s real architecture.'],
  ['Why do small models have no score?', 'Arena votes mostly on large models. We list the most popular small models from the labs\' official Hugging Face pages separately and mark them “No Arena votes”, so you can still find something that runs on a 4 to 12 GB card.'],
];
const faqHtml = (titolo = 'Frequently asked questions') => `<div class="panel faq" id="faq"><h2>${titolo}</h2>${FAQ.map(([d, r]) => `<details><summary>${esc(d)}</summary><p>${esc(r)}</p></details>`).join('')}</div>`;

pagina({
  file: 'index.html', attiva: '/', dati, blog,
  titolo: `Best Free AI Models, Ranked by Real Votes · ${NOME_PIENO}`,
  descr: 'The best free and open-weight AI models for chat, coding, vision, image and video, ranked by millions of human votes from Arena. See where to use each one free and what GPU you need.',
  corpo: `<div class="eroe">
<div style="display:grid;gap:.5rem">
<h1>The best free AI models, ranked by real votes</h1>
<p class="lead">Only models you can use without paying: free online, or downloaded to your own GPU. Scores come from millions of blind human votes on Arena, updated every night.</p>
</div>
${ultimi.length ? `<div class="nuovi"><span class="small muted">New on the free leaderboard</span>${ultimi.map((x) => `<a href="${hrefDi(x.m.nome)}"><b>${esc(x.m.nome)}</b><span class="small muted">#${x.m.pos} in ${esc(x.c.nome)} · ${fmtData(x.d)}</span></a>`).join('')}</div>` : ''}
</div>
<div class="panel">
<div class="tabs" role="group" aria-label="Category">${dati.categorie.map((c, i) => `<button type="button" data-cat="${c.id}" aria-pressed="${i === 0}">${esc(c.nome)}</button>`).join('')}</div>
<div class="row">
<label class="chk"><input type="checkbox" id="f-api"> Free API right now</label>
<label class="chk"><input type="checkbox" id="f-open"> Downloadable (open weights)</label>
</div>
</div>
${sezioni}
${sezioneNuovi}
${faqHtml()}`,
  script: 'classifica.js',
});

// ---------- prova a confronto ----------
pagina({
  file: 'compare.html', attiva: '/compare.html', dati, blog,
  titolo: `Try Free AI Models Side by Side · ${NOME_PIENO}`,
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
  file: 'home.html', attiva: '/home.html', dati, blog,
  titolo: `Best Free AI Model for Your GPUs (1 to 10 cards) · ${NOME_PIENO}`,
  descr: 'Pick your graphics card, how many you have and your RAM. See the best free open-weight models that fit, how the memory splits and how fast they run.',
  corpo: `<div style="display:grid;gap:.5rem">
<h1>The best model your hardware can run</h1>
<p class="lead">Pick your graphics card, how many you have, and your system RAM. See which top-voted open models fit, how the memory splits, and how fast they will write.</p>
</div>
<div class="panel sim">
<div class="rileva"><button class="btn primary" type="button" id="rileva">Detect my graphics card</button><span class="small" id="rileva-esito">Or pick it from the list. Your browser cannot tell us your system RAM, so set that yourself.</span></div>
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
<div id="spiega"></div>
<div id="grafico"></div>
<div id="tabella"></div>
<details class="panel small"><summary><b>How we estimate</b></summary>
<p><b>Memory</b> = weights (parameters × bytes per weight at the chosen precision) + context cache (computed from each model's real architecture on Hugging Face: layers, attention heads, sliding windows) + about 0.6 GB per card for the runtime. Image and video models get 3 GB more for text encoders and decoders.</p>
<p><b>Speed</b>: writing a token reads the active weights and the cache once, so tokens per second ≈ memory bandwidth × 70% ÷ data read. Mixture-of-experts models read only their active experts. With several cards (llama.cpp and Ollama split layers across them), speed stays near one card's speed; with weights in system RAM, the RAM part is far slower. Real numbers vary by about ±30%.</p>
<p>Apple, AMD Ryzen AI Max and DGX Spark share memory with the system: we count 75% of it.</p>
</details>`,
  script: 'casa.js',
});

// ---------- metodo, fonti, FAQ ----------
pagina({
  file: 'about.html', attiva: '', dati, blog,
  titolo: `How We Rank Free AI Models · ${NOME_PIENO}`,
  descr: `How ${NOME_PIENO} works: where the votes, free models, sizes and speed estimates come from, and how often they update.`,
  corpo: `<article class="articolo">
<h1>How we rank free AI models</h1>
<p class="lead">${NOME_PIENO} shows the best AI models you can use without paying, ranked by real human votes, with what you need to run them.</p>
<h2>The ranking</h2>
<p>Scores come from <a href="https://huggingface.co/datasets/lmarena-ai/leaderboard-dataset">Arena's public leaderboard dataset</a>. On Arena, people send a prompt, get two anonymous answers and vote for the better one; the votes become a score with the Bradley-Terry model. We keep only the models you can use for free: open weights, or a free API today. Rank numbers (“#11 of 416”) count all models, paid ones included.</p>
<h2>Sizes and memory</h2>
<p>Parameter counts come from the official Hugging Face repositories (safetensors metadata). Context memory comes from each model's configuration file: layers, attention heads, sliding windows and compressed attention. For repositories that require accepting a license, we read the same configuration from Unsloth's public copy.</p>
<h2>Speed</h2>
<p>Speed is an estimate: memory bandwidth × 70% ÷ the data read for each token (active weights plus context). It matches real llama.cpp results within about ±30%. Graphics card specifications come from the manufacturers' data sheets.</p>
<h2>Small models without votes</h2>
<p>Arena votes mostly on large models. We also list popular small models (0.5 to 16 billion parameters) from the labs' official Hugging Face pages, marked “No Arena votes”. They are ordered by downloads or size, never presented as ranked by quality.</p>
<h2 id="sources">Data sources</h2>
<ul>
<li><a href="https://huggingface.co/datasets/lmarena-ai/leaderboard-dataset">Arena leaderboard dataset</a>, CC BY 4.0, by Arena Intelligence. We filter it and add sizes; we are not affiliated with Arena.</li>
<li><a href="https://openrouter.ai/api/v1/models">OpenRouter model list</a>, to find models with a free API.</li>
<li><a href="https://huggingface.co/docs/hub/api">Hugging Face Hub API</a>, for parameter counts, configurations and downloads.</li>
</ul>
<h2>Updates</h2>
<p>Everything updates every night: rankings, free APIs, sizes, model pages and the weekly report on the blog. Last update: ${fmtData(dati.aggiornato)}. The code is <a href="https://github.com/MarcoDeliaBot/freellmrank">open source</a>.</p>
</article>
${faqHtml()}`,
});

// pagina non trovata: Cloudflare Pages la serve con codice 404 (senza, risponde con la home)
pagina({
  file: '404.html', attiva: '', dati, blog,
  titolo: `Page not found · ${NOME_PIENO}`, descr: 'This page does not exist.',
  corpo: `<div style="display:grid;gap:.6rem"><h1>Page not found</h1><p class="lead">This page does not exist, or the model was renamed.</p>
<p><a href="/">Free leaderboard</a> · <a href="/models.html">All free models</a> · <a href="/home.html">Run at home</a></p></div>`,
});

paginaCatalogo(dati, modelli, blog);
paginaDecisioni(dati, blog);
pagineModelli(dati, storia, modelli, blog);
pagineBlog(dati, blog);

for (const f of fs.readdirSync(SORGENTE)) fs.copyFileSync(path.join(SORGENTE, f), path.join(SITO, f));

// robots.txt e sitemap.xml con tutte le pagine
fs.writeFileSync(path.join(SITO, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${URL_SITO}/sitemap.xml\n`);
const indirizzi = pagineScritte().filter((f) => f !== '404.html').map((f) => URL_SITO + '/' + f.replace(/index\.html$/, '').replace(/\.html$/, ''));
fs.writeFileSync(path.join(SITO, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${indirizzi.map((u) => `<url><loc>${u}</loc><lastmod>${dati.aggiornato}</lastmod></url>`).join('\n')}
</urlset>
`);
console.log(`pagine: ${pagineScritte().length} (modelli ${modelli.length}, articoli ${blog.length})`);
