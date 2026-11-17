// Testi delle pagine «A vs B» (Marco, 17/11/2026: «pagine periodiche (quindi con n8n) di arena con titoli tipo
// Qwen4-Max vs GLM-5.5», esempio https://www.orcarouter.ai/blog/qwen-4-max-vs-glm-5-5). Un indirizzo per coppia, quello
// che esiste già (/compare/<a>-vs-<b>): il testo si scrive la prima volta e si riscrive quando i fatti cambiano.
// Lo lancia n8n ogni giorno (flusso «FreeLLMArena · testi dei confronti» → .github/workflows/confronti-testi.yml).
//
// Quali coppie, in ordine (al massimo --max, 4 di solito; Marco: 3-5 al giorno, non 30, per non sembrare spam a Google):
//   1. testi che non dicono più il vero (Arena ha cambiato il vincitore, o un modello non è più gratis nello stesso modo):
//      la pagina li ha già nascosti, vanno riscritti per primi;
//   2. coppie senza testo, prima quelle con un modello arrivato su Arena da poco (il «modello nuovo contro i rivali»);
//   3. testi più vecchi di 30 giorni, dal più vecchio.
// Scrive lo scrittore del sito (script/bozze.mjs: Workers AI, poi Groq) con i SOLI fatti di fattiCoppia(); il testo esce
// solo se passa i controlli in codice (controllaTesto): numeri tutti nei fatti, nessun altro modello nominato, niente
// frasi vietate, lunghezze giuste, vincitore come nei fatti) e poi un secondo lettore (verifica: un modello che cerca le
// frasi non sostenute dai fatti). Se non passa si riprova dicendo gli errori, 3 giri in tutto; poi la coppia si salta.
// Uso: node script/confronti-testi.mjs [--max 4] [--prova]   (--prova: stampa e non salva)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { RADICE, leggiDati, chiediModello, REGOLE_SCRITTURA, senzaLineette, ultimoScrittore } from './bozze.mjs';
import { unisci } from './sito/modelli.mjs';
import { preparaConfronti, fattiCoppia, leggiTesti, testoAncoraVero, CARTELLA_TESTI } from './sito/confronti.mjs';

const VIETATE = ['unlock', 'game-changer', 'game changer', 'revolutionary', 'delve', 'leverage', 'say goodbye', 'next level', "here's the thing", 'fast-paced', 'worth noting', 'in conclusion', 'landscape', 'powerhouse'];
const GIORNO = 86400000;
const PARI = ['about even', 'too close to call', 'too small to call', 'a tie', 'tied', 'no clear winner', 'dead heat', 'cannot claim', 'roughly equal', 'neck and neck', 'half the time'];

