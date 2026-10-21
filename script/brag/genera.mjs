// Video verticali fatti con le regole della skill /brag-slim (latent-spaces/brag), approvati da Marco il 20/10/2026.
// Dal 21/10/2026 (richiesta di Marco, punti A-F): voce fuori campo, sottotitoli parola per parola, musica sotto la voce,
// versione inglese e italiana, tre tipi di video (nuovo, settimana, gpu) e chiusura fissa «link in bio».
// Per ogni tipo e lingua crea video/brag/scena-<tipo>[-it].html (ogni fotogramma è funzione pura del tempo, render(t))
// e video/brag/info-<tipo>[-it].json: nome, titolo, descrizione, tag, testo da condividere e, scena per scena,
// la frase da leggere («voce») e la durata minima. I tempi veri li decide registra.py dalla durata della voce.
// Riusa i pezzi veri del sito: il CSS (sorgente/style.css), il grafico a barre (barre), i colori dei laboratori, il simulatore.
import fs from 'node:fs';
import path from 'node:path';
import { barre } from '../../script/sito/grafici.mjs';
import { coloreLab, nomeLab, chiaveLab } from '../../script/sito/laboratori.mjs';
import { simula, daScheda } from '../../sorgente/calc.mjs';

const QUI = path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1'));
const RADICE = path.join(QUI, '..', '..');
const OUT = path.join(RADICE, 'video', 'brag');
fs.mkdirSync(OUT, { recursive: true });
const dati = JSON.parse(fs.readFileSync(path.join(RADICE, 'sito', 'data.json'), 'utf8'));
const css = fs.readFileSync(path.join(RADICE, 'sorgente', 'style.css'), 'utf8');
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const gratis = (m) => m.aperto || m.or?.gratis;
export const LINGUE_VIDEO = ['en', 'it'];

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

// scheda della settimana per il video «gpu»: a rotazione fra le più diffuse (BRAG_GPU=<id> per le prove)
const ROTAZIONE = ['rtx3060-12', 'rtx4060ti-16', 'rtx4070', 'rtx4090', 'rtx5060ti-16', 'rx7900xtx', 'rtx5090', 'rtx3090', 'rx9070xt', 'm4pro-64'];
const settimanaAnno = Math.floor((Date.parse(dati.aggiornato + 'T12:00:00Z') - Date.UTC(2026, 0, 5)) / (7 * 864e5));
const gpu = dati.schede.schede.find((s) => s.id === (process.env.BRAG_GPU || ROTAZIONE[((settimanaAnno % ROTAZIONE.length) + ROTAZIONE.length) % ROTAZIONE.length]));
// sulla scheda con 32 GB di RAM DDR5 (un PC di casa normale, come nella pagina /ram): i 3 modelli gratis di chat più votati
// che scrivono almeno alla velocità di lettura (10 token/s), e per ognuno se sta tutto sulla GPU o in parte nella RAM
const VELOCE = 10;
const sullaScheda = chat.modelli.filter((m) => gratis(m) && m.hf).map((m) => ({ m, r: simula(m.hf, daScheda(gpu, { n: 1, ram: 32, bandaRam: 96, ctx: 8192 })) }))
  .filter((x) => x.r.dove !== 'no' && x.r.vel >= VELOCE).slice(0, 3);

