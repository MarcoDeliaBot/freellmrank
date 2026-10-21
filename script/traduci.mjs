// Versioni tradotte del sito (richiesta di Marco, 21/10/2026): /it/, /es/, /de/, /fr/, /pt/.
// Gira DOPO costruisci-sito.mjs, sulle pagine già costruite in sito/: le spezza in frasi, cerca ogni frase nel
// dizionario traduzioni/<lingua>.json e scrive la copia in sito/<lingua>/. I numeri sono nascosti come {0}, {1}…
// e i tag dentro la frase come <0>…</0>: così l'aggiornamento notturno dei dati non crea frasi nuove.
// Una pagina esce in una lingua solo se quasi tutte le sue frasi sono tradotte (ne possono mancare 3, o il 3%: restano
// in inglese fino alla notte dopo, così una pagina già tradotta non sparisce per un modello nuovo); le frasi che mancano finiscono in
// traduzioni/mancanti/<lingua>.json, che script/traduci-mancanti.mjs fa tradurre.
// Uso: node script/traduci.mjs          → scrive le pagine tradotte e i file delle mancanti
//      node script/traduci.mjs --conta  → solo i conteggi
import fs from 'node:fs';
import path from 'node:path';
import { RADICE, SITO, URL_SITO, VER } from './sito/comune.mjs';
import { LINGUE } from './traduci-lingue.mjs';

const CARTELLA = path.join(RADICE, 'traduzioni');
const SOLO_CONTA = process.argv.includes('--conta');

// tag che stanno dentro una frase; tutti gli altri la chiudono
const DENTRO = new Set(['a', 'abbr', 'b', 'bdi', 'cite', 'del', 'dfn', 'em', 'i', 'ins', 'mark', 'q', 's', 'small', 'span', 'strong', 'sub', 'sup', 'time', 'u', 'var', 'br', 'wbr', 'img']);
const VUOTI = new Set(['br', 'wbr', 'img']);
// pezzi che non si traducono mai e restano interi: commenti, script, stili, icone, codice
const PEZZI = /<!--[\s\S]*?-->|<(script|style|svg|code|pre|kbd|textarea)\b[\s\S]*?<\/\1>|<[^>]+>|[^<]+/gi;
const ATTRIBUTI = /(\s(?:title|alt|aria-label|placeholder|data-label|data-etichetta|data-apri)=")([^"]*)(")/g;
const META = /^<meta\s+(?:name="description"|property="og:(?:title|description|image:alt)")/;
const LETTERE = /\p{L}{2}/u;

const nomeTag = (t) => (/^<\/?([a-z0-9]+)/i.exec(t)?.[1] || '').toLowerCase();
const normale = (s) => s.replace(/\s+/g, ' ').trim();

// tutte le pagine inglesi (le cartelle delle lingue escluse)
function pagineInglesi() {
  const out = [];
  (function giro(dir) {
    for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, f.name);
      if (f.isDirectory()) { if (!(dir === SITO && LINGUE[f.name])) giro(p); } else if (f.name.endsWith('.html')) out.push(path.relative(SITO, p).replace(/\\/g, '/'));
    }
  })(SITO);
  return out.filter((f) => f !== '404.html');
}

// Nomi propri che non si traducono (modelli, laboratori, schede video, kit): nascosti come i numeri,
// così «Best free AI models for the RTX 4090» e «… for the RTX 3060» sono la stessa frase.
const NOMI = (() => {
  const nomi = new Set(), lab = new Set();
  const raccogli = (o) => {
    if (Array.isArray(o)) return o.forEach(raccogli);
    if (!o || typeof o !== 'object') return;
    for (const [k, v] of Object.entries(o)) {
      if (typeof v === 'string' && k === 'org' && /^[a-z][a-z0-9-]{2,}$/.test(v)) lab.add(v);
      if (typeof v === 'string' && ['nome', 'org', 'id', 'repo', 'modello'].includes(k)) nomi.add(v);
      else if (typeof v === 'object') raccogli(v);
    }
  };
  for (const f of ['sito/data.json', 'dati/ram.json', 'dati/musica.json', 'dati/audio.json']) {
    const p = path.join(RADICE, f);
    if (fs.existsSync(p)) raccogli(JSON.parse(fs.readFileSync(p, 'utf8')));
  }
  // solo nomi con una cifra, un trattino o una maiuscola dentro: mai parole comuni come «free» o «image»
  const buoni = [...nomi].map((n) => n.trim()).filter((n) => n.length >= 3 && n.length <= 80 && /\p{L}/u.test(n) && (/[\d\-_/.:]/.test(n) || /\p{Ll}\p{Lu}/u.test(n)) && !/\s{2}/.test(n));
  // laboratori in minuscolo come «microsoft», «mistral» (le chiavi dei dati, scritte così nelle pagine)
  for (const n of lab) if (!['free', 'open', 'other', 'image', 'video', 'audio', 'music', 'code', 'chat', 'search'].includes(n)) buoni.push(n);
  buoni.sort((a, b) => b.length - a.length);
  const via = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const gruppi = [];
  for (let i = 0; i < buoni.length; i += 400) gruppi.push(new RegExp(`(?<![\\p{L}\\d._-])(?:${buoni.slice(i, i + 400).map(via).join('|')})(?![\\p{L}\\d_-])`, 'gu'));
  return gruppi;
})();

