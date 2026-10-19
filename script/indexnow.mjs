// Avvisa Bing, Yandex e gli altri motori IndexNow che le pagine sono cambiate.
// Legge la sitemap pubblicata (quindi va lanciato dopo che Cloudflare ha ripubblicato).
// Uso: node script/indexnow.mjs
import { URL_SITO } from './sito/comune.mjs';

const CHIAVE = '1948cb022b449cb0c0a32192d4d2ef89'; // è pubblica: sta anche in sorgente/<chiave>.txt
const host = new URL(URL_SITO).host;

const xml = await (await fetch(`${URL_SITO}/sitemap.xml`)).text();
const urlList = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
if (!urlList.length) throw new Error('sitemap vuota o non raggiungibile');

const r = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ host, key: CHIAVE, keyLocation: `${URL_SITO}/${CHIAVE}.txt`, urlList }),
});
console.log(`IndexNow: ${urlList.length} pagine, risposta ${r.status}`);
// 200 e 202 sono buoni; 403 = chiave non trovata sul sito; 422 = URL di un altro dominio
if (r.status !== 200 && r.status !== 202) process.exit(1);