// Il controllo: restituisce gli errori (vuoto = si pubblica). t = {angolo, descr, intro, sezioni:[{titolo,testo}], verdetto}
export function controllaTesto(t, { a, b, testoDati, altriNomi = [], leader = '' }) {
  const err = [];
  if (!t || typeof t !== 'object') return ['no JSON object'];
  const sezioni = Array.isArray(t.sezioni) ? t.sezioni : [];
  if (!t.angolo || String(t.angolo).length > 70) err.push('angolo: missing or over 70 characters');
  if (/[:|]/.test(String(t.angolo || ''))) err.push('angolo: no colon or pipe');
  if (!t.descr || String(t.descr).length > 160) err.push('descr: missing or over 160 characters');
  if (!t.intro) err.push('intro: missing');
  if (!t.verdetto) err.push('verdetto: missing');
  if (sezioni.length < 3 || sezioni.length > 5) err.push(`sezioni: ${sezioni.length}, need 3 to 5`);
  if (sezioni.some((s) => !s?.titolo || !s?.testo)) err.push('sezioni: every section needs titolo and testo');
  const tutto = [t.angolo, t.descr, t.intro, ...sezioni.flatMap((s) => [s?.titolo, s?.testo]), t.verdetto].map((x) => String(x || '')).join('\n');
  const parole = tutto.split(/\s+/).filter(Boolean).length;
  if (parole < 300 || parole > 1000) err.push(`length: ${parole} words, need 300 to 1000`);
  // ogni numero (tranne i piccoli e gli anni) deve stare nei fatti, scritto uguale o senza separatori delle migliaia
  for (const m of tutto.matchAll(/\d[\d,.]*/g)) {
    const n = m[0].replace(/[.,]+$/, '');
    const nudo = n.replace(/,/g, '');
    // interi piccoli e anni si saltano; i decimali (0.35) si controllano
    if ((!nudo.includes('.') && Number(nudo) <= 10) ||/^(19|20)\d\d$/.test(nudo)) continue;
    if (!testoDati.includes(n) && !testoDati.includes(nudo)) err.push(`number not in DATA: ${n}`);
  }
  // nessun altro modello: si tolgono i due nomi della coppia, poi si cercano gli altri nomi del sito
  const pulito = tutto.toLowerCase().split(a.nome.toLowerCase()).join(' ').split(b.nome.toLowerCase()).join(' ');
  for (const n of altriNomi) if (n.length >= 6 && pulito.includes(n.toLowerCase())) err.push(`other model named: ${n}`);
  const basso = tutto.toLowerCase();
  for (const v of VIETATE) if (basso.includes(v)) err.push(`banned phrase: ${v}`);
  // chi vince: come dice la riga «Call» dei fatti (17/11, prova con Qwen 3.6: 10 punti di distacco chiamati «pareggio»)
  if (leader) {
    const intro = String(t.intro || '').toLowerCase();
    if (leader === 'even') {
      if (!PARI.some((x) => intro.includes(x))) err.push('intro: DATA says too close to call, say they are about even');
    } else {
      if (!intro.includes(leader.toLowerCase())) err.push(`intro: must say ${leader} is ahead`);
      const pari = PARI.filter((x) => x !== 'half the time').find((x) => basso.includes(x));
      if (pari) err.push(`DATA says ${leader} has a real lead, but the text says "${pari}"`);
    }
  }
  if (/[—–]/.test(tutto)) err.push('em dash');
  if (/[\u{1F300}-\u{1FAFF}]/u.test(tutto)) err.push('emoji');
  return [...new Set(err)];
}

// Le coppie da scrivere oggi, in ordine di urgenza
export function scegliCoppie(coppie, testi, fattiDi, { max = 4, oggi = new Date().toISOString().slice(0, 10) } = {}) {
  const ora = Date.parse(oggi);
  const recente = (c) => Math.max(...[c.a.primo, c.b.primo].map((d) => (d ? Date.parse(d) : 0)));
  const punti = (c) => c.a.cat.chat.punti + c.b.cat.chat.punti;
  const cambiate = [], nuove = [], vecchie = [];
  for (const c of coppie) {
    const t = testi[c.file];
    if (!t) nuove.push(c);
    else if (!testoAncoraVero(t, fattiDi(c))) cambiate.push(c);
    else if (ora - Date.parse(t.aggiornato) > 30 * GIORNO) vecchie.push(c);
  }
  // nuove: prima quelle con un modello arrivato negli ultimi 14 giorni, poi le più votate
  const fresca = (c) => ora - recente(c) <= 14 * GIORNO;
  nuove.sort((x, y) => (fresca(y) - fresca(x)) || (fresca(x) && fresca(y) ? recente(y) - recente(x) : 0) || punti(y) - punti(x));
  vecchie.sort((x, y) => Date.parse(testi[x.file].aggiornato) - Date.parse(testi[y.file].aggiornato));
  return [...cambiate, ...nuove, ...vecchie].slice(0, max);
}

