// Pagine di prova del menu (20/10/2026): la pagina /gpus con 5 menu diversi, per scegliere guardandoli dal vero.
// Escono in sito/nav-test/1..5.html e nav-test/index.html, fuori dalla sitemap e con noindex.
// Da togliere quando Marco ha scelto (basta levare questo script dalla build).
import fs from 'node:fs';
import path from 'node:path';
import { SITO } from './sito/comune.mjs';

const base = fs.readFileSync(path.join(SITO, 'gpus.html'), 'utf8');
const DIR = path.join(SITO, 'nav-test');
fs.mkdirSync(DIR, { recursive: true });

const V = {
  leaderboard: ['/', 'Free leaderboard'], arena: ['/arena.html', 'Free Arena'], audio: ['/audio.html', 'Audio'], decision: ['/decision.html', 'Decision models'],
  models: ['/models.html', 'Models'], compare: ['/compare.html', 'Try and compare'], home: ['/home.html', 'Run at home'], gpus: ['/gpus.html', 'GPUs'],
  phone: ['/phone.html', 'Phone'], blog: ['/blog/', 'Blog'], about: ['/about.html', 'About'],
};
const GRUPPI = [
  ['Rankings', ['leaderboard', 'arena', 'audio', 'decision']],
  ['Models', ['models']],
  ['Tools', ['home', 'gpus', 'phone', 'compare']],
  ['Blog', ['blog']],
];
const QUI = 'gpus';
const a = (k, cls = '') => `<a href="${V[k][0]}"${k === QUI ? ' aria-current="page"' : ''}${cls ? ` class="${cls}"` : ''}>${V[k][1]}</a>`;
const logo = '<a class="logo" href="/"><img src="/favicon.svg" alt="" width="26" height="26">FreeLLM<span>Arena</span></a>';
// tendina che funziona anche col dito: <details>
const tendina = (titolo, chiavi) => chiavi.length === 1 ? a(chiavi[0], 'nt-voce')
  : `<details class="nt-tendina"><summary class="nt-voce${chiavi.includes(QUI) ? ' nt-attiva' : ''}">${titolo}</summary><div class="nt-pop">${chiavi.map((k) => a(k)).join('')}</div></details>`;

const CSS_COMUNE = `<style>
.nt-avviso{background:var(--soft);border-bottom:1px solid var(--line);font-size:.85rem;padding:.4rem 0}
.nt-avviso .wrap{display:flex;flex-wrap:wrap;gap:.3rem 1rem;align-items:center}
.nt-avviso a[aria-current]{font-weight:700;text-decoration:none;color:var(--ink)}
header.nt{border-bottom:1px solid var(--line);background:var(--surface)}
header.nt .wrap{display:flex;align-items:center;gap:1rem;padding-block:.7rem;flex-wrap:nowrap}
.nt a{color:var(--ink);text-decoration:none}
.nt-voce,.nt nav>a{padding:.35rem .6rem;border-radius:6px;white-space:nowrap;cursor:pointer;color:var(--ink)}
.nt [aria-current="page"],.nt-attiva{background:var(--soft);font-weight:600}
.nt-tendina{position:relative}
.nt-tendina summary{list-style:none}
.nt-tendina summary::-webkit-details-marker{display:none}
.nt-tendina summary::after{content:" ▾";color:var(--muted)}
.nt-pop{position:absolute;top:calc(100% + 4px);left:0;z-index:20;background:var(--surface);border:1px solid var(--line);border-radius:10px;padding:.35rem;display:grid;min-width:13rem;box-shadow:0 8px 24px rgba(0,0,0,.18)}
.nt-pop a{padding:.45rem .6rem;border-radius:6px;white-space:nowrap}
.nt-pop a:hover{background:var(--soft)}
@media (hover:hover){.nt nav>a:hover,.nt-voce:hover{background:var(--soft)}}
</style>`;

