// Indirizzi YouTube dei video già caricati sul canale, per i player del blog (24/10/2026).
// Legge video/pubblicati/LINK.md (righe «<nome> → https://youtu.be/<id>» o «…/shorts/<id>», scritte dalla pubblicazione
// in Chrome) e aggiorna contenuti/youtube.json ({ "<nome del video>": "<id YouTube>" }), che va nel repository.
// Uso: node script/youtube-link.mjs
import fs from 'node:fs';
import path from 'node:path';
import { RADICE } from './sito/comune.mjs';

const fileLink = path.join(RADICE, 'video', 'pubblicati', 'LINK.md');
const fileOut = path.join(RADICE, 'contenuti', 'youtube.json');
const uscita = fs.existsSync(fileOut) ? JSON.parse(fs.readFileSync(fileOut, 'utf8')) : {};
let nuovi = 0;
for (const riga of fs.existsSync(fileLink) ? fs.readFileSync(fileLink, 'utf8').split(/\r?\n/) : []) {
  const m = /^[-*\s]*([a-z0-9][\w.-]*)\s*→\s*https?:\/\/(?:youtu\.be\/|(?:www\.)?youtube\.com\/(?:shorts\/|watch\?v=))([\w-]{11})/i.exec(riga);
  if (m && uscita[m[1]] !== m[2]) { uscita[m[1]] = m[2]; nuovi++; }
}
fs.writeFileSync(fileOut, JSON.stringify(uscita, null, 1) + '\n');
console.log(`youtube.json: ${Object.keys(uscita).length} video, ${nuovi} nuovi`);
