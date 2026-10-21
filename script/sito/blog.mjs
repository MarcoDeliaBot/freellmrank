// Blog: guide scritte a mano in contenuti/blog/*.md (con numeri aggiornati a ogni build),
// un resoconto settimanale generato dallo storico Arena e, dal 22/10/2026, un post per ogni video (contenuti/video/,
// scritti da script/video-post.mjs dopo il controllo dei fatti).
import fs from 'node:fs';
import path from 'node:path';
import { marked } from 'marked';
import { RADICE, SITO, REPO, esc, fmtData, pagina, NOME_PIENO, URL_SITO, linkAmazon } from './comune.mjs';
import { cercaAmazon } from './gpus.mjs';

const DIR = path.join(RADICE, 'contenuti', 'blog');
const DIR_VIDEO = path.join(RADICE, 'contenuti', 'video');
const TIPO_VIDEO = { nuovo: 'New model', settimana: 'Weekly ranking', gpu: 'GPU of the week', lungo: 'Weekly video report' };

// un post per video: il video (da YouTube quando c'è l'indirizzo, se no l'MP4 della release di GitHub), cosa dice la voce, i dati
function leggiVideo(hrefPerNome, dati) {
  const schede = new Map(dati.schede.schede.map((s) => [s.id, s]));
  const amazon = (id) => { const s = schede.get(id); const q = s && cercaAmazon(s); return q ? ` · <a class="tag free amazon" data-q="${esc(q)}" href="${esc(linkAmazon(q))}" rel="sponsored nofollow noopener" target="_blank">Amazon ↗</a>` : ''; };
  const nomeScheda = (s) => `<a href="/gpu/${esc(s.id)}.html">${esc(s.nome)}</a>${/\bGB\b/.test(s.nome) ? '' : ` (${s.gb} GB)`}`;
  const modello = (n) => (hrefPerNome(n) ? `[${n}](${hrefPerNome(n)})` : n);
  // l'hardware del video, in parole: memoria a 4 bit, la scheda di casa più piccola che lo regge, i link per comprarla
  const hardware = (h) => {
    if (!h) return '';
    const r = [];
    for (const s of h.schede || []) if (!(h.modelli || []).some((m) => m.scheda?.id === s.id)) r.push(`- ${nomeScheda(s)}: ${s.tiene ? 'holds it fully in memory' : 'too small to hold it'}${amazon(s.id)}`);
    for (const m of h.modelli || []) {
      if (m.vel != null) r.push(`- ${modello(m.nome)}: about ${m.vel} tokens/s${m.gb ? `, about ${m.gb} GB at 4-bit` : ''} (${m.dove === 'gpu' ? 'fully on the GPU' : 'GPU + system RAM'})`);
      else if (m.gb) r.push(`- ${modello(m.nome)}: about ${m.gb} GB at 4-bit · ${m.scheda ? `smallest home machine that holds it: ${nomeScheda(m.scheda)}${amazon(m.scheda.id)}` : 'no single home machine on our list holds it'}`);
      else r.push(`- ${modello(m.nome)}: size not published, so we cannot say which card runs it`);
    }
    for (const c of h.casa || []) r.push(`- ${nomeScheda(c.scheda)}${c.ram ? ` + ${c.ram} GB RAM` : ''}: ${modello(c.modello)}, about ${c.vel} tokens/s (${c.dove === 'gpu' ? 'fully on the GPU' : 'GPU + system RAM'})${amazon(c.scheda.id)}`);
    return r.length ? `\n\n## Hardware\n\nMemory at 4-bit with an 8K context, from our simulator. To check your own setup, use the [Run at home simulator](/home.html).\n\n${r.join('\n')}\n\n<small>As an Amazon Associate, ${NOME_PIENO} earns from qualifying purchases; the links do not change the numbers.</small>` : '';
  };
  if (!fs.existsSync(DIR_VIDEO)) return [];
  return fs.readdirSync(DIR_VIDEO).filter((f) => f.endsWith('.json')).map((f) => {
    const v = JSON.parse(fs.readFileSync(path.join(DIR_VIDEO, f), 'utf8'));
    const tipo = v.nome.split('-')[0];
    const titolo = v.titolo.replace(/\s*#Shorts$/, '');
    const righe = v.descrizione.split('\n').filter(Boolean);
    const mp4 = `https://github.com/${REPO}/releases/download/${v.release}/${v.nome}.mp4`;
    const verticale = tipo !== 'lungo';
    const player = v.youtube
      ? `<div class="video-post${verticale ? ' verticale' : ''}"><iframe src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(v.youtube)}" title="${esc(titolo)}" loading="lazy" allow="accelerometer; encrypted-media; picture-in-picture" allowfullscreen></iframe></div>`
      : `<div class="video-post${verticale ? ' verticale' : ''}"><video controls preload="none" playsinline poster="/video/${v.nome}.jpg" src="${mp4}"></video></div>`;
    // i nomi dei modelli nell'elenco dei dati portano alla loro pagina
    const conLink = (r) => r.replace(/^(\d+\.\s)([^:(]+?)(?=[:(])/, (t, n, nome) => (hrefPerNome(nome.trim()) ? `${n}[${nome.trim()}](${hrefPerNome(nome.trim())})` : t));
    const elenco = righe.slice(1).map((r) => (/^\d+\.\s/.test(r) ? conLink(r) : `- ${r}`));
    const intro = righe[0].replace(/\s*:$/, '.');
    // nel post non servono gli inviti del video («Link in bio», «link in the description»)
    const voce = v.voce.map((p) => p.replace(/\s*(The link is in the description\.|Link in (the )?bio\.)\s*/gi, ' ').trim()).filter(Boolean);
    const corpo = `${player}\n\n## What the video says\n\n${voce.map((p) => p.replace(/\b(RTX|GTX) (\d\d) (\d\d)\b/g, '$1 $2$3')).join('\n\n')}\n\n## The data\n\n${elenco.join('\n')}${hardware(v.hardware)}\n\nEvery number in this post comes from the ${NOME_PIENO} data on ${fmtData(v.pubblicato)}: Arena votes, Hugging Face sizes and our speed simulator. [Download the video and its subtitles](https://github.com/${REPO}/releases/tag/${v.release}).\n`;
    return { slug: `video-${v.nome.replace(/[^a-z0-9-]+/gi, '-').toLowerCase()}`, titolo, descr: intro.slice(0, 158), data: v.pubblicato, tema: TIPO_VIDEO[tipo] || 'Video', corpo, tipo: 'Video', amazon: /class="tag free amazon"/.test(hardware(v.hardware)), copertina: `/video/${v.nome}.jpg`, fileCopertina: path.join(DIR_VIDEO, `${v.nome}.jpg`) };
  });
}
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
    // pezzi delle guide nello stile del disegno Stitch: riga «Best free model» con punteggio e posizione, e nome semplice
    riga: (cat) => {
      const m = miglioreGratis(cat); const c = dati.categorie.find((x) => x.id === cat);
      return m ? `<div class="cat-riga"><span class="cat-etichetta">Best free model:</span><a class="cat-nome" href="${hrefPerNome(m.nome) || '/'}">${esc(m.nome)}</a><span class="cat-chip">★ Score ${m.punti}</span><span class="cat-chip tenue">#${m.pos} of ${c.totale} overall</span></div>` : '';
    },
    nome: (cat) => esc(miglioreGratis(cat)?.nome || ''),
  };
  const guide = leggiGuide().map((g) => ({ ...g, automatico: /\{\{\w+/.test(g.corpo), corpo: riempi(g.corpo, ctx), data: g.data || dati.aggiornato }));
  return [...guide, ...resoconti(dati, storia, hrefPerNome), ...leggiVideo(hrefPerNome, dati)].sort((a, b) => b.data.localeCompare(a.data));
}

// Grafica del disegno Stitch per OGNI articolo (richiesta di Marco, 20/10/2026), applicata all'HTML di marked:
// introduzione nel riquadro informativo, indice delle sezioni, elenchi e tabelle dentro schede, riquadro finale per tema.
const ICONA_INFO = '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="16" y2="12"/><line x1="12" x2="12.01" y1="8" y2="8"/></svg>';
const ancora = (s) => s.replace(/<[^>]+>/g, '').toLowerCase().replace(/&[a-z]+;|&#\d+;/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
function riquadroFinale(p, dati) {
  const primo = dati.categorie.find((c) => c.id === 'chat')?.modelli.find((m) => m.aperto || m.or?.gratis);
  if (p.tipo === 'Video') return ['Free leaderboard', 'Every free AI model, ranked', 'Sizes, memory, speed on your GPU and where to use each model for free. Updated every night.', '/', 'Open the leaderboard →'];
  if (p.tipo !== 'Guide') return ['Free Arena', 'Which free model would you pick?', 'Ask one question to two free models, without seeing their names, and vote. Your votes build our own free ranking.', '/arena.html', 'Vote in Free Arena →'];
  if (/hardware/i.test(p.tema)) return ['Free hardware tool', 'What can your GPU run?', 'Pick your card and see how much memory each model needs, whether it fits and the estimated speed.', '/home.html', 'Open the simulator →'];
  if (/api|online|cloud/i.test(p.tema)) return ['Try it now', 'Try two free models side by side', 'Send one prompt to two free models at once and compare the answers.', '/compare.html', 'Compare models →'];
  return ['Free leaderboard', primo ? `Is ${primo.nome} the right model for you?` : 'Find the right free model', 'See every free model ranked by blind human votes, with size, memory and speed on a home GPU.', '/', 'Open the leaderboard →'];
}
function abbellisci(html, p, dati) {
  const finale = (h) => {
    if (h.includes('cta-scura')) return h;
    const [occhiello, titolo, testo, href, tasto] = riquadroFinale(p, dati);
    return `${h}\n<div class="cta-scura"><div><span class="cta-occhiello">${esc(occhiello)}</span><h3>${esc(titolo)}</h3><p>${esc(testo)}</p></div><a href="${href}">${esc(tasto)}</a></div>`;
  };
  if (html.includes('cat-guida')) return finale(html); // guida già disegnata a mano
  // video: il player resta fuori dal riquadro dell'introduzione
  let player = '';
  html = html.replace(/^\s*(<div class="video-post[\s\S]*?<\/div>)\s*/, (t, p1) => { player = p1; return ''; });
  const pezzi = html.split(/(?=<h2[ >])/);
  const intro = pezzi[0].startsWith('<h2') ? '' : pezzi.shift();
  const sezioni = pezzi.map((s) => {
    const m = /^<h2[^>]*>([\s\S]*?)<\/h2>/.exec(s);
    const titolo = m ? m[1] : '';
    const corpo = m ? s.slice(m[0].length) : s;
    const id = ancora(titolo) || 'section';
    const nuovi = /New free models this week/.test(corpo) ? (corpo.split('Biggest moves')[0].match(/<li>/g) || []).length : 0;
    const chip = nuovi ? `<span class="cat-conta">${nuovi} new</span>` : '';
    const dati_ = /<(ul|ol|table)[ >]/.test(corpo);
    return { id, titolo, html: `<section class="cat-guida" id="${id}"><div class="cat-testa"><h2>${titolo}</h2>${chip}</div>${dati_ ? `<div class="cat-scheda">${corpo}</div>` : `<div class="art-sezione">${corpo}</div>`}</section>` };
  });
  const indice = sezioni.length >= 3 ? `<nav class="salta" aria-label="Jump to section"><span>Jump to section</span>${sezioni.map((s) => `<a href="#${s.id}">${s.titolo.replace(/<[^>]+>/g, '')}</a>`).join('')}</nav>` : '';
  const riquadro = intro.trim() ? `<div class="riquadro-info">${ICONA_INFO}<div>${intro}</div></div>` : '';
  return finale(`${player}\n${riquadro}\n${indice}\n${sezioni.map((s) => s.html).join('\n')}`);
}

export function pagineBlog(dati, post) {
  // copertine dei video, servite da /video/
  for (const p of post.filter((x) => x.fileCopertina && fs.existsSync(x.fileCopertina))) {
    fs.mkdirSync(path.join(SITO, 'video'), { recursive: true });
    fs.copyFileSync(p.fileCopertina, path.join(SITO, 'video', path.basename(p.fileCopertina)));
  }
  const etichetta = (p) => (p.tipo === 'Guide' ? 'Guide' : p.tipo === 'Video' ? 'Video' : 'Weekly report');
  for (const p of post) {
    pagina({
      file: `blog/${p.slug}.html`, attiva: '/blog/', dati, blog: post, script: p.amazon ? 'amazon.js' : undefined,
      jsonld: [
        { '@type': 'BlogPosting', headline: p.titolo, description: p.descr, datePublished: p.data, dateModified: dati.aggiornato, url: `${URL_SITO}/blog/${p.slug}`, author: { '@type': 'Organization', name: NOME_PIENO, url: URL_SITO + '/' }, publisher: { '@type': 'Organization', name: NOME_PIENO, url: URL_SITO + '/' } },
        { '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Blog', item: `${URL_SITO}/blog/` }, { '@type': 'ListItem', position: 2, name: p.titolo, item: `${URL_SITO}/blog/${p.slug}` }] },
      ],
      titolo: `${p.titolo} · ${NOME_PIENO}`, descr: p.descr,
      corpo: `<article class="articolo">
<nav class="art-briciole" aria-label="Breadcrumb"><a href="/blog/">Blog</a><span>/</span><span>${esc(etichetta(p))}</span></nav>
<header class="art-testa"><p class="art-meta"><span class="art-tipo">${esc(etichetta(p))}</span><span>·</span><time datetime="${p.data}">${fmtData(p.data)}</time><span>·</span><span>${Math.max(1, Math.round(p.corpo.split(/\s+/).length / 220))} min read</span>${p.tipo !== 'Guide' || /\{\{|Data as of/.test(p.corpo) || p.automatico ? '<span>·</span><span class="art-vivo"><i class="punto-vivo" aria-hidden="true"></i>Data updated automatically</span>' : ''}</p><h1>${esc(p.titolo)}</h1><p class="lead">${esc(p.descr)}</p></header>
${abbellisci(marked.parse(p.corpo), p, dati)}
</article>`,
    });
  }
  // elenco nello stile del disegno Stitch (blog, 20/10/2026): filtri, guida in evidenza con i primi in classifica,
  // schede delle guide, poi i resoconti automatici della settimana con il numero di modelli nuovi
  const lettura = (p) => Math.max(1, Math.round(p.corpo.split(/\s+/).length / 220));
  const primo = (cat) => dati.categorie.find((x) => x.id === cat)?.modelli.find((m) => m.aperto || m.or?.gratis);
  const guide = post.filter((p) => p.tipo === 'Guide');
  const resoconti = post.filter((p) => p.tipo !== 'Guide' && p.tipo !== 'Video');
  const evidenza = guide.find((p) => p.slug === 'best-free-ai-models') || guide[0];
  const altre = guide.filter((p) => p !== evidenza);
  const filtro = (p) => (p.tipo === 'Guide' ? `guide${/hardware/i.test(p.tema) ? ' hardware' : ''}` : p.tipo === 'Video' ? 'video' : 'week');
  const video = post.filter((p) => p.tipo === 'Video');
  const capi = [['chat', 'Chat'], ['code', 'Code'], ['vision', 'Vision']].map(([c, n]) => [n, primo(c)]).filter(([, m]) => m);
  const scheda = (p, grande) => `<article class="post-scheda${grande ? ' evidenza' : ''}" data-filtro="${filtro(p)}">
${p.copertina ? `<a class="post-copertina" href="/blog/${p.slug}.html" tabindex="-1" aria-hidden="true"><img src="${p.copertina}" alt="" loading="lazy" width="320" height="${p.tema === 'Weekly video report' ? 180 : 569}"></a>` : ''}<p class="post-meta">${p.tipo === 'Guide' ? `<span class="post-tipo${grande ? ' pillola' : ''}">Guide</span>` : p.tipo === 'Video' ? '<span class="post-tipo video">Video</span>' : '<span class="post-tipo settimana">Weekly report</span>'}<span>•</span><time datetime="${p.data}">${fmtData(p.data)}</time>${p.tema ? `<span>•</span><span class="tenue">${esc(p.tema)}</span>` : ''}${grande ? `<span>•</span><span class="tenue">${lettura(p)} min read</span><span class="post-destra verde">Featured</span>` : ''}${p.nuovi != null ? `<span class="post-destra conta-nuovi${p.nuovi >= 10 ? ' molti' : ''}">${p.nuovi} new model${p.nuovi === 1 ? '' : 's'}</span>` : ''}</p>
<h2><a href="/blog/${p.slug}.html">${esc(p.titolo)}</a></h2>
<p class="post-descr">${esc(p.descr)}</p>
${grande && capi.length ? `<p class="post-capi"><span class="tenue">Arena #1 free:</span>${capi.map(([n, m]) => `<span>${n}: <b>${esc(m.nome)}</b></span>`).join('')}</p>` : ''}</article>`;
  pagina({
    file: 'blog/index.html', attiva: '/blog/', dati, blog: post, script: 'blog.js',
    titolo: `Blog: Free AI Models, Guides and Weekly Reports · ${NOME_PIENO}`,
    descr: 'Guides to free and local AI models, and a weekly report of what changed on the free leaderboard.',
    corpo: `<div class="blog-testa"><h1>Blog</h1><p class="lead">Guides to using AI models for free, and a weekly report of what changed, written automatically from the leaderboard data.</p>
<nav class="blog-filtri" aria-label="Filter posts"><button type="button" aria-pressed="true" data-filtro="">All articles</button><button type="button" aria-pressed="false" data-filtro="guide">Guides</button><button type="button" aria-pressed="false" data-filtro="video">Videos</button><button type="button" aria-pressed="false" data-filtro="week">Weekly reports</button><button type="button" aria-pressed="false" data-filtro="hardware">Hardware and GPUs</button></nav></div>
<section class="lista-blog" aria-label="Posts">
${evidenza ? scheda(evidenza, true) : ''}
${altre.map((p) => scheda(p)).join('\n')}
${video.length ? `<div class="blog-sezione" data-filtro="video"><h3>Videos</h3><span>Every day</span></div><div class="griglia-video">${video.map((p) => scheda(p)).join('\n')}</div>` : ''}
${resoconti.length ? `<div class="blog-sezione" data-filtro="week"><h3>Automatic weekly Arena reports</h3><span>Every Sunday</span></div>${resoconti.map((p) => scheda(p)).join('\n')}` : ''}
</section>`,
  });
}
