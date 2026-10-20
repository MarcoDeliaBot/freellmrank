// «Report a mistake»
// POST /api/report  {pagina: '/model/...', testo: '...', turnstile}  →  {ok: true}
//   salva nel D1 solo la pagina e il testo; controllo anti-bot Turnstile e 5 segnalazioni al giorno per visitatore.
// GET  /api/report  (Authorization: Bearer <REPORT_KEY>)  →  {segnalazioni: [...]}  le non lette, poi le segna lette.
//   Lo usa il riassunto mattutino di n8n (n8n/segnalazioni-riassunto.json). Senza REPORT_KEY risponde 503.
// Legami del progetto Pages: ARENA (D1), PROVA (KV), SALE e TURNSTILE_SECRET (segreti), REPORT_KEY (segreto, facoltativo).
const ORIGINI = ['https://freellmarena.com', 'http://127.0.0.1:8788', 'http://localhost:8788'];
const MAX = 1000;
const PER_VISITATORE = 5;
const json = (dati, stato = 200) => new Response(JSON.stringify(dati), { status: stato, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });

async function impronta(ip, giorno, sale) {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${sale}|${giorno}|${ip}`));
  return [...new Uint8Array(b)].slice(0, 12).map((x) => x.toString(16).padStart(2, '0')).join('');
}

export async function onRequestPost({ request, env }) {
  const origine = request.headers.get('Origin');
  if (origine && !ORIGINI.includes(origine)) return json({ errore: 'Not allowed.' }, 403);
  if (!env.ARENA || !env.PROVA) return json({ errore: 'Reports are not set up yet. Write to info@freellmarena.com.' }, 503);

  let corpo;
  try { corpo = await request.json(); } catch { return json({ errore: 'Bad request.' }, 400); }
  const pagina = String(corpo?.pagina || '').trim();
  const testo = String(corpo?.testo || '').trim();
  if (!pagina || pagina.length > 200) return json({ errore: 'Write which page has the mistake.' }, 400);
  if (testo.length < 5) return json({ errore: 'Write what is wrong, in a few words.' }, 400);
  if (testo.length > MAX) return json({ errore: `Keep it under ${MAX} characters.` }, 400);

  if (env.TURNSTILE_SECRET) {
    const v = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST', body: new URLSearchParams({ secret: env.TURNSTILE_SECRET, response: String(corpo?.turnstile || ''), remoteip: request.headers.get('CF-Connecting-IP') || '' }),
    }).then((r) => r.json()).catch(() => ({ success: false }));
    if (!v.success) return json({ errore: 'The anti-bot check did not pass. Wait for it to finish, then send again.' }, 403);
  }

  const giorno = new Date().toISOString().slice(0, 10);
  const chiaveIp = `report-ip:${await impronta(request.headers.get('CF-Connecting-IP') || 'x', giorno, env.SALE || '')}`;
  const usate = Number(await env.PROVA.get(chiaveIp)) || 0;
  if (usate >= PER_VISITATORE) return json({ errore: `You sent ${PER_VISITATORE} reports today. Thank you! For more, write to info@freellmarena.com.` }, 429);
  await env.PROVA.put(chiaveIp, String(usate + 1), { expirationTtl: 60 * 60 * 26 });

  // solo il percorso della pagina, mai un indirizzo esterno
  let percorso = pagina;
  try { percorso = new URL(pagina, 'https://freellmarena.com').pathname; } catch {}
  await env.ARENA.prepare('INSERT INTO segnalazioni (creato, pagina, testo) VALUES (?, ?, ?)').bind(new Date().toISOString(), percorso.slice(0, 200), testo).run();
  return json({ ok: true });
}

export async function onRequestGet({ request, env }) {
  if (!env.REPORT_KEY || !env.ARENA) return json({ errore: 'Not set up.' }, 503);
  if (request.headers.get('Authorization') !== `Bearer ${env.REPORT_KEY}`) return json({ errore: 'Not allowed.' }, 401);
  const { results } = await env.ARENA.prepare('SELECT id, creato, pagina, testo FROM segnalazioni WHERE letta = 0 ORDER BY id LIMIT 100').all();
  if (results.length) await env.ARENA.prepare(`UPDATE segnalazioni SET letta = 1 WHERE id IN (${results.map(() => '?').join(',')})`).bind(...results.map((r) => r.id)).run();
  return json({ segnalazioni: results });
}
