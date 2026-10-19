// Filtri e ordinamento del catalogo dei modelli (le schede sono già nella pagina).
const $ = (id) => document.getElementById(id);
const griglia = $('griglia');
const schede = [...griglia.querySelectorAll('.scheda-modello')];
const leggi = (k) => { try { return sessionStorage.getItem(k); } catch { return null; } };
const scrivi = (k, v) => { try { sessionStorage.setItem(k, v); } catch {} };

function applica() {
  const q = $('q').value.trim().toLowerCase();
  const cat = $('f-cat').value, org = $('f-org').value, dim = $('f-dim').value, api = $('f-api').checked;
  let n = 0;
  for (const s of schede) {
    const d = s.dataset;
    const ok = (!q || d.testo.includes(q)) && (!cat || d.cat.split(' ').includes(cat)) && (!org || d.org === org)
      && (!dim || d.dim === dim) && (!api || d.api === '1');
    s.hidden = !ok;
    if (ok) n++;
  }
  const ord = $('f-ord').value;
  const chiave = { punti: (s) => -Number(s.dataset.punti), data: (s) => -Date.parse(s.dataset.data || '1970-01-01'), b: (s) => Number(s.dataset.b) || 1e9 }[ord];
  schede.slice().sort((a, b) => chiave(a) - chiave(b)).forEach((s) => griglia.appendChild(s));
  $('conta').textContent = `${n} of ${schede.length} models`;
  scrivi('catalogo', JSON.stringify({ q, cat, org, dim, api, ord }));
}

try {
  const st = JSON.parse(leggi('catalogo') || '{}');
  if (st.q) $('q').value = st.q;
  for (const [id, k] of [['f-cat', 'cat'], ['f-org', 'org'], ['f-dim', 'dim'], ['f-ord', 'ord']]) if (st[k]) $(id).value = st[k];
  if (st.api) $('f-api').checked = true;
} catch {}
['q', 'f-cat', 'f-org', 'f-dim', 'f-ord', 'f-api'].forEach((id) => $(id).addEventListener('input', applica));
applica();
