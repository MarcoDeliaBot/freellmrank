// Controlla il sito costruito in sito/: ogni link interno, immagine, script e foglio di stile deve esistere.
// Uso: node script/controlla-link.mjs   → elenco dei link rotti (esce con 1 se ce ne sono)
import fs from 'node:fs';
import path from 'node:path';
import { SITO } from './sito/comune.mjs';

const pagine = [];
(function giro(dir) {
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, f.name);
    if (f.isDirectory()) giro(p); else if (f.name.endsWith('.html')) pagine.push(p);
  }
})(SITO);

// Cloudflare Pages serve /x come /x.html e /cartella/ come /cartella/index.html
const cache = new Map();
const esiste = (url) => {
  const pulito = decodeURIComponent(url.split('#')[0].split('?')[0]);
  if (!pulito || pulito === '/') return true;
  if (cache.has(pulito)) return cache.get(pulito);
  const p = path.join(SITO, pulito);
  const result = [p, p + '.html', path.join(p, 'index.html')].some((x) => fs.existsSync(x) && fs.statSync(x).isFile());
  cache.set(pulito, result);
  return result;
};

const rotti = new Map();
let controllati = 0;
for (const file of pagine) {
  const html = fs.readFileSync(file, 'utf8');
  const qui = '/' + path.relative(SITO, path.dirname(file)).replace(/\\/g, '/');
  for (const [, attr, url] of html.matchAll(/\b(href|src)="([^"]+)"/g)) {
    if (/^(https?:|mailto:|tel:|data:|javascript:|#)/.test(url)) continue;
    const assoluto = url.startsWith('/') ? url : path.posix.join(qui, url);
    controllati++;
    if (!esiste(assoluto)) {
      const k = `${assoluto}`;
      if (!rotti.has(k)) rotti.set(k, []);
      rotti.get(k).push(path.relative(SITO, file));
    }
  }
  // ancore interne della stessa pagina (#id)
  for (const [, id] of html.matchAll(/href="#([^"]+)"/g)) {
    controllati++;
    if (!html.includes(`id="${id}"`)) {
      const k = `#${id}`;
      if (!rotti.has(k)) rotti.set(k, []);
      rotti.get(k).push(path.relative(SITO, file));
    }
  }
}
console.log(`pagine ${pagine.length}, link controllati ${controllati}, rotti ${rotti.size}`);
for (const [url, dove] of rotti) console.log(`ROTTO ${url}  (in ${dove.length} pagine, es. ${dove.slice(0, 3).join(', ')})`);
process.exit(rotti.size ? 1 : 0);
