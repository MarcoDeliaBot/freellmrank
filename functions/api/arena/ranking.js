// GET /api/arena/ranking  →  {voti, soglia, modelli: [{id, punteggio, ic, voti, vinte, perse, pari}], aggiornato}
// Classifica di Free Arena da tutti i voti salvati (Bradley-Terry, sorgente/bt.mjs).
// Il database dà solo i conteggi raggruppati, così il calcolo resta piccolo; la risposta resta in cache 5 minuti.
import { classifica } from '../../../sorgente/bt.mjs';
import { json } from '../../../script/arena-comune.mjs';

export const SOGLIA = 300; // sotto questo numero di voti un modello è "collecting votes", non in classifica

export async function onRequestGet({ request, env, waitUntil }) {
  if (!env.ARENA) return json({ errore: 'Free Arena is not set up yet.' }, 503);
  const cache = caches.default;
  const chiave = new Request(new URL('/api/arena/ranking', request.url).toString());
  const salvata = await cache.match(chiave);
  if (salvata) return salvata;

  const { results } = await env.ARENA.prepare('SELECT a, b, esito, COUNT(*) AS n FROM voti GROUP BY a, b, esito').all();
  const modelli = classifica(results || []);
  const totale = (results || []).reduce((s, r) => s + Number(r.n), 0);
  const risposta = new Response(JSON.stringify({ voti: totale, soglia: SOGLIA, modelli, aggiornato: new Date().toISOString() }), {
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=300' },
  });
  waitUntil(cache.put(chiave, risposta.clone()));
  return risposta;
}
