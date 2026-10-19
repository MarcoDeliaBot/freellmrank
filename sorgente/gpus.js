// Pagina /gpus: ricalcola la tabella per 1, 2 o 4 schede (con o senza RAM), la ordina per la colonna
// scelta e filtra per marca. Calcolo e celle vengono da gpu-table.mjs, gli stessi della build.
import { valuta, ordina, celle, massimiDi, COLONNA_PREDEFINITA } from './gpu-table.mjs';

const D = JSON.parse(document.getElementById('gpu-data').textContent);
const $ = (id) => document.getElementById(id);
const corpo = document.querySelector('.gpu-tabella tbody');
const righe = new Map([...corpo.querySelectorAll('tr')].map((tr) => [tr.dataset.id, tr]));
const rif = D.rif.map((r) => r.hf);
let marca = 'All';
let colonna = COLONNA_PREDEFINITA, verso = -1;

// "All for home and office" non mostra le schede da centro dati: si vedono solo col loro tasto
const visibile = (s) => (marca === 'All' ? s.marca !== 'Data center' : s.marca === marca);

function aggiorna() {
  const opzioni = { n: Number($('g-quante').value), ram: $('g-ram').checked ? D.ram : 0, ctx: D.ctx, rif, classificati: D.classificati };
  const valutate = ordina(D.schede.map((s) => valuta(s, opzioni)), colonna, verso);
  const massimi = massimiDi(valutate.filter((v) => visibile(v.s)), rif.length);
  let pos = 0;
  for (const v of valutate) {
    const tr = righe.get(v.s.id);
    const si = visibile(v.s);
    tr.hidden = !si;
    const c = celle(v, massimi);
    tr.querySelector('.c-pos').textContent = si ? ++pos : '';
    tr.querySelector('.c-gb').innerHTML = c.gb;
    tr.querySelectorAll('.c-vel').forEach((td, i) => { td.innerHTML = c.vel[i]; });
    tr.querySelector('.c-max').textContent = c.max;
    tr.querySelector('.c-best').innerHTML = c.best;
    corpo.appendChild(tr); // in fondo, nell'ordine nuovo
  }
}

// ordinare cliccando sul titolo della colonna (di nuovo: verso opposto)
document.querySelectorAll('.gpu-tabella th[data-ordina]').forEach((th) => {
  th.tabIndex = 0;
  const scegli = (e) => {
    if (e.target.closest('a')) return; // il nome del modello resta un link
    if (colonna === th.dataset.ordina) verso = -verso; else { colonna = th.dataset.ordina; verso = -1; }
    document.querySelectorAll('.gpu-tabella th[data-ordina]').forEach((x) => x.removeAttribute('aria-sort'));
    th.setAttribute('aria-sort', verso < 0 ? 'descending' : 'ascending');
    aggiorna();
  };
  th.addEventListener('click', scegli);
  th.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); scegli(e); } });
});

// link Amazon: negozio italiano per chi ha il browser in italiano, amazon.com per gli altri
const negozi = { it: { host: 'www.amazon.it', tag: 'comecosa-21' } };
const lingua = (navigator.language || 'en').slice(0, 2).toLowerCase();
const negozio = negozi[lingua];
document.querySelectorAll('a.amazon').forEach((a) => {
  a.href = `https://${negozio ? negozio.host : 'www.amazon.com'}/s?k=${encodeURIComponent(a.dataset.q)}${negozio ? `&tag=${negozio.tag}` : ''}`;
  a.addEventListener('click', () => { if (window.gtag) window.gtag('event', 'amazon_click', { gpu: a.dataset.q, store: negozio ? lingua : 'com' }); });
});

$('g-quante').addEventListener('change', aggiorna);
$('g-ram').addEventListener('change', aggiorna);
document.querySelectorAll('.gpu-filtri .tabs button').forEach((b) => b.addEventListener('click', () => {
  marca = b.dataset.marca;
  document.querySelectorAll('.gpu-filtri .tabs button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
  aggiorna();
}));
