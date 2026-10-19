// POST /api/arena/vote  {biglietto, esito}  →  {a, b, contato}
// Salva il voto (solo chi era A, chi era B, chi ha vinto) e rivela i nomi dei due modelli.
// Un solo voto per duello; un voto dato prima di poter leggere le risposte non entra in classifica.
import { SECONDI_MINIMI } from '../../../script/cf-modelli.mjs';
import { json, ORIGINI, verifica } from '../../../script/arena-comune.mjs';

const ESITI = ['a', 'b', 'pari', 'male'];
const SCADENZA_MS = 2 * 60 * 60 * 1000; // un duello si vota entro due ore

export async function onRequestPost({ request, env }) {
  const origine = request.headers.get('Origin');
  if (origine && !ORIGINI.includes(origine)) return json({ errore: 'Not allowed.' }, 403);
  if (!env.ARENA) return json({ errore: 'Free Arena is not set up yet.' }, 503);

  let corpo;
  try { corpo = await request.json(); } catch { return json({ errore: 'Bad request.' }, 400); }
  const esito = corpo?.esito;
  if (!ESITI.includes(esito)) return json({ errore: 'Pick one of the four buttons.' }, 400);
  const d = await verifica(corpo?.biglietto, env.SALE);
  if (!d) return json({ errore: 'This duel is not valid. Start a new one.' }, 400);
  const passati = (Date.now() - d.t) / 1000;
  if (passati * 1000 > SCADENZA_MS) return json({ errore: 'This duel is too old. Start a new one.' }, 400);

  // i nomi si rivelano sempre; il voto conta solo se c'è stato il tempo di leggere
  const contato = passati >= SECONDI_MINIMI;
  if (contato) {
    const r = await env.ARENA.prepare('INSERT OR IGNORE INTO voti (duello, giorno, a, b, esito, categoria, lingua, secondi, creato) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(d.id, d.g, d.a, d.b, esito, d.cat, d.lang, Math.round(passati * 10) / 10, new Date().toISOString()).run();
    if (!r?.meta?.changes) return json({ a: d.a, b: d.b, contato: false, nota: 'You already voted on this duel.' });
  }
  return json({ a: d.a, b: d.b, contato, nota: contato ? '' : 'Your vote came before you could read both answers, so it is not counted.' });
}

export const onRequestGet = () => json({ errore: 'Use POST.' }, 405);
