// Gli stampi dei video (24/10/2026): ogni file .mjs di questa cartella (tranne questo) è uno stampo, caricato da solo.
// Il contratto di uno stampo è in script/video-hf/CONTRATTO.md. Uno stampo rotto non ferma gli altri: resta fuori
// e il piano non lo può scegliere (lo dice il registro della corsa).
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const QUI = path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1'));
const file = fs.readdirSync(QUI).filter((f) => f.endsWith('.mjs') && f !== 'index.mjs').sort();
export const STAMPI = {};
for (const f of file) {
  try {
    const m = (await import(pathToFileURL(path.join(QUI, f)).href)).default;
    if (!m?.nome || typeof m.html !== 'function' || typeof m.parole !== 'function' || typeof m.valida !== 'function') throw new Error('contratto incompleto');
    STAMPI[m.nome] = m;
  } catch (e) { console.error(`Stampo ${f} escluso: ${e.message}`); }
}
// Il pianificatore delle notizie/guide conserva il catalogo che usava prima
// delle nuove sezioni; gli stampi specializzati hanno il gate DOM delle schede.
export const STAMPI_NOTIZIE = Object.fromEntries(Object.entries(STAMPI).filter(([,st]) => !st.soloSkillTutorial));
