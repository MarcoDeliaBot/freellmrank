// Tre pezzi piccoli: la pagina "sul telefono", il feed RSS del blog (per newsletter e n8n) e il widget per altri siti.
import fs from 'node:fs';
import path from 'node:path';
import { esc, pagina, NOME_PIENO, URL_SITO, SITO, fmtNum } from './comune.mjs';
import { barre } from './grafici.mjs';

const gb4 = (b) => b * 0.606 + 0.4; // file a 4-bit più il minimo per farlo girare
const fmtGB = (g) => (g >= 10 ? g.toFixed(0) : g.toFixed(1)) + ' GB';

// ---------- /phone: modelli che girano su un telefono ----------
// Regola prudente: su un telefono il modello può usare circa il 40% della RAM (il resto è del sistema e delle app).
const TAGLI = [[8, 'Most phones from 2023 on'], [12, 'Recent flagships'], [16, 'Top phones and tablets']];
const APP = [
  ['PocketPal AI', 'https://github.com/a-ghorbani/pocketpal-ai', 'open-source app that downloads GGUF models from Hugging Face and runs them offline (MIT license)'],
  ['Google AI Edge Gallery', 'https://github.com/google-ai-edge/gallery', 'Google’s open-source app to try on-device models, including Gemma (Apache-2.0)'],
  ['MLC LLM', 'https://github.com/mlc-ai/mlc-llm', 'engine with a chat app for phones; more technical (Apache-2.0)'],
];

export function paginaTelefono(dati, modelli, blog) {
  const piccoli = modelli.filter((m) => m.hf && m.senzaVoti && !m.nuovo && m.download && m.hf.b <= 16).sort((a, b) => b.download - a.download);
  const minicpm = modelli.find((m) => m.hf?.repo === 'openbmb/MiniCPM-V-4.7-35B-A3B');
  // per ogni taglio solo i modelli in più rispetto al taglio prima (quelli più grandi che ora ci stanno)
  const perTaglio = TAGLI.map(([ram, chi], i) => ({ ram, chi, prima: i ? TAGLI[i - 1][0] : 0,
    lista: piccoli.filter((m) => gb4(m.hf.b) <= ram * 0.4 && gb4(m.hf.b) > (i ? TAGLI[i - 1][0] : 0) * 0.4).slice(0, 8) }));
  // classifica visiva: i più scaricati che stanno in un telefono da 16 GB, colorati secondo il telefono che serve
  const COLORE = { 8: 's3', 12: 's1', 16: 's2' };
  const serve = (m) => TAGLI.find(([ram]) => gb4(m.hf.b) <= ram * 0.4)?.[0];
  const grafico = barre(piccoli.filter((m) => serve(m)).slice(0, 12).map((m) => ({ nome: m.nome, valore: m.download, href: m.href, colore: COLORE[serve(m)], nota: `${fmtGB(gb4(m.hf.b))} at 4-bit, needs a ${serve(m)} GB phone` })),
    { titoloAsse: 'Downloads per month on Hugging Face', formato: fmtNum, daZero: true,
      testoColori: 'Color = the phone it needs: green 8 GB of RAM, blue 12 GB, orange 16 GB. Popularity, not quality: these models have no Arena votes yet.' });
  pagina({
    file: 'phone.html', attiva: '/gpus.html', dati, blog,
    titolo: `Free AI Models That Run on Your Phone (Offline) · ${NOME_PIENO}`,
    descr: 'Which free AI models run offline on a phone with 8, 12 or 16 GB of RAM, which apps to use, and what MiniCPM-V 4.7’s expert streaming really does.',
    corpo: `<div style="display:grid;gap:.4rem">
<h1>Free AI models on your phone</h1>
<p class="lead">A phone can run a small AI model offline, with no account and no internet. What fits depends on its memory (RAM). Here is what to expect, and which free apps to use.</p>
</div>
<div class="panel"><h2>The most used models that fit a phone</h2>${grafico}</div>
<div class="panel"><h2>What fits in your phone’s memory</h2>
<p class="small muted">Rule of thumb: the model can use about 40% of the phone’s RAM; the system and your apps need the rest. Sizes are 4-bit files from the labs’ official Hugging Face pages, ordered by downloads (popularity, not quality).</p>
${perTaglio.map((t) => `<h3>${t.ram} GB of RAM <span class="small muted">· ${esc(t.chi)} · ${t.prima ? `everything above, plus models up to about ${fmtGB(t.ram * 0.4)}` : `models up to about ${fmtGB(t.ram * 0.4)}`}</span></h3>
<div class="tw"><table><thead><tr><th>Model</th><th>Size</th><th>4-bit file</th><th>Downloads/month</th></tr></thead><tbody>${t.lista.map((m) => `<tr><td><a href="${m.href}">${esc(m.nome)}</a><br><span class="small muted">${esc(m.org)}</span></td><td class="n">${m.hf.b} B</td><td class="n">${fmtGB(gb4(m.hf.b))}</td><td class="n">${fmtNum(m.download)}</td></tr>`).join('')}</tbody></table></div>`).join('\n')}
</div>
${minicpm ? `<div class="panel"><h2>The exception: MiniCPM-V 4.7 with expert streaming</h2>
<p><a href="${minicpm.href}">MiniCPM-V 4.7 35B-A3B</a> by OpenBMB has ${minicpm.hf.b} billion parameters but uses only about 3 billion for each word (a mixture of experts). Its makers keep the experts in the phone’s storage and load them just before they are needed, so only about 3 GB sit in memory. They report more than 13 tokens per second on an iPhone 17 Pro Max (<a href="https://huggingface.co/openbmb/MiniCPM-V-4.7-35B-A3B" rel="noopener">model page</a>). It reads images, video and documents too.</p>
<p class="small muted">What this does not mean: the whole model still needs about ${fmtGB(gb4(minicpm.hf.b))} of storage, it needs their special build of llama.cpp, and speed depends on how fast the phone’s storage is. On a graphics card the same model is much faster: see its <a href="${minicpm.href}">page</a>.</p></div>` : ''}
<div class="panel"><h2>Free apps to run them</h2><ul class="dove">${APP.map(([n, u, d]) => `<li><b><a href="${u}" rel="noopener">${esc(n)}</a></b>: ${esc(d)}.</li>`).join('')}</ul>
<p class="small muted">Download the model inside the app (look for a 4-bit or Q4 version), then it works offline. Bigger models drain the battery faster and make the phone warm.</p></div>
<div class="panel"><h2>Need more?</h2><p>For bigger and smarter models, use them free online (<a href="/">leaderboard</a>), try them without an account in <a href="/arena.html">Free Arena</a>, or see what a graphics card can run in <a href="/gpus.html">GPUs for local AI</a>.</p></div>`,
  });
}

