// Controlla un file di traduzioni { "frase inglese": "traduzione" }: segnaposto {0} e <0> </0> <0/> tutti presenti
// e uguali a quelli della frase inglese, nessuna traduzione vuota.
// Uso: node script/controlla-traduzioni.mjs <file.json> [file-delle-frasi-inglesi.json]
import fs from 'node:fs';

const [file, sorgente] = process.argv.slice(2);
const d = JSON.parse(fs.readFileSync(file, 'utf8'));
const attese = sorgente ? JSON.parse(fs.readFileSync(sorgente, 'utf8')) : Object.keys(d);
const segni = (s) => (s.match(/\{\d+\}|<\/?\d+\/?>/g) || []).sort().join(' ');
const errori = [];
for (const k of attese) {
  const t = d[k];
  if (typeof t !== 'string' || !t.trim()) { errori.push(`MANCA: ${k}`); continue; }
  if (segni(t) !== segni(k)) errori.push(`SEGNAPOSTO: ${k}\n  → ${t}`);
}
for (const k of Object.keys(d)) if (sorgente && !attese.includes(k)) errori.push(`IN PIÙ (chiave cambiata?): ${k}`);
console.log(errori.length ? errori.join('\n') : `ok: ${attese.length} frasi`);
process.exit(errori.length ? 1 : 0);
