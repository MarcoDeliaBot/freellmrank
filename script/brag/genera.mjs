// Video verticali fatti con le regole della skill /brag-slim (latent-spaces/brag), approvati da Marco il 20/10/2026.
// Crea video/brag/scena-<tipo>.html (ogni fotogramma è funzione pura del tempo, render(t)) e video/brag/info-<tipo>.json
// (nome, titolo, descrizione e tag per YouTube). Li registra registra.py; li pubblica .github/workflows/video.yml.
// Riusa i pezzi veri del sito: il CSS (sito/style.css), il grafico a barre (barre) e i colori dei laboratori.
import fs from 'node:fs';
import path from 'node:path';
import { barre } from '../../script/sito/grafici.mjs';
import { coloreLab, nomeLab, chiaveLab } from '../../script/sito/laboratori.mjs';

const QUI = path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1'));
const RADICE = path.join(QUI, '..', '..');
const OUT = path.join(RADICE, 'video', 'brag');
fs.mkdirSync(OUT, { recursive: true });
const dati = JSON.parse(fs.readFileSync(path.join(RADICE, 'sito', 'data.json'), 'utf8'));
const css = fs.readFileSync(path.join(RADICE, 'sorgente', 'style.css'), 'utf8');
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const gratis = (m) => m.aperto || m.or?.gratis;

// ---------- dati veri ----------
const chat = dati.categorie.find((c) => c.id === 'chat');
const top5 = chat.modelli.filter(gratis).slice(0, 5);
const pagato = chat.modelli.find((m) => !gratis(m));
const contaGratis = chat.modelli.filter(gratis).length;
// BRAG_NUOVO=<nome> sceglie un modello preciso (per le prove); di solito il più recente con dimensioni note
const nuovo = (process.env.BRAG_NUOVO && dati.nuovi.find((m) => m.nome === process.env.BRAG_NUOVO)) || [...dati.nuovi].sort((a, b) => (b.creato || '').localeCompare(a.creato || '')).find((m) => m.hf);
// memoria a 4 bit più un margine di 1,5 GB per il contesto: la stessa regola di script/video.py e del simulatore
const gb4 = Math.round(nuovo.hf.b * 0.606 + 1.2 + 1.5);
const schede = ['RTX 4090', 'RTX 5090', 'RTX PRO 6000 Blackwell', 'Mac Studio M3 Ultra 512 GB'].map((n) => dati.schede.schede.find((s) => s.nome === n)).filter(Boolean);

const grafico = barre(top5.map((m) => ({ nome: m.nome, valore: m.punti, href: '#', lab: coloreLab(m.org), chiaveLab: chiaveLab(m.org), nomeLab: nomeLab(m.org) })), { riferimento: { valore: pagato.punti, nome: pagato.nome } })
  .replace(/<p class="small muted">[\s\S]*?<\/p>/, ''); // la didascalia lunga non si legge in un video

const marchio = `<div class="marchio"><span class="segno"><i style="height:30px"></i><i style="height:48px"></i><i style="height:38px"></i></span><b>FreeLLM<span>Arena</span></b></div>`;

