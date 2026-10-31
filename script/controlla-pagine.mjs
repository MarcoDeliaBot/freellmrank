// Build gate: permanent inventory, self canonicals, one H1, title/H1, heading order,
// one keyword owner per language and every historical URL in the sitemap.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SITO, URL_SITO } from './sito/comune.mjs';
import { publicationRoot, leggi, filePerURL, verificaPubblicate } from './sito/pagine-pubblicate.mjs';

export function controllaPubblicate(root = publicationRoot(), output = SITO) {
  const registry = leggi(root, 'dati/pagine-pubblicate.json', []);
  verificaPubblicate(registry, output);
  const errors = [], files = new Set(registry.map(p => filePerURL(p.url))), keywords = new Map();
  const sitemap = fs.readFileSync(path.join(output, 'sitemap.xml'), 'utf8');
  const listed = new Map([...sitemap.matchAll(/<url><loc>([^<]+)<\/loc><lastmod>([^<]+)<\/lastmod><\/url>/g)].map(m => [m[1], m[2]]));
  for (const p of registry) if (!/^\d{4}-\d{2}-\d{2}$/.test(listed.get(URL_SITO + p.url) || '')) errors.push(`${p.url}: missing sitemap/lastmod`);
  for (const file of files) {
    const html = fs.readFileSync(path.join(output, file), 'utf8'), main = /<main\b[^>]*>([\s\S]*?)<\/main>/.exec(html)?.[1] || '';
    const h = [...main.matchAll(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/g)];
    const title = /<title>([\s\S]*?)<\/title>/.exec(html)?.[1];
    if (h.filter(x => x[1] === '1').length !== 1) errors.push(`${file}: requires one H1`);
    if (title !== h.find(x => x[1] === '1')?.[2]) errors.push(`${file}: title must equal H1`);
    for (let i = 1; i < h.length; i++) if (+h[i][1] > +h[i - 1][1] + 1) errors.push(`${file}: heading level skipped`);
    if (/name="robots"[^>]*content="[^"]*noindex/i.test(html)) errors.push(`${file}: noindex`);
    const canonical = /<link rel="canonical" href="([^"]+)"/.exec(html)?.[1];
    if (canonical !== `${URL_SITO}/${file.replace(/\.html$/, '')}`) errors.push(`${file}: canonical must point to itself`);
    const locale = /^(it|es|de|fr|pt|ja)\//.exec(file)?.[1] || 'en';
    const key = `${locale}:${title?.toLowerCase().replace(/\s+/g, ' ').trim()}`;
    if (keywords.has(key)) errors.push(`${file}: duplicate keyword/title with ${keywords.get(key)}`); else keywords.set(key, file);
  }
  return { urls: registry.length, pages: files.size, errors };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = controllaPubblicate();
  console.log(`Permanent pages: ${result.urls} URLs, ${result.pages} pages, ${result.errors.length} errors`);
  if (result.errors.length) { console.error(result.errors.join('\n')); process.exitCode = 1; }
}
