// Piano dello Short di una notizia o di una guida (24/10/2026 sera, Marco: «li vorrei tutti così»): verticale, preso dal
// piano del video lungo già controllato. Apertura col titolo, la scena con il dato più forte (un numero se c'è),
// chiusura che rimanda al video lungo sul canale. Stesse voci, quindi stessi fatti: niente Workers AI.
// Uso: node script/video-hf/breve.mjs <piano del video lungo> <piano dello Short>
import fs from 'node:fs';
import path from 'node:path';
import { conFissi } from './fissi.mjs';

const PREFERENZA = ['numero', 'numeri', 'barre', 'nome', 'mappa', 'confronto', 'punti', 'lista', 'titolo'];

export function pianoBreve(lungo) {
  const scene = lungo.scene.filter((s) => s.stampo !== 'chiusura');
  if (!scene.length) return null;
  const apertura = scene[0];
  const altre = scene.slice(1);
  const forte = PREFERENZA.map((st) => altre.find((s) => s.stampo === st)).find(Boolean);
  // 5/11/2026: le scene con le immagini vere della fonte (media-fonte.mjs) vanno anche nello Short: la pagina dopo
  // l'apertura (nella foto stretta, come sul telefono), le immagini dopo la scena forte
  const media = altre.filter((s) => s.media);
  const verticale = (s) => (s.dati?.mediaVerticale
    ? { ...s, dati: { ...s.dati, media: s.dati.mediaVerticale, rapporto: s.dati.rapportoVerticale } }
    : s.stampo === 'immagine' ? { ...s, dati: { ...s.dati, cornice: Math.min(Number(s.dati.rapporto) || 1.78, 1.3) } }
    // nello Short la griglia tiene 2 immagini, una sopra l'altra: con 4 erano piccole e mezza pagina restava vuota
    : s.stampo === 'griglia' ? { ...s, dati: { ...s.dati, immagini: s.dati.immagini.slice(0, 2) } } : s);
  let contenuto = [apertura, ...media.slice(0, 1).map(verticale), ...(forte ? [forte] : []), ...media.slice(1, 2).map(verticale)];
  // 14/11/2026: se il piano lungo porta i testi fissi di una guida (piano.fissi, scritti da piano.mjs), lo Short comincia con
  // l'apertura fissa e dice le frasi obbligatorie dello Short: se la scena scelta non le ha, il codice le mette dopo l'apertura.
  // Le frasi che erano solo del video lungo si tolgono dalla prima scena.
  const f = lungo.fissi;
  if (f) contenuto = conFissi(contenuto, { apertura: f.apertura, obbligatorie: f.obbligatorieBreve, tutte: [...f.obbligatorie, ...f.obbligatorieBreve] }).scene;
  return {
    formato: 'verticale',
    copertina: 0,
    notizia: lungo.notizia,
    scene: [...contenuto, { stampo: 'chiusura', etichetta: 'FreeLLMArena', dati: { invito: 'canale' } }],
  };
}

if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) {
  const [da, a] = process.argv.slice(2);
  const p = pianoBreve(JSON.parse(fs.readFileSync(da, 'utf8')));
  if (!p) { console.error('Piano del video lungo vuoto: nessuno Short'); process.exit(1); }
  fs.writeFileSync(a, JSON.stringify(p, null, 1));
  console.log(`Short: ${p.scene.map((s) => s.stampo).join(' → ')}`);
}
