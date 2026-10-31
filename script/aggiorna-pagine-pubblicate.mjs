// Persist the inventory in the SAME commit as the inputs that create its URLs.
// Recover the monotone union after a workflow rebase, even with -X theirs.
import { unisci } from './sito/modelli.mjs';
import { preparaConfronti } from './sito/confronti.mjs';
import { preparaBlog } from './sito/blog.mjs';
import { publicationRoot, leggi, salva, preparaPubblicate, unisciRegistri, emptyArchive } from './sito/pagine-pubblicate.mjs';
const root = publicationRoot(), backup = '.ai/pagine-commit-backup.json';
if (process.argv.includes('--recupera')) {
  const saved = leggi(root, backup, null);
  if (!saved) throw Error('Missing pre-rebase publication backup');
  const merged = unisciRegistri(saved, { registry: leggi(root, 'dati/pagine-pubblicate.json', []), archive: leggi(root, 'dati/pagine-archivio.json', emptyArchive()) });
  salva(root, 'dati/pagine-pubblicate.json', merged.registry); salva(root, 'dati/pagine-archivio.json', merged.archive);
}
const dati = leggi(root, 'sito/data.json'), storia = leggi(root, 'sito/history.json');
const modelli = unisci(dati, storia), coppie = preparaConfronti(modelli), blog = preparaBlog(dati, storia, modelli);
const result = preparaPubblicate({ root, modelli, coppie, blog, date: dati.aggiornato });
salva(root, backup, { registry: result.registry, archive: result.archive });
console.log(`Persistent inventory: ${result.registry.length} URLs`);
