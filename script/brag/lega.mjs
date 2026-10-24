// Lega un post del blog (notizia o guida) ai suoi video: scrive in contenuti/legami-video.json
// { "<slug del post>": { "lungo": "<nome del video lungo>", "breve": "<nome dello Short>" } }.
// script/sito/blog.mjs mette il video in cima al post (24/10/2026).
// Uso: node script/brag/lega.mjs <slug del post> <nome del video lungo> [<nome dello Short>]
import fs from 'node:fs';
import path from 'node:path';
import { RADICE } from '../sito/comune.mjs';

const [slug, lungo, breve] = process.argv.slice(2);
if (!slug || !lungo) { console.error('Uso: node script/brag/lega.mjs <slug> <lungo> [<breve>]'); process.exit(1); }
const file = path.join(RADICE, 'contenuti', 'legami-video.json');
const legami = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
legami[slug] = { lungo, ...(breve ? { breve } : {}) };
fs.writeFileSync(file, JSON.stringify(legami, null, 1) + '\n');
console.log(`Legato ${slug} -> ${lungo}${breve ? ` + ${breve}` : ''}`);
