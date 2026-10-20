// Controllo del sito online ogni giorno (automatismo 11, deciso da Marco il 20/10/2026).
// Apre ogni pagina della sitemap, prova le API senza consumare quota né scrivere dati, controlla che i dati siano freschi
// e che l'aggiornamento notturno sia andato. Se qualcosa non va apre un'issue «salute» (n8n la manda per mail) ed esce con 1.
// Uso: node script/controlla-salute.mjs [--prova]   (--prova: stampa e basta, niente issue)
import { REPO, apriIssue } from './bozze.mjs';

const SITO = 'https://freellmarena.com';
const PROVA = process.argv.includes('--prova');
const problemi = [];
const prendi = (url, opz = {}) => fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(20000), headers: { 'User-Agent': 'freellmarena-salute' }, ...opz });

// 1. tutte le pagine della sitemap
const sitemap = await (await prendi(`${SITO}/sitemap.xml`)).text();
const pagine = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
if (pagine.length < 100) problemi.push(`La sitemap ha solo ${pagine.length} pagine.`);
const rotte = [];
for (let i = 0; i < pagine.length; i += 8) {
  await Promise.all(pagine.slice(i, i + 8).map(async (u) => {
    try { const r = await prendi(u); if (r.status !== 200) rotte.push(`${u} → ${r.status}`); await r.arrayBuffer(); } catch (e) { rotte.push(`${u} → ${e.name}`); }
  }));
}
if (rotte.length) problemi.push(`${rotte.length} pagine non rispondono:\n${rotte.slice(0, 20).map((x) => `- ${x}`).join('\n')}`);

// 2. dati freschi e aggiornamento notturno
const dati = await (await prendi(`${SITO}/data.json`)).json().catch(() => null);
if (!dati) problemi.push('data.json non si legge.');
else {
  const giorni = (Date.now() - Date.parse(dati.aggiornato)) / 864e5;
  if (giorni > 2.5) problemi.push(`I dati del sito sono fermi al ${dati.aggiornato} (${Math.floor(giorni)} giorni).`);
}
try {
  const r = await (await prendi(`https://api.github.com/repos/${REPO}/actions/workflows/aggiorna-dati.yml/runs?per_page=4`, { headers: { Accept: 'application/vnd.github+json', ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}) } })).json();
  const ultima = r.workflow_runs?.find((x) => x.status === 'completed');
  if (ultima && ultima.conclusion !== 'success') problemi.push(`L'ultimo aggiornamento dati è finito con «${ultima.conclusion}»: ${ultima.html_url}`);
  if (ultima && (Date.now() - Date.parse(ultima.created_at)) / 36e5 > 30) problemi.push(`L'aggiornamento dati non parte da ${Math.round((Date.now() - Date.parse(ultima.created_at)) / 36e5)} ore (manca il GITHUB_TOKEN sul Worker sveglia?).`);
} catch (e) { problemi.push(`Non riesco a leggere le corse di GitHub: ${e.message}`); }

// 3. le API rispondono (richieste sbagliate apposta: nessuna quota usata, niente salvato)
const api = [
  ['GET', '/api/arena/ranking', null, 200],
  ['POST', '/api/try', {}, 400],
  ['POST', '/api/audio', {}, 400],
  ['POST', '/api/arena/vote', {}, 400],
  ['POST', '/api/report', {}, 400],
];
for (const [metodo, p, corpo, atteso] of api) {
  try {
    const r = await prendi(`${SITO}${p}`, { method: metodo, headers: { 'Content-Type': 'application/json', Origin: SITO }, body: corpo ? JSON.stringify(corpo) : undefined });
    if (r.status !== atteso) problemi.push(`${metodo} ${p} risponde ${r.status} invece di ${atteso}: ${(await r.text()).slice(0, 120)}`);
  } catch (e) { problemi.push(`${metodo} ${p}: ${e.name}`); }
}

console.log(`Pagine controllate: ${pagine.length}. Problemi: ${problemi.length}`);
for (const p of problemi) console.log('-', p);
if (problemi.length && !PROVA) {
  const giorno = new Date().toISOString().slice(0, 10);
  await apriIssue(`Sito: ${problemi.length} problem${problemi.length === 1 ? 'a' : 'i'} il ${giorno}`, `Controllo automatico del ${giorno} su ${pagine.length} pagine.\n\n${problemi.map((p) => `- ${p}`).join('\n')}\n\nScrivi a Claude «controlla il sito» con questo elenco.`, ['salute']);
}
process.exit(problemi.length ? 1 : 0);
