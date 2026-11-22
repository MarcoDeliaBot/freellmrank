// Pagine "A vs B": i 15 modelli gratis più votati in chat, a coppie (105 pagine).
// Rispondono alla ricerca "qwen vs gemma": chi vince secondo i voti di Arena, in quali categorie, quanto pesa,
// quanto va veloce in casa e dove si usa gratis. Ogni coppia ha un solo indirizzo (nomi in ordine alfabetico).
// 17/11/2026 (Marco: «pagine periodiche di arena con titoli tipo Qwen4-Max vs GLM-5.5», esempio OrcaRouter): ogni coppia può
// avere un testo scritto da script/confronti-testi.mjs (contenuti/confronti/<a>-vs-<b>.json), con i SOLI fatti di fattiCoppia().
// Il testo si mostra datato; se dopo un aggiornamento di Arena il vincitore o il «gratis» non coincidono più, il testo si
// nasconde (la pagina torna alle sole tabelle) finché il giro successivo non lo riscrive.
import fs from 'node:fs';
import path from 'node:path';
import { esc, pagina, URL_SITO, conLicenza, fmtData, RADICE } from './comune.mjs';
import { simula, daScheda } from '../../sorgente/calc.mjs';
import { fmtVel } from '../../sorgente/gpu-table.mjs';
import { avvisoArchivio } from './pagine-pubblicate.mjs';
import { perNomeProva } from '../cf-modelli.mjs';

const QUANTI = 15;
const HARDWARE = [['rtx3090', 1], ['rtx4090', 1], ['rtx5090', 1], ['rx7900xtx', 1], ['m4max-128', 1], ['strixhalo-128', 1]];
const gb4 = (b) => b * 0.606 + 1.2;
const fmtGB = (g) => (g >= 100 ? Math.round(g) : g >= 10 ? g.toFixed(0) : g.toFixed(1)) + ' GB';
// famiglia: il nome (del repository Hugging Face, se c'è) senza varianti (date, high, preview, max, thinking...)
const famiglia = (m) => String(m.hf ? m.hf.repo.split('/')[1] : m.nome).toLowerCase()
  .replace(/\(.*?\)/g, '').replace(/[-_ ](high|low|max|preview|thinking|instant|exp|\d{6,8})(?=$|[-_ ])/g, '').replace(/[^a-z0-9.]+/g, '-').replace(/-+$/, '');
const vince = (x, y) => 1 / (1 + 10 ** ((y - x) / 400)); // probabilità che x batta y, scala di Arena
export const CARTELLA_TESTI = path.join(RADICE, 'contenuti', 'confronti');

// decide le coppie e le aggancia ai modelli (m.confronti), così le pagine dei modelli possono linkarle
export function preparaConfronti(modelli) {
  // una sola versione per famiglia (niente tre DeepSeek V4 Pro con date diverse): tiene la più votata
  const visti = new Set();
  const primi = modelli.filter((m) => m.cat.chat).sort((a, b) => b.cat.chat.punti - a.cat.chat.punti)
    .filter((m) => { const f = famiglia(m); if (visti.has(f)) return false; visti.add(f); return true; }).slice(0, QUANTI);
  const coppie = [];
  for (let i = 0; i < primi.length; i++) for (let j = i + 1; j < primi.length; j++) {
    const [a, b] = [primi[i], primi[j]].sort((x, y) => x.slug.localeCompare(y.slug));
    const file = `compare/${a.slug}-vs-${b.slug}.html`;
    coppie.push({ a, b, file, href: `/${file}` });
  }
  for (const m of primi) m.confronti = coppie.filter((c) => c.a === m || c.b === m).map((c) => ({ href: c.href, altro: c.a === m ? c.b : c.a }));
  return coppie;
}


// Il nome come lo cerca la gente: senza la variante di Arena («Gemini 3.8 Flash», non «Gemini 3.8 Flash (High)»).
// Marco, 17/11/2026: title e H1 uguali, secchi, «A vs B».
export const nomeCorto = (m) => String(m.nome).replace(/\s*\([^)]*\)\s*$/, '').trim() || m.nome;

// Schede di casa, divise per gli H4 della pagina
const GRUPPI_HW = [
  ['NVIDIA graphics cards', ['rtx3090', 'rtx4090', 'rtx5090']],
  ['AMD graphics cards', ['rx7900xtx']],
  ['Apple Mac and mini PCs with unified memory', ['m4max-128', 'strixhalo-128']],
];

