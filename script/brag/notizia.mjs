// Video delle notizie (deciso da Marco il 24/10/2026: «Costruisco il generatore di video dalle notizie? SI»), come i canali
// che segue, ma solo con fatti verificati: la voce legge il post del blog già passato dal controllo dei fatti
// (script/notizie.mjs, contenuti/notizie/*.json), parola per parola. Workers AI scrive solo i titoli e i punti sullo schermo
// e le 3 frasi dello Short; un controllo in codice toglie ogni pezzo con un numero o un nome che non sta nel post.
// Scrive due video:
//   video/brag/scena-notizia.html + info-notizia.json        video lungo orizzontale 1920x1080 (1-3 minuti)
//   video/brag/scena-notizia-corto.html + info-notizia-corto.json   Short verticale, che rimanda al video lungo
// Il post del video è la notizia stessa (https://freellmarena.com/blog/news-<nome>): niente secondo post.
// Uso: BOZZE_KEY=… node script/brag/notizia.mjs   (BRAG_FATTI=release già fatte; BRAG_NOTIZIA=<nome del file> per una precisa)
import fs from 'node:fs';
import path from 'node:path';
import { MOTORE, STILE_ORIZZONTALE, STILE_VERTICALE } from './motore.mjs';
import { chiediModello } from '../bozze.mjs';
import { numeri } from '../video-post.mjs';
import { nomiDi, LABORATORI, LANCIO } from '../notizie.mjs';
import { metaYoutube, RICHIESTA_YT } from './titoli-yt.mjs';

