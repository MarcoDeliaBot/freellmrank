// Aggiunge a contenuti/youtube.json le voci mandate da n8n (31/10/2026).
// Il flusso n8n «video su YouTube Shorts» non scrive più il file da solo: il suo token ha solo il permesso Actions,
// quindi avvia .github/workflows/youtube-link.yml con le voci nuove e il salvataggio lo fa GITHUB_TOKEN.
// Stesso formato di script/youtube-link.mjs: { "<nome del video>": "<id YouTube>" }, rientro di 1 spazio.
// Uso: VOCI='{"<nome del video>":"<id YouTube>"}' node script/youtube-voci.mjs
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const file = new URL('../contenuti/youtube.json', import.meta.url);
const voci = JSON.parse(process.env.VOCI || '{}');
if (!voci || typeof voci !== 'object' || Array.isArray(voci)) throw new Error('VOCI deve essere un oggetto { nome: id }');
const mappa = JSON.parse(fs.readFileSync(file, 'utf8'));
const nuovi = [];
for (const [nome, id] of Object.entries(voci)) {
  if (!/^[a-z0-9][\w.-]*$/i.test(nome) || !/^[\w-]{11}$/.test(String(id))) throw new Error(`Voce non valida: ${nome} → ${id}`);
  if (mappa[nome] !== id) { mappa[nome] = id; nuovi.push(nome); }
}
if (nuovi.length) fs.writeFileSync(file, JSON.stringify(mappa, null, 1) + '\n');
fs.writeFileSync(path.join(process.env.RUNNER_TEMP || os.tmpdir(), 'youtube-nuovi.txt'), nuovi.join(', ').slice(0, 200));
console.log(`youtube.json: ${Object.keys(mappa).length} video, ${nuovi.length} nuovi${nuovi.length ? ': ' + nuovi.join(', ') : ''}`);
