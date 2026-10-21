// Post del blog per ogni video (deciso da Marco il 22/10/2026: «ogni video deve avere il suo post», pubblicato da solo
// «purché ogni numero venga dai dati e ci sia il controllo dei fatti»).
// Copia in contenuti/video/ il .json del video (titolo, descrizione, testo della voce) e la copertina; il blog
// (script/sito/blog.mjs) ne fa la pagina. Prima controlla i fatti: ogni numero detto dalla voce o scritto nella
// descrizione deve comparire nelle scene del video, che sono costruite dai dati del sito. Se un numero non torna,
// il post NON si scrive e lo script esce con errore (il video resta su GitHub).
// Uso: node script/video-post.mjs <info.json> <copertina.jpg> <scena.html> [release]
import fs from 'node:fs';
import path from 'node:path';
import { RADICE } from './sito/comune.mjs';

// numeri di un testo, normalizzati: «1,443» e «1443» sono lo stesso numero; «4-bit» dà 4
export const numeri = (testo) => new Set((String(testo).replace(/<[^>]+>/g, ' ').match(/\d[\d,.]*\d|\d/g) || []).map((n) => n.replace(/,(?=\d{3}\b)/g, '').replace(/\.$/, '')));

// numeri del testo che non compaiono in nessuna fonte
export function numeriSenzaFonte(testo, fonti) {
  const visti = new Set();
  for (const f of fonti) for (const n of numeri(f)) visti.add(n);
  return [...numeri(testo)].filter((n) => !visti.has(n));
}

if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) {
  const [fileInfo, copertina, scena, release] = process.argv.slice(2);
  const info = JSON.parse(fs.readFileSync(fileInfo, 'utf8'));
  const html = fs.readFileSync(scena, 'utf8');
  // le scene: il testo visibile (senza stile e codice) più i contatori animati, che nel file partono da 0 (data-conta)
  const visibile = html.replace(/<style[\s\S]*?<\/style>|<script[\s\S]*?<\/script>/g, ' ').replace(/<[^>]+>/g, ' ');
  const contatori = [...html.matchAll(/data-conta="(\d+)"/g)].map((m) => m[1]).join(' ');
  // la voce legge le schede a coppie («RTX 40 60» = RTX 4060); i numeri degli elenchi («1. …») non sono dati
  const voce = info.scene.map((s) => s.voce).join(' ').replace(/\b(RTX|GTX) (\d\d) (\d\d)\b/g, '$1 $2$3');
  const descrizione = info.descrizione.replace(/^\s*\d+\.\s/gm, '');
  // le date si scrivono in parole nella voce («20 October 2026»): valgono come fonte anche la data dei dati e i nomi dei modelli
  const dati = JSON.parse(fs.readFileSync(path.join(RADICE, 'sito', 'data.json'), 'utf8'));
  const fonti = [visibile, contatori, info.nome, JSON.stringify(dati.aggiornato), info.titolo];
  const senza = numeriSenzaFonte(`${voce}\n${descrizione}`, fonti);
  if (senza.length) {
    console.error(`Controllo dei fatti NON superato per ${info.nome}: numeri senza fonte nelle scene: ${senza.join(', ')}`);
    process.exit(1);
  }
  const dir = path.join(RADICE, 'contenuti', 'video');
  fs.mkdirSync(dir, { recursive: true });
  const { scene, ...resto } = info;
  fs.writeFileSync(path.join(dir, `${info.nome}.json`), JSON.stringify({ ...resto, voce: scene.map((s) => s.voce), release: release || `video-${info.nome}`, pubblicato: dati.aggiornato }, null, 1) + '\n');
  fs.copyFileSync(copertina, path.join(dir, `${info.nome}.jpg`));
  console.log(`Post del video pronto: contenuti/video/${info.nome}.json`);
}
