// Il piano di un video a stampi (24/10/2026, Marco: video come la prova DeepInfer, fatti ogni giorno da n8n senza Claude).
// Workers AI (gratis, quota del sito, uso «video») legge la notizia già verificata e sceglie stampi, testi e voce.
// Poi il controllo in codice: ogni numero e ogni nome della voce e dello schermo deve stare nella notizia; ogni stampo
// controlla le sue lunghezze. Una scena che non regge si toglie; se il piano non regge, piano di riserva costruito
// in codice con le frasi della notizia lette parola per parola.
// Uso: BOZZE_KEY=… node script/video-hf/piano.mjs <notizia.json> <piano.json>
import fs from 'node:fs';
import path from 'node:path';
import { STAMPI } from './stampi/index.mjs';
import { chiediModello } from '../bozze.mjs';
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

export function controllaPiano(grezzo, n) {
  const { regge, mancanti } = controllore(n);
  const problemi = [];
  const scene = [];
  for (const [i, sc] of (Array.isArray(grezzo?.scene) ? grezzo.scene : []).entries()) {
    const st = STAMPI[sc?.stampo];
    const dove = `scena ${i + 1} (${sc?.stampo})`;
    if (!st || sc.stampo === 'chiusura') { problemi.push(`${dove}: stampo non valido`); continue; }
    const voce = semplice(sc.voce);
    const dati = sc.dati && typeof sc.dati === 'object' ? sc.dati : {};
    const p = [
      ...(parole(voce) < 6 || parole(voce) > 70 ? ['voce troppo corta o troppo lunga'] : []),
      ...(regge(voce) ? [] : [`voce con numeri o nomi non nella notizia (${mancanti(voce).join(', ')})`]),
      ...testi(dati).filter((t) => !regge(semplice(t))).map((t) => `testo non nella notizia: «${t}» (${mancanti(semplice(t)).join(', ')})`),
      ...st.valida(dati),
    ];
    if (p.length) { problemi.push(`${dove}: ${p.join('; ')}`); continue; }
    scene.push({ stampo: sc.stampo, etichetta: semplice(sc.etichetta).slice(0, 24), voce, dati });
  }
  const totale = scene.reduce((s, x) => s + parole(x.voce), 0);
  const ok = scene.length >= 3 && scene[0].stampo === 'titolo' && totale >= 70 && totale <= 230;
  if (!ok) problemi.push(`piano scartato: ${scene.length} scene buone, prima «${scene[0]?.stampo}», ${totale} parole`);
  return { ok, scene, problemi };
}

// riserva: titolo con il riassunto, poi un «punti» per paragrafo con le frasi brevi del paragrafo, voce = il paragrafo
export function pianoDiRiserva(n) {
  const guida = n.tipo === 'guida';
  const etichette = guida ? ['Step by step', 'The details', 'Why it matters', 'What it means'] : ['What happened', 'The details', 'Why it matters', 'What it means'];
  const tipo = guida ? 'Guide' : 'AI news';
  const scene = [{ stampo: 'titolo', etichetta: tipo, voce: semplice(n.descr), dati: { testo: titoloCorto(semplice(n.titolo)), sopra: `${tipo} · ${giorno(n.pubblicato)}` } }];
  const blocchi = [...(n.paragrafi || []), ...((n.perche || []).length ? [(n.perche || []).join(' ')] : [])].slice(0, 4);
  for (const [i, p] of blocchi.entries()) {
    const pezzi = frasi(p).flatMap((f) => f.length <= 60 ? [f] : f.split(/,\s|;\s/)).map((x) => x.replace(/[.,;]$/, '').trim()).filter((x) => x.length >= 12 && x.length <= 60);
    const titolo = (n.titoliSezioni || [])[i] || etichette[Math.min(i, etichette.length - 1)];
    const dati = pezzi.length >= 2 ? { titolo, punti: pezzi.slice(0, 4) } : null;
    if (dati && STAMPI.punti && !STAMPI.punti.valida(dati).length) scene.push({ stampo: 'punti', etichetta: titolo, voce: semplice(p), dati });
    // nessuna frase breve: a schermo solo il nome della parte (una frase tagliata potrebbe cambiare il senso)
    else scene.push({ stampo: 'titolo', etichetta: titolo, voce: semplice(p), dati: { testo: titolo, sopra: guida ? 'Guide' : 'AI news' } });
  }
  return scene;
}

