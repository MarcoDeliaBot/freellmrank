// Parti comuni delle pagine: nome, intestazione, piè di pagina, scrittura dei file.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const RADICE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const SITO = path.join(RADICE, 'sito');
export const URL_SITO = (process.env.SITO_URL || 'https://freellmrank.pages.dev').replace(/\/$/, '');

// Nome di lavoro: si cambia qui e basta.
export const NOME = { testa: 'FreeLLM', coda: 'Rank' };
export const NOME_PIENO = NOME.testa + NOME.coda;

// Chat web ufficiali dei laboratori (raggiungibili il 18/10/2026).
export const CHAT_WEB = {
  deepseek: 'https://chat.deepseek.com', moonshot: 'https://www.kimi.com', zai: 'https://chat.z.ai',
  alibaba: 'https://chat.qwen.ai', minimax: 'https://agent.minimax.io', tencent: 'https://yuanbao.tencent.com',
  google: 'https://aistudio.google.com', nvidia: 'https://build.nvidia.com',
};

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const fmtNum = (n) => (n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? Math.round(n / 1e3) + 'K' : String(n));
export const fmtData = (d) => new Date(d + 'T12:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

const pagine = []; // per la sitemap
export const pagineScritte = () => pagine;

export function pagina({ file, titolo, descr, attiva, corpo, script, dati, blog = [] }) {
  const voci = [['/', 'Leaderboard'], ['/models.html', 'Models'], ['/compare.html', 'Try & compare'], ['/home.html', 'Run at home'], ['/blog/', 'Blog']];
  const canonico = URL_SITO + '/' + file.replace(/index\.html$/, '').replace(/\.html$/, '');
  const colonne = [
    ['Leaderboards', dati.categorie.map((c) => [`/#${c.id}`, `Best free ${c.nome.toLowerCase()} models`])],
    ['Tools', [['/home.html', 'Run at home: GPU simulator'], ['/compare.html', 'Try two free models'], ['/models.html', 'All free models']]],
    ['Blog', [...blog.slice(0, 4).map((p) => [`/blog/${p.slug}.html`, p.titolo]), ['/blog/', 'All posts']]],
    ['About', [['/about.html', 'How we rank'], ['/about.html#faq', 'FAQ'], ['/about.html#sources', 'Data sources'], ['https://github.com/MarcoDeliaBot/freellmrank', 'Source code']]],
  ];
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(titolo)}</title>
<meta name="description" content="${esc(descr)}">
<link rel="canonical" href="${canonico}">
<meta property="og:title" content="${esc(titolo)}">
<meta property="og:description" content="${esc(descr)}">
<meta property="og:type" content="website">
<link rel="stylesheet" href="/stile.css">
</head>
<body>
<header class="top"><div class="wrap">
  <a class="logo" href="/">${NOME.testa}<span>${NOME.coda}</span></a>
  <nav>${voci.map(([h, t]) => `<a href="${h}"${h === attiva ? ' aria-current="page"' : ''}>${t}</a>`).join('')}</nav>
</div></header>
<main class="wrap">
${corpo}
</main>
<footer><div class="wrap">
  <div class="piede">
    <div class="piede-marca"><a class="logo" href="/">${NOME.testa}<span>${NOME.coda}</span></a><p>The best AI models you can use for free, ranked by real human votes.</p></div>
    ${colonne.map(([t, l]) => `<div><h3>${t}</h3><ul>${l.map(([h, x]) => `<li><a href="${h}"${h.startsWith('http') ? ' rel="noopener"' : ''}>${esc(x)}</a></li>`).join('')}</ul></div>`).join('')}
  </div>
  <p>Rankings: <a href="https://huggingface.co/datasets/lmarena-ai/leaderboard-dataset">Arena leaderboard dataset</a> by Arena Intelligence, licensed <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>. We filtered it to models you can use for free and added sizes from Hugging Face. ${esc(NOME_PIENO)} is not affiliated with Arena. Data updated ${esc(dati.aggiornato)}.</p>
</div></footer>
${script ? `<script type="module" src="/${script}"></script>` : ''}
</body>
</html>
`;
  const dest = path.join(SITO, file);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, html);
  pagine.push(file);
}
