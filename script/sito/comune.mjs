// Parti comuni delle pagine: nome, intestazione, piè di pagina, scrittura dei file.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const RADICE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const SITO = path.join(RADICE, 'sito');
export const URL_SITO = (process.env.SITO_URL || 'https://freellmarena.com').replace(/\/$/, '');

// Google Analytics 4 (si attiva solo dopo il consenso, vedi sorgente/consent.js)
export const GA_ID = 'G-D4DK3X1MQJ';
// versione dei file statici: cambia a ogni build, così i browser non usano lo stile vecchio
export const VER = Date.now().toString(36);
// Affiliazione Amazon: un codice per negozio. Oggi solo amazon.it (codice di Marco, 19/10/2026).
// Per gli altri negozi il link va su amazon.com senza codice finché non arriva il loro.
export const AMAZON = { it: { host: 'www.amazon.it', tag: 'comecosa-21' } };
export const AMAZON_ALTRI = 'www.amazon.com';
export const linkAmazon = (q, negozio = 'it') => { const n = AMAZON[negozio]; return `https://${n ? n.host : AMAZON_ALTRI}/s?k=${encodeURIComponent(q)}${n ? `&tag=${n.tag}` : ''}`; };
// contatto del titolare per la pagina privacy (scelto da Marco il 19/10, casella su Server Plan)
export const CONTATTO_PRIVACY = 'info@freellmarena.com';

// Nome di lavoro: si cambia qui e basta.
export const NOME = { testa: 'FreeLLM', coda: 'Arena' };
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

