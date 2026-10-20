// Post social in bozza per un video appena pubblicato (automatismo 10, deciso da Marco il 20/10/2026).
// Uso: node script/bozze-social.mjs <tipo>   (tipo = nuovo | settimana; legge video/brag/info-<tipo>.json)
// Apre un'issue «bozza» con il post per X e quello per Reddit; n8n la manda a Marco per mail. Si pubblica a mano.
import fs from 'node:fs';
import path from 'node:path';
import { RADICE, REPO, leggiDati, gratis, postSocial, testoPost, apriIssue } from './bozze.mjs';

const tipo = process.argv[2];
const info = JSON.parse(fs.readFileSync(path.join(RADICE, 'video', 'brag', `info-${tipo}.json`), 'utf8'));
const dati = leggiDati();
const chat = dati.categorie.find((c) => c.id === 'chat');
const contesto = tipo === 'settimana'
  ? `Arena chat ranking, data ${chat.data}. Best paid: ${chat.modelli.find((m) => !gratis(m)).nome} ${chat.modelli.find((m) => !gratis(m)).punti}. Gap between best paid and best free: ${chat.modelli.find((m) => !gratis(m)).punti - chat.modelli.filter(gratis)[0].punti} points. On Arena 10 points is noise and 50 is a clear gap.\nTop free: ${chat.modelli.filter(gratis).slice(0, 5).map((m, i) => `${i + 1}. ${m.nome} (${m.org}) ${m.punti}${m.aperto ? ', open weights' : ''}`).join('; ')}.\n${chat.modelli.filter(gratis).length} free chat models ranked.\n${info.descrizione}`
  : `${info.descrizione}\n${info.condividi}`;
const p = await postSocial({ argomento: info.titolo.replace(/ #Shorts$/, ''), dati: contesto, link: 'https://freellmarena.com' });
const video = `https://github.com/${REPO}/releases/tag/video-${info.nome}`;
await apriIssue(`Post social da approvare: ${info.titolo.replace(/ #Shorts$/, '')}`, `Bozze per il video appena pubblicato su GitHub: ${video} (il file mp4 è lì). **Nulla è stato pubblicato.**

Su X conviene allegare il video al post: dura 20 secondi, oltre la soglia minima per contare come video.

${testoPost(p, contesto)}`, ['bozza', 'social']);