const QUI = path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1'));
const RADICE = path.join(QUI, '..', '..');
const OUT = path.join(RADICE, 'video', 'brag');
const DIR = path.join(RADICE, 'contenuti', 'notizie');
fs.mkdirSync(OUT, { recursive: true });
const css = fs.readFileSync(path.join(RADICE, 'sorgente', 'style.css'), 'utf8');
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const giorno = (d) => new Date(d + 'T12:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const semplice = (t) => String(t || '').replace(/[‐‑‒]/g, '-').replace(/\s*[–—]\s*/g, ', ').replace(/[   ]/g, ' ').replace(/\s+/g, ' ').trim();

// ---------- 1. quale notizia: la più ripresa degli ultimi 2 giorni non ancora raccontata ----------
const fatti = process.env.BRAG_FATTI && fs.existsSync(process.env.BRAG_FATTI) ? new Set(fs.readFileSync(process.env.BRAG_FATTI, 'utf8').split(/\s+/).filter(Boolean)) : new Set();
const nomeVideo = (n) => `${n.tipo === 'guida' ? 'guida' : 'notizia'}-${n.nome.replace(/^\d{4}-\d{2}-\d{2}-/, '').slice(0, 56).replace(/-+$/, '')}`;
const tutte = fs.readdirSync(DIR).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8')));
const recente = (n) => Date.now() - new Date(n.pubblicato + 'T12:00:00Z') < 2.5 * 864e5;
// i lanci dei grandi laboratori passano davanti (24/10/2026: la prima corsa scelse OpenAI su Google Cloud e Orchestra Bio
// invece di Kimi K3.1 Pro e Claude Duet, perché contava solo il numero di fonti)
const lancio = (n) => LABORATORI.test(n.titolo) && LANCIO.test(`${n.titolo} ${n.descr}`);
const peso = (n) => n.fonti.length * 3 + (lancio(n) ? 8 : 0) + (n.fonti.some((f) => f.ufficiale) ? 2 : 0) + (n.tema === 'LLMs' ? 2 : 0);
// un modello che ha già il suo video lungo (video-modello-flint) non si racconta una seconda volta come notizia
const giaModello = (n) => [...fatti].filter((f) => f.startsWith('video-modello-')).some((f) => n.titolo.toLowerCase().includes(f.slice(14).replace(/-/g, ' ')));
// BRAG_FILE=<json>: una guida (contenuti/video-guide/*.json: i campi di una notizia più «tipo»: «guida» e «url»), dal 24/10/2026
const n = process.env.BRAG_FILE ? JSON.parse(fs.readFileSync(process.env.BRAG_FILE, 'utf8')) : process.env.BRAG_NOTIZIA
  ? tutte.find((x) => x.nome === process.env.BRAG_NOTIZIA.replace(/\.json$/, ''))
  : tutte.filter((x) => recente(x) && x.paragrafi.length >= 3 && !fatti.has(`video-${nomeVideo(x)}`) && !giaModello(x)).sort((a, b) => peso(b) - peso(a) || b.pubblicato.localeCompare(a.pubblicato))[0];
if (!n) { console.log('Nessuna notizia nuova da raccontare'); process.exit(0); }
const url = n.url || `https://freellmarena.com/blog/news-${n.nome}`;
const GUIDA = n.tipo === 'guida';
const ETICHETTA = GUIDA ? 'Guide' : 'AI news';

// ---------- 2. titoli e punti sullo schermo (Workers AI), poi il controllo ----------
const POST = [n.titolo, n.descr, ...n.paragrafi, ...(n.perche || [])].map(semplice).join('\n');
const ammessi = numeri(POST);
const basso = POST.toLowerCase();
// un pezzo passa se ogni numero e ogni nome stanno nel post
const regge = (t) => [...numeri(t)].every((x) => ammessi.has(x)) && nomiDi(`X ${t}`).every((x) => basso.includes(x.toLowerCase()));
let ai = {};
try {
  ai = await chiediModello([
    { role: 'system', content: `You prepare on-screen text for a YouTube news video by FreeLLMArena. Use ONLY facts and names from ARTICLE. Never add a number, name, date or claim that is not in ARTICLE. No hype words, no emojis. Use sentence case: capital letter only for the first word and for names.
Return JSON: {"schermo": "headline for the screen, max 8 words", "sezioni": [{"titolo": "3 to 6 words", "punti": ["2 or 3 bullets, max 9 words each"]}], "corto": ["3 short spoken sentences for a 30-second vertical Short, max 20 words each: the news, the key fact, why it matters"], ${RICHIESTA_YT}}.
Write exactly one item in "sezioni" for each numbered paragraph, in the same order.` },
    { role: 'user', content: `ARTICLE:\nTitle: ${n.titolo}\nSummary: ${n.descr}\n${n.paragrafi.map((p, i) => `Paragraph ${i + 1}: ${p}`).join('\n')}\nWhy it matters: ${(n.perche || []).join(' ')}` },
  ], { json: true, max: 1500, scopo: 'video' });
} catch (e) { console.log(`Testi dello schermo non scritti (${e.message}): uso le frasi del post`); }
const prima = (p) => semplice(p).split(/(?<=[.!?])\s+(?=[A-Z0-9"])/)[0];
const corta = (t, max) => { const w = semplice(t).split(' '); return w.length > max ? w.slice(0, max).join(' ') + '…' : w.join(' '); };
const tolti = [];
const tieni = (t, riserva) => { const s = semplice(t); if (s && regge(s)) return s; if (s) tolti.push(s); return riserva; };
const schermo = tieni(ai.schermo, '') || semplice(n.titolo);
const sezioni = n.paragrafi.map((p, i) => {
  const s = (ai.sezioni || [])[i] || {};
  const punti = (s.punti || []).map((x) => tieni(String(x).slice(0, 90), null)).filter(Boolean).slice(0, 3);
  return { titolo: (n.titoliSezioni || [])[i] || tieni(String(s.titolo || '').slice(0, 60), '') || (GUIDA ? 'Step by step' : i === 0 ? 'What happened' : 'The details'), punti: punti.length ? punti : [corta(prima(p), 14)], voce: semplice(p) };
});
// le frasi dello Short: quelle di Workers AI che reggono, se no le prime frasi del post
let corto = (ai.corto || []).map((x) => tieni(x, null)).filter(Boolean).slice(0, 3);
if (corto.length < 3) corto = [semplice(n.descr), prima(n.paragrafi[0]), prima((n.perche || [])[0] || n.paragrafi[1])].filter(Boolean);
if (tolti.length) console.log(`Controllo dei fatti: tolti ${tolti.length} pezzi con numeri o nomi che non stanno nel post`);

// ---------- 3. video lungo, orizzontale ----------
const fonti = n.fonti.map((f) => f.nome);
const elencoFonti = fonti.length > 1 ? `${fonti.slice(0, -1).join(', ')} and ${fonti.at(-1)}` : fonti[0];
const dimTitolo = schermo.length > 70 ? 76 : schermo.length > 48 ? 88 : schermo.length > 30 ? 104 : 124;
const scene = [
  { min: 7, voce: semplice(n.descr),
    corpo: `<span class="chip riga" data-in="0">${ETICHETTA} · ${esc(giorno(n.pubblicato))}</span><p class="grande riga verde" data-in="0.2" style="font-size:${dimTitolo}px;line-height:1.05">${esc(schermo)}</p><p class="sotto-titolo riga" data-in="0.6">Sources: ${esc(fonti.join(' · '))}</p>` },
  ...sezioni.map((s) => ({ min: 8, voce: s.voce,
    corpo: `<p class="titolo riga" data-in="0">${esc(s.titolo)}</p><div class="griglia ${s.punti.length === 1 ? '' : 'due'}" style="${s.punti.length === 1 ? 'grid-template-columns:1fr' : ''}">${s.punti.map((p, i) => `<div class="carta riga" data-in="${0.6 + i * 0.6}"><b style="font-size:38px">${esc(p)}</b></div>`).join('')}</div>` })),
  ...((n.perche || []).length ? [{ min: 8, voce: (n.perche || []).map(semplice).join(' '),
    corpo: `<p class="titolo riga" data-in="0">Why it matters</p><p class="sotto-titolo riga" data-in="0.5" style="font-size:44px;color:var(--ink)">${esc(corta(prima(n.perche[0]), 30))}</p>` }] : []),
  { min: 6, voce: `${GUIDA ? 'This guide is based on' : 'This story comes from'} ${elencoFonti}. The links are in the description.`,
    corpo: `<p class="titolo riga" data-in="0">Sources</p><div class="griglia">${n.fonti.slice(0, 3).map((f, i) => `<div class="carta riga" data-in="${0.4 + i * 0.3}"><small>${f.ufficiale ? 'Official' : 'Report'} · ${esc(f.data)}</small><b>${esc(f.nome)}</b><span>${esc(new URL(f.url).hostname.replace(/^www\./, ''))}</span></div>`).join('')}</div>` },
  { min: 7, voce: 'For AI news every day, and to compare every free AI model, visit FreeLLMArena. The link is in the description.',
    corpo: `<p class="titolo riga" data-in="0">AI news every day · every free model compared</p><p class="url riga" data-in="0.3">freellmarena.com</p><p class="sotto-titolo riga" data-in="0.6">Link in the description</p>` },
];
const tempi = (sc) => { let t = 0; return { html: sc.map((s) => { const da = t; t += s.min; return `<section class="scena${s.classe ? ' ' + s.classe : ''}" data-da="${da}" data-a="${t}">${s.corpo}</section>`; }), t }; };
const lungo = tempi(scene);
const marchioO = `<div class="marchio"><span class="segno"><i style="height:22px"></i><i style="height:36px"></i><i style="height:28px"></i></span><b>FreeLLM<span>Arena</span></b></div><div class="data-sett">${ETICHETTA} · ${esc(giorno(n.pubblicato))}</div>`;
fs.writeFileSync(path.join(OUT, 'scena-notizia.html'), `<!doctype html><html lang="en"><head><meta charset="utf-8"><style>${css}${STILE_ORIZZONTALE}</style></head><body>
<div class="tela">${marchioO}${lungo.html.join('\n')}<div class="sotto"><p></p></div><div class="avanza"><i></i></div></div>
<script>let DURATA = ${lungo.t};${MOTORE};render(0)</script></body></html>`);
const nome = nomeVideo(n);
const righeFonti = n.fonti.map((f) => `${f.nome}: ${f.url}`).join('\n');
// titolo, descrizione e tag di YouTube (youtube-seo, 24/10/2026): script/brag/titoli-yt.mjs
const nomiTitolo = [...new Set(nomiDi(`X ${semplice(n.titolo)}`).filter((x) => x.length >= 3))];
const yt = metaYoutube({ n: { ...n, titolo: semplice(n.titolo), descr: semplice(n.descr) }, yt: ai.yt || {}, regge, punti: sezioni.flatMap((s) => s.punti.filter((p) => !p.endsWith('…'))), nomi: nomiTitolo, url, righeFonti, guida: GUIDA });
if (yt.tolti.length) console.log(`Titolo/descrizione YouTube: tolti ${yt.tolti.length} pezzi che non reggono: ${yt.tolti.join(' | ')}`);
const info = {
  nome, titolo: yt.titolo, notizia: n.nome, post: GUIDA ? url.replace(/^.*\/blog\//, '') : `news-${n.nome}`,
  descrizione: yt.descrizione,
  tag: yt.tag,
  condividi: `${n.titolo} ${url}`,
  lingua: 'en', formato: { w: 1920, h: 1080 }, fps: 24, copertina: 0,
  scene: scene.map((s) => ({ min: s.min, voce: s.voce })),
};
fs.writeFileSync(path.join(OUT, 'info-notizia.json'), JSON.stringify(info, null, 1));

// ---------- 4. lo Short, verticale, che rimanda al video lungo ----------
const dimCorto = schermo.length > 70 ? 76 : schermo.length > 40 ? 92 : schermo.length > 24 ? 112 : 132;
const sceneC = [
  { min: 3.6, voce: corto[0],
    corpo: `<span class="chip riga" data-in="0">${ETICHETTA.toUpperCase()} · ${esc(giorno(n.pubblicato).toUpperCase())}</span><p class="grande riga verde" data-in="0.2" style="font-size:${dimCorto}px">${esc(schermo)}</p>` },
  ...corto.slice(1).map((c, i) => ({ min: 3.4, voce: c,
    corpo: `<p class="medio riga" data-in="0">${esc(sezioni[i]?.titolo || 'Key fact')}</p><p class="piccolo riga" data-in="0.3" style="color:var(--ink)">${esc(corta(c, 24))}</p>` })),
  { min: 3.0, voce: GUIDA ? 'Watch the full guide on our channel.' : 'Watch the full story on our channel.',
    corpo: `<p class="medio riga" data-in="0.1">Full story on <span class="verde">our channel</span></p><p class="piccolo riga" data-in="0.4">Sources: ${esc(fonti.join(' · '))}</p>` },
  { min: 2.6, classe: 'fine', voce: 'Find it all on FreeLLMArena. Link in bio.',
    corpo: `<span class="segno riga" data-in="0"><i style="height:60px"></i><i style="height:96px"></i><i style="height:76px"></i></span><p class="url riga" data-in="0.2">freellmarena.com</p><span class="bio riga" data-in="0.45">Link in bio ↑</span>` },
];
const breve = tempi(sceneC);
const marchioV = `<div class="marchio"><span class="segno"><i style="height:30px"></i><i style="height:48px"></i><i style="height:38px"></i></span><b>FreeLLM<span>Arena</span></b></div>`;
fs.writeFileSync(path.join(OUT, 'scena-notizia-corto.html'), `<!doctype html><html lang="en"><head><meta charset="utf-8"><style>${css}${STILE_VERTICALE}</style></head><body>
<div class="tela">${marchioV}${breve.html.join('\n')}<div class="sotto"><p></p></div><div class="avanza"><i></i></div></div>
<script>let DURATA = ${breve.t};${MOTORE};render(0)</script></body></html>`);
const infoC = {
  nome: GUIDA ? `breve-${nome}` : nome.replace(/^notizia-/, 'breve-'), titolo: `${yt.titolo} #Shorts`, notizia: n.nome,
  // lo Short rimanda al video lungo (Marco, 23/10/2026): «lungo» per il «Video correlato» di YouTube, e il link nella descrizione
  lungo: `video-${nome}`,
  descrizione: `${yt.apertura}\nFull story: ${url}\nSources: ${fonti.join(', ')}`,
  tag: [...yt.tag.slice(0, 10), 'Shorts'],
  condividi: `${n.titolo} ${url}`,
  lingua: 'en', copertina: 0,
  scene: sceneC.map((s) => ({ min: s.min, voce: s.voce })),
};
fs.writeFileSync(path.join(OUT, 'info-notizia-corto.json'), JSON.stringify(infoC, null, 1));
console.log('ok', { notizia: n.nome, video: nome, short: infoC.nome, parti: sezioni.length, minimo: lungo.t, tolti: tolti.length });
