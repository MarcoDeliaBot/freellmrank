// Pagina /gpus: ricalcola la tabella per 1, 2 o 4 schede (con o senza RAM) e filtra per marca.
import { simula, daScheda } from './calc.mjs';

const D = JSON.parse(document.getElementById('gpu-data').textContent);
const $ = (id) => document.getElementById(id);
const fmtVel = (v) => (v >= 100 ? Math.round(v) : v >= 10 ? v.toFixed(0) : v.toFixed(1));
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const perId = new Map(D.schede.map((s) => [s.id, s]));
let marca = 'All';

function cella(r) {
  if (r.dove === 'gpu') return `<span class="n">${fmtVel(r.vel)}</span>`;
  if (r.dove === 'ram') return `<span class="n">${fmtVel(r.vel)}</span> <span class="tag chip-ram" title="Part of the model sits in system RAM">+RAM</span>`;
  return '<span class="muted">does not fit</span>';
}

function aggiorna() {
  const n = Number($('g-quante').value);
  const ram = $('g-ram').checked ? D.ram : 0;
  document.querySelectorAll('.gpu-tabella tbody tr').forEach((tr) => {
    const s = perId.get(tr.dataset.id);
    tr.hidden = marca !== 'All' && tr.dataset.marca !== marca;
    const h = daScheda(s, { n, ram, ctx: D.ctx });
    const celle = tr.querySelectorAll('.c-vel');
    D.rif.forEach((r, i) => { celle[i].innerHTML = cella(simula(r.hf, h)); });
    const maxB = Math.max(0, (h.vram - 0.6 * h.n - 1) / (h.bpp + 0.000004 * D.ctx));
    tr.querySelector('.c-max').textContent = `~${Math.round(maxB)} B`;
    tr.querySelector('.c-gb').innerHTML = s.unificata
      ? `${s.gb} GB<br><span class="small muted">~${Math.round(s.gb * 0.75)} GB for AI${n > 1 ? ' · one unit' : ''}</span>`
      : `${h.n > 1 ? `${h.n} × ${s.gb} = ` : ''}${h.vram} GB`;
    const tutto = D.classificati.find((x) => simula(x.hf, h).dove === 'gpu');
    const m = tutto || D.classificati.find((x) => simula(x.hf, h).dove === 'ram');
    tr.querySelector('.c-best').innerHTML = m ? `<a href="${esc(m.href)}">${esc(m.nome)}</a><br><span class="small muted">Arena ${m.punti}</span>${tutto ? '' : ' <span class="tag chip-ram">+RAM</span>'}` : '—';
  });
}

$('g-quante').addEventListener('change', aggiorna);
$('g-ram').addEventListener('change', aggiorna);
document.querySelectorAll('.gpu-filtri .tabs button').forEach((b) => b.addEventListener('click', () => {
  marca = b.dataset.marca;
  document.querySelectorAll('.gpu-filtri .tabs button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
  aggiorna();
}));