// ---------- /blog/feed.xml: RSS 2.0 dei post ----------
export function feedRss(post) {
  const x = (s) => esc(s);
  const voci = [...post].sort((a, b) => String(b.data).localeCompare(String(a.data))).slice(0, 30);
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
<title>${x(NOME_PIENO)} blog</title>
<link>${URL_SITO}/blog/</link>
<atom:link href="${URL_SITO}/blog/feed.xml" rel="self" type="application/rss+xml"/>
<description>Guides to free and local AI models, and a weekly report of what changed on the free leaderboard.</description>
<language>en</language>
${voci.map((p) => `<item><title>${x(p.titolo)}</title><link>${URL_SITO}/blog/${p.slug}</link><guid isPermaLink="true">${URL_SITO}/blog/${p.slug}</guid><pubDate>${new Date(p.data + 'T08:00:00Z').toUTCString()}</pubDate><category>${x(p.tipo)}</category><description>${x(p.descr)}</description></item>`).join('\n')}
</channel>
</rss>
`;
  fs.mkdirSync(path.join(SITO, 'blog'), { recursive: true });
  fs.writeFileSync(path.join(SITO, 'blog', 'feed.xml'), xml);
}

// ---------- widget per altri siti: i dati (piccoli, uno per categoria) e la pagina con il codice da copiare ----------
export function widget(dati, modelli, blog) {
  fs.mkdirSync(path.join(SITO, 'widget'), { recursive: true });
  for (const c of dati.categorie) {
    const primi = modelli.filter((m) => m.cat[c.id]).sort((a, b) => b.cat[c.id].punti - a.cat[c.id].punti).slice(0, 5)
      .map((m) => ({ nome: m.nome, punti: m.cat[c.id].punti, url: `${URL_SITO}${m.href.replace(/\.html$/, '')}` }));
    fs.writeFileSync(path.join(SITO, 'widget', `top-${c.id}.json`), JSON.stringify({ categoria: c.nome, aggiornato: dati.aggiornato, modelli: primi }));
  }
  const codice = (cat) => `<div class="freellmarena-top" data-category="${cat}"></div>\n<script src="${URL_SITO}/widget.js" async></script>`;
  pagina({
    file: 'embed.html', attiva: '', dati, blog, script: 'widget.js',
    titolo: `Free Leaderboard Widget for Your Site · ${NOME_PIENO}`,
    descr: 'Show the top 5 free AI models on your blog or site with two lines of code. Updated every night, free, no tracking.',
    corpo: `<div style="display:grid;gap:.4rem">
<h1>Put the free leaderboard on your site</h1>
<p class="lead">Two lines of code show the top 5 free AI models on your blog or site. It updates by itself every night, it is free, and it sets no cookies.</p>
</div>
<div class="panel"><h2>Preview</h2><div class="freellmarena-top" data-category="chat"></div></div>
<div class="panel"><h2>Copy this code</h2>
<p class="small muted">Paste it where you want the box. Change <code>chat</code> to ${dati.categorie.map((c) => `<code>${esc(c.id)}</code>`).join(', ')} for another category.</p>
<pre class="codice"><code>${esc(codice('chat'))}</code></pre>
<p class="small muted">The box shows the model names, their Arena scores and a link to ${esc(NOME_PIENO)}. Data: Arena leaderboard dataset (CC BY 4.0), filtered to free models.</p></div>`,
  });
}
