// Controllo di un piano scritto in codice dai generatori (genera.mjs, lungo.mjs, modello.mjs, breve.mjs): ogni scena
// deve avere uno stampo esistente e dati validi per quello stampo. Le scene che non vanno si tolgono (dal registro si vede
// quali e perché); se restano meno di 2 scene oltre la chiusura il piano non si usa (esce con 1: il video si fa alla vecchia).
// Uso: node script/video-hf/controlla.mjs <piano.json>   (riscrive il file senza le scene tolte)
import fs from 'node:fs';
import { STAMPI } from './stampi/index.mjs';

const file = process.argv[2];
const piano = JSON.parse(fs.readFileSync(file, 'utf8'));
const tenute = [];
for (const [i, sc] of (piano.scene || []).entries()) {
  const st = STAMPI[sc.stampo];
  const problemi = !st ? ['stampo inesistente'] : [...st.valida(sc.dati || {}, piano.formato === 'verticale' ? 'verticale' : 'orizzontale'), ...(!st.voceFissa && !String(sc.voce || '').trim() ? ['voce vuota'] : [])];
  if (problemi.length) console.log(`Scena ${i + 1} (${sc.stampo}) tolta: ${problemi.join('; ')}`);
  else tenute.push(sc);
}
const contenuto = tenute.filter((s) => s.stampo !== 'chiusura').length;
if (contenuto < 2) { console.error(`Piano non usabile: ${contenuto} scene buone`); process.exit(1); }
if (tenute.at(-1)?.stampo !== 'chiusura') tenute.push({ stampo: 'chiusura', etichetta: 'FreeLLMArena', dati: piano.formato === 'verticale' ? { invito: 'bio' } : {} });
piano.scene = tenute;
piano.copertina = Math.min(piano.copertina ?? 0, tenute.length - 2);
fs.writeFileSync(file, JSON.stringify(piano, null, 1));
console.log(`Piano ok: ${tenute.map((s) => s.stampo).join(' → ')}`);