const MENU = {
  1: {
    nome: 'F layout: sidebar on the left',
    header: `<header class="nt"><div class="wrap">${logo}<span style="flex:1"></span>${a('blog', 'nt-voce nt-grande')}${a('about', 'nt-voce nt-grande')}<details class="nt-tendina nt-mobile"><summary class="nt-voce">Menu</summary><div class="nt-pop" style="left:auto;right:0">${[...GRUPPI.flatMap(([, k]) => k), 'about'].map((k) => a(k)).join('')}</div></details></div></header>`,
    css: `<style>
.nt-f{display:grid;grid-template-columns:13rem minmax(0,1fr);gap:0 1.5rem;max-width:84rem;margin:0 auto;padding-inline:max(16px,env(safe-area-inset-left))}
.nt-f>main.wrap{max-width:none;margin:0;padding-inline:0}
.nt-lato{position:sticky;top:0;align-self:start;padding:1rem 0;display:grid;gap:.15rem;max-height:100vh;overflow:auto}
.nt-lato h3{font-size:.75rem;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);margin:.9rem .6rem .2rem}
.nt-lato a{padding:.4rem .6rem;border-radius:6px;color:var(--ink);text-decoration:none}
.nt-mobile{display:none}
@media (max-width:64rem){.nt-f{display:block}.nt-lato{display:none}.nt-mobile{display:block}}
@media (max-width:40rem){.nt-grande{display:none}}
</style>`,
    corpo: (main) => `<div class="nt-f"><aside class="nt-lato">${GRUPPI.map(([g, k]) => `<h3>${g}</h3>${k.map((x) => a(x)).join('')}`).join('')}</aside>${main}</div>`,
  },
  2: {
    nome: 'Four items with drop-downs',
    header: `<header class="nt"><div class="wrap">${logo}<nav style="display:flex;gap:.25rem;align-items:center">${GRUPPI.map(([g, k]) => tendina(g, k)).join('')}</nav></div></header>`,
    css: '<style>@media (max-width:40rem){header.nt .wrap{flex-wrap:wrap;gap:.4rem}}</style>',
  },
  3: {
    nome: 'Logo and menu on one line, no icons',
    header: `<header class="nt"><div class="wrap">${logo}<nav style="display:flex;gap:0;align-items:center;font-size:.9rem;overflow-x:auto;scrollbar-width:none">${['leaderboard', 'arena', 'audio', 'models', 'decision', 'compare', 'home', 'gpus', 'blog'].map((k) => a(k)).join('')}</nav></div></header>`,
    css: '<style>.nt nav>a{padding:.35rem .45rem}</style>',
  },
  4: {
    nome: 'The items that fit, then “More”',
    header: `<header class="nt"><div class="wrap">${logo}<nav class="nt-piu" style="display:flex;gap:.25rem;align-items:center;flex:1;min-width:0">${['leaderboard', 'arena', 'audio', 'models', 'gpus', 'home', 'decision', 'compare', 'phone', 'blog'].map((k) => a(k, 'nt-voce')).join('')}<details class="nt-tendina nt-altro"><summary class="nt-voce">More</summary><div class="nt-pop" style="left:auto;right:0"></div></details></nav></div></header>`,
    css: '<style>.nt-piu{overflow:visible}</style>',
    js: `<script>
(function(){var nav=document.querySelector('.nt-piu'),altro=nav.querySelector('.nt-altro'),pop=altro.querySelector('.nt-pop'),voci=[].slice.call(nav.querySelectorAll(':scope>a'));
function sistema(){voci.forEach(function(v){nav.insertBefore(v,altro)});pop.innerHTML='';altro.hidden=false;
var spazio=nav.clientWidth-altro.offsetWidth-8,usato=0,fuori=[];voci.forEach(function(v){usato+=v.offsetWidth+4;if(usato>spazio)fuori.push(v)});
if(!fuori.length){altro.hidden=true;return}fuori.forEach(function(v){pop.appendChild(v)})}
sistema();addEventListener('resize',sistema)})();
</script>`,
  },
  5: {
    nome: 'Two levels: sections on top, pages below',
    header: `<header class="nt"><div class="wrap">${logo}<nav style="display:flex;gap:.25rem;align-items:center">${GRUPPI.map(([g, k]) => `<a href="${V[k[0]][0]}" class="nt-voce${k.includes(QUI) ? ' nt-attiva' : ''}">${g}</a>`).join('')}</nav></div></header>
<div class="nt-sotto"><div class="wrap">${GRUPPI.find(([, k]) => k.includes(QUI))[1].map((k) => a(k)).join('')}</div></div>`,
    css: `<style>.nt-sotto{background:var(--soft);border-bottom:1px solid var(--line);font-size:.9rem}
.nt-sotto .wrap{display:flex;gap:.25rem;padding-block:.35rem;overflow-x:auto;scrollbar-width:none}
.nt-sotto a{padding:.3rem .6rem;border-radius:6px;color:var(--ink);text-decoration:none;white-space:nowrap}
.nt-sotto a[aria-current]{background:var(--surface);font-weight:600}
@media (max-width:40rem){header.nt nav{overflow-x:auto;scrollbar-width:none}}</style>`,
  },
};

const avviso = (n) => `<div class="nt-avviso"><div class="wrap"><b>Menu test ${n} of 5</b>${Object.keys(MENU).map((k) => `<a href="/nav-test/${k}.html"${String(k) === String(n) ? ' aria-current="page"' : ''}>${k} · ${MENU[k].nome}</a>`).join('')}</div></div>`;

const testa = base.match(/<header class="top">[\s\S]*?<\/header>/)[0];
const main = base.match(/<main class="wrap">[\s\S]*?<\/main>/)[0];
for (const [n, m] of Object.entries(MENU)) {
  let html = base.replace('<meta name="viewport"', '<meta name="robots" content="noindex">\n<meta name="viewport"')
    .replace('</head>', `${CSS_COMUNE}\n${m.css || ''}\n</head>`)
    .replace(testa, `${avviso(n)}\n${m.header}`);
  if (m.corpo) html = html.replace(main, m.corpo(main));
  if (m.js) html = html.replace('</body>', `${m.js}\n</body>`);
  // chiudi le tendine aperte cliccando altrove
  html = html.replace('</body>', `<script>document.addEventListener('click',function(e){document.querySelectorAll('.nt-tendina[open]').forEach(function(d){if(!d.contains(e.target))d.removeAttribute('open')})});</script>\n</body>`);
  fs.writeFileSync(path.join(DIR, `${n}.html`), html);
}
fs.writeFileSync(path.join(DIR, 'index.html'), `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="robots" content="noindex"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Menu tests</title><link rel="stylesheet" href="/style.css"></head><body><main class="wrap" style="padding-block:2rem"><h1>Menu tests</h1><ol>${Object.entries(MENU).map(([n, m]) => `<li><a href="/nav-test/${n}.html">${m.nome}</a></li>`).join('')}</ol></main></body></html>`);
console.log('pagine di prova del menu: 5');