export async function pianoPer(n) {
  const elenco = Object.values(STAMPI).filter((s) => s.nome !== 'chiusura').map((s) => `- "${s.nome}": ${s.descrizione}\n  dati: ${s.schema}`).join('\n');
  let grezzo = null, problemi = [];
  try {
    grezzo = await chiediModello([
      { role: 'system', content: `You plan a 60-90 second YouTube ${n.tipo === 'guida' ? 'guide' : 'news'} video for FreeLLMArena, built from ready-made animated scenes ("stampi").
Use ONLY facts, numbers and names from ARTICLE. Never add a number, name, date or claim that is not in ARTICLE. Performance claims are the company's own: say "X reports" or "according to X". No hype words, no emojis, no questions to the viewer.
Available stampi:
${elenco}
Rules:
- 4 to 6 scenes. The first scene is always "titolo". Do NOT add a closing scene (it is added automatically).
- Use "numero", "numeri", "lista" or "confronto" only when ARTICLE really has that kind of content; otherwise "punti".
- "voce" is what the narrator says during the scene: 1 to 3 short spoken sentences (6 to 60 words), plain English, numbers written as digits. All scenes together: 110 to 190 words.
- Everything shown on screen ("dati") must also be said in that scene's "voce", in the same order.
- "quando" (optional, inside dati): for each piece, the exact word of "voce" at which it should appear, e.g. {"etichetta": "day"}.
- "etichetta": a 1-3 word label for the scene, shown small at the top (e.g. "The number", "What's inside").
Return JSON: {"scene": [{"stampo": "...", "etichetta": "...", "voce": "...", "dati": {...}}]}` },
      { role: 'user', content: `ARTICLE:\nTitle: ${semplice(n.titolo)}\nDate: ${giorno(n.pubblicato)}\nSummary: ${semplice(n.descr)}\n${(n.paragrafi || []).map((p, i) => `Paragraph ${i + 1}: ${semplice(p)}`).join('\n')}\nWhy it matters: ${(n.perche || []).map(semplice).join(' ')}\nSources: ${(n.fonti || []).map((f) => f.nome).join(', ')}` },
    ], { json: true, max: 2200, scopo: 'video' });
  } catch (e) { problemi.push(`Workers AI non ha risposto: ${e.message}`); }
  const c = grezzo ? controllaPiano(grezzo, n) : { ok: false, scene: [], problemi: [] };
  problemi = [...problemi, ...c.problemi];
  const scene = c.ok ? c.scene : pianoDiRiserva(n);
  const copertina = Math.max(0, scene.findIndex((s) => s.stampo === 'numero' || s.stampo === 'numeri'));
  return { notizia: n.nome, riserva: !c.ok, problemi, copertina, scene: [...scene, { stampo: 'chiusura', etichetta: 'FreeLLMArena' }] };
}

if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) {
  const [fileNotizia, out] = process.argv.slice(2);
  const piano = await pianoPer(JSON.parse(fs.readFileSync(fileNotizia, 'utf8')));
  fs.writeFileSync(out, JSON.stringify(piano, null, 1));
  if (piano.problemi.length) console.log(`Problemi del piano:\n- ${piano.problemi.join('\n- ')}`);
  console.log(`Piano ${piano.riserva ? 'DI RISERVA' : 'di Workers AI'}: ${piano.scene.map((s) => s.stampo).join(' → ')}`);
}
