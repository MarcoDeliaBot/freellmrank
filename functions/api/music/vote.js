// POST /api/music/vote {coppia: '<battle_uuid di Music Arena>', esito: 'a'|'b'|'pari'} → {ok: true}
// Test alla cieca della pagina /music: si salva solo la coppia e l'esito, con un tetto di 100 voti al giorno per visitatore.
// Legami: ARENA (D1, tabella voti_musica), PROVA (KV), SALE (segreto).
const ORIGINI = ['https://freellmarena.com', 'http://127.0.0.1:8787', 'http://localhost:8787'];
const json = (dati, stato = 200) => new Response(JSON.stringify(dati), { status: stato, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });

async function impronta(ip, giorno, sale) {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${sale}|${giorno}|${ip}`));
  return [...new Uint8Array(b)].slice(0, 12).map((x) => x.toString(16).padStart(2, '0')).join('');
}

export async function onRequestPost({ request, env }) {
  const origine = request.headers.get('Origin');
  if (origine && !ORIGINI.includes(origine)) return json({ errore: 'Not allowed.' }, 403);
  if (!env.ARENA || !env.PROVA) return json({ errore: 'Not set up.' }, 503);
  let c;
  try { c = await request.json(); } catch { return json({ errore: 'Bad request.' }, 400); }
  const coppia = String(c?.coppia || '');
  const esito = c?.esito;
  if (!/^[0-9a-f-]{36}$/.test(coppia) || !['a', 'b', 'pari'].includes(esito)) return json({ errore: 'Bad request.' }, 400);
  const giorno = new Date().toISOString().slice(0, 10);
  const chiave = `music-ip:${await impronta(request.headers.get('CF-Connecting-IP') || 'x', giorno, env.SALE || '')}`;
  const usati = Number(await env.PROVA.get(chiave)) || 0;
  if (usati >= 100) return json({ errore: 'That is a lot of votes for today. Thank you! Come back tomorrow.' }, 429);
  await env.PROVA.put(chiave, String(usati + 1), { expirationTtl: 60 * 60 * 26 });
  await env.ARENA.prepare('INSERT INTO voti_musica (coppia, esito, giorno) VALUES (?, ?, ?)').bind(coppia, esito, giorno).run();
  return json({ ok: true });
}

export const onRequestGet = () => json({ errore: 'Use POST.' }, 405);
