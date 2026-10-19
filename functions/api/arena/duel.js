// POST /api/arena/duel  {domanda, categoria}  →  {a, b, biglietto, rimasti}
// Due modelli gratis a caso rispondono alla stessa domanda; i nomi restano nel biglietto firmato.
// Tetti: 5.000 neurons al giorno per tutta l'arena, 10 duelli al giorno per visitatore.
// Legami del progetto Pages: AI (Workers AI), ARENA (D1), SALE (segreto), TURNSTILE_SECRET (facoltativo).
import { CF_MODELLI, ARENA_MODELLI, ARENA_CATEGORIE, TETTO_ARENA, DUELLI_PER_VISITATORE, LUNGHEZZA_DOMANDA, peggioreNeurons } from '../../../script/cf-modelli.mjs';
import { json, ORIGINI, oggi, firma, impronta, leggiContatore, aggiungi, pulisci, chiedi } from '../../../script/arena-comune.mjs';

const MODELLI = ARENA_MODELLI.map((id) => CF_MODELLI.find((m) => m.id === id)).filter(Boolean);

export async function onRequestPost({ request, env }) {
  const origine = request.headers.get('Origin');
  if (origine && !ORIGINI.includes(origine)) return json({ errore: 'Not allowed.' }, 403);
  if (!env.AI || !env.ARENA) return json({ errore: 'Free Arena is not set up yet.' }, 503);

  let corpo;
  try { corpo = await request.json(); } catch { return json({ errore: 'Bad request.' }, 400); }
  const domanda = String(corpo?.domanda || '').trim();
  const categoria = ARENA_CATEGORIE.includes(corpo?.categoria) ? corpo.categoria : 'chat';
  const lingua = /^[a-z]{2}$/.test(corpo?.lingua || '') ? corpo.lingua : 'xx';
  if (domanda.length < 3) return json({ errore: 'Write a question first.' }, 400);
  if (domanda.length > LUNGHEZZA_DOMANDA) return json({ errore: `Keep the question under ${LUNGHEZZA_DOMANDA} characters.` }, 400);

  // controllo anti-bot di Cloudflare, se è stato configurato
  if (env.TURNSTILE_SECRET) {
    const v = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST', body: new URLSearchParams({ secret: env.TURNSTILE_SECRET, response: String(corpo?.turnstile || ''), remoteip: request.headers.get('CF-Connecting-IP') || '' }),
    }).then((r) => r.json()).catch(() => ({}));
    if (!v.success) return json({ errore: 'Please confirm you are a person (the check below the box), then try again.' }, 403);
  }

  const giorno = oggi();
  const db = env.ARENA;
  const chiaveIp = `arena-ip:${giorno}:${await impronta(request.headers.get('CF-Connecting-IP') || 'x', giorno, env.SALE || '')}`;
  const chiaveSpesa = `arena-spesa:${giorno}`;
  const [usati, spesa] = await Promise.all([leggiContatore(db, chiaveIp), leggiContatore(db, chiaveSpesa)]);
  if (usati >= DUELLI_PER_VISITATORE) return json({ errore: `You used your ${DUELLI_PER_VISITATORE} free duels for today. Come back tomorrow.`, rimasti: 0 }, 429);

  // due modelli diversi a caso; a sinistra o a destra a caso
  const i = Math.floor(Math.random() * MODELLI.length);
  let j = Math.floor(Math.random() * (MODELLI.length - 1));
  if (j >= i) j++;
  const [ma, mb] = [MODELLI[i], MODELLI[j]];
  const peggiore = peggioreNeurons(ma, domanda.length) + peggioreNeurons(mb, domanda.length);
  if (spesa + peggiore > TETTO_ARENA) return json({ errore: 'Today’s free duels are finished for everyone. They come back at midnight UTC.', rimasti: 0 }, 429);

  // prima si conta il duello, poi si chiamano i modelli
  await aggiungi(db, chiaveIp, 1, giorno);
  let ra, rb;
  try {
    [ra, rb] = await Promise.all([chiedi(env.AI, ma, domanda), chiedi(env.AI, mb, domanda)]);
  } catch {
    await aggiungi(db, chiaveSpesa, peggiore, giorno);
    return json({ errore: 'One of the models did not answer. Try again in a minute.' }, 502);
  }
  await aggiungi(db, chiaveSpesa, (ra.neurons ?? peggioreNeurons(ma, domanda.length)) + (rb.neurons ?? peggioreNeurons(mb, domanda.length)), giorno);
  if (Math.random() < 0.05) await pulisci(db, giorno); // ogni tanto via i contatori dei giorni passati

  if (!ra.testo || !rb.testo) return json({ errore: 'One of the models returned an empty answer. Try a clearer question.', rimasti: DUELLI_PER_VISITATORE - usati - 1 }, 502);
  const biglietto = await firma({ id: crypto.randomUUID(), a: ma.id, b: mb.id, t: Date.now(), cat: categoria, lang: lingua, g: giorno }, env.SALE);
  return json({ a: ra.testo, b: rb.testo, tagliataA: ra.tagliata, tagliataB: rb.tagliata, biglietto, rimasti: DUELLI_PER_VISITATORE - usati - 1 });
}

export const onRequestGet = () => json({ errore: 'Use POST.' }, 405);
