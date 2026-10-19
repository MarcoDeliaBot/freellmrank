// Prova a confronto: due modelli gratuiti di OpenRouter, chiamati dal browser del visitatore
// con la sua chiave (accesso OAuth PKCE, nessun server nostro).
const $ = (id) => document.getElementById(id);
const OR = 'https://openrouter.ai/api/v1';
const leggi = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const scrivi = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch {} };

let modelli = [];
let coppia = null; // { a, b }
let votato = false;

// ---------- accesso ----------
const b64url = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const indietro = () => location.origin + location.pathname;

async function accedi() {
  const verifier = b64url(crypto.getRandomValues(new Uint8Array(32)));
  const challenge = b64url(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)));
  try { sessionStorage.setItem('pkce', verifier); } catch {}
  location.href = `https://openrouter.ai/auth?callback_url=${encodeURIComponent(indietro())}&code_challenge=${challenge}&code_challenge_method=S256`;
}

async function ritornoDaOpenRouter() {
  const code = new URLSearchParams(location.search).get('code');
  if (!code) return;
  let verifier = null;
  try { verifier = sessionStorage.getItem('pkce'); sessionStorage.removeItem('pkce'); } catch {}
  history.replaceState(null, '', indietro() + location.hash);
  $('stato-conto').textContent = 'Connecting…';
  try {
    const r = await fetch(`${OR}/auth/keys`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, code_verifier: verifier, code_challenge_method: 'S256' }) });
    const j = await r.json();
    if (!r.ok || !j.key) throw new Error(j.error?.message || `HTTP ${r.status}`);
    scrivi('or-key', j.key);
  } catch (e) {
    $('stato-conto').textContent = `Connection failed: ${e.message}. Try again.`;
    return;
  }
  aggiornaConto();
}

function aggiornaConto() {
  const k = leggi('or-key');
  $('stato-conto').innerHTML = k ? '<span class="tag free">Connected</span> <button class="btn" id="esci" type="button">Disconnect</button>' : 'Not connected.';
  $('accedi').hidden = !!k;
  $('esci')?.addEventListener('click', () => { scrivi('or-key', null); aggiornaConto(); });
  $('invia').disabled = !k;
}

// ---------- modelli ----------
const nome = (id) => modelli.find((m) => m.id === id)?.nome || id;
function scegliCoppia() {
  if ($('cieco').checked) {
    const i = Math.floor(Math.random() * modelli.length);
    let j = Math.floor(Math.random() * (modelli.length - 1));
    if (j >= i) j++;
    coppia = { a: modelli[i].id, b: modelli[j].id };
  } else {
    coppia = { a: $('mod-a').value, b: $('mod-b').value };
  }
}
function mostraNomi(svela) {
  const cieco = $('cieco').checked && !svela;
  $('nome-a').textContent = cieco ? 'Model A' : `A · ${nome(coppia.a)}`;
  $('nome-b').textContent = cieco ? 'Model B' : `B · ${nome(coppia.b)}`;
}

// ---------- invio ----------
async function chiedi(modello, domanda, box) {
  box.textContent = '';
  const r = await fetch(`${OR}/chat/completions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${leggi('or-key')}`, 'Content-Type': 'application/json', 'HTTP-Referer': location.origin, 'X-Title': document.title.split(' · ').pop() },
    body: JSON.stringify({ model: modello, stream: true, messages: [{ role: 'user', content: domanda }] }),
  });
  if (!r.ok) {
    const j = await r.json().catch(() => ({}));
    throw new Error(r.status === 429 ? 'Free limit reached for now. Wait a minute, or try tomorrow.' : (j.error?.message || `HTTP ${r.status}`));
  }
  const lettore = r.body.getReader();
  const dec = new TextDecoder();
  let resto = '';
  for (;;) {
    const { done, value } = await lettore.read();
    if (done) break;
    resto += dec.decode(value, { stream: true });
    const righe = resto.split('\n');
    resto = righe.pop();
    for (const riga of righe) {
      if (!riga.startsWith('data: ')) continue;
      const corpo = riga.slice(6).trim();
      if (corpo === '[DONE]') return;
      try {
        const j = JSON.parse(corpo);
        if (j.error) throw new Error(j.error.message);
        const pezzo = j.choices?.[0]?.delta?.content;
        if (pezzo) box.textContent += pezzo;
      } catch (e) { if (e.message && !(e instanceof SyntaxError)) throw e; }
    }
  }
}