// ---------- parole: inglese e italiano ----------
// per la voce: i numeri delle schede letti a coppie («RTX 40 90» = «forty ninety»), «B» = miliardi
const voceScheda = (n) => n.replace(/\b(RTX|GTX)\s?(\d\d)(\d\d)\b/g, '$1 $2 $3').replace(/\s*\/.*$/, '').replace(/\s\d+ GB$/, '');
const fmtVel = (v) => (v >= 10 ? Math.round(v) : v.toFixed(1));
const giorno = (d, l) => new Date(d + 'T12:00:00Z').toLocaleDateString(l === 'it' ? 'it-IT' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const ctx = nuovo.hf.ctx || 0;
const ctxTesto = (l) => (ctx >= 1048576 ? `${String(Math.round(ctx / 1048576 * 10) / 10).replace('.', l === 'it' ? ',' : '.')} ${l === 'it' ? 'milioni' : 'million'}` : `${Math.round(ctx / 1024)}K`);
const ctxVoce = (l) => (ctx >= 1048576 ? ctxTesto(l) : `${Math.round(ctx / 1024)} ${l === 'it' ? 'mila' : 'thousand'}`);
const SITO = { en: 'freellmarena.com', it: 'freellmarena.com/it' };

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
/* le scene stanno sopra i sottotitoli: lo spazio in basso è loro */
.scena{position:absolute;inset:0;padding:0 88px 420px;display:flex;flex-direction:column;justify-content:center;gap:34px;opacity:0}
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
.scheda-v small{grid-column:1 / -1;font:500 34px/1.2 var(--sans);color:var(--muted)}
.scheda-v .no{font:800 44px/1 var(--sans);color:#ef4444}
.scheda-v .si{font:800 44px/1 var(--sans);color:var(--v-verde)}
.scheda-v .pista{grid-column:1 / -1;position:relative;height:22px;border-radius:11px;background:var(--line);overflow:hidden}
.scheda-v .pista i{position:absolute;left:0;top:0;bottom:0;background:var(--c-gpu);border-radius:11px}
.scheda-v .pista i.verde-b{background:var(--v-verde)}
.serve{font:700 52px/1.2 var(--sans)}
.serve span{color:var(--v-verde)}
.url{font:800 96px/1 var(--sans);color:var(--v-verde);letter-spacing:-.02em;overflow-wrap:anywhere}
.gancio{display:grid;gap:14px;margin-top:18px}
.gancio>span:not(.pista){font:700 40px/1.2 var(--sans);color:var(--muted)}
.gancio .pista{position:relative;height:56px;border-radius:12px;background:var(--line);overflow:hidden}
.gancio .pista i{position:absolute;left:0;top:0;bottom:0;border-radius:12px;background:var(--v-verde)}
.gancio .pista i.pagato{background:repeating-linear-gradient(135deg,var(--ink) 0 14px,var(--muted) 14px 28px)}
/* sottotitoli parola per parola (B): grandi, in basso, la parola detta adesso in verde */
.sotto{position:absolute;left:70px;right:70px;bottom:190px;min-height:200px;display:flex;align-items:center;justify-content:center;z-index:6}
.sotto p{margin:0;max-width:940px;padding:20px 30px;border-radius:24px;background:rgba(2,6,23,.78);color:#fff;font:800 66px/1.18 var(--sans);text-align:center;letter-spacing:-.01em}
.sotto p:empty{display:none}
.sotto b{color:var(--v-verde)}
/* chiusura fissa (F): uguale in tutti i video */
.fine{align-items:center;text-align:center}
.fine .segno{width:150px;height:150px;padding:0 24px 28px;gap:14px;border-radius:36px}
.fine .segno i{width:26px}
.fine .url{font-size:76px;overflow-wrap:normal;white-space:nowrap}
.fine .bio{font:800 64px/1.1 var(--sans);padding:26px 44px;border-radius:999px;background:var(--v-verde);color:#04130b}
`;

// ---------- motore: ogni elemento ha [entra, esce] in secondi; tutto si calcola da t ----------
// SOTTO (da registra.py): [{da, a, parole: [[testo, quando], …]}]; senza, niente sottotitoli
const MOTORE = `
const ease = (x) => x <= 0 ? 0 : x >= 1 ? 1 : 1 - Math.pow(1 - x, 3);
const fin = (t, a, d) => ease((t - a) / d);
const escH = (s) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
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
  const pezzo = (window.SOTTO || []).find((p) => t >= p.da && t < p.a);
  const riga = document.querySelector('.sotto p');
  if (riga) riga.innerHTML = pezzo ? pezzo.parole.map(([w, q], i) => { const ora = t >= q && (i === pezzo.parole.length - 1 || t < pezzo.parole[i + 1][1]); return ora ? '<b>' + escH(w) + '</b>' : escH(w); }).join(' ') : '';
  document.querySelector('.avanza i').style.width = (t / DURATA * 100) + '%';
}
`;

// scene: [{min, voce, corpo}]. data-da/data-a provvisori (dalle durate minime): registra.py li rimette dalla voce.
function pagina(scene, l) {
  const tutte = [...scene, chiusura(l)];
  let t = 0;
  const html = tutte.map((s) => { const da = t; t += s.min; return `<section class="scena${s.classe ? ' ' + s.classe : ''}" data-da="${da}" data-a="${t}">${s.corpo}</section>`; });
  return {
    html: `<!doctype html><html lang="${l}"><head><meta charset="utf-8"><style>${css}${STILE}</style></head><body>
<div class="tela">${marchio}${html.join('\n')}<div class="sotto"><p></p></div><div class="avanza"><i></i></div></div>
<script>let DURATA = ${t};${MOTORE};render(0)</script></body></html>`,
    scene: tutte.map((s) => ({ min: s.min, voce: s.voce })),
  };
}
// chiusura (F): marchio grande, indirizzo, «link in bio»; sempre uguale
const chiusura = (l) => ({
  min: 2.6, classe: 'fine',
  voce: l === 'it' ? 'Trovi tutto su FreeLLMArena. Link nella bio.' : 'Find it all on FreeLLMArena. Link in bio.',
  corpo: `<span class="segno riga" data-in="0"><i style="height:60px"></i><i style="height:96px"></i><i style="height:76px"></i></span><p class="url riga" data-in="0.2">${SITO[l]}</p><span class="bio riga" data-in="0.45">${l === 'it' ? 'Link nella bio ↑' : 'Link in bio ↑'}</span>`,
});

// ---------- video 1: la settimana ----------
const distacco = pagato.punti - top5[0].punti;
const grafico = barre(top5.map((m) => ({ nome: m.nome, valore: m.punti, href: '#', lab: coloreLab(m.org), chiaveLab: chiaveLab(m.org), nomeLab: nomeLab(m.org) })), { riferimento: { valore: pagato.punti, nome: pagato.nome } })
  .replace(/<p class="small muted">[\s\S]*?<\/p>/, ''); // la didascalia lunga non si legge in un video
const tuttiAperti = top5.every((m) => m.aperto);
function videoSettimana(l) {
  const it = l === 'it';
  const scalaPagato = ((pagato.punti - 1400) / (pagato.punti - 1390) * 100).toFixed(1), scalaGratis = ((top5[0].punti - 1400) / (pagato.punti - 1390) * 100).toFixed(1);
  return pagina([
    // regole della skill «video» (coreyhaines31): gancio visivo e testo entro il primo secondo, al massimo 2 righe corte per frase,
    // parole chiave in colore, invito finale chiaro. Il gancio mostra il distacco con due barre vere sulla scala del grafico (da 1400).
    { min: 3.6, voce: it ? `La migliore AI gratis è a ${distacco} punti da quella a pagamento.` : `The best free AI is ${distacco} points behind the best paid one.`,
      corpo: `<p class="grande riga" data-in="0">${it ? "L'AI gratis è" : 'Free AI is'}</p><p class="grande riga verde" data-in="0.15">${distacco} ${it ? 'punti' : 'points'}</p><p class="medio riga" data-in="0.3">${it ? 'dietro quella a pagamento.' : 'behind paid AI.'}</p><div class="gancio riga" data-in="0.2"><span>${it ? 'Miglior a pagamento' : 'Best paid'} · ${pagato.punti}</span><span class="pista"><i class="pagato" data-pista="${scalaPagato}" data-da="0.25"></i></span><span>${it ? 'Miglior gratis' : 'Best free'} · ${top5[0].punti}</span><span class="pista"><i data-pista="${scalaGratis}" data-da="0.35"></i></span><span style="font-size:30px">${it ? 'La scala parte da 1400, come sul sito.' : 'Scale starts at 1400, like on the site.'}</span></div>` },
    { min: 3.4, voce: it ? `Mettiamo in classifica ${contaGratis} modelli gratis, con voti di persone vere, alla cieca.` : `We rank ${contaGratis} free chat models by blind human votes.`,
      corpo: `<p class="medio riga" data-in="0">${it ? 'Ogni modello AI gratis,' : 'Every free AI model,'}</p><p class="medio riga" data-in="0.3">${it ? 'in classifica con <span class="verde">voti alla cieca</span>.' : 'ranked by <span class="verde">blind votes</span>.'}</p><span class="chip riga" data-in="0.8"><span data-conta="${contaGratis}" data-da="0.8">0</span> ${it ? 'modelli gratis' : 'free chat models'}</span>` },
    { min: 6.4, voce: it ? 'Ecco i cinque migliori di questa settimana.' : 'Here are the top five this week.',
      corpo: `<p class="medio riga" data-in="0">${it ? 'I 5 migliori modelli gratis' : 'Top 5 free chat models'}</p><p class="piccolo riga" data-in="0.2">${it ? 'Questa settimana' : 'This week'}, ${esc(giorno(dati.aggiornato, l))}</p><div class="grafico-v" data-luce="3.6">${grafico}</div><p class="etichetta-rif riga" data-in="2.6">${it ? 'Linea tratteggiata = miglior a pagamento' : 'Dashed line = best paid'}: <b>${esc(pagato.nome)}</b></p>` },
    tuttiAperti
      ? { min: 3.4, voce: it ? 'Sono tutti e cinque aperti: li scarichi e li usi gratis.' : 'All five are open: download them and run them for free.',
        corpo: `<p class="grande riga" data-in="0.1">${it ? 'Tutti e cinque' : 'All five'}</p><p class="grande riga verde" data-in="0.4">${it ? 'sono aperti.' : 'are open.'}</p><p class="medio riga" data-in="0.9">${it ? 'Scarica. Usa. Gratis.' : 'Download. Run. Free.'}</p>` }
      : { min: 3.4, voce: it ? 'Puoi provarli tutti gratis, online o sul tuo computer.' : 'You can try all of them for free, online or on your own computer.',
        corpo: `<p class="grande riga" data-in="0.1">${it ? 'Tutti' : 'All of them'}</p><p class="grande riga verde" data-in="0.4">${it ? 'gratis.' : 'free.'}</p>` },
    { min: 3.0, voce: it ? 'Quale gira sulla tua scheda video?' : 'Which one runs on your GPU?',
      corpo: `<p class="medio riga" data-in="0.1">${it ? 'Quale gira sulla <span class="verde">tua GPU</span>?' : 'Which one runs on <span class="verde">your GPU</span>?'}</p><p class="piccolo riga" data-in="0.5">${it ? 'Gratis · aggiornato ogni notte' : 'Free · updated every night'}</p>` },
  ], l);
}

// ---------- video 2: il modello nuovo ----------
const nomeCorto = nuovo.nome.replace(/-\d{4}$/, '');
// schede di casa in ordine di memoria utile (le unificate ne danno al modello circa il 75%, come nel simulatore del sito)
const usa = (s) => Math.round(s.gb * (s.unificata ? 0.75 : 1));
const casa = dati.schede.schede.filter((s) => s.marca !== 'Data center').sort((a, b) => usa(a) - usa(b) || a.gb - b.gb);
const iTiene = casa.findIndex((s) => usa(s) >= gb4);
const chiTiene = iTiene >= 0 ? casa[iTiene] : null;
// se qualcuna lo tiene: le due appena sotto (no) e la prima che basta (sì); se nessuna: le quattro grandi di sempre (no)
const mostrate = chiTiene ? casa.slice(Math.max(0, iTiene - 2), iTiene + 1) : schede;
const nomeLungo = nomeCorto.length > 22 ? 84 : nomeCorto.length > 16 ? 96 : 112;
const miliardi = Math.round(nuovo.hf.b);
function videoNuovo(l) {
  const it = l === 'it';
  const righeSchede = mostrate.map((s, i) => {
    const si = usa(s) >= gb4;
    return `<div class="scheda-v riga" data-in="${0.9 + i * 0.5}"><b>${esc(s.nome)}</b><span class="${si ? 'si' : 'no'}">${si ? '✓' : '✕'}</span><span class="pista"><i data-pista="${Math.min(100, (usa(s) / gb4) * 100).toFixed(1)}" data-da="${1.1 + i * 0.5}"></i></span></div>`;
  }).join('');
  const esito = chiTiene
    ? (it ? `La ${esc(chiTiene.nome)} lo fa girare tutto sulla GPU.` : `The ${esc(chiTiene.nome)} runs it fully on the GPU.`)
    : (it ? `Non basta nemmeno un ${esc(schede.at(-1)?.nome || 'computer di casa')}.` : `Not even a ${esc(schede.at(-1)?.nome || 'top home machine')} holds it.`);
  const esitoVoce = chiTiene
    ? (it ? `Serve almeno una ${voceScheda(chiTiene.nome)}.` : `You need at least an ${voceScheda(chiTiene.nome)}.`)
    : (it ? 'Nessun computer di casa della nostra lista basta.' : 'No single home machine on our list can hold it.');
  return pagina([
    { min: 3.4, voce: it ? `Un nuovo modello AI gratis da ${miliardi} miliardi di parametri.` : `A new free AI model with ${miliardi} billion parameters.`,
      corpo: `<p class="grande riga verde" data-in="0">${miliardi}B ${it ? 'parametri.' : 'parameters.'}</p><p class="medio riga" data-in="0.2">${it ? 'Da scaricare gratis.' : 'Free to download.'}</p><div class="gancio riga" data-in="0.25"><span>${it ? 'Gli servono' : 'It needs'} · ${gb4} GB</span><span class="pista"><i class="pagato" data-pista="100" data-da="0.3"></i></span><span>RTX 4090 · 24 GB</span><span class="pista"><i data-pista="${Math.min(100, 24 / gb4 * 100).toFixed(1)}" data-da="0.4"></i></span></div>` },
    { min: 3.2, voce: it ? `Lo ha fatto ${nomeLab(nuovo.org)}, e i pesi sono aperti.` : `It comes from ${nomeLab(nuovo.org)}, with open weights.`,
      corpo: `<span class="chip riga" data-in="0">${it ? 'NUOVO' : 'NEW'} · ${esc(giorno(nuovo.creato, l))}</span><p class="grande riga" data-in="0.2" style="font-size:${nomeLungo}px;overflow-wrap:anywhere">${esc(nomeCorto)}</p><p class="piccolo riga" data-in="0.6">${it ? 'di' : 'by'} ${esc(nomeLab(nuovo.org))} · ${it ? 'pesi aperti' : 'open weights'}</p>` },
    { min: 5.6, voce: it ? `Gira sul tuo PC? A 4 bit gli servono circa ${gb4} gigabyte. ${esitoVoce}` : `Can your PC run it? At 4-bit it needs about ${gb4} gigabytes. ${esitoVoce}`,
      corpo: `<p class="medio riga" data-in="0">${it ? 'Gira sul <span class="verde">tuo PC</span>?' : 'Can <span class="verde">your PC</span> run it?'}</p><p class="serve riga" data-in="0.3">${it ? `Servono <span>${gb4} GB</span> a 4 bit.` : `It needs <span>${gb4} GB</span> at 4-bit.`}</p>${righeSchede}<p class="piccolo riga" data-in="${0.9 + mostrate.length * 0.5}">${esito}</p>` },
    ctx ? { min: 3.6, voce: it ? `Legge fino a ${ctxVoce(l)} token in una volta.` : `It reads up to ${ctxVoce(l)} tokens at once.`,
      corpo: `<p class="grande riga verde" data-in="0.1">${ctxTesto(l)}</p><p class="medio riga" data-in="0.3">${it ? 'token di contesto.' : 'tokens of context.'}</p><p class="piccolo riga" data-in="1.0">${it ? 'In classifica appena Arena lo vota.' : 'Ranked as soon as Arena votes on it.'}</p>` } : null,
    { min: 3.0, voce: it ? 'Confrontalo con tutti i modelli gratis.' : 'Compare it with every free model.',
      corpo: `<p class="medio riga" data-in="0.1">${it ? 'Confrontalo con <span class="verde">tutti i modelli gratis</span>' : 'Compare it with <span class="verde">every free model</span>'}</p>` },
  ].filter(Boolean), l);
}

// ---------- video 3: la scheda video della settimana (E) ----------
function videoGpu(l) {
  const it = l === 'it';
  const nomeG = gpu.nome.replace(/ \d+ GB$/, '');
  const migliore = sullaScheda[0];
  const righe = sullaScheda.map((x, i) => `<div class="scheda-v riga" data-in="${0.6 + i * 0.5}"><b>${esc(x.m.nome)}</b><span class="si">${fmtVel(x.r.vel)} tok/s</span><small>${esc(nomeLab(x.m.org))} · Arena ${x.m.punti} · ${x.r.dove === 'gpu' ? (it ? 'tutto sulla GPU' : 'fully on the GPU') : 'GPU + RAM'}</small><span class="pista"><i class="verde-b" data-pista="${Math.min(100, x.r.vel / Math.max(...sullaScheda.map((y) => y.r.vel)) * 100).toFixed(1)}" data-da="${0.8 + i * 0.5}"></i></span></div>`).join('');
  return pagina([
    { min: 3.4, voce: it ? `Qual è la migliore AI gratis per una ${voceScheda(gpu.nome)}?` : `What's the best free AI for an ${voceScheda(gpu.nome)}?`,
      corpo: `<p class="medio riga" data-in="0">${it ? 'La migliore AI gratis per' : 'The best free AI for'}</p><p class="grande riga verde" data-in="0.2" style="font-size:${nomeG.length > 14 ? 104 : 132}px">${esc(nomeG)}</p>` },
    { min: 3.0, voce: it ? `Ha ${gpu.gb} gigabyte di memoria.` : `It has ${gpu.gb} gigabytes of memory.`,
      corpo: `<p class="grande riga" data-in="0"><span data-conta="${gpu.gb}" data-da="0.1">0</span> GB</p><p class="medio riga" data-in="0.3">${it ? 'di memoria' : 'of memory'}</p><p class="piccolo riga" data-in="0.6">${gpu.banda} GB/s · ${esc(gpu.marca)}</p>` },
    migliore ? { min: 5.6, voce: it ? `Con 32 gigabyte di RAM, il migliore è di ${nomeLab(migliore.m.org)}: circa ${fmtVel(migliore.r.vel)} token al secondo.` : `With 32 gigabytes of RAM, the best one is from ${nomeLab(migliore.m.org)}, at about ${fmtVel(migliore.r.vel)} tokens per second.`,
      corpo: `<p class="medio riga" data-in="0">${it ? 'Con <span class="verde">32 GB di RAM</span>' : 'With <span class="verde">32 GB of RAM</span>'}</p>${righe}<p class="piccolo riga" data-in="${0.8 + sullaScheda.length * 0.5}">${it ? '4 bit, 8K di contesto, DDR5. Stima del nostro simulatore.' : '4-bit, 8K context, DDR5. Our simulator’s estimate.'}</p>` }
      : { min: 3.4, voce: it ? 'Nessun modello in classifica scrive abbastanza veloce su questa scheda.' : 'No ranked model writes fast enough on this card.', corpo: `<p class="medio riga" data-in="0">${it ? 'Nessun modello in classifica è abbastanza veloce.' : 'No ranked model is fast enough.'}</p>` },
    { min: 3.0, voce: it ? 'Prova la tua scheda nel simulatore gratis.' : 'Try your own card in our free simulator.',
      corpo: `<p class="medio riga" data-in="0.1">${it ? 'Prova la <span class="verde">tua scheda</span>' : 'Try <span class="verde">your card</span>'}</p><p class="piccolo riga" data-in="0.4">${it ? 'Simulatore gratis, 35 schede' : 'Free simulator, 35 cards'}</p>` },
  ].filter(Boolean), l);
}