const SISTEMA = `You write comparison articles for FreeLLMArena (freellmarena.com), a free site that ranks AI models you can use for free (open weights or a free API) using Arena's blind human votes, and estimates how fast they run on home hardware. Always write the site name as FreeLLMArena, one word. Readers are curious people and hobbyists who searched "A vs B" and want a straight answer.
${REGOLE_SCRITTURA}
- Mention no AI model other than the two being compared. Do not mention prices: DATA has none.
- Explain once, plainly, what an Arena score is. Say who leads exactly as the "Call" line in DATA says.
- Say a model can be tried on FreeLLMArena, used through a free API or run at home only if DATA says so for that model.
- Write numbers exactly as DATA writes them (same digits). Round nothing. Percentages only if DATA has them.

Return one JSON object with these keys:
"angolo": the most telling concrete fact from DATA as a headline phrase, max 60 characters, no colon, it goes after "A vs B: " in the title (e.g. "One Runs on a 24 GB Card, the Other Only Online"),
"descr": meta description, max 155 characters, with both names,
"intro": 2 or 3 sentences that answer straight away which one is better and for what,
"sezioni": 3 or 4 sections [{"titolo": "short heading", "testo": "1 or 2 paragraphs separated by a blank line"}]: who wins in blind votes and by how much; where each one is stronger (categories); running them at home (size, download, speed); how to use them free,
"verdetto": 2 to 4 sentences, "Pick X if ... Pick Y if ...", based only on DATA.
Total 450 to 750 words.`;

export function componi(t, { a, b, fatti, oggi, scritto, scrittore }) {
  const pulisci = (s) => senzaLineette(String(s || '').trim());
  return {
    coppia: [a.nome, b.nome],
    angolo: pulisci(t.angolo).replace(/\.$/, ''),
    descr: pulisci(t.descr),
    intro: pulisci(t.intro),
    sezioni: t.sezioni.map((s) => ({ titolo: pulisci(s.titolo), testo: pulisci(s.testo) })),
    verdetto: pulisci(t.verdetto),
    scritto: scritto || oggi,
    aggiornato: oggi,
    scrittore,
    // per sapere quando il testo smette di dire il vero (testoAncoraVero) e per rileggerlo
    fatti: { leader: fatti.leader, gratisA: fatti.gratisA, gratisB: fatti.gratisB, puntiA: a.cat.chat.punti, puntiB: b.cat.chat.punti, dataArena: a.cat.chat.data },
  };
}

// Secondo lettore (17/11, prova con Qwen 3.6: titolo «Kimi Fits Home GPU» con Kimi che non entra in nessuna macchina):
// i numeri e i nomi li controlla il codice, il senso delle frasi (chi vince, dove entra, come si usa gratis) un modello.
export async function verifica(t, testoDati) {
  const r = await chiediModello([
    { role: 'system', content: 'You are a strict fact checker. Compare ARTICLE with DATA. List every statement in ARTICLE that DATA does not support or that contradicts DATA: who leads, which hardware a model fits on or not, how each model can be used for free, whether it can be tried on FreeLLMArena, sizes, category results, open weights. Ignore style. Return JSON {"errori": ["short description of each unsupported statement"]}, with an empty list if everything is supported.' },
    { role: 'user', content: `DATA:\n${testoDati}\n\nARTICLE (JSON):\n${JSON.stringify(t)}` },
  ], { json: true, max: 1200, scopo: 'bozze' });
  return Array.isArray(r?.errori) ? r.errori.map(String).filter(Boolean) : ['fact checker: no "errori" list'];
}

// i modelli a volte cambiano i nomi dei campi (title/text, paragrafi in un elenco): si accettano, poi si pulisce
export function normalizza(t) {
  if (!t || typeof t !== 'object') return t;
  const testo = (x) => senzaLineette(Array.isArray(x) ? x.join(String.fromCharCode(10, 10)) : String(x || ''));
  const sezioni = (Array.isArray(t.sezioni) ? t.sezioni : Array.isArray(t.sections) ? t.sections : []).map((s) => ({
    titolo: testo(s?.titolo ?? s?.title ?? s?.heading), testo: testo(s?.testo ?? s?.text ?? s?.body ?? s?.paragraphs),
  }));
  return { angolo: testo(t.angolo ?? t.angle), descr: testo(t.descr ?? t.description), intro: testo(t.intro), sezioni, verdetto: testo(t.verdetto ?? t.verdict) };
}

