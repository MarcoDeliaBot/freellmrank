// Tre pagine, una per parola chiave (LETTERA SEO-01, 25/10/2026): /free-llm, /best-free-ai, /free-ai.
// Titolo = H1 senza il nome del sito; sotto l'H1 solo H2, sotto ogni H2 una H3 per ogni voce-link.
// Ogni numero esce da data.json, dai file in dati/ o dalle funzioni del build (usabileGratis, hrefDi, cellaGratis,
// RIF), che costruisci-sito.mjs passa qui: nessun numero scritto a mano.
// /best-free-ai e /free-ai prendono il posto delle guide best-free-ai-models e use-top-ai-models-free-online
// (301 in sorgente/_redirects): i loro paragrafi non coperti dai dati stanno qui sotto un H2.
import fs from 'node:fs';
import path from 'node:path';
import { esc, fmtNum, fmtData, pagina, barraSezioni, CHAT_WEB, RADICE, URL_SITO } from './comune.mjs';
import { nomeLab } from './laboratori.mjs';
import { simula } from '../../sorgente/calc.mjs';

// sotto queste soglie di voti la pagina Music e la pagina Audio mettono un modello fuori classifica (musica.mjs, audio.mjs)
const SOGLIA_MUSICA = 200;
const SOGLIA_TTS = 300;