// Tutti i fatti di una coppia, una volta sola: le tabelle della pagina e il testo scritto dal modello leggono questi.
// 22/11/2026: «Coding» è diventata «WebDev (coding)»: i testi scritti prima hanno ancora la chiave vecchia
const NOMI_VECCHI = { code: 'Coding' };
const testoCat = (t, c) => t?.categorie?.[c.nome] || t?.categorie?.[NOMI_VECCHI[c.id]] || '';

export function fattiCoppia(dati, a, b) {
  const A = nomeCorto(a), B = nomeCorto(b);
  const corto = (m) => (m === a ? A : B);
  const nomiCat = Object.fromEntries(dati.categorie.map((c) => [c.id, c.nome]));
  const schede = Object.fromEntries(dati.schede.schede.map((s) => [s.id, s]));
  const pa = vince(a.cat.chat.punti, b.cat.chat.punti);
  const [primo, secondo, p] = pa >= 0.5 ? [a, b, pa] : [b, a, 1 - pa];
  const vicino = Math.abs(a.cat.chat.punti - b.cat.chat.punti) < 10;
  // gli agenti (Agents e Agent coding) hanno un'altra scala: fuori dal confronto a punti
  const conScala = new Set(dati.categorie.filter((c) => c.scala).map((c) => c.id));
  const cats = Object.keys(a.cat).filter((c) => b.cat[c] && !conScala.has(c) && c !== 'agent');
  const categorie = cats.map((c) => {
    const x = a.cat[c].punti, y = b.cat[c].punti;
    return { id: c, nome: nomiCat[c] || c, a: x, b: y, avanti: Math.abs(x - y) < 10 ? 'about even' : corto(x > y ? a : b) };
  });
  const dim = (m) => (m.hf ? `${m.hf.b} B${m.hf.att && m.hf.att < m.hf.b * 0.6 ? ` (${m.hf.att} B active)` : ''}` : 'not public');
  const scarico = (m) => (m.hf ? fmtGB(gb4(m.hf.b)) : 'n/a');
  const hardware = HARDWARE.map(([id, n]) => {
    const s = schede[id]; if (!s) return null;
    const h = daScheda(s, { n, ram: 64, ctx: 8192 });
    const cella = (m) => { if (!m.hf) return { testo: 'online only' }; const r = simula(m.hf, h); return r.dove === 'no' ? { testo: 'does not fit' } : { testo: `${fmtVel(r.vel)} tok/s${r.dove === 'ram' ? ' (spills into system RAM)' : ''}`, vel: r.vel, ram: r.dove === 'ram' }; };
    return { id, nome: s.nome, a: cella(a), b: cella(b) };
  }).filter(Boolean);
  // 17/11/2026: anche l'API gratis di Google e la prova di Alibaba (prima la cella diceva solo «Proprietary license» per Gemini)
  const gratis = (m) => [m.or?.gratis ? 'free API on OpenRouter' : '', m.api?.tipo === 'free tier' ? 'free API from Google (Gemini API free tier)' : '', m.api?.tipo === 'trial' ? 'free trial quota on Alibaba Cloud (90 days)' : '', m.aperto && m.hf ? 'download and run at home' : '', m.licenza ? conLicenza(m.licenza) : ''].filter(Boolean).join(' · ') || '—';
  const verdetto = vicino
    ? `${A} and ${B} are about even on Arena (${a.cat.chat.punti} vs ${b.cat.chat.punti}): in a blind vote each wins about half the time.`
    : `${corto(primo)} is ahead on Arena (${primo.cat.chat.punti} vs ${secondo.cat.chat.punti}): in a blind vote people prefer it about ${Math.round(p * 100)}% of the time.`;
  // leader col nome intero: è l'impronta salvata nei testi (testoAncoraVero); leaderCorto è quello che il testo deve dire
  const leader = vicino ? 'even' : primo.nome;
  const leaderCorto = vicino ? 'even' : corto(primo);
  const scarto = Math.abs(a.cat.chat.punti - b.cat.chat.punti);
  const provabile = (m) => Object.values(m.nomi || {}).concat(m.nome).some((n) => perNomeProva(n));
  const scheda = (m) => [
    `${corto(m)}${corto(m) !== m.nome ? ` (Arena entry: ${m.nome}; call it ${corto(m)})` : ''}`,
    `- made by: ${m.org}`,
    `- Arena chat score: ${m.cat.chat.punti}, rank ${m.cat.chat.pos} of ${m.cat.chat.totale} models (paid ones included), ${m.cat.chat.voti} votes`,
    `- size: ${dim(m)}${m.hf ? `, 4-bit download about ${scarico(m)}` : ''}`,
    `- open weights: ${m.aperto && m.hf ? 'yes' : 'no'}`,
    `- how to use it free: ${gratis(m)}`,
    `- can be tried free on FreeLLMArena (Try & compare page): ${provabile(m) ? 'yes' : 'no'}`,
    m.primo ? `- first seen on Arena: ${m.primo}` : '',
  ].filter(Boolean).join('\n');
  // il testo per lo scrittore: solo questo, niente altro (il controllo in codice rifiuta i numeri che non ci sono)
  const testoDati = [
    `Arena data date: ${a.cat.chat.data}. Arena ranks models by blind human votes: two anonymous answers, people pick the better one.`,
    scheda(a), scheda(b),
    `Head to head: ${verdetto}`,
    `Call: the chat scores differ by ${scarto} points. ${vicino ? 'This counts as too close to call: say they are about even, do not name a winner.' : `This counts as a real lead for ${corto(primo)}: say ${corto(primo)} is ahead, do not call it a tie.`}`,
    `Arena scores by category (category | ${A} | ${B} | ahead):\n${categorie.map((c) => `${c.nome} | ${c.a} | ${c.b} | ${c.avanti}`).join('\n')}`,
    `Estimated generation speed at home, 4-bit, 8K context, 64 GB of system RAM for offload (hardware | ${A} | ${B}):\n${hardware.map((h) => `${h.nome} | ${h.a.testo} | ${h.b.testo}`).join('\n')}`,
    provabile(a) && provabile(b) ? 'Readers can ask both the same question side by side on the FreeLLMArena "Try & compare" page.' : 'Readers can vote blind between free models in Free Arena on FreeLLMArena.',
  ].join('\n\n');
  return { A, B, primo, secondo, p, vicino, leader, leaderCorto, scarto, verdetto, categorie, hardware, dim, scarico, gratis, gratisA: gratis(a), gratisB: gratis(b), testoDati };
}

