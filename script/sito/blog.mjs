// Blog: guide scritte a mano in contenuti/blog/*.md (con numeri aggiornati a ogni build)
// e un resoconto settimanale generato dallo storico Arena.
import fs from 'node:fs';
import path from 'node:path';
import { marked } from 'marked';
import { RADICE, esc, fmtData, pagina, NOME_PIENO, URL_SITO } from './comune.mjs';

const DIR = path.join(RADICE, 'contenuti', 'blog');
const SETTIMANE = 8;

function leggiGuide() {
  if (!fs.existsSync(DIR)) return [];
  return fs.readdirSync(DIR).filter((f) => f.endsWith('.md')).map((f) => {
    const testo = fs.readFileSync(path.join(DIR, f), 'utf8').replace(/\r\n/g, '\n');
    const m = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(testo);
    const meta = Object.fromEntries((m?.[1] || '').split('\n').map((r) => r.split(/:\s(.*)/s).slice(0, 2)).filter((x) => x[0]));
    return { slug: f.replace(/\.md$/, ''), titolo: meta.titolo, descr: meta.descr, data: meta.data, tema: meta.tema || '', corpo: m ? m[2] : testo, tipo: 'Guide' };
  });
}

// {{migliore:chat}} → nome e punteggio del miglior modello gratis; {{conta:chat}} → quanti sono gratis
function riempi(md, ctx) {
  return md.replace(/\{\{(\w+)(?::([\w-]+))?\}\}/g, (tutto, k, a) => {
    const f = ctx[k];
    return f ? String(f(a)) : tutto;
  });
}

// classifica dei modelli aperti a una certa data (indice nella serie)
function classificaA(st, i) {
  return Object.entries(st.serie).map(([n, v]) => [n, v[i]]).filter(([, v]) => v != null).sort((a, b) => b[1] - a[1]).map(([n, v], k) => ({ nome: n, punti: v, rank: k + 1 }));
}
function indiceAl(st, giorno) {
  let k = -1;
  st.date.forEach((d, i) => { if (d <= giorno) k = i; });
  return k;
}

function resoconti(dati, storia, hrefPerNome) {
  const nomiCat = Object.fromEntries(dati.categorie.map((c) => [c.id, c.nome]));
  const fine = new Date(storia.categorie.chat.date.at(-1) + 'T00:00:00Z');
  // domenica della settimana dell'ultimo aggiornamento
  fine.setUTCDate(fine.getUTCDate() + ((7 - fine.getUTCDay()) % 7));
  const post = [];
  for (let s = 0; s < SETTIMANE; s++) {
    const al = new Date(fine.getTime() - s * 7 * 864e5).toISOString().slice(0, 10);
    const dal = new Date(Date.parse(al) - 7 * 864e5).toISOString().slice(0, 10);
    const sezioni = [];
    const migliori = [];
    let novita = 0;
    for (const [cat, st] of Object.entries(storia.categorie)) {
      const iA = indiceAl(st, al), iB = indiceAl(st, dal);
      if (iA < 0) continue;
      const ora = classificaA(st, iA);
      if (ora[0]) migliori.push(`| ${nomiCat[cat]} | ${link(ora[0].nome, hrefPerNome)} | ${ora[0].punti} |`);
      const nuovi = ora.filter((x) => st.primo[x.nome] > dal && st.primo[x.nome] <= al).slice(0, 6);
      novita += nuovi.length;
      const prima = iB >= 0 && iB !== iA ? new Map(classificaA(st, iB).map((x) => [x.nome, x.rank])) : null;
      const mosse = prima ? ora.filter((x) => x.rank <= 30 && prima.has(x.nome)).map((x) => ({ ...x, d: prima.get(x.nome) - x.rank })).filter((x) => x.d !== 0).sort((a, b) => Math.abs(b.d) - Math.abs(a.d)).slice(0, 3) : [];
      if (!nuovi.length && !mosse.length) continue;
      let t = `## ${nomiCat[cat]}\n\n`;
      if (nuovi.length) t += `New free models this week:\n\n${nuovi.map((x) => `- ${link(x.nome, hrefPerNome)}: score ${x.punti}, #${x.rank} among free models`).join('\n')}\n\n`;
      if (mosse.length) t += `Biggest moves among the top 30 free models:\n\n${mosse.map((x) => `- ${link(x.nome, hrefPerNome)} ${x.d > 0 ? 'up' : 'down'} ${Math.abs(x.d)} to #${x.rank} (score ${x.punti})`).join('\n')}\n\n`;
      sezioni.push(t);
    }
    if (!sezioni.length) continue;
    const settimana = `${fmtData(new Date(Date.parse(dal) + 864e5).toISOString().slice(0, 10))} – ${fmtData(al)}`;
    post.push({
      slug: `week-${al}`, data: al, tipo: 'Weekly report', nuovi: novita,
      titolo: `Free AI models this week: ${settimana}`,
      descr: `${novita ? `${novita} new free model${novita > 1 ? 's' : ''} on Arena` : 'Rank changes among free models'} and the best free model in each category, for the week ending ${fmtData(al)}.`,
      corpo: `This report is generated automatically from the public Arena leaderboard history. It covers open-weight models only.\n\n${sezioni.join('')}## Best free model in each category\n\n| Category | Model | Score |\n|---|---|---|\n${migliori.join('\n')}\n`,
    });
  }
  return post;
}
const link = (nome, href) => (href(nome) ? `[${nome}](${href(nome)})` : nome);