export function pagina({ file, titolo, descr, attiva, corpo, script, dati, blog = [], jsonld = [] }) {
  // icone a linea, disegnate qui (niente librerie esterne)
  const ICONE = {
    classifica: '<path d="M5 20v-7M12 20V5M19 20v-10"/>',
    modelli: '<rect x="4" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5"/>',
    confronto: '<rect x="3.5" y="5" width="7" height="14" rx="1.5"/><rect x="13.5" y="5" width="7" height="14" rx="1.5"/>',
    casa: '<rect x="7" y="7" width="10" height="10" rx="1.5"/><path d="M10 3.5V7M14 3.5V7M10 17v3.5M14 17v3.5M3.5 10H7M3.5 14H7M17 10h3.5M17 14h3.5"/>',
    blog: '<path d="M6.5 3.5h8l3 3v14h-11z"/><path d="M9.5 11.5h5M9.5 15h5"/>',
    gpus: '<rect x="2.5" y="6.5" width="19" height="10" rx="2"/><circle cx="8.5" cy="11.5" r="2.6"/><circle cx="15.5" cy="11.5" r="2.6"/><path d="M5 16.5v2.5M9 16.5v2.5"/>',
    decisioni: '<path d="M12 3.5v6M12 9.5l-6 5M12 9.5l6 5"/><circle cx="6" cy="17" r="2.5"/><circle cx="18" cy="17" r="2.5"/>',
  };
  const icona = (k) => `<svg class="icona" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONE[k]}</svg>`;
  const voci = [
    ['/', `${icona('classifica')}Leaderboard <span class="badge-free">free</span>`],
    ['/models.html', `${icona('modelli')}Models`],
    ['/decision.html', `${icona('decisioni')}Decision models`],
    ['/compare.html', `${icona('confronto')}Try & compare`],
    ['/home.html', `${icona('casa')}Run at home`],
    ['/gpus.html', `${icona('gpus')}GPUs`],
    ['/blog/', `${icona('blog')}Blog`],
  ];
  const canonico = URL_SITO + '/' + file.replace(/index\.html$/, '').replace(/\.html$/, '');
  // un'immagine di anteprima per sezione (disegnate da script/immagini.py)
  const ANTEPRIMA = { '/models.html': 'og-models.png', '/decision.html': 'og-decision.png', '/compare.html': 'og-compare.png', '/home.html': 'og-run-at-home.png', '/blog/': 'og-blog.png', '/gpus.html': 'og-gpus.png' };
  const anteprima = ANTEPRIMA[attiva] || 'og-default.png';
  const condividi = encodeURIComponent(canonico), testoCond = encodeURIComponent(titolo);
  const colonne = [
    ['Leaderboards', dati.categorie.map((c) => [`/#${c.id}`, `Best free ${c.nome.toLowerCase()} models`])],
    ['Tools', [['/home.html', 'Run at home: GPU simulator'], ['/gpus.html', 'GPUs for local AI, compared'], ['/compare.html', 'Try two free models'], ['/models.html', 'All free models'], ['/decision.html', 'Decision models (Jev-style)']]],
    ['Blog', [...blog.slice(0, 4).map((p) => [`/blog/${p.slug}.html`, p.titolo]), ['/blog/', 'All posts']]],
    ['About', [['/about.html', 'How we rank'], ['/about.html#faq', 'FAQ'], ['/about.html#sources', 'Data sources'], ['https://github.com/MarcoDeliaBot/freellmrank', 'Source code']]],
  ];
  const html = `<!doctype html>
<html lang="en">
<head>
<!-- Google tag (gtag.js), con Consent Mode v2: niente cookie finché il visitatore non accetta -->
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('consent', 'default', { ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', analytics_storage: 'denied' });
  // lo script di Google si carica SOLO dopo "Accept": prima del consenso non parte nessuna richiesta
  window.caricaGa = function () {
    if (window.gaCaricato) return; window.gaCaricato = true;
    gtag('consent', 'update', { analytics_storage: 'granted' });
    var s = document.createElement('script'); s.async = true; s.src = 'https://www.googletagmanager.com/gtag/js?id=${GA_ID}';
    document.head.appendChild(s);
    gtag('js', new Date()); gtag('config', '${GA_ID}');
  };
  try { if (localStorage.getItem('consenso') === 'si') window.caricaGa(); } catch (e) {}
</script>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(titolo)}</title>
<meta name="description" content="${esc(descr)}">
<link rel="canonical" href="${canonico}">
<meta property="og:title" content="${esc(titolo)}">
<meta property="og:description" content="${esc(descr)}">
<meta property="og:type" content="website">
<meta property="og:url" content="${canonico}">
<meta property="og:site_name" content="${NOME_PIENO}">
<meta property="og:image" content="${URL_SITO}/${anteprima}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${NOME_PIENO}: the best AI models you can use for free">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#0e1419">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/favicon-32.png" sizes="32x32" type="image/png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="stylesheet" href="/style.css?v=${VER}">
<link rel="alternate" type="text/plain" href="/llms.txt" title="llms.txt">
${(Array.isArray(jsonld) ? jsonld : [jsonld]).filter(Boolean).map((o) => `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', ...o }).replace(/</g, '\\u003c')}</script>`).join('\n')}
</head>
<body>
<header class="top"><div class="wrap">
  <a class="logo" href="/"><img src="/favicon.svg" alt="" width="26" height="26">${NOME.testa}<span>${NOME.coda}</span></a>
  <nav>${voci.map(([h, t]) => `<a href="${h}"${h === attiva ? ' aria-current="page"' : ''}>${t}</a>`).join('')}</nav>
</div></header>
<main class="wrap">
${corpo}
<p class="condividi small"><span class="muted">Share this page:</span><a href="https://x.com/intent/post?url=${condividi}&amp;text=${testoCond}" rel="noopener" target="_blank">X</a><a href="https://www.linkedin.com/sharing/share-offsite/?url=${condividi}" rel="noopener" target="_blank">LinkedIn</a><a href="https://www.reddit.com/submit?url=${condividi}&amp;title=${testoCond}" rel="noopener" target="_blank">Reddit</a><a href="https://wa.me/?text=${testoCond}%20${condividi}" rel="noopener" target="_blank">WhatsApp</a><button type="button" class="link-btn" data-copia="${canonico}">Copy link</button></p>
</main>
<footer><div class="wrap">
  <div class="piede">
    <div class="piede-marca"><a class="logo" href="/">${NOME.testa}<span>${NOME.coda}</span></a><p>The best AI models you can use for free, ranked by real human votes.</p></div>
    ${colonne.map(([t, l]) => `<div><h3>${t}</h3><ul>${l.map(([h, x]) => `<li><a href="${h}"${h.startsWith('http') ? ' rel="noopener"' : ''}>${esc(x)}</a></li>`).join('')}</ul></div>`).join('')}
  </div>
  <p>Rankings: <a href="https://huggingface.co/datasets/lmarena-ai/leaderboard-dataset">Arena leaderboard dataset</a> by Arena Intelligence, licensed <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>. We filtered it to models you can use for free and added sizes from Hugging Face. ${esc(NOME_PIENO)} is not affiliated with Arena. Data updated ${esc(dati.aggiornato)}.</p>
  <p><a href="/privacy.html">Privacy and cookies</a> · <button type="button" class="link-btn" id="consenso-cambia">Cookie settings</button></p>
</div></footer>
<div class="consenso" id="consenso" role="dialog" aria-live="polite" aria-label="Cookie consent" hidden>
  <p>We use Google Analytics to count visits, only if you agree. No ads, no tracking for advertising. <a href="/privacy.html">Details</a></p>
  <div class="row"><button type="button" class="btn" id="consenso-no">Reject</button><button type="button" class="btn" id="consenso-si">Accept</button></div>
</div>
<script src="/consent.js?v=${VER}" defer></script>
<script src="/tables.js?v=${VER}" defer></script>
${script ? `<script type="module" src="/${script}?v=${VER}"></script>` : ''}
</body>
</html>
`;
  const dest = path.join(SITO, file);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, html);
  pagine.push(file);
}