const STILE = `
:root{--v-verde:#4ccb8b;--serif:"Palatino Linotype","P052","Book Antiqua",Georgia,serif;--sans:"Segoe UI","Noto Sans","DejaVu Sans",sans-serif}
html,body{margin:0;width:1080px;height:1920px;overflow:hidden;background:var(--bg);color:var(--ink)}
.tela{position:relative;width:1080px;height:1920px;overflow:hidden;font-family:var(--sans)}
.marchio{position:absolute;left:88px;top:110px;display:flex;align-items:center;gap:22px;font:700 46px/1 var(--sans);z-index:5}
.marchio b span{color:var(--v-verde)}
.segno{display:flex;align-items:flex-end;gap:8px;width:76px;height:76px;padding:0 12px 14px;box-sizing:border-box;border-radius:18px;background:#0d7a47}
.segno i{display:block;width:13px;border-radius:3px;background:#fff}
.avanza{position:absolute;left:88px;right:88px;bottom:120px;height:8px;border-radius:4px;background:var(--line);z-index:5}
.avanza i{position:absolute;left:0;top:0;bottom:0;border-radius:4px;background:var(--v-verde)}
.scena{position:absolute;inset:0;padding:0 88px;display:flex;flex-direction:column;justify-content:center;gap:34px;opacity:0}
.grande{font:700 140px/1.04 var(--serif);letter-spacing:-.02em;margin:0}
.medio{font:600 84px/1.12 var(--serif);margin:0;letter-spacing:-.01em}
.piccolo{font:400 46px/1.35 var(--sans);color:var(--muted);margin:0}
.verde{color:var(--v-verde)}
.riga{will-change:transform,opacity}
.chip{align-self:flex-start;font:700 40px/1 var(--sans);padding:22px 30px;border-radius:999px;background:color-mix(in srgb,var(--v-verde) 18%,transparent);color:var(--v-verde)}
.grafico-v{zoom:3.1;margin:0 -6px}
.grafico-v .vg-riga{pointer-events:none}
.grafico-v .vg-riga,.grafico-v .vg-asse{grid-template-columns:minmax(6rem,7.6rem) 1fr!important;gap:.5rem!important}
.grafico-v .vg-nome{text-align:right!important}
.grafico-v .vg-asse .vg-nome{display:block!important}
.etichetta-rif{font:600 36px/1.3 var(--sans);color:var(--muted)}
.etichetta-rif b{color:var(--ink)}
.scheda-v{display:grid;grid-template-columns:1fr auto;align-items:center;gap:10px 24px;padding:26px 30px;border:2px solid var(--line);border-radius:22px;background:var(--surface)}
.scheda-v b{font:700 46px/1.1 var(--sans)}
.scheda-v .no{font:800 44px/1 var(--sans);color:#ef4444}
.scheda-v .si{font:800 44px/1 var(--sans);color:var(--v-verde)}
.scheda-v .pista{grid-column:1 / -1;position:relative;height:22px;border-radius:11px;background:var(--line);overflow:hidden}
.scheda-v .pista i{position:absolute;left:0;top:0;bottom:0;background:var(--c-gpu);border-radius:11px}
.serve{font:700 52px/1.2 var(--sans)}
.serve span{color:var(--v-verde)}
.url{font:800 104px/1 var(--sans);color:var(--v-verde);letter-spacing:-.02em}
.gancio{display:grid;gap:14px;margin-top:18px}
.gancio>span:not(.pista){font:700 40px/1.2 var(--sans);color:var(--muted)}
.gancio .pista{position:relative;height:56px;border-radius:12px;background:var(--line);overflow:hidden}
.gancio .pista i{position:absolute;left:0;top:0;bottom:0;border-radius:12px;background:var(--v-verde)}
.gancio .pista i.pagato{background:repeating-linear-gradient(135deg,var(--ink) 0 14px,var(--muted) 14px 28px)}
`;

// ---------- motore: ogni elemento ha [entra, esce] in secondi; tutto si calcola da t ----------
const MOTORE = `
const ease = (x) => x <= 0 ? 0 : x >= 1 ? 1 : 1 - Math.pow(1 - x, 3);
const fin = (t, a, d) => ease((t - a) / d);
function render(t) {
  for (const s of document.querySelectorAll('.scena')) {
    const a = +s.dataset.da, b = +s.dataset.a;
    // la scena entra dopo che la precedente è uscita: si passa dallo sfondo, niente doppia esposizione
    const o = Math.min(fin(t, a, 0.35), 1 - fin(t, b - 0.3, 0.3));
    s.style.opacity = o;
    s.style.visibility = o > 0 ? 'visible' : 'hidden';
    for (const r of s.querySelectorAll('[data-in]')) {
      const k = fin(t, a + +r.dataset.in, 0.5);
      r.style.opacity = k;
      r.style.transform = 'translateY(' + (1 - k) * 60 + 'px)';
    }
    for (const r of s.querySelectorAll('[data-conta]')) {
      const k = fin(t, a + +r.dataset.da, 1.2);
      r.textContent = Math.round(+r.dataset.conta * k);
    }
    // barre del grafico vero: crescono una dopo l'altra fino alla larghezza del sito
    s.querySelectorAll('.vg-riga:not(.rif)').forEach((riga, i) => {
      const barra = riga.querySelector('.vg-barra'), val = riga.querySelector('.vg-val');
      if (!barra.dataset.w) barra.dataset.w = parseFloat(barra.style.width);
      const k = fin(t, a + 0.9 + i * 0.35, 0.9);
      barra.style.width = barra.dataset.w * k + '%';
      val.style.left = barra.dataset.w * k + '%';
      val.style.opacity = k;
      riga.style.opacity = Math.min(1, fin(t, a + 0.7 + i * 0.35, 0.4));
    });
    for (const r of s.querySelectorAll('[data-pista]')) {
      const k = fin(t, a + +r.dataset.da, 0.8);
      r.style.width = +r.dataset.pista * k + '%';
    }
    for (const r of s.querySelectorAll('[data-luce]')) {
      const x = t - (a + +r.dataset.luce);
      r.style.boxShadow = x > 0 && x < 1.6 ? '0 0 0 ' + (6 * Math.sin(Math.PI * x / 1.6)) + 'px color-mix(in srgb, var(--v-verde) 55%, transparent)' : 'none';
      r.style.borderRadius = '8px';
    }
  }
  document.querySelector('.avanza i').style.width = (t / DURATA * 100) + '%';
}
`;

