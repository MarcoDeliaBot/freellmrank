// A publication is permanent; today's catalogue is only an observation.
import fs from 'node:fs';
import path from 'node:path';
import { RADICE, esc } from './comune.mjs';
import { LINGUE } from '../traduci-lingue.mjs';

export const linguePagine = ['en', ...Object.keys(LINGUE)];
export const publicationRoot = () => path.resolve(process.env.PAGINE_ROOT || RADICE);
export const leggi = (root, file, fallback) => fs.existsSync(path.join(root, file)) ? JSON.parse(fs.readFileSync(path.join(root, file), 'utf8')) : fallback;
export function salva(root, file, data) {
  const dest = path.join(root, file), text = JSON.stringify(data, null, 1) + '\n';
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  if (!fs.existsSync(dest) || fs.readFileSync(dest, 'utf8') !== text) fs.writeFileSync(dest, text);
}
export function filePerURL(url) {
  if (!/^\/(?:[a-z]{2}\/)?(?:model|compare|blog)\/[a-z0-9-]+(?:\.html)?$/.test(url)) throw Error(`Invalid publication URL: ${url}`);
  return url.slice(1).replace(/(?:\.html)?$/, '.html');
}
export const senzaLingua = url => url.replace(/^\/(?:it|es|de|fr|pt|ja)\//, '/');
export const variantiURL = (url, lingua) => {
  const base = (lingua === 'en' ? '' : '/' + lingua) + url.replace(/\.html$/, '');
  return [base, base + '.html'];
};
export const stessaIdentita = (a, b) => !!((a.hf?.repo && b.hf?.repo && a.hf.repo.toLowerCase() === b.hf.repo.toLowerCase()) ||
  (a.or?.id && b.or?.id && a.or.id === b.or.id));
const modelCopy = m => { const c = structuredClone(m); delete c.confronti; delete c.pubblicazione; return c; };
export const emptyArchive = () => ({ versione: 1, modelli: {}, confronti: {}, blog: {} });
export function unisciRegistri(saved, current) {
  const records = new Map(saved.registry.map(p => [p.url, p]));
  for (const p of current.registry) {
    const old = records.get(p.url);
    if (old && old.tipo !== p.tipo) throw Error(`Publication type changed during merge: ${p.url}`);
    records.set(p.url, old ? { ...old, ...p, primaVista: [old.primaVista, p.primaVista].sort()[0], ultimaVista: [old.ultimaVista, p.ultimaVista].sort().at(-1) } : p);
  }
  const archive = { ...saved.archive, ...current.archive };
  for (const type of ['modelli', 'confronti', 'blog']) {
    archive[type] = { ...saved.archive[type] };
    for (const [url, snapshot] of Object.entries(current.archive[type]))
      if (!archive[type][url] || archive[type][url].data <= snapshot.data) archive[type][url] = snapshot;
  }
  return { registry: [...records.values()], archive };
}

// Called both by the historical reconstruction and by the normal build.
export function osserva({ registry, archive, modelli, coppie, blog, date, commit }) {
  const byURL = new Map(registry.map(p => [p.url, p]));
  const seen = (url, tipo) => {
    for (const lingua of linguePagine) for (const variant of variantiURL(url, lingua)) {
      const old = byURL.get(variant);
      if (old && old.tipo !== tipo) throw Error(`Publication type changed: ${variant}`);
      if (old) { old.primaVista = old.primaVista < date ? old.primaVista : date; old.ultimaVista = old.ultimaVista > date ? old.ultimaVista : date; }
      else { const entry = { url: variant, tipo, lingua, primaVista: date, ultimaVista: date, stato: 'attiva' }; registry.push(entry); byURL.set(variant, entry); }
    }
  };
  for (const m of modelli) {
    const old = archive.modelli[m.href];
    // Losing Arena scores while remaining in "small/new" must not erase the last scores.
    if (!old || Object.keys(m.cat).length || !Object.keys(old.modello.cat).length) {
      const snapshot = modelCopy(m);
      for (const [cat, scores] of Object.entries(old?.modello.cat || {}))
        if (!snapshot.cat[cat]) snapshot.cat[cat] = { ...scores, fuoriDal: scores.fuoriDal || date };
      archive.modelli[m.href] = { modello: snapshot, data: date, ...(commit ? { commit } : {}) };
    }
    seen(m.href, 'modello');
  }
  for (const c of coppie) {
    const url = c.href || c.url;
    archive.confronti[url] = { a: typeof c.a === 'string' ? c.a : c.a.href, b: typeof c.b === 'string' ? c.b : c.b.href, data: date, ...(commit ? { commit } : {}) };
    seen(url, 'confronto');
  }
  for (const p of blog) {
    const copy = structuredClone(p);
    delete copy.fileCopertina; // Absolute historical cache paths are never published.
    archive.blog[`/blog/${p.slug}.html`] = { post: copy, data: date, ...(commit ? { commit } : {}) };
    seen(`/blog/${p.slug}.html`, 'articolo');
  }
  const presentModels = new Map(modelli.map(m => [m.href, m]));
  const presentURLs = new Set([...modelli.map(m => m.href), ...coppie.map(c => c.href || c.url), ...blog.map(p => `/blog/${p.slug}.html`)]);
  for (const p of registry) {
    const url = senzaLingua(p.url).replace(/(?:\.html)?$/, '.html');
    const m = presentModels.get(url), old = archive.modelli[url]?.modello;
    const lostScores = m && old && Object.keys(old.cat).length && !Object.keys(m.cat).length;
    if (!presentURLs.has(url) || lostScores) p.fuoriDal ||= date;
    else delete p.fuoriDal;
  }
  return { registry, archive };
}

export function preparaPubblicate({ root = publicationRoot(), modelli, coppie, blog, date }) {
  const registry = leggi(root, 'dati/pagine-pubblicate.json', []);
  const archive = leggi(root, 'dati/pagine-archivio.json', emptyArchive());
  osserva({ registry, archive, modelli, coppie, blog, date });
  const active = new Map(modelli.map(m => [m.href, m]));
  const pairs = new Set(coppie.map(c => c.href));
  const posts = new Set(blog.map(p => `/blog/${p.slug}.html`));
  const state = new Map();
  const allModels = Object.entries(archive.modelli).map(([url, saved]) => {
    const current = active.get(url), wasRanked = Object.keys(saved.modello.cat).length > 0;
    const present = current && (!wasRanked || Object.keys(current.cat).length > 0);
    const candidates = present ? [] : modelli.filter(m => m.href !== url && stessaIdentita(saved.modello, m));
    const renamed = candidates.length === 1 ? candidates[0] : null;
    const previous = registry.find(p => p.url === url);
    const info = { stato: renamed ? 'rinominata' : present ? 'attiva' : 'fuori-classifica',
      ultimaVista: saved.data, fuoriDal: present ? null : previous?.fuoriDal || date,
      ...(renamed ? { nuovoURL: renamed.href, nuovoNome: renamed.nome,
        prova: saved.modello.hf?.repo && renamed.hf?.repo?.toLowerCase() === saved.modello.hf.repo.toLowerCase() ? `hf:${saved.modello.hf.repo}` : `openrouter:${saved.modello.or.id}` } : {}) };
    state.set(url, info);
    return { ...modelCopy(present ? current : saved.modello), pubblicazione: info };
  });
  const byURL = new Map(allModels.map(m => [m.href, m]));
  // Historical slug collisions are distinct records without an identity proof.
  // Give their pages a precise qualifier instead of competing for the same title.
  for (const group of Object.values(Object.groupBy(allModels, m => m.nome.toLowerCase()))) if (group.length > 1) {
    group.sort((a, b) => Number(b.pubblicazione.stato === 'attiva') - Number(a.pubblicazione.stato === 'attiva') || a.href.localeCompare(b.href));
    for (const m of group.slice(1)) m.titoloPagina = `${m.nome} (${m.slug.split('-').at(-1)})`;
  }
  const allPairs = Object.entries(archive.confronti).map(([url, c]) => {
    const participant = href => {
      const m = byURL.get(href), saved = archive.modelli[href], chat = saved?.modello.cat.chat;
      if (!m || m.cat.chat) return m;
      if (!chat) return m;
      return { ...m, cat: { ...m.cat, chat }, pubblicazione: { stato: 'fuori-classifica', ultimaVista: chat.data || saved.data, fuoriDal: chat.fuoriDal || date } };
    };
    const a = participant(c.a), b = participant(c.b);
    if (!a?.cat.chat || !b?.cat.chat) throw Error(`Comparison without last known chat scores: ${url}`);
    state.set(url, { stato: pairs.has(url) ? 'attiva' : 'fuori-classifica', ultimaVista: c.data });
    return { a, b, href: url, file: url.slice(1) };
  });
  const allBlog = Object.entries(archive.blog).map(([url, saved]) => {
    state.set(url, { stato: posts.has(url) ? 'attiva' : 'fuori-classifica', ultimaVista: saved.data });
    const p = blog.find(p => p.slug === saved.post.slug) || { ...saved.post, archiviato: true };
    if (p.copertina?.startsWith('/video/')) {
      const image = path.join(root, 'contenuti', 'video', path.basename(p.copertina));
      if (fs.existsSync(image)) p.fileCopertina = image;
    }
    return p;
  }).sort((a, b) => b.data.localeCompare(a.data));
  for (const group of Object.values(Object.groupBy(allBlog, p => p.titolo.toLowerCase()))) if (group.length > 1)
    for (const p of group) p.titoloPagina = `${p.titolo} (${p.data})`;
  for (const p of registry) {
    const url = senzaLingua(p.url).replace(/(?:\.html)?$/, '.html'), info = state.get(url);
    if (!info) throw Error(`Missing archive snapshot: ${p.url}`);
    p.stato = info.stato;
    if (info.fuoriDal) p.fuoriDal = info.fuoriDal; else delete p.fuoriDal;
    if (info.nuovoURL) { p.nuovoURL = variantiURL(info.nuovoURL, p.lingua)[p.url.endsWith('.html') ? 1 : 0]; p.prova = info.prova; }
    else { delete p.nuovoURL; delete p.prova; }
  }
  registry.sort((a, b) => a.url.localeCompare(b.url));
  salva(root, 'dati/pagine-pubblicate.json', registry);
  salva(root, 'dati/pagine-archivio.json', archive);
  return { registry, archive, modelli: allModels, coppie: allPairs, blog: allBlog };
}

export function avvisoArchivio(m) {
  const p = m.pubblicazione;
  if (!p || p.stato === 'attiva') return '';
  return `<aside class="panel archivio-avviso" role="note" data-stato="${p.stato}">
${p.stato === 'rinominata' ? `<p>This model changed name: it is now <a href="${esc(p.nuovoURL)}">${esc(p.nuovoNome)}</a></p>` : `<p>No longer in the Arena ranking since <time datetime="${p.fuoriDal}">${p.fuoriDal}</time> (last data shown)</p>`}
<p class="small muted">Last known data: <time datetime="${p.ultimaVista}">${p.ultimaVista}</time>. Scores, ranks, size, license and availability below refer to that date.</p>
</aside>`;
}

export function verificaPubblicate(registry, output, { englishOnly = false } = {}) {
  const missing = registry.filter(p => (!englishOnly || p.lingua === 'en') && !fs.existsSync(path.join(output, filePerURL(p.url))));
  if (missing.length) throw Error(`Published pages missing (${missing.length}): ${missing.slice(0, 20).map(p => p.url).join(', ')}`);
  return registry.filter(p => !englishOnly || p.lingua === 'en').length;
}
