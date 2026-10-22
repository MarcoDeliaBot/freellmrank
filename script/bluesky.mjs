// Post su Bluesky per ogni video con il suo post nel blog (deciso da Marco il 22/10/2026: «pubblica in automatico su
// Bluesky»; X e Reddit no, perché X a programma costa e «non paghiamo nulla», Reddit banna l'autopromozione).
// Il testo è il campo «condividi» del video (già passato dal controllo dei fatti in script/video-post.mjs), con il link
// al post del blog e la sua scheda (titolo, descrizione, copertina). Dopo l'invio il .json del video si segna con
// «bluesky» (indirizzo del post), così non si pubblica due volte.
// Uso: node script/bluesky.mjs [--prova]   (--prova: stampa i post senza mandarli)
// Segreti: BLUESKY_HANDLE e BLUESKY_APP_PASSWORD (password per le app, da Impostazioni → Privacy e sicurezza).
import fs from 'node:fs';
import path from 'node:path';
import { RADICE, URL_SITO } from './sito/comune.mjs';

const DIR = path.join(RADICE, 'contenuti', 'video');
const DAL = '2026-10-22'; // i video più vecchi restano solo nel blog: niente raffica di post al primo avvio
const MASSIMO = 3; // post per corsa
const SERVER = 'https://bsky.social/xrpc';
const prova = process.argv.includes('--prova');

// stesso indirizzo che costruisce script/sito/blog.mjs
export const indirizzoPost = (nome) => `${URL_SITO}/blog/video-${nome.replace(/[^a-z0-9-]+/gi, '-').toLowerCase()}`;

// testo del post: «condividi» col link del sito sostituito da quello del post; massimo 300 caratteri (grafemi)
export function testo(info) {
  const link = indirizzoPost(info.nome);
  const base = String(info.condividi || info.titolo).replace(/\s*https?:\/\/\S+\s*$/, '').trim();
  const conta = (s) => [...new Intl.Segmenter('en', { granularity: 'grapheme' }).segment(s)].length;
  let corpo = base;
  while (conta(`${corpo}\n\n${link}`) > 300) corpo = corpo.replace(/\s*\S+$/, '') + '…';
  return { testo: `${corpo}\n\n${link}`, link };
}

// il link come «facet»: Bluesky vuole le posizioni in byte UTF-8
export function facetLink(t, link) {
  const inizio = Buffer.byteLength(t.slice(0, t.lastIndexOf(link)), 'utf8');
  return [{ index: { byteStart: inizio, byteEnd: inizio + Buffer.byteLength(link, 'utf8') }, features: [{ $type: 'app.bsky.richtext.facet#link', uri: link }] }];
}

async function chiama(metodo, corpo, token, tipo = 'application/json') {
  const r = await fetch(`${SERVER}/${metodo}`, {
    method: 'POST',
    headers: { 'Content-Type': tipo, ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: tipo === 'application/json' ? JSON.stringify(corpo) : corpo,
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`${metodo}: ${r.status} ${d.error || ''} ${d.message || ''}`);
  return d;
}

if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) {
  const daFare = fs.readdirSync(DIR).filter((f) => f.endsWith('.json'))
    .map((f) => ({ file: path.join(DIR, f), info: JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8')) }))
    .filter(({ info }) => !info.bluesky && info.pubblicato >= DAL)
    .sort((a, b) => a.info.pubblicato.localeCompare(b.info.pubblicato))
    .slice(0, MASSIMO);
  if (!daFare.length) { console.log('Bluesky: nessun post nuovo'); process.exit(0); }
  const { BLUESKY_HANDLE: handle, BLUESKY_APP_PASSWORD: password } = process.env;
  if (!prova && (!handle || !password)) { console.log('Bluesky: manca BLUESKY_HANDLE o BLUESKY_APP_PASSWORD, nessun post'); process.exit(0); }
  const sessione = prova ? null : await chiama('com.atproto.server.createSession', { identifier: handle, password });
  for (const { file, info } of daFare) {
    const { testo: t, link } = testo(info);
    const record = {
      $type: 'app.bsky.feed.post', text: t, createdAt: new Date().toISOString(), langs: ['en'], facets: facetLink(t, link),
      embed: { $type: 'app.bsky.embed.external', external: { uri: link, title: info.titolo.replace(/ #Shorts$/, ''), description: String(info.descrizione).trim().slice(0, 300) } },
    };
    if (prova) { console.log(`--- ${info.nome}\n${t}\n`); continue; }
    try {
      const copertina = file.replace(/\.json$/, '.jpg');
      if (fs.existsSync(copertina)) record.embed.external.thumb = (await chiama('com.atproto.repo.uploadBlob', fs.readFileSync(copertina), sessione.accessJwt, 'image/jpeg')).blob;
      const fatto = await chiama('com.atproto.repo.createRecord', { repo: sessione.did, collection: 'app.bsky.feed.post', record }, sessione.accessJwt);
      fs.writeFileSync(file, JSON.stringify({ ...info, bluesky: fatto.uri }, null, 1) + '\n');
      console.log(`Bluesky: pubblicato ${info.nome} (${fatto.uri})`);
    } catch (e) {
      // un post che non parte non ferma gli altri né il resto della corsa
      console.error(`Bluesky: ${info.nome} non pubblicato: ${e.message}`);
    }
  }
}