// testo → chiave con nomi e numeri nascosti
function maschera(testo, numeri) {
  const segno = (n) => `\u0001${numeri.push(n) - 1}\u0002`;
  for (const re of NOMI) testo = testo.replace(re, segno);
  testo = testo.replace(/(?<![\u0001\d.,])(?<!&#)\d+(?:[.,]\d+)*/g, segno);
  return testo.replace(/\u0001(\d+)\u0002/g, '{$1}');
}

// Una frase: pezzi di testo e tag in linea. Restituisce { chiave, rimetti(traduzione) } o null se non c'è niente da tradurre.
function frase(pezzi) {
  // coppie apertura/chiusura dentro la frase; le spaiate diventano segnaposto singoli
  const coppia = new Map(), pila = [];
  pezzi.forEach((p, i) => {
    if (p[0] !== '<' || /^<(script|style|svg|code|pre|kbd|textarea|!--)/i.test(p)) return;
    const n = nomeTag(p);
    if (VUOTI.has(n) || p.endsWith('/>')) return;
    if (p[1] === '/') { const j = pila.findLastIndex((x) => x.n === n); if (j >= 0) { coppia.set(pila[j].i, i); coppia.set(i, pila[j].i); pila.splice(j); } }
    else pila.push({ n, i });
  });
  // via i tag e gli spazi che avvolgono tutta la frase: restano fuori, uguali
  let a = 0, b = pezzi.length - 1;
  const vuoto = (p) => p[0] !== '<' && !p.trim();
  const singolo = (i) => pezzi[i][0] === '<' && !coppia.has(i);
  for (;;) {
    if (a <= b && vuoto(pezzi[a])) a++;
    else if (a <= b && vuoto(pezzi[b])) b--;
    else if (a < b && coppia.get(a) === b) { a++; b--; }
    else if (a <= b && singolo(a)) a++;
    else if (a <= b && singolo(b)) b--;
    else break;
  }
  const dentro = pezzi.slice(a, b + 1);
  if (!dentro.some((p) => p[0] !== '<' && LETTERE.test(p))) return null;
  // troppi tag (grafici a barre, righe di schede): non è una frase, si traduce pezzo per pezzo
  if (dentro.filter((p) => p[0] === '<').length > 12) return { pezzi: true };
  const numeri = [], tag = [];
  const numTag = new Map();
  let chiave = '';
  for (let i = a; i <= b; i++) {
    const p = pezzi[i];
    if (p[0] !== '<') { chiave += maschera(p, numeri); continue; }
    if (coppia.has(i) && coppia.get(i) < i) { chiave += `</${numTag.get(coppia.get(i))}>`; continue; }
    const k = tag.push({ apri: p, chiudi: coppia.has(i) ? pezzi[coppia.get(i)] : null }) - 1;
    numTag.set(i, k);
    chiave += coppia.has(i) ? `<${k}>` : `<${k}/>`;
  }
  const iniz = chiave.match(/^\s*/)[0], fine = chiave.match(/\s*$/)[0];
  chiave = normale(chiave);
  return {
    chiave, prima: pezzi.slice(0, a), dopo: pezzi.slice(b + 1), iniz, fine,
    rimetti(t, sistemaTag) {
      let ok = true;
      const usati = new Set();
      let r = t.replace(/<(\/?)(\d+)(\/?)>/g, (m, chiusa, k, vuota) => {
        const x = tag[+k];
        if (!x) { ok = false; return ''; }
        usati.add(`${chiusa}${k}${vuota}`);
        if (chiusa) return x.chiudi ?? (ok = false, '');
        return sistemaTag(x.apri);
      });
      r = r.replace(/\{(\d+)\}/g, (m, k) => (numeri[+k] ?? (ok = false, '')));
      if (usati.size !== tag.reduce((s, x) => s + (x.chiudi ? 2 : 1), 0)) ok = false;
      return ok ? iniz + r + fine : null;
    },
  };
}

// valore di un attributo: niente tag, solo numeri nascosti
function valore(v) {
  if (!LETTERE.test(v)) return null;
  const numeri = [];
  const chiave = normale(maschera(v, numeri));
  return { chiave, rimetti: (t) => { let ok = true; const r = t.replace(/\{(\d+)\}/g, (m, k) => numeri[+k] ?? (ok = false, '')); return ok && (t.match(/\{\d+\}/g) || []).length === numeri.length ? r : null; } };
}

// file della pagina a cui porta un link interno, o null
function fileDi(url) {
  if (!url.startsWith('/') || url.startsWith('//')) return null;
  const p = decodeURIComponent(url.split(/[?#]/)[0]);
  if (p === '/') return 'index.html';
  const s = p.replace(/^\//, '');
  if (s.endsWith('/')) return s + 'index.html';
  if (s.endsWith('.html')) return s;
  if (/\.[a-z0-9]+$/i.test(s)) return null;
  return s + '.html';
}
const urlDi = (file, lingua) => `${URL_SITO}${lingua ? '/' + lingua : ''}/${file.replace(/(^|\/)index\.html$/, '$1').replace(/\.html$/, '')}`;

// Traduce una pagina. dizionario: chiave → traduzione. Restituisce { html, mancanti:Set }.
function traduciPagina(html, dizionario, sistemaTag) {
  const mancanti = new Set();
  let frasi = 0;
  const cerca = (x) => { frasi++; const t = dizionario[x.chiave]; if (t == null) { mancanti.add(x.chiave); return null; } return t; };
  const attributi = (tag) => {
    let t = tag.replace(ATTRIBUTI, (m, a, v, c) => { const x = valore(v); if (!x) return m; const tr = cerca(x); const r = tr != null ? x.rimetti(tr) : null; if (tr != null && r == null) mancanti.add(x.chiave); return r != null ? a + r + c : m; });
    if (META.test(t)) t = t.replace(/(\scontent=")([^"]*)(")/, (m, a, v, c) => { const x = valore(v); if (!x) return m; const tr = cerca(x); const r = tr != null ? x.rimetti(tr) : null; if (tr != null && r == null) mancanti.add(x.chiave); return r != null ? a + r + c : m; });
    return sistemaTag(t);
  };
  const out = [];
  let frasePezzi = [];
  const chiudi = () => {
    if (!frasePezzi.length) return;
    let f = frase(frasePezzi);
    if (f?.pezzi) {
      const tutti = frasePezzi;
      frasePezzi = [];
      for (const p of tutti) { if (p[0] === '<') { chiudi(); out.push(attributi(p)); } else frasePezzi.push(p); }
      return chiudi();
    }
    if (!f) out.push(frasePezzi.map((p) => (p[0] === '<' ? attributi(p) : p)).join(''));
    else {
      const tr = cerca(f);
      const r = tr != null ? f.rimetti(tr, attributi) : null;
      if (tr != null && r == null) mancanti.add(f.chiave);
      out.push(f.prima.map((p) => (p[0] === '<' ? attributi(p) : p)).join(''), r ?? frasePezzi.slice(f.prima.length, frasePezzi.length - f.dopo.length).join(''), f.dopo.map((p) => (p[0] === '<' ? attributi(p) : p)).join(''));
    }
    frasePezzi = [];
  };
  for (const p of html.match(PEZZI) || []) {
    const n = p[0] === '<' ? nomeTag(p) : '';
    const intero = /^<(script|style|!--)/i.test(p);
    if (p[0] !== '<' || (!intero && (DENTRO.has(n) || /^<(svg|code|kbd)/i.test(p)))) frasePezzi.push(p);
    else { chiudi(); out.push(intero || /^<(pre|textarea)/i.test(p) ? p : attributi(p)); }
  }
  chiudi();
  return { html: out.join(''), mancanti, frasi };
}

// ---------- main ----------
const pagine = pagineInglesi();
// si può rilanciare: via quello che un giro precedente aveva aggiunto alle pagine inglesi
const pulisci = (h) => h.replace(/<!--lingue-->[\s\S]*?<!--\/lingue-->/g, '<!--lingue-->').replace(/<link rel="alternate" hreflang="[^"]*" href="[^"]*">\n/g, '').replace(/<p class="lingue small">[\s\S]*?<\/p>/, '').replace(/<script src="\/lingua\.js\?v=[^"]*" defer><\/script>\n/, '');
const html = new Map(pagine.map((f) => [f, pulisci(fs.readFileSync(path.join(SITO, f), 'utf8'))]));

const dizionari = {};
for (const l of Object.keys(LINGUE)) {
  const f = path.join(CARTELLA, `${l}.json`);
  dizionari[l] = fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : {};
}

// primo giro: quali pagine sono complete in ogni lingua (i link portano solo a quelle)
const complete = {}, mancantiPer = {};
const finto = (t) => t;
for (const l of Object.keys(LINGUE)) {
  complete[l] = new Set();
  mancantiPer[l] = new Map();
  for (const f of pagine) {
    const { mancanti, frasi } = traduciPagina(html.get(f), dizionari[l], finto);
    if (mancanti.size <= Math.max(3, frasi * 0.03) && mancanti.size < frasi) complete[l].add(f);
    for (const k of mancanti) mancantiPer[l].set(k, (mancantiPer[l].get(k) || 0) + 1);
  }
}

if (SOLO_CONTA) {
  const tutte = new Set();
  for (const f of pagine) for (const k of traduciPagina(html.get(f), {}, finto).mancanti) tutte.add(k);
  const parole = [...tutte].reduce((s, k) => s + k.split(' ').length, 0);
  console.log(`${pagine.length} pagine, ${tutte.size} frasi uniche, ${parole} parole`);
  for (const l of Object.keys(LINGUE)) console.log(`${l}: ${complete[l].size} pagine complete, ${mancantiPer[l].size} frasi mancanti`);
  process.exit(0);
}

// alternative di lingua per una pagina
const lingueDi = (f) => Object.keys(LINGUE).filter((l) => complete[l].has(f));
const alternative = (f) => {
  const ll = lingueDi(f);
  if (!ll.length) return '';
  return [`<link rel="alternate" hreflang="en" href="${urlDi(f)}">`, ...ll.map((l) => `<link rel="alternate" hreflang="${l}" href="${urlDi(f, l)}">`), `<link rel="alternate" hreflang="x-default" href="${urlDi(f)}">`].join('\n');
};
const linkUrl = (f, l) => (l ? `/${l}` : '') + '/' + f.replace(/(^|\/)index\.html$/, '$1').replace(/\.html$/, '');
const scelta = (f, attuale) => {
  const ll = lingueDi(f);
  if (!ll.length) return '';
  return `<p class="lingue small"><span class="muted">${{ it: 'Lingua', es: 'Idioma', de: 'Sprache', fr: 'Langue', pt: 'Idioma' }[attuale] || 'Language'}:</span> ${[['', 'English'], ...ll.map((l) => [l, LINGUE[l]])].map(([l, n]) => (l === attuale ? `<b lang="${l || 'en'}">${n}</b>` : `<a href="${linkUrl(f, l)}" hreflang="${l || 'en'}" lang="${l || 'en'}" data-lingua="${l || 'en'}">${n}</a>`)).join(' · ')}</p>`;
};
// bandierine (21/10/2026): disegnate qui, niente emoji (Windows le mostra come lettere). pt = Brasile, en = Regno Unito.
const BANDIERE = {
  en: '<path fill="#012169" d="M0 0h60v30H0z"/><path stroke="#fff" stroke-width="6" d="m0 0 60 30M60 0 0 30"/><path stroke="#c8102e" stroke-width="2" d="m0 0 60 30M60 0 0 30"/><path stroke="#fff" stroke-width="10" d="M30 0v30M0 15h60"/><path stroke="#c8102e" stroke-width="6" d="M30 0v30M0 15h60"/>',
  it: '<path fill="#009246" d="M0 0h20v30H0z"/><path fill="#fff" d="M20 0h20v30H20z"/><path fill="#ce2b37" d="M40 0h20v30H40z"/>',
  fr: '<path fill="#0055a4" d="M0 0h20v30H0z"/><path fill="#fff" d="M20 0h20v30H20z"/><path fill="#ef4135" d="M40 0h20v30H40z"/>',
  de: '<path fill="#000" d="M0 0h60v10H0z"/><path fill="#dd0000" d="M0 10h60v10H0z"/><path fill="#ffce00" d="M0 20h60v10H0z"/>',
  es: '<path fill="#aa151b" d="M0 0h60v30H0z"/><path fill="#f1bf00" d="M0 7.5h60v15H0z"/>',
  pt: '<path fill="#009b3a" d="M0 0h60v30H0z"/><path fill="#fedf00" d="m30 3 26 12-26 12L4 15z"/><circle cx="30" cy="15" r="7" fill="#002776"/>',
};
const bandiera = (l) => `<svg class="bandiera" viewBox="0 0 60 30" preserveAspectRatio="none" aria-hidden="true">${BANDIERE[l || 'en']}</svg>`;
const PAROLA_LINGUA = { it: 'Lingua', es: 'Idioma', de: 'Sprache', fr: 'Langue', pt: 'Idioma' };
const tendina = (f, attuale) => {
  const ll = lingueDi(f);
  if (!ll.length) return '';
  const tutte = [['', 'English'], ...ll.map((l) => [l, LINGUE[l]])];
  const nome = (attuale ? LINGUE[attuale] : 'English');
  const parola = PAROLA_LINGUA[attuale] || 'Language';
  return `<details class="bandiere"><summary aria-label="${parola}: ${nome}" title="${parola}">${bandiera(attuale)}<span class="bandiere-codice">${(attuale || 'en').toUpperCase()}</span></summary><div class="bandiere-elenco">${tutte.map(([l, n]) => `<a href="${linkUrl(f, l)}" hreflang="${l || 'en'}" lang="${l || 'en'}" data-lingua="${l || 'en'}"${l === attuale ? ' aria-current="true"' : ''}>${bandiera(l)}${n}</a>`).join('')}</div></details>`;
};
const conLingua = (h, f, l) => {
  if (!/<\/head>/.test(h)) return h; // frammenti /cat/
  const alt = alternative(f);
  h = h.replace('</head>', `${alt ? alt + '\n' : ''}</head>`);
  h = h.replace('</div></footer>', `${scelta(f, l)}</div></footer>`);
  h = h.replaceAll('<!--lingue-->', `<!--lingue-->${tendina(f, l)}<!--/lingue-->`);
  return h.replace('</body>', `<script src="/lingua.js?v=${VER}" defer></script>\n</body>`);
};

for (const l of Object.keys(LINGUE)) fs.rmSync(path.join(SITO, l), { recursive: true, force: true });
// pagine inglesi: alternative, scelta della lingua, avviso
for (const f of pagine) fs.writeFileSync(path.join(SITO, f), conLingua(html.get(f), f, ''));

let scritte = 0;
for (const l of Object.keys(LINGUE)) {
  const sistemaTag = (t) => t
    .replace(/(\s(?:href|data-frammento)=")([^"]+)(")/, (m, a, u, c) => { const f = fileDi(u); return f && complete[l].has(f) ? `${a}/${l}${u}${c}` : m; })
    .replace(/(\sdata-copia=")([^"]+)(")/, (m, a, u, c) => (u.startsWith(URL_SITO + '/') ? `${a}${URL_SITO}/${l}${u.slice(URL_SITO.length)}${c}` : m));
  for (const f of complete[l]) {
    let { html: h } = traduciPagina(html.get(f), dizionari[l], sistemaTag);
    h = h.replace('<html lang="en">', `<html lang="${l}">`)
      .replace(/(<link rel="canonical" href=")[^"]*(")/, `$1${urlDi(f, l)}$2`)
      .replace(/(<meta property="og:url" content=")[^"]*(")/, `$1${urlDi(f, l)}$2`);
    const dest = path.join(SITO, l, f);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, conLingua(h, f, l));
    scritte++;
  }
}

// frasi mancanti, dalla più usata: le traduce script/traduci-mancanti.mjs
fs.mkdirSync(path.join(CARTELLA, 'mancanti'), { recursive: true });
for (const l of Object.keys(LINGUE)) {
  const lista = [...mancantiPer[l]].sort((a, b) => b[1] - a[1]).map(([k]) => k);
  fs.writeFileSync(path.join(CARTELLA, 'mancanti', `${l}.json`), JSON.stringify(lista, null, 1) + '\n');
}

// sitemap: si aggiungono le pagine tradotte
const fileSitemap = path.join(SITO, 'sitemap.xml');
if (fs.existsSync(fileSitemap)) {
  const righe = Object.keys(LINGUE).flatMap((l) => [...complete[l]].filter((f) => !f.startsWith('cat/')).map((f) => `<url><loc>${urlDi(f, l)}</loc></url>`));
  const vecchie = new RegExp(`<url><loc>${URL_SITO.replace(/[.]/g, '\\.')}/(?:${Object.keys(LINGUE).join('|')})/[^<]*</loc></url>\\n`, 'g');
  fs.writeFileSync(fileSitemap, fs.readFileSync(fileSitemap, 'utf8').replace(vecchie, '').replace('</urlset>', righe.join('\n') + '\n</urlset>'));
}
console.log(`Traduzioni: ${scritte} pagine scritte (${Object.keys(LINGUE).map((l) => `${l} ${complete[l].size}`).join(', ')} su ${pagine.length})`);