export function preparaBlog(dati, storia, modelli) {
  const perNome = new Map();
  for (const m of modelli) for (const n of Object.values(m.nomi || {})) perNome.set(n, m.href);
  const hrefPerNome = (n) => perNome.get(n);
  const miglioreGratis = (cat) => {
    const c = dati.categorie.find((x) => x.id === cat);
    return c?.modelli.find((m) => m.aperto || m.or?.gratis);
  };
  const ctx = {
    migliore: (cat) => { const m = miglioreGratis(cat); return m ? `[${m.nome}](${hrefPerNome(m.nome) || '/'}) (score ${m.punti}, #${m.pos} of ${dati.categorie.find((x) => x.id === cat).totale})` : '—'; },
    conta: (cat) => dati.categorie.find((x) => x.id === cat)?.modelli.filter((m) => m.aperto || m.or?.gratis).length ?? '—',
    totale: (cat) => dati.categorie.find((x) => x.id === cat)?.totale ?? '—',
    apigratis: () => dati.openrouterGratis.length,
    piccoli: () => (dati.piccoli || []).length,
    data: () => fmtData(dati.aggiornato),
  };
  const guide = leggiGuide().map((g) => ({ ...g, corpo: riempi(g.corpo, ctx), data: g.data || dati.aggiornato }));
  return [...guide, ...resoconti(dati, storia, hrefPerNome)].sort((a, b) => b.data.localeCompare(a.data));
}