const leggi = (f) => { const p = path.join(RADICE, 'dati', f); return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : null; };
const assoluto = (href) => URL_SITO + href.replace(/\.html(?=$|#)/, '');
// una voce di un elenco: H3 col link, poi il testo (classi già usate da FAQ e pagina 3D)
const voce = (h3, testo) => `<div class="faq-voce"><h3>${h3}</h3><p>${testo}</p></div>`;
const sezione = (id, titolo, intro, voci) => (voci.length ? `<div class="panel" id="${id}"><h2>${titolo}</h2>${intro ? `<p class="small muted">${intro}</p>` : ''}<div class="faq-griglia">${voci.join('')}</div></div>` : '');
const elenco = (nome, voci) => ({ '@type': 'ItemList', name: nome, itemListOrder: 'https://schema.org/ItemListOrderDescending', itemListElement: voci.map((v, i) => ({ '@type': 'ListItem', position: i + 1, name: v.nome, ...(v.href ? { url: assoluto(v.href) } : {}) })) });
const host = (u) => new URL(u).host;

// dati comuni alle tre pagine
function prepara({ dati, modelli, perNome, usabileGratis, RIF }) {
  const cat = (id) => dati.categorie.find((c) => c.id === id);
  const chat = cat('chat');
  const gratisChat = chat ? chat.modelli.filter(usabileGratis) : [];
  // per ogni laboratorio con una chat web: il suo miglior modello chat gratis
  const labs = Object.entries(CHAT_WEB).map(([org, url]) => ({ org, url, m: gratisChat.find((x) => x.org === org) })).filter((l) => l.m);
  // modelli che si provano su /compare.html: API gratis su OpenRouter (stesso elenco che legge sorgente/compare.js)
  const idGratis = new Set((dati.openrouterGratis || []).map((x) => x.id));
  const provabili = modelli.filter((u) => u.or?.gratis && idGratis.has(u.or.id));
  // modelli chat aperti che entrano tutti nella scheda di riferimento (RIF: RTX 4090, 4 bit, 8K, 64 GB di RAM)
  const casa = [];
  const visti = new Set();
  for (const m of chat ? chat.modelli.filter((x) => x.aperto) : []) {
    const u = perNome.get(m.nome);
    if (!u?.hf || visti.has(u.chiave)) continue;
    const s = simula(u.hf, RIF);
    if (s.dove !== 'gpu') continue;
    visti.add(u.chiave);
    casa.push({ m, u, s });
  }
  return { cat, chat, gratisChat, labs, provabili, casa };
}

const punteggio = (m, c) => `Arena score <b>${m.punti}</b> · #${m.pos} of ${c.totale} in ${esc(c.nome)}, paid models included`;
const nomeRif = (RIF) => `${esc(RIF.nome)} (${RIF.vram} GB)`;

// ---------- /free-llm ----------
export function paginaFreeLlm(ctx) {
  const { dati, blog, hrefDi, cellaGratis, RIF } = ctx;
  const { cat, chat, gratisChat, labs, casa } = prepara(ctx);
  const code = cat('code');
  const gratisCode = code ? code.modelli.filter(ctx.usabileGratis) : [];
  const perOr = new Map(ctx.modelli.filter((u) => u.or?.id).map((u) => [u.or.id, u]));
  const titolo = 'Best Free LLMs, Ranked by Real Votes';

  const primi = gratisChat.slice(0, 3);
  const api = (dati.openrouterGratis || []).map((x) => ({ x, u: perOr.get(x.id) }));
  const cinque = gratisCode.slice(0, 5);

  const sezioni = [
    ['now', 'The best free LLM right now', chat ? `Arena chat ranking of ${fmtData(chat.data)}: ${gratisChat.length} of ${chat.totale} models are free to use.` : '',
      primi.map((m, i) => voce(`<a href="${hrefDi(m.nome)}">${esc(m.nome)}</a>`, `#${i + 1} among free LLMs · ${punteggio(m, chat)}<br>${cellaGratis(m)}`))],
    ['api', 'Free LLM APIs you can call today', `${api.length} models on OpenRouter cost nothing per token today. Try any of them on <a href="/compare.html">Try and compare</a>, with your own free OpenRouter account.`,
      api.map(({ x, u }) => voce(`<a href="/compare.html#${encodeURIComponent(x.id)}">${esc(u?.nome || x.nome)}</a>`, `${u?.cat?.chat ? `Arena chat score <b>${u.cat.chat.punti}</b> · #${u.cat.chat.pos} of ${u.cat.chat.totale}` : 'No Arena chat votes yet'}${x.contesto ? ` · ${fmtNum(x.contesto)} tokens of context` : ''}<br><a class="tag free" href="/compare.html#${encodeURIComponent(x.id)}">Free API · try it</a>${u ? ` <a class="small" href="${u.href}">Model page</a>` : ''}`))],
    ['labs', 'Free LLM chats from the labs', 'Most labs that release open models also run a free chat website. Here is each lab’s best free chat model on Arena.',
      labs.map(({ org, url, m }) => voce(`<a href="${url}" rel="noopener">${esc(nomeLab(org))}</a>`, `Best free model: <a href="${hrefDi(m.nome)}">${esc(m.nome)}</a> · #${m.pos} of ${chat.totale} in Chat<br><a class="tag web" href="${url}" rel="noopener">${esc(host(url))}</a>`))],
    ['gpu', 'Open LLMs that run on one 24 GB GPU', `Open chat models that fit fully on one ${nomeRif(RIF)} at 4-bit with ${RIF.ctx / 1024}K of context, by Arena score. Memory and speed are estimates. <a href="/home.html">Simulate your own hardware</a>.`,
      casa.map(({ m, u, s }) => voce(`<a href="${u.href}">${esc(u.nome)}</a>`, `${punteggio(m, chat)}<br>${Math.round(s.serve)} GB at 4-bit · about ${Math.round(s.vel)} tok/s`))],
    ['coding', 'Best free LLMs for coding', code ? `Arena’s web development ranking of ${fmtData(code.data)}: models build working pages from a prompt. ${gratisCode.length} of ${code.totale} are free.` : '',
      cinque.map((m, i) => voce(`<a href="${hrefDi(m.nome)}">${esc(m.nome)}</a>`, `#${i + 1} among free models · ${punteggio(m, code)}<br>${cellaGratis(m)}`))],
  ];

  // domande frequenti: risposte costruite dai dati delle sezioni sopra
  const faq = [];
  if (primi[0]) faq.push(['What is the best free LLM?', `By blind Arena votes, the best free LLM on ${fmtData(chat.data)} is ${primi[0].nome}, with a score of ${primi[0].punti}: #${primi[0].pos} of ${chat.totale} chat models, paid ones included.${cinque[0] ? ` For coding, the best free model is ${cinque[0].nome} (#${cinque[0].pos} of ${code.totale}).` : ''}`]);
  if (api.length) {
    const migliori = gratisChat.filter((m) => m.or?.gratis).slice(0, 3);
    faq.push(['Is there a free LLM API?', `Yes. Today ${api.length} models on OpenRouter cost nothing per token${migliori.length ? `; the best ranked on Arena are ${migliori.map((m) => `${m.nome} (#${m.pos})`).join(', ')}` : ''}. You can try them side by side on our Try and compare page, with your own free OpenRouter account.`]);
  }
  if (casa[0]) faq.push(['Can I run a free LLM on my own PC?', `Yes, if it fits in your GPU memory. On one ${RIF.nome} (${RIF.vram} GB), ${casa.length} open chat models fit fully on the card at 4-bit. The best by Arena votes is ${casa[0].u.nome} (#${casa[0].m.pos}), with about ${Math.round(casa[0].s.serve)} GB and ${Math.round(casa[0].s.vel)} tokens per second. The Run at home page estimates memory and speed for your own card.`]);

  const piene = sezioni.filter(([, , , v]) => v.length);
  pagina({
    file: 'free-llm.html', attiva: '/free-llm.html', dati, blog,
    titolo,
    descr: 'Every LLM you can use free today, ranked by blind Arena votes: free APIs, free lab chats and open models to download. Updated every night.',
    jsonld: [
      ...(primi.length ? [elenco('The best free LLM right now', primi.map((m) => ({ nome: m.nome, href: hrefDi(m.nome) })))] : []),
      ...(api.length ? [elenco('Free LLM APIs you can call today', api.map(({ x, u }) => ({ nome: u?.nome || x.nome, href: u?.href })))] : []),
      ...(casa.length ? [elenco('Open LLMs that run on one 24 GB GPU', casa.map(({ u }) => ({ nome: u.nome, href: u.href })))] : []),
      ...(cinque.length ? [elenco('Best free LLMs for coding', cinque.map((m) => ({ nome: m.nome, href: hrefDi(m.nome) })))] : []),
      ...(faq.length ? [{ '@type': 'FAQPage', mainEntity: faq.map(([d, r]) => ({ '@type': 'Question', name: d, acceptedAnswer: { '@type': 'Answer', text: r } })) }] : []),
    ],
    corpo: `<div style="display:grid;gap:.5rem">
<h1>${titolo}</h1>
<p class="lead">Every LLM you can use without paying, ranked by blind human votes on Arena: free APIs, free chats from the labs, and open models you can download. Updated every night; data of ${fmtData(dati.aggiornato)}.</p>
</div>
${barraSezioni([...piene.map(([id, t]) => [id, esc(t)]), ...(faq.length ? [['faq', 'FAQ']] : [])])}
${piene.map(([id, t, intro, v]) => sezione(id, esc(t), intro, v)).join('\n')}
${faq.length ? `<div class="panel faq" id="faq"><h2>Frequently asked questions</h2><div class="faq-griglia">${faq.map(([d, r]) => `<div class="faq-voce"><h3>${esc(d)}</h3><p>${esc(r)}</p></div>`).join('')}</div></div>` : ''}`,
  });
}

// ---------- /best-free-ai ----------
export function paginaBestFreeAi(ctx) {
  const { dati, blog, hrefDi, cellaGratis, usabileGratis } = ctx;
  const { cat } = prepara(ctx);
  const titolo = 'The Best Free AI for Every Task';
  const sezioni = []; // [id, compito, intro, voci [{nome, href, testo}]]

  // compiti con una classifica Arena: i primi tre gratis
  for (const [id, extra] of [['chat', ''], ['code', 'Arena’s web development ranking asks models to build working pages from a prompt. '], ['image', ''], ['video', ''], ['edit', '']]) {
    const c = cat(id);
    if (!c) continue;
    const gratis = c.modelli.filter(usabileGratis);
    const pagato = c.modelli.find((m) => !usabileGratis(m));
    const d = pagato && gratis[0] ? pagato.punti - gratis[0].punti : null;
    const scarto = d == null ? '' : d > 0 ? ` The best free one is ${d} points behind the best paid model, ${esc(pagato.nome)}.` : d < 0 ? ` The best free one is ${-d} points ahead of the best paid model, ${esc(pagato.nome)}.` : ` The best free one is level with the best paid model, ${esc(pagato.nome)}.`;
    sezioni.push([`task-${id}`, c.nome, `${extra}${gratis.length} of ${c.totale} models in Arena’s ${esc(c.nome)} ranking of ${fmtData(c.data)} are free to use.${scarto}`,
      gratis.slice(0, 3).map((m, i) => ({ nome: m.nome, href: hrefDi(m.nome), testo: `#${i + 1} among free models · Arena score <b>${m.punti}</b> · #${m.pos} of ${c.totale} overall${m.aperto ? ' · open weights' : ''}<br>${cellaGratis(m)}` }))]);
  }

  // musica: modelli aperti in classifica su Music Arena (stessi dati e stessa soglia della pagina /music)
  const mv = leggi('musica.json'), mi = leggi('musica-modelli.json');
  if (mv && mi) {
    const classificati = mv.modelli.map((m) => ({ ...m, ...(mi.modelli[m.id] || { nome: m.id, aperto: false }) })).filter((m) => m.voti >= SOGLIA_MUSICA);
    const aperti = classificati.filter((m) => m.aperto);
    sezioni.push(['task-music', 'Music', `Open music models you can download, ranked by ${fmtNum(mv.sfide)} blind votes on Music Arena (${esc(mv.fonte.licenza)}). Closed models are left out.`,
      aperti.slice(0, 3).map((m) => ({ nome: m.nome, href: `/music.html#m-${m.id}`, testo: `Score <b>${m.punteggio}</b> from ${fmtNum(m.voti)} blind votes · #${classificati.indexOf(m) + 1} of ${classificati.length} on Music Arena<br>${esc(m.licenza)}${m.commerciale === false ? ', non-commercial use only' : ''}` }))]);
  }

  // voce: testo → voce per voti ciechi (stessi dati e stessa soglia della pagina /audio); la trascrizione nell'introduzione
  const a = leggi('audio.json');
  if (a) {
    const tts = a.tts.filter((m) => m.voti >= SOGLIA_TTS);
    const asr = a.asr?.[0];
    sezioni.push(['task-speech', 'Speech', `Open text-to-speech models ranked by blind listening votes on ${esc(a.fonti.tts.nome)}.${asr ? ` For speech to text, the open model with the fewest mistakes on English is ${esc(asr.repo)}, with ${asr.wer}% of words wrong: see the <a href="/audio.html#in">speech-to-text ranking</a>.` : ''}`,
      tts.slice(0, 3).map((m, i) => ({ nome: m.space, href: '/audio.html#out', testo: `Score <b>${m.punteggio}</b> from ${fmtNum(m.voti)} blind votes · #${i + 1} of ${tts.length} open voices` }))]);
  }

  // 3D: Arena non vota, l'ordine è per download (come la pagina /3d-models, che lo dice)
  const t = leggi('3d.json');
  if (t) {
    sezioni.push(['task-3d', '3D', `There are no blind votes for 3D models yet, so these are the free 3D models downloaded most on Hugging Face in the last month: popularity, not quality. Data of ${fmtData(t.aggiornato)}.`,
      t.modelli.slice(0, 3).map((m) => { const l = t.licenze[m.licenza]; return { nome: m.nome, href: `/3d-models.html#m-${m.repo.replace('/', '-')}`, testo: `${fmtNum(m.download)} downloads · makes 3D from ${esc(m.da)}<br>${esc(l.nome)} license${l.avviso ? `: ${esc(l.nota)}` : ''}` }; })]);
  }

  const piene = sezioni.filter(([, , , v]) => v.length);
  pagina({
    file: 'best-free-ai.html', attiva: '/best-free-ai.html', dati, blog,
    titolo,
    descr: 'The best free AI for chat, coding, images, video, music, speech and 3D, picked by blind human votes, with a link to use each one free.',
    jsonld: piene.map(([, compito, , v]) => elenco(`Best free AI for ${compito}`, v)),
    corpo: `<div style="display:grid;gap:.5rem">
<h1>${titolo}</h1>
<p class="lead">For each task, the free model that won the most blind votes, and the two that follow. Free means two things here: open weights you can download and run yourself, or a free API you can call today. Paid-only models are left out. Data of ${fmtData(dati.aggiornato)}.</p>
</div>
${barraSezioni([...piene.map(([id, compito]) => [id, esc(compito)]), ['best', 'What best means'], ['how', 'How we pick']])}
${piene.map(([id, compito, intro, v]) => sezione(id, `Best free AI for ${esc(compito)}`, intro, v.map((x) => voce(`<a href="${esc(x.href)}">${esc(x.nome)}</a>`, x.testo)))).join('\n')}
<div class="panel" id="best"><h2>What “best” does not tell you</h2>
<p>The best free chat model is often a very large model. Large models are free to download, but you need a lot of GPU memory to run them. If you want the best model for your computer, use the <a href="/home.html">Run at home simulator</a>: pick your graphics card and it shows the highest-voted model that fits, with an estimated speed.</p>
<p>If you want to try them without installing anything, the <a href="/compare.html">comparison page</a> sends one prompt to two free models at once, on your own free OpenRouter account.</p></div>
<div class="panel" id="how"><h2>How we pick</h2>
<p>Every pick comes from blind tests where people compare two anonymous answers and vote for the better one: Arena for text, code, images and video, Music Arena for music and an open voice arena for text to speech, while 3D, which has no blind votes yet, is ordered by downloads. We keep only models you can use for free and rebuild the rankings every night, as explained in <a href="/about.html">How we rank</a>.</p></div>`,
  });
}

// ---------- /free-ai ----------
export function paginaFreeAi(ctx) {
  const { dati, blog, hrefDi } = ctx;
  const { chat, labs, provabili } = prepara(ctx);
  const titolo = 'Free AI Chats You Can Use Right Now';

  const sezioni = [
    ['labs', 'Free AI chats from the labs', 'Most labs that release open models also run a free chat website. On every model page we link the official chat when there is one. Next to each lab, its best free chat model on Arena.',
      labs.map(({ org, url, m }) => voce(`<a href="${url}" rel="noopener">${esc(nomeLab(org))}</a>`, `Best free model: <a href="${hrefDi(m.nome)}">${esc(m.nome)}</a> · #${m.pos} of ${chat.totale} in Chat<br><a class="tag web" href="${url}" rel="noopener">Open ${esc(host(url))}</a>`))],
    ['try', 'Try free AI on this site', `${provabili.length} models have a free API on OpenRouter today. Our <a href="/compare.html">Try and compare</a> page sends one prompt to two of them: you connect your free OpenRouter account in one click, and your prompts go from your browser straight to OpenRouter. We never see your key or your messages.`,
      provabili.map((u) => voce(`<a href="/compare.html#${encodeURIComponent(u.or.id)}">${esc(u.nome)}</a>`, `${u.cat.chat ? `Arena chat score <b>${u.cat.chat.punti}</b> · #${u.cat.chat.pos} of ${u.cat.chat.totale}` : 'No Arena chat votes yet'}<br><a class="tag free" href="/compare.html#${encodeURIComponent(u.or.id)}">Free API · try it</a> <a class="small" href="${u.href}">Model page</a>`))],
    ['devices', 'Free AI on your phone and your PC', 'Small open models can also run on your own phone or computer, for free and fully private.',
      [voce('<a href="/phone.html">Free AI on your phone</a>', 'Small open models that run offline on a phone, how much memory they need and which free apps run them.'),
        voce('<a href="/home.html">Free AI on your PC</a>', 'Pick your graphics card and see which top-voted open models fit, how the memory splits and how fast they write. See also <a href="/blog/how-much-gpu-memory-for-a-local-llm.html">how much GPU memory you need</a>.')]],
  ];

  const piene = sezioni.filter(([, , , v]) => v.length);
  pagina({
    file: 'free-ai.html', attiva: '/free-ai.html', dati, blog,
    titolo,
    descr: 'Free AI chats from DeepSeek, Kimi, Qwen, GLM and more: which model each one runs, how it ranks in blind votes, and where to try it now.',
    jsonld: provabili.length ? [elenco('Try free AI on this site', provabili.map((u) => ({ nome: u.nome, href: u.href })))] : [],
    corpo: `<div style="display:grid;gap:.5rem">
<h1>${titolo}</h1>
<p class="lead">You do not need a graphics card to use a strong free AI. The labs run their own free chat websites, free APIs let you try top models here, and small models run on your own phone or PC. Data of ${fmtData(dati.aggiornato)}.</p>
</div>
${barraSezioni([...piene.map(([id, t]) => [id, esc(t)]), ['cost', 'What free costs']])}
${piene.map(([id, t, intro, v]) => sezione(id, esc(t), intro, v)).join('\n')}
<div class="panel" id="cost"><h2>What “free” usually costs you</h2>
<p>Free tiers exist to bring developers in. Some providers may use free-tier prompts to improve their models, so read the terms before sending anything private. Running a model at home is the only option where nothing leaves your computer.</p></div>`,
  });
}
