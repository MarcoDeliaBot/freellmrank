// Piano dello Short di una notizia o di una guida (24/10/2026 sera, Marco: «li vorrei tutti così»): verticale, preso dal
// piano del video lungo già controllato. Apertura col titolo, la scena con il dato più forte (un numero se c'è),
// chiusura che rimanda al video lungo sul canale. Stesse voci, quindi stessi fatti: niente Workers AI.
// Uso: node script/video-hf/breve.mjs <piano del video lungo> <piano dello Short>
import fs from 'node:fs';
import path from 'node:path';

const PREFERENZA = ['numero', 'numeri', 'barre', 'nome', 'mappa', 'confronto', 'punti', 'lista', 'titolo'];

export function pianoBreve(lungo) {
  const scene = lungo.scene.filter((s) => s.stampo !== 'chiusura');
  if (!scene.length) return null;
  const apertura = scene[0];
  const altre = scene.slice(1);
  const forte = PREFERENZA.map((st) => altre.find((s) => s.stampo === st)).find(Boolean);
  return {
    formato: 'verticale',
    copertina: 0,
    notizia: lungo.notizia,
    scene: [apertura, ...(forte ? [forte] : []), { stampo: 'chiusura', etichetta: 'FreeLLMArena', dati: { invito: 'canale' } }],
  };
}

if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) {
  const [da, a] = process.argv.slice(2);
  const p = pianoBreve(JSON.parse(fs.readFileSync(da, 'utf8')));
  if (!p) { console.error('Piano del video lungo vuoto: nessuno Short'); process.exit(1); }
  fs.writeFileSync(a, JSON.stringify(p, null, 1));
  console.log(`Short: ${p.scene.map((s) => s.stampo).join(' → ')}`);
}