// i testi scritti, per file della pagina («compare/a-vs-b.html»)
export function leggiTesti(cartella = CARTELLA_TESTI) {
  if (!fs.existsSync(cartella)) return {};
  const testi = {};
  for (const f of fs.readdirSync(cartella).filter((x) => x.endsWith('.json'))) {
    const t = JSON.parse(fs.readFileSync(path.join(cartella, f), 'utf8'));
    testi[`compare/${f.replace(/\.json$/, '')}.html`] = t;
  }
  return testi;
}

// Formato dei testi: 2 dal 17/11/2026 (paragrafi sotto i titoli fissi della pagina). I testi del formato 1 (titoli scritti
// dal modello) non si mostrano più e vanno riscritti per primi.
export const VERSIONE_TESTI = 2;

// il testo dice ancora la verità? Formato giusto, stesso vincitore e stesso modo di usarli gratis di quando è stato scritto
export const testoAncoraVero = (t, f) => Boolean(t && t.versione === VERSIONE_TESTI && t.fatti && t.fatti.leader === f.leader && t.fatti.gratisA === f.gratisA && t.fatti.gratisB === f.gratisB);

const paragrafi = (s) => String(s || '').split(/\n\s*\n/).map((x) => x.trim()).filter(Boolean).map((x) => `<p>${esc(x)}</p>`).join('\n');

// Pagina a piramide (Marco, 17/11/2026): H1 = title = «A vs B»; H2 per i temi, H3 per i dettagli, H4 per i gruppi di schede.
// I titoli li fissa il codice; il modello scrive solo i paragrafi. Senza testo, sotto gli stessi titoli restano i dati.
// Title corti senza doppioni: le coppie archiviate con una variante vecchia («DeepSeek V4 Pro (High) 20260813») danno lo
// stesso «A vs B» della coppia attiva. Il title corto va alla coppia attiva; le altre del gruppo tengono i nomi interi.
export function titoliConfronti(coppie, attive = new Set()) {
  const corto = (c) => `${nomeCorto(c.a)} vs ${nomeCorto(c.b)}`;
  const gruppi = Object.groupBy(coppie, corto);
  const titoli = {};
  for (const [t, gruppo] of Object.entries(gruppi)) {
    // prima la pagina il cui nome intero è già quello corto (le altre, con la variante, restano diverse), poi l'attiva
    const intero = (c) => `${c.a.nome} vs ${c.b.nome}`;
    const tiene = gruppo.length === 1 ? gruppo[0] : gruppo.find((c) => intero(c) === t) || gruppo.find((c) => attive.has(c.file));
    for (const c of gruppo) titoli[c.file] = c === tiene ? t : intero(c);
  }
  // ultima garanzia: due pagine con lo stesso title non escono mai (il controllo del sito le rifiuta)
  const visti = new Set();
  for (const c of [...coppie].sort((x, y) => x.file.length - y.file.length)) {
    if (visti.has(titoli[c.file])) titoli[c.file] = `${titoli[c.file]} (archived page)`;
    visti.add(titoli[c.file]);
  }
  return titoli;
}