async function invia() {
  const domanda = $('domanda').value.trim();
  if (!domanda) { $('stato-invio').textContent = 'Write a prompt first.'; return; }
  if (!$('cieco').checked && $('mod-a').value === $('mod-b').value) { $('stato-invio').textContent = 'Pick two different models.'; return; }
  scegliCoppia();
  mostraNomi(false);
  votato = false;
  $('voto').hidden = true;
  $('esito').textContent = '';
  $('invia').disabled = true;
  $('stato-invio').textContent = 'Waiting for both answers…';
  const esiti = await Promise.allSettled([chiedi(coppia.a, domanda, $('risp-a')), chiedi(coppia.b, domanda, $('risp-b'))]);
  esiti.forEach((e, i) => { if (e.status === 'rejected') $(i ? 'risp-b' : 'risp-a').textContent = `Error: ${e.reason.message}`; });
  $('invia').disabled = false;
  const ok = esiti.every((e) => e.status === 'fulfilled');
  $('stato-invio').textContent = ok ? 'Done. Vote below.' : 'One model did not answer.';
  $('voto').hidden = !ok;
}

// ---------- voti (per ora solo nel browser del visitatore) ----------
function voti() { try { return JSON.parse(leggi('voti') || '[]'); } catch { return []; } }
function vota(v) {
  if (votato || !coppia) return;
  votato = true;
  const lista = voti();
  lista.push({ a: coppia.a, b: coppia.b, v, t: Date.now() });
  scrivi('voti', JSON.stringify(lista.slice(-500)));
  mostraNomi(true);
  $('esito').textContent = `Thanks. A was ${nome(coppia.a)}, B was ${nome(coppia.b)}.`;
  mostraVoti();
}
function mostraVoti() {
  const vinte = {};
  for (const x of voti()) {
    if (x.v === 'a') vinte[x.a] = (vinte[x.a] || 0) + 1;
    if (x.v === 'b') vinte[x.b] = (vinte[x.b] || 0) + 1;
  }
  const ord = Object.entries(vinte).sort((p, q) => q[1] - p[1]);
  $('miei-voti').innerHTML = ord.length ? `<ol>${ord.map(([id, n]) => `<li>${nome(id)}: ${n} win${n > 1 ? 's' : ''}</li>`).join('')}</ol>` : 'No votes yet.';
}

// ---------- avvio ----------
$('accedi').addEventListener('click', accedi);
$('salva-chiave').addEventListener('click', () => { const k = $('chiave').value.trim(); if (k) { scrivi('or-key', k); $('chiave').value = ''; aggiornaConto(); } });
$('cieco').addEventListener('change', () => { $('scelta').hidden = $('cieco').checked; });
$('invia').addEventListener('click', invia);
document.querySelectorAll('#voto button').forEach((b) => b.addEventListener('click', () => vota(b.dataset.v)));

fetch('data.json').then((r) => r.json()).then((d) => {
  modelli = d.openrouterGratis;
  const opz = modelli.map((m) => `<option value="${m.id}">${m.nome}</option>`).join('');
  $('mod-a').innerHTML = opz;
  $('mod-b').innerHTML = opz;
  if (modelli[1]) $('mod-b').value = modelli[1].id;
  const scelto = decodeURIComponent(location.hash.slice(1));
  if (modelli.some((m) => m.id === scelto)) {
    $('cieco').checked = false;
    $('scelta').hidden = false;
    $('mod-a').value = scelto;
    if ($('mod-b').value === scelto) $('mod-b').value = modelli.find((m) => m.id !== scelto).id;
  }
  mostraVoti();
});
aggiornaConto();
ritornoDaOpenRouter();
