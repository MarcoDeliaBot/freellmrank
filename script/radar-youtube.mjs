// Radar settimanale della nicchia su YouTube (Marco, 25/10/2026: «prepara il radar settimanale dei video che vanno meglio
// nella nicchia»). Un canale nuovo viene proposto da YouTube in base all'argomento: ogni settimana si guarda quali video dei
// canali vicini fanno più visite del solito, per scegliere i temi dei prossimi video.
// Gratis e senza chiave: legge il feed pubblico di ogni canale (feeds/videos.xml, ultimi 15 video con le visualizzazioni).
// Punteggio = visualizzazioni / mediana del canale per lo stesso formato (Short o lungo). Si contano solo i video con almeno
// 2 giorni, perché un video di poche ore ha sempre poche visite.
// Uso: node script/radar-youtube.mjs  →  .ai/radar/AAAA-MM-GG.md e .json

import { readFile, writeFile, mkdir } from 'node:fs/promises';

const CANALI = 'dati/radar-canali.json';
const ID = 'dati/radar-id.json'; // @handle → UC…, per non rileggere la pagina del canale ogni settimana
const GIORNO = 86400000;
const ETA_MIN = 2, ETA_MAX = 14; // giorni
const SOGLIA = 2; // almeno il doppio della mediana del canale
const UA = { 'User-Agent': 'Mozilla/5.0', Cookie: 'SOCS=CAI; CONSENT=YES+1' }; // senza cookie YouTube rimanda al consenso UE

const leggi = async (f, vuoto) => { try { return JSON.parse(await readFile(f, 'utf8')); } catch { return vuoto; } };
const mediana = (a) => { const s = [...a].sort((x, y) => x - y); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const testo = (s) => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');

async function idDi(handle) {
  const r = await fetch(`https://www.youtube.com/@${handle}`, { headers: UA });
  if (!r.ok) return null;
  return (await r.text()).match(/"externalId":"(UC[\w-]{22})"/)?.[1] || null;
}

async function feed(id) {
  const r = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${id}`);
  if (!r.ok) throw new Error(`feed ${r.status}`);
  const x = await r.text();
  const nome = testo(x.match(/<title>([^<]*)<\/title>/)?.[1] || id);
  const video = [...x.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map(([, e]) => ({
    id: e.match(/<yt:videoId>([^<]+)/)[1],
    titolo: testo(e.match(/<title>([^<]*)<\/title>/)?.[1] || ''),
    short: /youtube\.com\/shorts\//.test(e),
    data: new Date(e.match(/<published>([^<]+)/)[1]),
    visite: Number(e.match(/<media:statistics views="(\d+)"/)?.[1] || 0),
    mi_piace: Number(e.match(/<media:starRating count="(\d+)"/)?.[1] || 0),
  }));
  return { nome, video };
}

const { canali } = await leggi(CANALI, { canali: [] });
const ids = await leggi(ID, {});
const ora = Date.now();
const trovati = [], saltati = [], letti = [];

for (const h of canali) {
  try {
    ids[h] ||= await idDi(h);
    if (!ids[h]) { saltati.push(`@${h}: canale non trovato`); delete ids[h]; continue; }
    const { nome, video } = await feed(ids[h]);
    letti.push(nome);
    for (const formato of [true, false]) {
      const maturi = video.filter((v) => v.short === formato && (ora - v.data) / GIORNO >= ETA_MIN);
      if (maturi.length < 3) continue; // con meno di 3 video la mediana non dice niente
      const med = mediana(maturi.map((v) => v.visite)) || 1;
      for (const v of maturi) {
        const eta = (ora - v.data) / GIORNO;
        const volte = v.visite / med;
        if (eta <= ETA_MAX && volte >= SOGLIA) trovati.push({ ...v, canale: nome, handle: h, mediana: Math.round(med), volte: +volte.toFixed(1), giorni: Math.floor(eta) });
      }
    }
  } catch (e) { saltati.push(`@${h}: ${e.message}`); }
}

trovati.sort((a, b) => b.volte - a.volte);
const oggi = new Date(ora).toISOString().slice(0, 10);
const n = (x) => x.toLocaleString('it-IT');
const cella = (s) => s.replace(/\|/g, '/'); // un «|» nel titolo o nel nome del canale spezza la tabella
const riga = (v) => `| ${v.volte}× | ${v.short ? 'Short' : 'lungo'} | [${cella(v.titolo)}](https://youtu.be/${v.id}) | ${cella(v.canale)} | ${n(v.visite)} (mediana ${n(v.mediana)}) | ${v.giorni} g |`;
const md = [
  `# Radar YouTube · ${oggi}`,
  '',
  `Video degli ultimi ${ETA_MAX} giorni con almeno ${SOGLIA} volte le visite solite del loro canale (stesso formato).`,
  `Canali letti: ${letti.length} su ${canali.length}. Video sopra soglia: ${trovati.length}.`,
  '',
  '| Volte | Formato | Video | Canale | Visite | Età |',
  '|---|---|---|---|---|---|',
  ...trovati.map(riga),
  '',
  saltati.length ? `Saltati: ${saltati.join('; ')}.` : 'Nessun canale saltato.',
  '',
].join('\n');

await mkdir('.ai/radar', { recursive: true });
await writeFile(`.ai/radar/${oggi}.md`, md);
await writeFile(`.ai/radar/${oggi}.json`, JSON.stringify({ data: oggi, letti, saltati, trovati }, null, 2) + '\n');
await writeFile(ID, JSON.stringify(ids, null, 2) + '\n');
console.log(`radar: ${letti.length}/${canali.length} canali, ${trovati.length} video sopra soglia → .ai/radar/${oggi}.md`);
if (saltati.length) console.log('saltati:', saltati.join('; '));
