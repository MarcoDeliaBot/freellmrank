// Il piano di un video a stampi (24/10/2026, Marco: video come la prova DeepInfer, fatti ogni giorno da n8n senza Claude).
// Workers AI (gratis, quota del sito, uso «video») legge la notizia già verificata e sceglie stampi, testi e voce.
// Poi il controllo in codice: ogni numero e ogni nome della voce e dello schermo deve stare nella notizia; ogni stampo
// controlla le sue lunghezze. Una scena che non regge si toglie; se il piano non regge, piano di riserva costruito
// in codice con le frasi della notizia lette parola per parola.
// Uso: BOZZE_KEY=… node script/video-hf/piano.mjs <notizia.json> <piano.json>
import fs from 'node:fs';
import path from 'node:path';
import { STAMPI_NOTIZIE as STAMPI } from './stampi/index.mjs';
import { chiediModello, ultimoScrittore } from '../bozze.mjs';
import { numeri } from '../video-post.mjs';
import { nomiDi } from '../notizie.mjs';
import { titoloCorto } from '../brag/titoli-yt.mjs';

export const semplice = (t) => String(t || '').replace(/[‐‑‒]/g, '-').replace(/\s*[–—]\s*/g, ', ').replace(/[   ]/g, ' ').replace(/\s+/g, ' ').trim();
const giorno = (d) => new Date(d + 'T12:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const frasi = (t) => semplice(t).split(/(?<=[.!?])\s+(?=[A-Z0-9"])/).filter(Boolean);
const parole = (t) => semplice(t).split(' ').filter(Boolean).length;

// il controllo dei fatti: numeri e nomi propri devono stare nella notizia (come script/brag/notizia.mjs)
export function controllore(n) {
  // la data di pubblicazione vale come fatto (va nella riga «AI news · 24 October 2026»)
  const POST = [n.titolo, n.descr, ...(n.paragrafi || []), ...(n.perche || []), ...(n.fonti || []).map((f) => f.nome), n.pubblicato ? giorno(n.pubblicato) : ''].map(semplice).join('\n');
  const ammessi = numeri(POST);
  const basso = POST.toLowerCase();
  // i nomi si cercano frase per frase: la prima parola di ogni frase ha la maiuscola comunque («Every day.»)
  const mancanti = (t) => [...numeri(t)].filter((x) => !ammessi.has(x)).concat(frasi(t).flatMap((f) => nomiDi(f)).filter((x) => !basso.includes(x.toLowerCase())));
  const regge = (t) => mancanti(t).length === 0;
  return { POST, regge, mancanti };
}
// tutti i testi dentro «dati» (anche annidati), tranne le parole di attacco
const testi = (v, k = '') => k === 'quando' ? [] : typeof v === 'string' ? [v] : Array.isArray(v) ? v.flatMap((x) => testi(x)) : v && typeof v === 'object' ? Object.entries(v).flatMap(([kk, x]) => testi(x, kk)) : [];

// riparazioni che non aggiungono niente: liste accorciate al massimo dello stampo, evidenza tolta se non va,
// titolo troppo lungo sostituito dal titolo della notizia accorciato. Restituisce i dati riparati o null
const clona = (x) => JSON.parse(JSON.stringify(x));
function ripara(st, dati, n) {
  if (!st.valida(dati).length) return dati;
  const prove = [];
  const liste = (o, via = []) => Object.entries(o || {}).flatMap(([k, v]) => k === 'quando' ? [] : Array.isArray(v) ? [[...via, k]] : v && typeof v === 'object' ? liste(v, [...via, k]) : []);
  const prendi = (o, via) => via.reduce((x, k) => x?.[k], o);
  for (const max of [5, 4, 3, 2]) {
    const d = clona(dati);
    for (const via of liste(d)) { const a = prendi(d, via.slice(0, -1)); a[via.at(-1)] = a[via.at(-1)].slice(0, max); }
    prove.push(d);
  }
  if (st.nome === 'titolo') prove.push({ ...clona(dati), testo: titoloCorto(semplice(n.titolo)) });
  // togliere le voci troppo lunghe di una lista, una alla volta, finché i problemi calano (la voce le dice comunque)
  let d = clona(dati);
  for (let giro = 0; giro < 4 && st.valida(d).length; giro++) {
    const prima = st.valida(d).length;
    let meglio = null;
    for (const via of liste(d)) {
      const a = prendi(d, via);
      for (let i = 0; i < a.length; i++) {
        const t = clona(d); prendi(t, via).splice(i, 1);
        const e = st.valida(t).length;
        if (e < prima && (!meglio || e < meglio.e)) meglio = { t, e };
      }
    }
    if (!meglio) break;
    d = meglio.t;
  }
  prove.push(d);
  for (const x of [...prove]) { const e = clona(x); delete e.evidenza; prove.push(e); }
  return prove.find((x) => !st.valida(x).length) || null;
}

const titoloDiRiserva = (n) => {
  const tipo = n.tipo === 'guida' ? 'Guide' : 'AI news';
  return { stampo: 'titolo', etichetta: tipo, voce: semplice(n.descr), dati: { testo: titoloCorto(semplice(n.titolo)), sopra: `${tipo} · ${giorno(n.pubblicato)}` } };
};

export function controllaPiano(grezzo, n) {
  const { POST, regge, mancanti } = controllore(n);
  const problemi = [];
  const scene = [];
  let tolte = 0; // scene scartate: un piano che ha perso una scena (es. quella sulla licenza) non è completo
  for (const [i, sc] of (Array.isArray(grezzo?.scene) ? grezzo.scene : []).entries()) {
    const st = STAMPI[sc?.stampo];
    const dove = `scena ${i + 1} (${sc?.stampo})`;
    if (!st || sc.stampo === 'chiusura') { problemi.push(`${dove}: stampo non valido`); tolte++; continue; }
    const voce = semplice(sc.voce);
    const grezzi = sc.dati && typeof sc.dati === 'object' ? sc.dati : {};
    // i fatti non si riparano: una scena con un numero o un nome che non sta nella notizia si toglie
    const fatti = [
      ...(parole(voce) < 6 || parole(voce) > 60 ? [`voce di ${parole(voce)} parole (servono 6-60)`] : []),
      ...(regge(voce) ? [] : [`voce con numeri o nomi non nella notizia (${mancanti(voce).join(', ')})`]),
      ...testi(grezzi).filter((t) => !regge(semplice(t))).map((t) => `testo non nella notizia: «${t}» (${mancanti(semplice(t)).join(', ')})`),
      // controlli dei fatti propri dello stampo (29/10/2026, «mappa»: ogni luogo deve stare nella notizia, anche se è una parola sola)
      ...(typeof st.fatti === 'function' ? st.fatti(grezzi, POST) : []),
    ];
    if (fatti.length) { problemi.push(`${dove}: ${fatti.join('; ')}`); tolte++; continue; }
    const dati = ripara(st, grezzi, n);
    if (!dati) { problemi.push(`${dove}: ${st.valida(grezzi).join('; ')}`); tolte++; continue; }
    if (dati !== grezzi) problemi.push(`${dove}: riparata (${st.valida(grezzi).join('; ')})`);
    scene.push({ stampo: sc.stampo, etichetta: semplice(sc.etichetta).slice(0, 24), voce, dati });
  }
  // si apre sempre col titolo: se manca, quello costruito dalla notizia (riassunto letto così com'è)
  if (scene.length && scene[0].stampo !== 'titolo') { scene.unshift(titoloDiRiserva(n)); problemi.push('titolo di apertura aggiunto dalla notizia'); }
  const totale = scene.reduce((s, x) => s + parole(x.voce), 0);
  // 26/10/2026: soglia allineata alle regole date al modello (4-6 scene, 110-190 parole); prima bastavano 3 scene e 60 parole
  // e passavano piani da 40 secondi
  const ok = scene.length >= 4 && totale >= 100 && totale <= 230;
  if (!ok) problemi.push(`piano scartato: ${scene.length} scene buone, ${totale} parole (servono almeno 4 scene e 100-230 parole)`);
  return { ok, completo: ok && tolte === 0, tolte, scene, problemi, totale };
}

// riserva: titolo con il riassunto, poi una scena per paragrafo con la voce che legge il paragrafo; a schermo i punti
// solo se il paragrafo ha almeno 2 frasi intere brevi (mai frasi tagliate: cambierebbero il senso), se no il nome della parte
export function pianoDiRiserva(n) {
  const guida = n.tipo === 'guida';
  const scene = [titoloDiRiserva(n)];
  const blocchi = (n.paragrafi || []).slice(0, 3).map((p, i) => ({ p, titolo: (n.titoliSezioni || [])[i] || (guida ? 'Step by step' : i === 0 ? 'What happened' : 'The details') }));
  if ((n.perche || []).length) blocchi.push({ p: n.perche.join(' '), titolo: 'Why it matters' });
  for (const { p, titolo } of blocchi) {
    const pezzi = frasi(p).map((x) => x.replace(/\.$/, '').trim()).filter((x) => x.length >= 12 && x.length <= 60);
    const dati = { titolo, punti: pezzi.slice(0, 4) };
    if (pezzi.length >= 2 && STAMPI.punti && !STAMPI.punti.valida(dati).length) scene.push({ stampo: 'punti', etichetta: titolo, voce: semplice(p), dati });
    else scene.push({ stampo: 'titolo', etichetta: titolo, voce: semplice(p), dati: { testo: titolo, sopra: guida ? 'Guide' : 'AI news' } });
  }
  return scene;
}

export async function pianoPer(n) {
  const elenco = Object.values(STAMPI).filter((s) => s.nome !== 'chiusura').map((s) => `- "${s.nome}": ${s.descrizione}\n  dati: ${s.schema}`).join('\n');
  const problemi = [], grezzi = [];
  let migliore = null;
  const domanda = [
      { role: 'system', content: `You plan a 60-90 second YouTube ${n.tipo === 'guida' ? 'guide' : 'news'} video for FreeLLMArena, built from ready-made animated scenes ("stampi").
Use ONLY facts, numbers and names from ARTICLE. Never add a number, name, date or claim that is not in ARTICLE. Write ranks, names and places exactly as ARTICLE does: "first", not "#1" or "1st"; "South Korea", not "SK"; never shorten a name. Performance claims are the company's own: say "X reports" or "according to X". No hype words, no emojis, no questions to the viewer.
Available stampi:
${elenco}
Rules:
- 4 to 6 scenes. The first scene is always "titolo"; its "sopra" is ${n.tipo === 'guida' ? '"Guide · ' : '"AI news · '}${giorno(n.pubblicato)}" exactly. Do NOT add a closing scene (it is added automatically).
- Use "numero", "numeri", "lista", "confronto" or "mappa" only when ARTICLE really has that kind of content ("mappa": ARTICLE names the cities or countries); otherwise "punti".
- "voce" is what the narrator says during the scene: 1 to 3 short spoken sentences (6 to 45 words, never more than 50), plain English, numbers written as digits. All scenes together: 110 to 190 words.
- Everything shown on screen ("dati") must also be said in that scene's "voce", in the same order. Show about one on-screen item for every 12 to 15 spoken words: a long voice needs more items, or split it into two scenes.
- "quando" (optional, inside dati): for each piece, the exact word of "voce" at which it should appear, e.g. {"etichetta": "day"}.
- "etichetta": a 1-3 word label for the scene, shown small at the top (e.g. "The number", "What's inside").
Return JSON: {"scene": [{"stampo": "...", "etichetta": "...", "voce": "...", "dati": {...}}]}` },
      { role: 'user', content: `ARTICLE:\nTitle: ${semplice(n.titolo)}\nDate: ${giorno(n.pubblicato)}\nSummary: ${semplice(n.descr)}\n${(n.paragrafi || []).map((p, i) => `Paragraph ${i + 1}: ${semplice(p)}`).join('\n')}\nWhy it matters: ${(n.perche || []).map(semplice).join(' ')}\nSources: ${(n.fonti || []).map((f) => f.nome).join(', ')}` },
  ];
  // ogni tentativo riceve i problemi del precedente. 26/10/2026: 5 tentativi invece di 3, ora che c'è Groq come riserva
  // (con il solo tetto di Workers AI i tentativi erano pochi e i piani finivano scartati)
  for (let tentativo = 1; tentativo <= 5 && !migliore?.completo; tentativo++) {
    try {
      const grezzo = await chiediModello(domanda, { json: true, max: 1800, scopo: 'video' });
      grezzi.push(grezzo);
      const c = controllaPiano(grezzo, n);
      problemi.push(...c.problemi.map((p) => `tentativo ${tentativo}: ${p}`));
      // il migliore: completo, poi accettabile, poi con meno scene perse, poi più parole
      const voto = (x) => [x.completo ? 1 : 0, x.ok ? 1 : 0, -x.tolte, x.totale];
      const meglio = (a, b) => { const va = voto(a), vb = voto(b); for (let i = 0; i < va.length; i++) if (va[i] !== vb[i]) return va[i] > vb[i]; return false; };
      if (!migliore || meglio(c, migliore)) migliore = c;
      if (!c.completo) domanda.push({ role: 'assistant', content: JSON.stringify(grezzo) }, { role: 'user', content: `Problems found by the checker:\n- ${c.problemi.join('\n- ')}\nFix them and return the whole JSON again. Remember: 4 to 6 scenes, 110 to 190 words in total, respect every max length and item count, only facts from ARTICLE.` });
    } catch (e) {
      problemi.push(`tentativo ${tentativo}: nessun modello ha risposto (${e.message})`);
      // quota finita o chiave sbagliata: inutile riprovare; JSON rotto: si riprova
      if (/\/api\/scrivi 4\d\d/.test(e.message)) break;
    }
  }
  // un piano quasi buono (almeno 3 scene e 45 parole, tutte controllate) è meglio della riserva, che mostra solo i titoli
  const ok = !!migliore?.ok || (migliore?.scene.length >= 3 && migliore.totale >= 45);
  if (ok && !migliore.ok) problemi.push(`piano del modello quasi buono usato lo stesso (${migliore.scene.length} scene, ${migliore.totale} parole)`);
  const scene = ok ? migliore.scene : pianoDiRiserva(n);
  const copertina = Math.max(0, scene.findIndex((s) => s.stampo === 'numero' || s.stampo === 'numeri'));
  return { notizia: n.nome, riserva: !ok, problemi, copertina, scene: [...scene, { stampo: 'chiusura', etichetta: 'FreeLLMArena' }], grezzi };
}

if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) {
  const [fileNotizia, out] = process.argv.slice(2);
  const piano = await pianoPer(JSON.parse(fs.readFileSync(fileNotizia, 'utf8')));
  fs.writeFileSync(out, JSON.stringify(piano, null, 1));
  if (piano.problemi.length) console.log(`Problemi del piano:\n- ${piano.problemi.join('\n- ')}`);
  console.log(`Piano ${piano.riserva ? 'DI RISERVA' : `scritto da ${ultimoScrittore || "?"}`}: ${piano.scene.map((s) => s.stampo).join(' → ')}`);
}
