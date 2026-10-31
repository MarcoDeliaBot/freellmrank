// Daily online check. --prova only reports; it never creates issues.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { REPO, apriIssue } from './bozze.mjs';
import { LINGUE } from './traduci-lingue.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export function registeredURLs(root, base) {
  const urls = [];
  for (const file of ['pagine-pubblicate.json', 'skill-pagine.json']) {
    const records = JSON.parse(fs.readFileSync(path.join(root, 'dati', file), 'utf8'));
    for (const p of records) {
      if (typeof p.url !== 'string' || !p.url.startsWith('/') || p.url.startsWith('//')) throw Error(`Invalid registry URL in ${file}`);
      urls.push(new URL(p.url, base).href);
    }
  }
  return [...urls, ...Object.keys(LINGUE).map(l => new URL(`/${l}/sitemap.xml`, base).href)];
}
export async function controllaSalute({ root = ROOT, base = 'https://freellmarena.com', fetcher = fetch, onlyPages = false } = {}) {
  const problemi = [], rotte = [];
  const prendi = (url, opts = {}) => fetcher(url, { redirect: 'follow', signal: AbortSignal.timeout(20000), headers: { 'User-Agent': 'freellmarena-salute' }, ...opts });
  let sitemapURLs = [];
  try {
    const response = await prendi(`${base}/sitemap.xml`);
    if (response.status !== 200) throw Error(`HTTP ${response.status}`);
    sitemapURLs = [...(await response.text()).matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => new URL(new URL(m[1]).pathname, base).href);
    if (sitemapURLs.length < 100) problemi.push(`La sitemap ha solo ${sitemapURLs.length} pagine.`);
  } catch (e) { problemi.push(`Sitemap non leggibile: ${e.message}`); }
  let registryURLs = [];
  try { registryURLs = registeredURLs(root, base); } catch (e) { problemi.push(`Registro non leggibile: ${e.message}`); }
  const pagine = [...new Set([...sitemapURLs, ...registryURLs])], sitemapSet = new Set(sitemapURLs);
  for (let i = 0; i < pagine.length; i += 8) await Promise.all(pagine.slice(i, i + 8).map(async u => {
    try { const r = await prendi(u, { method: 'HEAD' }); if (r.status !== 200) rotte.push(`${u} → ${r.status}`); await r.body?.cancel(); }
    catch (e) { rotte.push(`${u} → ${e.name}`); }
  }));
  problemi.push(...rotte.map(u => `Pagina non 200: ${u}`));
  if (!onlyPages) {
    try {
      const r = await prendi(`${base}/data.json`), dati = await r.json();
      if (r.status !== 200 || !dati.aggiornato) throw Error(`HTTP ${r.status}`);
      const giorni = (Date.now() - Date.parse(dati.aggiornato)) / 864e5;
      if (giorni > 2.5) problemi.push(`I dati del sito sono fermi al ${dati.aggiornato} (${Math.floor(giorni)} giorni).`);
    } catch (e) { problemi.push(`data.json non si legge: ${e.message}`); }
    try {
      const response = await prendi(`https://api.github.com/repos/${REPO}/actions/workflows/aggiorna-dati.yml/runs?per_page=4`, { headers: { Accept: 'application/vnd.github+json', ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}) } });
      if (response.status !== 200) throw Error(`HTTP ${response.status}`);
      const r = await response.json(), ultima = r.workflow_runs?.find(x => x.status === 'completed');
      if (ultima && ultima.conclusion !== 'success') problemi.push(`L'ultimo aggiornamento dati e finito con ${ultima.conclusion}: ${ultima.html_url}`);
      if (ultima && (Date.now() - Date.parse(ultima.created_at)) / 36e5 > 30) problemi.push(`L'aggiornamento dati non parte da ${Math.round((Date.now() - Date.parse(ultima.created_at)) / 36e5)} ore.`);
    } catch (e) { problemi.push(`Non riesco a leggere le corse di GitHub: ${e.message}`); }
    for (const [method, p, body, expected] of [['GET', '/api/arena/ranking', null, 200], ['POST', '/api/try', {}, 400], ['POST', '/api/audio', {}, 400], ['POST', '/api/arena/vote', {}, 400], ['POST', '/api/report', {}, 400]]) {
      try {
        const r = await prendi(`${base}${p}`, { method, headers: { 'Content-Type': 'application/json', Origin: base }, body: body ? JSON.stringify(body) : undefined });
        if (r.status !== expected) problemi.push(`${method} ${p} risponde ${r.status} invece di ${expected}`);
        await r.body?.cancel();
      } catch (e) { problemi.push(`${method} ${p}: ${e.name}`); }
    }
  }
  return { checked: pagine.length, fromRegistry: new Set(registryURLs).size, onlyRegistry: registryURLs.filter(u => !sitemapSet.has(u)).length, rotte, problemi };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const option = name => process.argv.find(a => a.startsWith(`--${name}=`))?.split('=').slice(1).join('=');
  const result = await controllaSalute({ root: option('radice') || ROOT, base: option('sito') || 'https://freellmarena.com', onlyPages: process.argv.includes('--solo-pagine') });
  console.log(`Pagine controllate: ${result.checked}; registro: ${result.fromRegistry}; fuori sitemap: ${result.onlyRegistry}. Problemi: ${result.problemi.length}`);
  for (const p of result.problemi) console.log('-', p);
  if (option('json')) fs.writeFileSync(option('json'), JSON.stringify(result, null, 2) + '\n');
  if (result.problemi.length && !process.argv.includes('--prova')) {
    const giorno = new Date().toISOString().slice(0, 10), batches = []; let body = '';
    for (const p of result.problemi) { if (body.length + p.length > 55000) { batches.push(body); body = ''; } body += `- ${p}\n`; }
    if (body) batches.push(body);
    for (const [i, text] of batches.entries()) await apriIssue(`Sito: ${result.problemi.length} problemi il ${giorno}${batches.length > 1 ? ` (${i + 1}/${batches.length})` : ''}`, `Controllo automatico su ${result.checked} pagine.\n\n${text}`, ['salute']);
  }
  process.exitCode = result.problemi.length ? 1 : 0;
}