async function scrivi(c, f, altriNomi) {
  const domanda = [
    { role: 'system', content: SISTEMA },
    { role: 'user', content: `Write the article "${c.a.nome} vs ${c.b.nome}".\n\nDATA:\n${f.testoDati}` },
  ];
  let errori = [];
  for (let giro = 1; giro <= 3; giro++) {
    const msg = giro === 1 ? domanda : [...domanda, { role: 'user', content: `Your previous answer was rejected by the fact check: ${errori.join('; ')}. Write it again and fix these points. Use only DATA.` }];
    let t;
    try { t = await chiediModello(msg, { json: true, max: 2600, scopo: 'bozze' }); } catch (e) { errori = [`writer: ${e.message}`]; continue; }
    const pulito = normalizza(t);
    errori = controllaTesto(pulito, { a: c.a, b: c.b, testoDati: f.testoDati, altriNomi, leader: f.leader });
    if (errori.length) continue;
    const scrittore = ultimoScrittore;
    try { errori = await verifica(pulito, f.testoDati); } catch (e) { errori = [`fact checker: ${e.message}`]; }
    if (!errori.length) return { t: pulito, scrittore };
    console.log(`  giro ${giro}, il secondo lettore trova: ${errori.join('; ')}`);
  }
  return { errori };
}

// ---------- main ----------
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
  const MAX = Number(arg('--max', '4')) || 4;
  const PROVA = process.argv.includes('--prova');
  const dati = leggiDati();
  const fileStoria = path.join(RADICE, 'sito', 'history.json');
  const storia = fs.existsSync(fileStoria) ? JSON.parse(fs.readFileSync(fileStoria, 'utf8')) : null;
  const modelli = unisci(dati, storia);
  const coppie = preparaConfronti(modelli);
  const testi = leggiTesti();
  const oggi = new Date().toISOString().slice(0, 10);
  const cache = new Map();
  const fattiDi = (c) => { if (!cache.has(c.file)) cache.set(c.file, fattiCoppia(dati, c.a, c.b)); return cache.get(c.file); };
  const scelte = scegliCoppie(coppie, testi, fattiDi, { max: MAX, oggi });
  console.log(`Coppie: ${coppie.length}, con testo: ${coppie.filter((c) => testi[c.file]).length}. Oggi: ${scelte.map((c) => `${c.a.nome} vs ${c.b.nome}`).join(' | ') || 'nessuna'}`);
  const tuttiNomi = [...new Set(modelli.map((m) => m.nome))];
  fs.mkdirSync(CARTELLA_TESTI, { recursive: true });
  let fatti = 0;
  for (const c of scelte) {
    const f = fattiDi(c);
    const altriNomi = tuttiNomi.filter((n) => n !== c.a.nome && n !== c.b.nome && !c.a.nome.includes(n) && !c.b.nome.includes(n));
    const r = await scrivi(c, f, altriNomi);
    if (r.errori) { console.log(`SALTATA ${c.a.nome} vs ${c.b.nome}: ${r.errori.join('; ')}`); continue; }
    const vecchio = testi[c.file];
    const doc = componi(r.t, { a: c.a, b: c.b, fatti: f, oggi, scritto: vecchio?.scritto, scrittore: r.scrittore });
    const file = path.join(CARTELLA_TESTI, `${path.basename(c.file, '.html')}.json`);
    if (PROVA) console.log(JSON.stringify(doc, null, 2));
    else fs.writeFileSync(file, JSON.stringify(doc, null, 2) + '\n');
    fatti++;
    console.log(`${vecchio ? 'RISCRITTA' : 'NUOVA'} ${c.a.nome} vs ${c.b.nome}: ${doc.angolo} (${r.scrittore})`);
  }
  console.log(`Scritte ${fatti} di ${scelte.length}.`);
  if (scelte.length && !fatti) process.exitCode = 1; // nessun testo passato: la corsa diventa rossa e si vede
}