// ---------- titoli, descrizioni e tag per YouTube (in inglese e in italiano) ----------
const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9.]+/g, '-').replace(/^-|-$/g, '');
const sito = (l) => `https://${SITO[l]}`;
const INFO = {
  settimana: (l) => (l === 'it'
    ? { nome: `settimana-${dati.aggiornato}-it`, titolo: `La miglior AI gratis è a ${distacco} punti da quella a pagamento #Shorts`,
      descrizione: `I 5 migliori modelli di chat gratis su Arena questa settimana (${dati.aggiornato}), con voti alla cieca di persone vere:\n${top5.map((m, i) => `${i + 1}. ${m.nome} (${m.punti})`).join('\n')}\nMiglior modello a pagamento: ${pagato.nome} (${pagato.punti}).\nClassifica solo dei modelli gratis, aggiornata ogni notte: ${sito(l)}`,
      tag: ['AI gratis', 'intelligenza artificiale', 'classifica AI', 'LLM locale'],
      condividi: `${pagato.nome} è primo nella classifica chat di Arena con ${pagato.punti}. Il miglior modello gratis, ${top5[0].nome}, è a ${distacco} punti. ${sito(l)}` }
    : { nome: `settimana-${dati.aggiornato}`, titolo: `The best free AI model is ${distacco} points behind the best paid one #Shorts`,
      descrizione: `Top 5 free chat models on Arena this week (${dati.aggiornato}), by blind human votes:\n${top5.map((m, i) => `${i + 1}. ${m.nome} (${m.punti})`).join('\n')}\nBest paid model: ${pagato.nome} (${pagato.punti}).\nFree-only ranking, updated every night: ${sito(l)}`,
      tag: ['free AI', 'open source AI', 'AI leaderboard', 'local LLM'],
      condividi: `${pagato.nome} leads Arena's chat ranking at ${pagato.punti}. The best free model, ${top5[0].nome}, is ${distacco} points behind, and ${tuttiAperti ? 'all top 5 free models are open weights' : 'the next four are close'}. ${sito(l)}` }),
  nuovo: (l) => (l === 'it'
    ? { nome: `nuovo-${slug(nuovo.nome)}-it`, titolo: `${nomeCorto}: ${miliardi} miliardi di parametri, gratis #Shorts`.slice(0, 100),
      descrizione: `${nuovo.nome} di ${nomeLab(nuovo.org)} è uscito il ${giorno(nuovo.creato, l)}, con i pesi aperti su Hugging Face. A 4 bit servono circa ${gb4} GB di memoria.\nConfrontalo con tutti i modelli gratis: ${sito(l)}`,
      tag: ['AI gratis', 'intelligenza artificiale', 'LLM locale', nomeCorto],
      condividi: `È uscito ${nomeCorto}: ${miliardi} miliardi di parametri e pesi aperti. A 4 bit servono circa ${gb4} GB${chiTiene ? `: la scheda più piccola che lo tiene tutto è la ${chiTiene.nome}` : ', più di qualunque computer di casa della nostra lista'}. ${sito(l)}` }
    : { nome: `nuovo-${slug(nuovo.nome)}`, titolo: `${nomeCorto}: ${miliardi}B parameters, free to download #Shorts`.slice(0, 100),
      descrizione: `${nuovo.nome} by ${nomeLab(nuovo.org)} came out on ${giorno(nuovo.creato, l)}, with open weights on Hugging Face. At 4-bit it needs about ${gb4} GB of memory.\nCompare it with every free model: ${sito(l)}`,
      tag: ['free AI', 'open source AI', 'local LLM', nomeCorto],
      condividi: `${nomeCorto} is out: ${miliardi}B parameters and open weights. At 4-bit it needs about ${gb4} GB${chiTiene ? `, so the smallest card that holds it fully is the ${chiTiene.nome}` : ', more than any single home machine on our list can hold'}. ${sito(l)}` }),
  gpu: (l) => {
    const m = sullaScheda[0];
    return l === 'it'
      ? { nome: `gpu-${gpu.id}-${dati.aggiornato}-it`, titolo: `La miglior AI gratis per ${gpu.nome} #Shorts`.slice(0, 100),
        descrizione: `I migliori modelli AI gratis su ${gpu.nome} (${gpu.gb} GB, ${gpu.banda} GB/s) con 32 GB di RAM DDR5, a 4 bit con 8K di contesto:\n${sullaScheda.map((x, i) => `${i + 1}. ${x.m.nome}: circa ${fmtVel(x.r.vel)} token/s (Arena ${x.m.punti}, ${x.r.dove === 'gpu' ? 'tutto sulla GPU' : 'GPU + RAM'})`).join('\n')}\nStime del nostro simulatore. Prova la tua scheda: ${sito(l)}/home`,
        tag: ['AI gratis', 'LLM locale', gpu.nome, 'scheda video AI'],
        condividi: m ? `Su ${gpu.nome} con 32 GB di RAM il miglior modello gratis è ${m.m.nome}, circa ${fmtVel(m.r.vel)} token/s. ${sito(l)}/home` : `${gpu.nome}: ${gpu.gb} GB. ${sito(l)}/home` }
      : { nome: `gpu-${gpu.id}-${dati.aggiornato}`, titolo: `The best free AI for the ${gpu.nome} #Shorts`.slice(0, 100),
        descrizione: `The best free AI models on the ${gpu.nome} (${gpu.gb} GB, ${gpu.banda} GB/s) with 32 GB of DDR5 RAM, at 4-bit with 8K context:\n${sullaScheda.map((x, i) => `${i + 1}. ${x.m.nome}: about ${fmtVel(x.r.vel)} tokens/s (Arena ${x.m.punti}, ${x.r.dove === 'gpu' ? 'fully on the GPU' : 'GPU + RAM'})`).join('\n')}\nEstimates from our simulator. Try your own card: ${sito(l)}/home`,
        tag: ['free AI', 'local LLM', gpu.nome, 'GPU for AI'],
        condividi: m ? `On the ${gpu.nome} with 32 GB of RAM, the best free model is ${m.m.nome}, at about ${fmtVel(m.r.vel)} tokens/s. ${sito(l)}/home` : `${gpu.nome}: ${gpu.gb} GB. ${sito(l)}/home` };
  },
};

const VIDEO = { settimana: videoSettimana, nuovo: videoNuovo, gpu: videoGpu };
for (const [tipo, fai] of Object.entries(VIDEO)) {
  for (const l of LINGUE_VIDEO) {
    const coda = l === 'en' ? '' : `-${l}`;
    const { html, scene } = fai(l);
    fs.writeFileSync(path.join(OUT, `scena-${tipo}${coda}.html`), html);
    fs.writeFileSync(path.join(OUT, `info-${tipo}${coda}.json`), JSON.stringify({ ...INFO[tipo](l), lingua: l, scene }, null, 1));
  }
}
console.log('ok', { distacco, contaGratis, top5: top5.map((m) => m.nome), pagato: pagato.nome, nuovo: nuovo.nome, gb4, chiTiene: chiTiene?.nome, gpu: gpu.nome, sullaScheda: sullaScheda.map((x) => `${x.m.nome} ${fmtVel(x.r.vel)} ${x.r.dove}`) });
