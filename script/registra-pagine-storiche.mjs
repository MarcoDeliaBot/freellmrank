import fs from 'node:fs';
import { osserva, salva, leggi, emptyArchive, preparaPubblicate, unisciRegistri } from './sito/pagine-pubblicate.mjs';
import { unisci } from './sito/modelli.mjs';
import { preparaConfronti } from './sito/confronti.mjs';
import { preparaBlog } from './sito/blog.mjs';
import { RADICE } from './sito/comune.mjs';

const history = JSON.parse(fs.readFileSync(process.argv[2] || '.ai/pagine-storia.json', 'utf8'));
const registry = [], archive = emptyArchive();
for (const s of history.snapshots) osserva({ registry, archive, modelli: s.models, coppie: s.compare, blog: s.blog, date: s.day, commit: s.commit });
archive.ricostruzione = { ref: history.ref, head: history.head, giorni: Object.keys(history.daily).length, osservazioni: history.snapshots.length, campioniGiornalieri: history.daily };
const merged = unisciRegistri({ registry, archive }, { registry: leggi(RADICE, 'dati/pagine-pubblicate.json', []), archive: leggi(RADICE, 'dati/pagine-archivio.json', emptyArchive()) });
merged.archive.ricostruzione = archive.ricostruzione;
salva(RADICE, 'dati/pagine-pubblicate.json', merged.registry);
salva(RADICE, 'dati/pagine-archivio.json', merged.archive);
const dati = JSON.parse(fs.readFileSync('sito/data.json', 'utf8')), storia = JSON.parse(fs.readFileSync('sito/history.json', 'utf8'));
const modelli = unisci(dati, storia), coppie = preparaConfronti(modelli), blog = preparaBlog(dati, storia, modelli);
const result = preparaPubblicate({ modelli, coppie, blog, date: dati.aggiornato });
console.log(JSON.stringify({ urls: result.registry.length, perTipo: Object.fromEntries(['modello', 'confronto', 'articolo'].map(t => [t, result.registry.filter(p => p.tipo === t).length])), ricostruzione: archive.ricostruzione }, null, 2));
