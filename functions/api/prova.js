// POST /api/prova  {modello: '@cf/...', domanda: '...'}  →  {risposta, neurons, rimaste}
// Il visitatore prova un modello senza account. Paga la quota gratis di Cloudflare Workers AI del sito,
// e ci fermiamo prima della fine: tetto giornaliero sui neurons e 5 domande al giorno per visitatore.
// Legami (impostati nel progetto Pages): AI = Workers AI, PROVA = KV per i contatori, SALE = segreto.
import { CF_MODELLI, TETTO_NEURONS, DOMANDE_PER_VISITATORE, LUNGHEZZA_DOMANDA, peggioreNeurons } from '../../script/cf-modelli.mjs';

const ORIGINI = ['https://freellmarena.com', 'http://127.0.0.1:8788', 'http://localhost:8788'];
const json = (dati, stato = 200) => new Response(JSON.stringify(dati), { status: stato, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });

async function impronta(ip, giorno, sale) {
  // il contatore non conserva l'indirizzo IP: solo un'impronta che cambia ogni giorno
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${sale}|${giorno}|${ip}`));
  return [...new Uint8Array(b)].slice(0, 12).map((x) => x.toString(16).padStart(2, '0')).join('');
}

export async function onRequestPost({ request, env }) {
  const origine = request.headers.get('Origin');
  if (origine && !ORIGINI.includes(origine)) return json({ errore: 'Not allowed.' }, 403);
  if (!env.AI || !env.PROVA) return json({ errore: 'Try-now is not set up yet.' }, 503);

  let corpo;
  try { corpo = await request.json(); } catch { return json({ errore: 'Bad request.' }, 400); }
  const m = CF_MODELLI.find((x) => x.id === corpo?.modello);
  const domanda = String(corpo?.domanda || '').trim();
  if (!m) return json({ errore: 'This model cannot be tried here.' }, 400);
  if (!domanda) return json({ errore: 'Write a question first.' }, 400);
  if (domanda.length > LUNGHEZZA_DOMANDA) return json({ errore: `Keep the question under ${LUNGHEZZA_DOMANDA} characters.` }, 400);

  const giorno = new Date().toISOString().slice(0, 10); // la quota Cloudflare riparte a mezzanotte UTC
  const chiaveSpesa = `spesa:${giorno}`;
  const chiaveIp = `ip:${await impronta(request.headers.get('CF-Connecting-IP') || 'x', giorno, env.SALE || '')}`;
  const [spesaTesto, usateTesto] = await Promise.all([env.PROVA.get(chiaveSpesa), env.PROVA.get(chiaveIp)]);
  const spesa = Number(spesaTesto) || 0, usate = Number(usateTesto) || 0;

  if (usate >= DOMANDE_PER_VISITATORE) return json({ errore: `You used your ${DOMANDE_PER_VISITATORE} free questions for today. Come back tomorrow, or try the model on the other free sites listed on this page.`, rimaste: 0 }, 429);
  if (spesa + peggioreNeurons(m, domanda.length) > TETTO_NEURONS) return json({ errore: 'Today\'s free questions are finished for everyone. They come back at midnight UTC.', rimaste: 0 }, 429);

  // prima si conta la domanda del visitatore, poi si chiama il modello
  await env.PROVA.put(chiaveIp, String(usate + 1), { expirationTtl: 60 * 60 * 26 });
  let r;
  try {
    r = await env.AI.run(m.id, { messages: [{ role: 'user', content: domanda }], max_tokens: m.max, ...(m.extra || {}) });
  } catch (e) {
    return json({ errore: 'The model did not answer. Try again in a minute.' }, 502);
  }
  const usage = r?.usage || {};
  const scelta = r?.choices?.[0]?.message || {};
  // alcuni modelli mettono il ragionamento fra <think> e </think> dentro la risposta: si toglie
  const risposta = String(scelta.content || r?.response || '').replace(/<think>[\s\S]*?<\/think>/g, '').trim();
  // costo vero, se Cloudflare lo dice; altrimenti il caso peggiore
  const neurons = Number(usage.neurons) || peggioreNeurons(m, domanda.length);
  await env.PROVA.put(chiaveSpesa, String(Math.round((spesa + neurons) * 100) / 100), { expirationTtl: 60 * 60 * 48 });

  return json({
    risposta: risposta || '(The model returned an empty answer. Try a shorter or clearer question.)',
    tagliata: r?.choices?.[0]?.finish_reason === 'length',
    token: usage.completion_tokens ?? null,
    rimaste: DOMANDE_PER_VISITATORE - usate - 1,
  });
}

export const onRequestGet = () => json({ errore: 'Use POST.' }, 405);