export function pagineBlog(dati, post) {
  for (const p of post) {
    pagina({
      file: `blog/${p.slug}.html`, attiva: '/blog/', dati, blog: post,
      jsonld: [
        { '@type': 'BlogPosting', headline: p.titolo, description: p.descr, datePublished: p.data, dateModified: dati.aggiornato, url: `${URL_SITO}/blog/${p.slug}`, author: { '@type': 'Organization', name: NOME_PIENO, url: URL_SITO + '/' }, publisher: { '@type': 'Organization', name: NOME_PIENO, url: URL_SITO + '/' } },
        { '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Blog', item: `${URL_SITO}/blog/` }, { '@type': 'ListItem', position: 2, name: p.titolo, item: `${URL_SITO}/blog/${p.slug}` }] },
      ],
      titolo: `${p.titolo} · ${NOME_PIENO}`, descr: p.descr,
      corpo: `<p class="briciole small"><a href="/blog/">Blog</a> › ${esc(p.tipo)}</p>
<article class="articolo">
<header><p class="small muted">${esc(p.tipo)} · ${fmtData(p.data)}</p><h1>${esc(p.titolo)}</h1><p class="lead">${esc(p.descr)}</p></header>
${marked.parse(p.corpo)}
</article>`,
    });
  }
  // elenco nello stile del disegno Stitch (blog, 20/10/2026): filtri, guida in evidenza con i primi in classifica,
  // schede delle guide, poi i resoconti automatici della settimana con il numero di modelli nuovi
  const lettura = (p) => Math.max(1, Math.round(p.corpo.split(/\s+/).length / 220));
  const primo = (cat) => dati.categorie.find((x) => x.id === cat)?.modelli.find((m) => m.aperto || m.or?.gratis);
  const guide = post.filter((p) => p.tipo === 'Guide');
  const resoconti = post.filter((p) => p.tipo !== 'Guide');
  const evidenza = guide.find((p) => p.slug === 'best-free-ai-models') || guide[0];
  const altre = guide.filter((p) => p !== evidenza);
  const filtro = (p) => (p.tipo === 'Guide' ? `guide${/hardware/i.test(p.tema) ? ' hardware' : ''}` : 'week');
  const capi = [['chat', 'Chat'], ['code', 'Code'], ['vision', 'Vision']].map(([c, n]) => [n, primo(c)]).filter(([, m]) => m);
  const scheda = (p, grande) => `<article class="post-scheda${grande ? ' evidenza' : ''}" data-filtro="${filtro(p)}">
<p class="post-meta">${p.tipo === 'Guide' ? `<span class="post-tipo${grande ? ' pillola' : ''}">Guide</span>` : '<span class="post-tipo settimana">Weekly report</span>'}<span>•</span><time datetime="${p.data}">${fmtData(p.data)}</time>${p.tema ? `<span>•</span><span class="tenue">${esc(p.tema)}</span>` : ''}${grande ? `<span>•</span><span class="tenue">${lettura(p)} min read</span><span class="post-destra verde">Featured</span>` : ''}${p.nuovi != null ? `<span class="post-destra conta-nuovi${p.nuovi >= 10 ? ' molti' : ''}">${p.nuovi} new model${p.nuovi === 1 ? '' : 's'}</span>` : ''}</p>
<h2><a href="/blog/${p.slug}.html">${esc(p.titolo)}</a></h2>
<p class="post-descr">${esc(p.descr)}</p>
${grande && capi.length ? `<p class="post-capi"><span class="tenue">Arena #1 free:</span>${capi.map(([n, m]) => `<span>${n}: <b>${esc(m.nome)}</b></span>`).join('')}</p>` : ''}</article>`;
  pagina({
    file: 'blog/index.html', attiva: '/blog/', dati, blog: post, script: 'blog.js',
    titolo: `Blog: Free AI Models, Guides and Weekly Reports · ${NOME_PIENO}`,
    descr: 'Guides to free and local AI models, and a weekly report of what changed on the free leaderboard.',
    corpo: `<div class="blog-testa"><h1>Blog</h1><p class="lead">Guides to using AI models for free, and a weekly report of what changed, written automatically from the leaderboard data.</p>
<nav class="blog-filtri" aria-label="Filter posts"><button type="button" aria-pressed="true" data-filtro="">All articles</button><button type="button" aria-pressed="false" data-filtro="guide">Guides</button><button type="button" aria-pressed="false" data-filtro="week">Weekly reports</button><button type="button" aria-pressed="false" data-filtro="hardware">Hardware and GPUs</button></nav></div>
<section class="lista-blog" aria-label="Posts">
${evidenza ? scheda(evidenza, true) : ''}
${altre.map((p) => scheda(p)).join('\n')}
${resoconti.length ? `<div class="blog-sezione" data-filtro="week"><h3>Automatic weekly Arena reports</h3><span>Every Sunday</span></div>${resoconti.map((p) => scheda(p)).join('\n')}` : ''}
</section>`,
  });
}
