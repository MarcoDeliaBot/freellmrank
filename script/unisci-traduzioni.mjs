// Unisce i pacchetti tradotti a mano (traduzioni/parti/<lingua>-NN.json) nei dizionari traduzioni/<lingua>.json.
// Uso: node script/unisci-traduzioni.mjs   (le traduzioni con segnaposto sbagliati si scartano e si dicono)
import fs from 'node:fs';
import path from 'node:path';
import { RADICE } from './sito/comune.mjs';
import { LINGUE } from './traduci-lingue.mjs';

const C = path.join(RADICE, 'traduzioni');
const segni = (s) => (s.match(/\{\d+\}|<\/?\d+\/?>/g) || []).sort().join(' ');
// i primi pacchetti nascondevano anche le cifre di &#39; («&#{0};»): si rimette &#39; e si rinumerano gli altri segnaposto
function senzaEntitaNascoste(k, v) {
  for (let m; (m = /&#\{(\d+)\};/.exec(k));) {
    const n = +m[1];
    const via = (s) => s.split(`&#{${n}};`).join('&#39;').replace(/\{(\d+)\}/g, (x, j) => (+j > n ? `{${j - 1}}` : x));
    k = via(k); v = typeof v === 'string' ? via(v) : v;
    // chi traduceva ha usato il segnaposto come virgoletta di chiusura: 'propias&#39; → propias
    if (typeof v === 'string') v = v.replace(/'([^'&<>]+)&#39;/g, '$1').replace(/&#39;([^'&<>’]+)’/g, '‘$1’').replace(/(\p{L})&#39;(?=[\s,.;:)]|$)/gu, '$1');
  }
  return [k, v];
}
const parti = fs.existsSync(path.join(C, 'parti')) ? fs.readdirSync(path.join(C, 'parti')) : [];
for (const l of Object.keys(LINGUE)) {
  const fileD = path.join(C, `${l}.json`);
  const diz = fs.existsSync(fileD) ? JSON.parse(fs.readFileSync(fileD, 'utf8')) : {};
  let n = 0, scartate = 0;
  for (const f of parti.filter((x) => x.startsWith(l + '-') && x.endsWith('.json'))) {
    for (let [k, v] of Object.entries(JSON.parse(fs.readFileSync(path.join(C, 'parti', f), 'utf8')))) {
      [k, v] = senzaEntitaNascoste(k, v);
      if (typeof v === 'string' && v.trim() && segni(v) === segni(k)) { diz[k] = v; n++; } else { scartate++; console.log(`${l} scartata: ${k}`); }
    }
  }
  fs.writeFileSync(fileD, JSON.stringify(Object.fromEntries(Object.entries(diz).sort(([x], [y]) => (x < y ? -1 : 1))), null, 1) + '\n');
  console.log(`${l}: ${n} frasi unite, ${scartate} scartate, dizionario ${Object.keys(diz).length}`);
}
