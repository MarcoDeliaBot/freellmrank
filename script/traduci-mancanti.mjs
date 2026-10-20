// Traduce le frasi nuove del sito (traduzioni/mancanti/<lingua>.json, scritte da script/traduci.mjs) con Workers AI
// attraverso /api/scrivi (segreto BOZZE_KEY, quota gratis del sito, tetto giornaliero) e le aggiunge a traduzioni/<lingua>.json.
// Gira ogni notte in GitHub Actions dopo l'aggiornamento dei dati. Si ferma da solo quando il tetto del giorno è finito:
// quello che resta si traduce la notte dopo. Ogni traduzione deve avere gli stessi segnaposto della frase inglese.
// Uso: BOZZE_KEY=… node script/traduci-mancanti.mjs [--max 10]   (--max = richieste al modello per notte, in tutto)
import fs from 'node:fs';
import path from 'node:path';
import { RADICE } from './sito/comune.mjs';
import { chiediModello } from './bozze.mjs';
import { LINGUE_NOMI } from './traduci-lingue.mjs';

const CARTELLA = path.join(RADICE, 'traduzioni');
const i = process.argv.indexOf('--max');
let richieste = i > 0 ? Number(process.argv[i + 1]) : 10;
const PER_RICHIESTA = 40;
const segni = (s) => (s.match(/\{\d+\}|<\/?\d+\/?>/g) || []).sort().join(' ');

const REGOLE = (nome) => `You translate the website FreeLLMArena (a ranking of AI models you can use for free) from English into ${nome}.
Rules: {0} {1}… stand for numbers or names; <0>…</0> are HTML tags around words; <3/> is a standalone tag. Keep every placeholder exactly once, move them only to fit the grammar, never add new ones.
Keep HTML entities (&amp; &lt; &gt;) as written. Do not translate model names, company and app names, FreeLLMArena, "Arena" as the name of the leaderboard, licence names, units (GB, tok/s, ms) or code. "free" means costs nothing. Short, clear, natural sentences, informal "you".
Page titles ending in " · FreeLLMArena" keep that ending. A string made only of names stays unchanged.
Input: a JSON object {"0": "English", "1": "English", …}. Output: only a JSON object with the same keys and the translations.`;

let aggiunte = 0;
fuori: for (const [l, nome] of Object.entries(LINGUE_NOMI)) {
  const fileM = path.join(CARTELLA, 'mancanti', `${l}.json`);
  if (!fs.existsSync(fileM)) continue;
  const mancanti = JSON.parse(fs.readFileSync(fileM, 'utf8'));
  const fileD = path.join(CARTELLA, `${l}.json`);
  const diz = fs.existsSync(fileD) ? JSON.parse(fs.readFileSync(fileD, 'utf8')) : {};
  const da = mancanti.filter((k) => diz[k] == null);
  for (let a = 0; a < da.length; a += PER_RICHIESTA) {
    if (richieste-- <= 0) break fuori;
    const pacco = da.slice(a, a + PER_RICHIESTA);
    let r;
    try {
      r = await chiediModello([{ role: 'system', content: REGOLE(nome) }, { role: 'user', content: JSON.stringify(Object.fromEntries(pacco.map((k, j) => [j, k]))) }], { json: true, max: 4000 });
    } catch (e) {
      console.log(`${l}: ${e.message}`);
      if (/429|budget/i.test(e.message)) break fuori;
      continue;
    }
    let buone = 0;
    pacco.forEach((k, j) => {
      const t = r?.[j];
      if (typeof t === 'string' && t.trim() && segni(t) === segni(k)) { diz[k] = t; buone++; }
    });
    aggiunte += buone;
    console.log(`${l}: ${buone}/${pacco.length} tradotte`);
    fs.writeFileSync(fileD, JSON.stringify(Object.fromEntries(Object.entries(diz).sort(([x], [y]) => (x < y ? -1 : 1))), null, 1) + '\n');
  }
}
console.log(`Frasi tradotte stanotte: ${aggiunte}`);
