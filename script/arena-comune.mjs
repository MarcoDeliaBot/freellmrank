// Parti comuni del server di Free Arena (functions/api/arena/*.js): biglietto firmato, contatori su D1, chiamata ai modelli.
// Il biglietto contiene i nomi dei due modelli firmati col segreto SALE: il browser lo porta indietro col voto
// ma non può leggerlo bene né cambiarlo, quindi i nomi restano segreti fino al voto.

export const json = (dati, stato = 200) => new Response(JSON.stringify(dati), { status: stato, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });
export const ORIGINI = ['https://freellmarena.com', 'http://127.0.0.1:8788', 'http://localhost:8788'];
export const oggi = () => new Date().toISOString().slice(0, 10); // la quota Cloudflare riparte a mezzanotte UTC

const b64 = (bytes) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const deb64 = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));

async function chiave(segreto) {
  return crypto.subtle.importKey('raw', new TextEncoder().encode(segreto || 'manca-il-segreto'), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}
export async function firma(dati, segreto) {
  const corpo = b64(new TextEncoder().encode(JSON.stringify(dati)));
  const f = await crypto.subtle.sign('HMAC', await chiave(segreto), new TextEncoder().encode(corpo));
  return `${corpo}.${b64(new Uint8Array(f))}`;
}
export async function verifica(biglietto, segreto) {
  const [corpo, f] = String(biglietto || '').split('.');
  if (!corpo || !f) return null;
  try {
    const ok = await crypto.subtle.verify('HMAC', await chiave(segreto), deb64(f), new TextEncoder().encode(corpo));
    return ok ? JSON.parse(new TextDecoder().decode(deb64(corpo))) : null;
  } catch { return null; }
}

// impronta del visitatore: l'IP non viene salvato, solo un'impronta che cambia ogni giorno
export async function impronta(ip, giorno, sale) {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${sale}|${giorno}|${ip}`));
  return [...new Uint8Array(b)].slice(0, 12).map((x) => x.toString(16).padStart(2, '0')).join('');
}

// contatori su D1 (non su KV: KV gratis permette solo 1.000 scritture al giorno)
export async function leggiContatore(db, k) {
  const r = await db.prepare('SELECT valore FROM contatori WHERE chiave = ?').bind(k).first();
  return r ? Number(r.valore) : 0;
}
export async function aggiungi(db, k, quanto, scade) {
  await db.prepare('INSERT INTO contatori (chiave, valore, scade) VALUES (?, ?, ?) ON CONFLICT(chiave) DO UPDATE SET valore = valore + excluded.valore')
    .bind(k, quanto, scade).run();
}
export const pulisci = (db, giorno) => db.prepare('DELETE FROM contatori WHERE scade < ?').bind(giorno).run();

// una risposta da un modello Cloudflare; il ragionamento fra <think> e </think> si toglie
export async function chiedi(ai, m, domanda) {
  const r = await ai.run(m.id, { messages: [{ role: 'user', content: domanda }], max_tokens: m.max, ...(m.extra || {}) });
  const testo = String(r?.choices?.[0]?.message?.content || r?.response || '').replace(/<think>[\s\S]*?<\/think>/g, '').trim();
  return { testo, neurons: Number(r?.usage?.neurons) || null, tagliata: r?.choices?.[0]?.finish_reason === 'length' };
}