function pagina(scene, durata) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>${css}${STILE}</style></head><body>
<div class="tela">${marchio}${scene.join('\n')}<div class="avanza"><i></i></div></div>
<script>const DURATA = ${durata};${MOTORE};render(0)</script></body></html>`;
}
const scena = (da, a, corpo) => `<section class="scena" data-da="${da}" data-a="${a}">${corpo}</section>`;

// ---------- video 1: la settimana ----------
const distacco = pagato.punti - top5[0].punti;
const settimana = pagina([
  // regole della skill «video» (coreyhaines31): gancio visivo e testo entro il primo secondo, al massimo 2 righe corte per frase,
  // parole chiave in colore, invito finale chiaro. Il gancio mostra il distacco con due barre vere sulla scala del grafico (da 1400).
  scena(0, 3.6, `<p class="grande riga" data-in="0">Free AI is</p><p class="grande riga verde" data-in="0.15">${distacco} points</p><p class="medio riga" data-in="0.3">behind paid AI.</p><div class="gancio riga" data-in="0.2"><span>Best paid · ${pagato.punti}</span><span class="pista"><i class="pagato" data-pista="${((pagato.punti - 1400) / (pagato.punti - 1390) * 100).toFixed(1)}" data-da="0.25"></i></span><span>Best free · ${top5[0].punti}</span><span class="pista"><i data-pista="${((top5[0].punti - 1400) / (pagato.punti - 1390) * 100).toFixed(1)}" data-da="0.35"></i></span><span style="font-size:30px">Scale starts at 1400, like on the site.</span></div>`),
  scena(3.6, 7.0, `<p class="medio riga" data-in="0">Every free AI model,</p><p class="medio riga" data-in="0.3">ranked by <span class="verde">blind votes</span>.</p><span class="chip riga" data-in="0.8"><span data-conta="${contaGratis}" data-da="0.8">0</span> free chat models</span>`),
  scena(7.0, 13.4, `<p class="medio riga" data-in="0">Top 5 free chat models</p><p class="piccolo riga" data-in="0.2">This week, ${esc(dati.aggiornato)}</p><div class="grafico-v" data-luce="3.6">${grafico}</div><p class="etichetta-rif riga" data-in="2.6">Dashed line = best paid: <b>${esc(pagato.nome)}</b></p>`),
  scena(13.4, 16.8, `<p class="grande riga" data-in="0.1">All five</p><p class="grande riga verde" data-in="0.4">are open.</p><p class="medio riga" data-in="0.9">Download. Run. Free.</p>`),
  scena(16.8, 20.0, `<p class="medio riga" data-in="0.1">Which one runs on <span class="verde">your GPU</span>?</p><p class="url riga" data-in="0.5">freellmarena.com</p><p class="piccolo riga" data-in="0.9">Free · updated every night</p>`),
], 20);

// ---------- video 2: il modello nuovo ----------
const nomeCorto = nuovo.nome.replace(/-\d{4}$/, '');
const giorno = new Date(nuovo.creato + 'T12:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
const ctx = nuovo.hf.ctx || 0;
const ctxTesto = ctx >= 1048576 ? `${Math.round(ctx / 1048576 * 10) / 10} million` : `${Math.round(ctx / 1024)}K`;
// schede di casa in ordine di memoria utile (le unificate ne danno al modello circa il 75%, come nel simulatore del sito)
const usa = (s) => Math.round(s.gb * (s.unificata ? 0.75 : 1));
const casa = dati.schede.schede.filter((s) => s.marca !== 'Data center').sort((a, b) => usa(a) - usa(b) || a.gb - b.gb);
const iTiene = casa.findIndex((s) => usa(s) >= gb4);
const chiTiene = iTiene >= 0 ? casa[iTiene] : null;
// se qualcuna lo tiene: le due appena sotto (no) e la prima che basta (sì); se nessuna: le quattro grandi di sempre (no)
const mostrate = chiTiene ? casa.slice(Math.max(0, iTiene - 2), iTiene + 1) : schede;
const righeSchede = mostrate.map((s, i) => {
  const si = usa(s) >= gb4;
  return `<div class="scheda-v riga" data-in="${0.9 + i * 0.5}"><b>${esc(s.nome)}</b><span class="${si ? 'si' : 'no'}">${si ? '✓' : '✕'}</span><span class="pista"><i data-pista="${Math.min(100, (usa(s) / gb4) * 100).toFixed(1)}" data-da="${1.1 + i * 0.5}"></i></span></div>`;
}).join('');
const esito = chiTiene ? `The ${esc(chiTiene.nome)} runs it fully on the GPU.` : `Not even a ${esc(schede.at(-1)?.nome || 'top home machine')} holds it.`;
const nomeLungo = nomeCorto.length > 22 ? 84 : nomeCorto.length > 16 ? 96 : 112;
const nuovoV = pagina([
  scena(0, 3.4, `<p class="grande riga verde" data-in="0">${Math.round(nuovo.hf.b)}B parameters.</p><p class="medio riga" data-in="0.2">Free to download.</p><div class="gancio riga" data-in="0.25"><span>It needs · ${gb4} GB</span><span class="pista"><i class="pagato" data-pista="100" data-da="0.3"></i></span><span>RTX 4090 · 24 GB</span><span class="pista"><i data-pista="${Math.min(100, 24 / gb4 * 100).toFixed(1)}" data-da="0.4"></i></span></div>`),
  scena(3.4, 6.6, `<span class="chip riga" data-in="0">NEW · ${esc(giorno)}</span><p class="grande riga" data-in="0.2" style="font-size:${nomeLungo}px;overflow-wrap:anywhere">${esc(nomeCorto)}</p><p class="piccolo riga" data-in="0.6">by ${esc(nomeLab(nuovo.org))} · open weights</p>`),
  scena(6.6, 12.2, `<p class="medio riga" data-in="0">Can <span class="verde">your PC</span> run it?</p><p class="serve riga" data-in="0.3">It needs <span>${gb4} GB</span> at 4-bit.</p>${righeSchede}<p class="piccolo riga" data-in="${0.9 + mostrate.length * 0.5}">${esito}</p>`),
  scena(12.2, 16.2, `<p class="grande riga verde" data-in="0.1">${ctxTesto}</p><p class="medio riga" data-in="0.3">tokens of context.</p><p class="piccolo riga" data-in="1.0">Ranked as soon as Arena votes on it.</p>`),
  scena(16.2, 20.0, `<p class="medio riga" data-in="0.1">Compare it with <span class="verde">every free model</span></p><p class="url riga" data-in="0.5">freellmarena.com</p>`),
], 20);

fs.writeFileSync(path.join(OUT, 'scena-settimana.html'), settimana);
fs.writeFileSync(path.join(OUT, 'scena-nuovo.html'), nuovoV);
// titolo, descrizione e tag per YouTube; il testo da condividere segue le regole della skill social (niente frasi da IA)
const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9.]+/g, '-').replace(/^-|-$/g, '');
const info = {
  settimana: {
    nome: `settimana-${dati.aggiornato}`,
    titolo: `The best free AI model is ${distacco} points behind the best paid one #Shorts`,
    descrizione: `Top 5 free chat models on Arena this week (${dati.aggiornato}), by blind human votes:
${top5.map((m, i) => `${i + 1}. ${m.nome} (${m.punti})`).join('\n')}
Best paid model: ${pagato.nome} (${pagato.punti}).
Free-only ranking, updated every night: https://freellmarena.com`,
    tag: ['free AI', 'open source AI', 'AI leaderboard', 'local LLM'],
    condividi: `${pagato.nome} leads Arena's chat ranking at ${pagato.punti}. The best free model, ${top5[0].nome}, is ${distacco} points behind, and ${top5.every((m) => m.aperto) ? 'all top 5 free models are open weights' : 'the next four are close'}. freellmarena.com`,
  },
  nuovo: {
    nome: `nuovo-${slug(nuovo.nome)}`,
    titolo: `${nomeCorto}: ${Math.round(nuovo.hf.b)}B parameters, free to download #Shorts`.slice(0, 100),
    descrizione: `${nuovo.nome} by ${nuovo.org} came out on ${giorno}, with open weights on Hugging Face. At 4-bit it needs about ${gb4} GB of memory.
Compare it with every free model: https://freellmarena.com`,
    tag: ['free AI', 'open source AI', 'local LLM', nomeCorto],
    condividi: `${nomeCorto} is out: ${Math.round(nuovo.hf.b)}B parameters and open weights. At 4-bit it needs about ${gb4} GB${chiTiene ? `, so the smallest card that holds it fully is the ${chiTiene.nome}` : ', more than any single home machine on our list can hold'}. freellmarena.com`,
  },
};
for (const [k, v] of Object.entries(info)) fs.writeFileSync(path.join(OUT, `info-${k}.json`), JSON.stringify(v, null, 1));
console.log('ok', { distacco, contaGratis, top5: top5.map((m) => m.nome), pagato: pagato.nome, nuovo: nuovo.nome, gb4, ctxTesto, chiTiene: chiTiene?.nome, mostrate: mostrate.map((s) => s.nome) });