export function pagineConfronti(dati, coppie, blog, testi = leggiTesti(), attive = new Set()) {
  const titoli = titoliConfronti(coppie, attive);
  for (const { a, b, file } of coppie) {
    const f = fattiCoppia(dati, a, b);
    const { A, B } = f;
    const t = testoAncoraVero(testi[file], f) ? testi[file] : null;
    const titolo = titoli[file];
    const cella = (x) => (x.vel == null ? `<span class="muted">${esc(x.testo)}</span>` : `${fmtVel(x.vel)} tok/s${x.ram ? ' <span class="tag chip-ram">+RAM</span>' : ''}`);
    const tabellaHw = (ids) => {
      const righe = f.hardware.filter((h) => ids.includes(h.id));
      return righe.length ? `<div class="tw"><table><thead><tr><th>Hardware</th><th>${esc(A)}</th><th>${esc(B)}</th></tr></thead><tbody>${righe.map((h) => `<tr><td><a href="/gpu/${h.id}.html">${esc(h.nome)}</a></td><td class="n">${cella(h.a)}</td><td class="n">${cella(h.b)}</td></tr>`).join('')}</tbody></table></div>` : '';
    };
    const righeCat = f.categorie.map((c) => `<tr><td>${esc(c.nome)}</td><td class="n"${c.a > c.b ? ' style="font-weight:700"' : ''}>${c.a}</td><td class="n"${c.b > c.a ? ' style="font-weight:700"' : ''}>${c.b}</td><td>${esc(c.avanti)}</td></tr>`).join('');
    // una frase dai dati, quando non c'è il testo del modello
    const fraseCat = (c) => `<p>${esc(A)} scores ${c.a} and ${esc(B)} scores ${c.b} in ${esc(c.nome)}: ${c.avanti === 'about even' ? 'about even' : `${esc(c.avanti)} is ahead`}.</p>`;
    // 17/11/2026: dalle coppie, non da m.confronti: preparaPubblicate copia i modelli senza m.confronti e il riquadro
    // «More comparisons» era vuoto su tutte le 105 pagine (link interni persi)
    const altri = (m) => coppie.filter((c) => c.file !== file && (c.a.href === m.href || c.b.href === m.href)).slice(0, 6)
      .map((c) => ({ href: c.href, altro: c.a.href === m.href ? c.b : c.a }));
    const briciole = { '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'All free models', item: `${URL_SITO}/models` },
      { '@type': 'ListItem', position: 2, name: titolo, item: `${URL_SITO}/${file.replace(/\.html$/, '')}` },
    ] };
    const articolo = t && { '@type': 'Article', headline: titolo, description: t.descr, datePublished: t.scritto, dateModified: t.aggiornato,
      author: { '@type': 'Organization', name: 'FreeLLMArena', url: URL_SITO }, publisher: { '@type': 'Organization', name: 'FreeLLMArena', url: URL_SITO },
      mainEntityOfPage: `${URL_SITO}/${file.replace(/\.html$/, '')}` };
    // la descrizione comincia con l'ordine inverso: la stessa pagina risponde a «A vs B» e a «B vs A»
    const descr = t ? `${B} vs ${A}: ${t.descr}` : `${B} vs ${A}: ${f.verdetto} Size, speed on home GPUs and how to use both for free.`;

    pagina({
      file, attiva: '/models.html', dati, blog,
      titolo,
      descr,
      jsonld: [briciole, articolo],
      corpo: `<p class="briciole small"><a href="/models.html">All models</a> › Compare</p>
<div style="display:grid;gap:.4rem">
<h1>${esc(titolo)}</h1>
${avvisoArchivio(a)}
${avvisoArchivio(b)}
<p class="lead">${esc(f.verdetto)}</p>
${t ? `<p class="small muted">Updated <time datetime="${t.aggiornato}">${fmtData(t.aggiornato)}</time> with Arena data of ${fmtData(t.fatti.dataArena)}. The tables always show today's numbers.</p>` : ''}
</div>
<div class="tiles">
<div class="tile"><span class="small muted"><a href="${a.href}">${esc(A)}</a></span><b>${a.cat.chat.punti}</b><span class="small muted">Arena chat · #${a.cat.chat.pos} of ${a.cat.chat.totale}</span></div>
<div class="tile"><span class="small muted"><a href="${b.href}">${esc(B)}</a></span><b>${b.cat.chat.punti}</b><span class="small muted">Arena chat · #${b.cat.chat.pos} of ${b.cat.chat.totale}</span></div>
</div>
<section class="panel confronto"><h2>Which is better, ${esc(B)} or ${esc(A)}?</h2>
${t ? paragrafi(t.risposta) : `<p>${esc(f.verdetto)}</p>`}
</section>
<section class="panel confronto"><h2>${esc(A)} vs ${esc(B)} on Arena blind votes</h2>
<p>Arena scores come from blind human votes: people see two anonymous answers and pick the better one. A gap under 10 points is too small to call.</p>
<div class="tw"><table><thead><tr><th>Category</th><th>${esc(A)}</th><th>${esc(B)}</th><th>Ahead</th></tr></thead><tbody>${righeCat}</tbody></table></div>
${f.categorie.map((c) => `<h3>${esc(c.nome)}</h3>\n${testoCat(t, c) ? paragrafi(testoCat(t, c)) : fraseCat(c)}`).join('\n')}
</section>
<section class="panel confronto"><h2>Running ${esc(A)} and ${esc(B)} at home</h2>
<h3>Size and download</h3>
${t ? paragrafi(t.dimensioni) : ''}
<div class="tw"><table><thead><tr><th></th><th>${esc(A)}</th><th>${esc(B)}</th></tr></thead><tbody>
<tr><td>Made by</td><td>${esc(a.org)}</td><td>${esc(b.org)}</td></tr>
<tr><td>Size</td><td class="n">${f.dim(a)}</td><td class="n">${f.dim(b)}</td></tr>
<tr><td>4-bit download</td><td class="n">${a.hf ? f.scarico(a) : '—'}</td><td class="n">${b.hf ? f.scarico(b) : '—'}</td></tr>
<tr><td>Open weights</td><td>${a.aperto && a.hf ? 'yes' : 'no'}</td><td>${b.aperto && b.hf ? 'yes' : 'no'}</td></tr>
</tbody></table></div>
<h3>Speed on home hardware</h3>
${t ? paragrafi(t.velocita) : ''}
${GRUPPI_HW.map(([nome, ids]) => { const tab = tabellaHw(ids); return tab ? `<h4>${esc(nome)}</h4>\n${tab}` : ''; }).join('\n')}
<p class="small muted">Estimates at 4-bit with an 8K context, 64 GB of system RAM for offload, calibrated on 44 real llama.cpp tests.</p>
</section>
<section class="panel confronto"><h2>How to use ${esc(A)} and ${esc(B)} for free</h2>
<h3>${esc(A)}</h3>
${t ? paragrafi(t.gratisA) : `<p>${esc(f.gratisA)}</p>`}
<h3>${esc(B)}</h3>
${t ? paragrafi(t.gratisB) : `<p>${esc(f.gratisB)}</p>`}
</section>
${t ? `<section class="panel confronto"><h2>${esc(A)} or ${esc(B)}: which one to pick</h2>
<h3>When to pick ${esc(A)}</h3>
${paragrafi(t.sceglieA)}
<h3>When to pick ${esc(B)}</h3>
${paragrafi(t.sceglieB)}
</section>` : ''}
<section class="panel confronto"><h2>Try them yourself</h2><p>Ask both the same question side by side in <a href="/compare.html">Try &amp; compare</a>, or vote blind between free models in <a href="/arena.html">Free Arena</a>.</p></section>
${altri(a).length || altri(b).length ? `<section class="panel confronto"><h2>More comparisons</h2><ul class="vicini">${[...altri(a).map((c) => [a, c]), ...altri(b).map((c) => [b, c])].slice(0, 10).map(([m, c]) => `<li><a href="${c.href}">${esc(nomeCorto(m))} vs ${esc(nomeCorto(c.altro))}</a></li>`).join('')}</ul></section>` : ''}`,
    });
  }
}
