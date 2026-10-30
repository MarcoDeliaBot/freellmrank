// POST /api/scrivi  (Authorization: Bearer <BOZZE_KEY>)  {messaggi: [...], max: 2500, scopo: 'bozze'|'traduzioni'|'video'}  →  {testo}
// Solo per le bozze automatiche di GitHub Actions (script/bozze.mjs): articoli del blog e post social da approvare.
// Usa Workers AI sulla quota gratis del sito, con un tetto giornaliero a parte. Senza BOZZE_KEY risponde 503.
// Legami del progetto Pages: AI (Workers AI), PROVA (KV per il contatore), BOZZE_KEY (segreto).
import { neuronsDa, TETTI_SCRIVI } from '../../script/cf-modelli.mjs';

const MODELLO = { id: '@cf/openai/gpt-oss-120b', pin: 0.35, pout: 0.75 };
const json = (dati, stato = 200) => new Response(JSON.stringify(dati), { status: stato, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });

export async function onRequestPost({ request, env }) {
  if (!env.BOZZE_KEY || !env.AI || !env.PROVA) return json({ errore: 'Not set up.' }, 503);
  if (request.headers.get('Authorization') !== `Bearer ${env.BOZZE_KEY}`) return json({ errore: 'Not allowed.' }, 401);
  let corpo;
  try { corpo = await request.json(); } catch { return json({ errore: 'Bad request.' }, 400); }
  const messaggi = Array.isArray(corpo?.messaggi) ? corpo.messaggi.slice(0, 6).map((m) => ({ role: m.role === 'system' ? 'system' : 'user', content: String(m.content || '').slice(0, 24000) })) : [];
  if (!messaggi.length) return json({ errore: 'No messages.' }, 400);
  const max = Math.min(4000, Math.max(100, Number(corpo?.max) || 2500));

  // ogni uso ha il suo tetto (bozze, traduzioni, video): le traduzioni non tolgono spazio ai copioni
  const scopo = Object.hasOwn(TETTI_SCRIVI, corpo?.scopo) ? corpo.scopo : 'bozze';
  const TETTO_SCRIVI = TETTI_SCRIVI[scopo];
  const giorno = new Date().toISOString().slice(0, 10);
  const chiave = scopo === 'bozze' ? `scrivi-spesa:${giorno}` : `scrivi-spesa-${scopo}:${giorno}`;
  const spesa = Number(await env.PROVA.get(chiave)) || 0;
  const caratteri = messaggi.reduce((s, m) => s + m.content.length, 0);
  const peggiore = neuronsDa(((caratteri / 3 + 200) * MODELLO.pin + max * MODELLO.pout) / 1e6);
  if (spesa + peggiore > TETTO_SCRIVI) return json({ errore: 'Daily writing budget used. Try tomorrow.' }, 429);

  let r;
  try {
    r = await env.AI.run(MODELLO.id, { messages: messaggi, max_tokens: max, reasoning_effort: 'low' });
  } catch (e) {
    return json({ errore: `Model error: ${String(e?.message || e).slice(0, 200)}` }, 502);
  }
  const neurons = Number(r?.usage?.neurons) || neuronsDa(((r?.usage?.prompt_tokens || caratteri / 3) * MODELLO.pin + (r?.usage?.completion_tokens || max) * MODELLO.pout) / 1e6);
  await env.PROVA.put(chiave, String(Math.round((spesa + neurons) * 100) / 100), { expirationTtl: 60 * 60 * 48 });
  const testo = String(r?.choices?.[0]?.message?.content || r?.response || '').replace(/<think>[\s\S]*?<\/think>/g, '').trim();
  return json({ testo, tagliato: r?.choices?.[0]?.finish_reason === 'length', neurons: Math.round(neurons) });
}

export const onRequestGet = () => json({ errore: 'Use POST.' }, 405);
