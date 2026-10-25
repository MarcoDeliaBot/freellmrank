// Tabella della pagina /gpus: calcolo, ordine e contenuto delle celle.
// La usano sia la build (script/sito/gpus.mjs, per Google e senza JavaScript) sia il browser (gpus.js),
// così ordine e numeri sono gli stessi.
import { simula, daScheda } from './calc.mjs';
import { t } from './testi.mjs'; // nella build resta inglese (niente document): la traduce traduci.mjs

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const fmtVel = (v) => (v >= 100 ? Math.round(v) : v >= 10 ? v.toFixed(0) : v.toFixed(1));
export const COLONNA_PREDEFINITA = 'v1'; // velocità sul modello denso da 27 B: la domanda più comune

// tutti i numeri di una scheda (o di n schede uguali)
export function valuta(s, { n = 1, ram = 64, ctx = 8192, rif, classificati }) {
  const h = daScheda(s, { n, ram, ctx });
  const vel = rif.map((hf) => simula(hf, h));
  const tutto = classificati.find((m) => simula(m.hf, h).dove === 'gpu');
  const migliore = tutto || classificati.find((m) => simula(m.hf, h).dove === 'ram');
  // il modello denso più grande che sta tutto in GPU a 4-bit (pesi + cache + runtime)
  const maxB = Math.max(0, (h.vram - 0.6 * h.n - 1) / (h.bpp + 0.000004 * ctx));
  return { s, h, vel, migliore, conRam: !tutto, maxB };
}

// valore per ordinare: le velocità di chi non ci sta vanno in fondo
export function chiave(v, col) {
  if (col === 'gb') return v.h.vram;
  if (col === 'banda') return v.s.banda;
  if (col === 'max') return v.maxB;
  const r = v.vel[Number(col.slice(1))];
  return r.dove === 'no' ? -1 : r.vel;
}

export const ordina = (valutate, col, verso = -1) => [...valutate].sort((a, b) => verso * (chiave(a, col) - chiave(b, col)) || b.s.banda - a.s.banda);

// contenuto delle celle; massimi = la velocità più alta di ogni colonna fra le righe mostrate (per le barre)
export function celle(v, massimi) {
  const { s, h } = v;
  const vel = v.vel.map((r, i) => {
    if (r.dove === 'no') return `<span class="muted small">${t('nonEntra')}</span>`;
    const w = massimi[i] ? Math.max(3, Math.round((100 * r.vel) / massimi[i])) : 0;
    return `<span class="vc"><span class="n">${fmtVel(r.vel)}</span><span class="mb${r.dove === 'ram' ? ' lenta' : ''}"><i style="width:${w}%"></i></span></span>${r.dove === 'ram' ? `<span class="tag chip-ram" title="${t('parteInRam')}">+RAM</span>` : ''}`;
  });
  return {
    // memoria e, sotto, la banda (quanto in fretta la scheda legge la memoria)
    gb: (s.unificata ? `${s.gb} GB<br><span class="small muted">${t('perAi', { n: Math.round(s.gb * 0.75) })}</span>`
      : h.n > 1 ? `${h.vram} GB<br><span class="small muted">${h.n} × ${s.gb} GB</span>` : `${s.gb} GB`)
      + `<br><span class="small muted">${s.banda} GB/s</span>`,
    vel,
    max: `~${Math.round(v.maxB)} B`,
    best: v.migliore ? `<a href="${esc(v.migliore.href)}">${esc(v.migliore.nome)}</a>${v.conRam ? ' <span class="tag chip-ram">+RAM</span>' : ''}<br><span class="small muted">Arena ${v.migliore.punti ?? v.migliore.cat?.chat?.punti}</span>` : '<span class="muted">—</span>',
  };
}

export const massimiDi = (valutate, quante) => Array.from({ length: quante }, (_, i) => Math.max(0, ...valutate.map((v) => (v.vel[i].dove === 'no' ? 0 : v.vel[i].vel))));
