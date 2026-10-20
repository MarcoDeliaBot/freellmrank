// "Your ranking": i voti di questo visitatore, salvati solo nel suo browser, e la loro classifica.
import { classifica } from './bt.mjs';

const CHIAVE = 'arena-miei-voti';
export function leggiMiei() {
  try { return JSON.parse(localStorage.getItem(CHIAVE) || '[]'); } catch { return []; }
}
export function salvaMio(voto) {
  try { localStorage.setItem(CHIAVE, JSON.stringify([...leggiMiei(), voto].slice(-500))); } catch { /* browser senza memoria: pazienza */ }
}
function cancellaMiei() { try { localStorage.removeItem(CHIAVE); } catch { /* niente */ } }

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export function linkModello(nomi, id) {
  const n = nomi[id] || { nome: String(id).split('/').pop(), href: null };
  return n.href ? `<a href="${esc(n.href)}">${esc(n.nome)}</a>` : esc(n.nome);
}

// tabella: posizione, modello, punteggio, ±, voti, vinte-perse-pari
export function tabella(righe, nomi, { conIc = true } = {}) {
  return `<table><thead><tr><th>#</th><th>Model</th><th>Score</th>${conIc ? '<th>±</th>' : ''}<th>Votes</th><th>Won · lost · tie</th></tr></thead><tbody>${righe.map((r, i) => `<tr><td class="n">${i + 1}</td><td>${linkModello(nomi, r.id)}</td><td class="n"><b>${r.punteggio}</b></td>${conIc ? `<td class="n">${r.ic != null ? '±' + r.ic : '—'}</td>` : ''}<td class="n">${r.voti}</td><td class="n">${r.vinte} · ${r.perse} · ${r.pari}</td></tr>`).join('')}</tbody></table>`;
}

export function mostraMia(nomi) {
  const box = document.getElementById('arena-mia');
  if (!box) return;
  const miei = leggiMiei();
  const vuota = document.getElementById('arena-mia-vuota');
  const tab = document.getElementById('arena-mia-tabella');
  const canc = document.getElementById('arena-mia-cancella');
  // solo sulla pagina /arena: conteggio, barra verso i 2 voti, scarica i voti
  const conto = document.getElementById('arena-mia-conto'), barra = document.getElementById('arena-mia-barra');
  const esporta = document.getElementById('arena-mia-esporta');
  if (conto) conto.textContent = `${miei.length} vote${miei.length === 1 ? '' : 's'} in this browser`;
  if (barra) barra.style.width = `${Math.max(4, Math.min(100, miei.length * 50))}%`;
  if (esporta) {
    esporta.hidden = miei.length === 0;
    esporta.onclick = () => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([JSON.stringify(miei, null, 2)], { type: 'application/json' }));
      a.download = 'free-arena-my-votes.json';
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    };
  }
  if (miei.length < 2) { vuota.hidden = false; tab.hidden = true; canc.hidden = true; return; }
  vuota.hidden = true;
  tab.innerHTML = `${tabella(classifica(miei), nomi, { conIc: false })}<p class="small muted" style="padding:.5rem .8rem;margin:0">From your ${miei.length} votes. Few votes give rough scores: the more you vote, the more it means.</p>`;
  tab.hidden = false;
  canc.hidden = false;
  canc.onclick = () => { cancellaMiei(); mostraMia(nomi); };
}
