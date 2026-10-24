// Video lungo di un modello nuovo (deciso da Marco il 22/10/2026, sul modello di Codedigipt: un video al giorno, 4-6 minuti).
// Orizzontale 1920x1080, in inglese, con voce e sottotitoli come gli altri video. Le fonti sono due e sole:
//   1. la scheda del modello su Hugging Face (README.md), scritta dal laboratorio;
//   2. i dati del sito: dimensioni, memoria a 4 bit, schede e PC che lo reggono e con che velocità (simulatore), API gratis.
// Il copione lo scrive Workers AI attraverso /api/scrivi (tetto «video»), con regole strette; poi un controllo in codice
// toglie ogni frase con un numero che non sta nelle fonti. Le parti con i dati (hardware, dove provarlo) sono scritte qui.
// Scrive video/brag/scena-modello.html, info-modello.json e fonti-modello.txt (le fonti, per il controllo del post).
// Uso: BOZZE_KEY=… node script/brag/modello.mjs   (BRAG_FATTI=file con le release già fatte; BRAG_COPIONE=file .json di prova)
import fs from 'node:fs';
import path from 'node:path';
import { nomeLab } from '../../script/sito/laboratori.mjs';
import { simula, daScheda } from '../../sorgente/calc.mjs';
import { MOTORE, STILE_ORIZZONTALE } from './motore.mjs';
import { chiediModello } from '../bozze.mjs';
import { numeri } from '../video-post.mjs';

const QUI = path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1'));
const RADICE = path.join(QUI, '..', '..');
const OUT = path.join(RADICE, 'video', 'brag');
fs.mkdirSync(OUT, { recursive: true });
const dati = JSON.parse(fs.readFileSync(path.join(RADICE, 'sito', 'data.json'), 'utf8'));
const css = fs.readFileSync(path.join(RADICE, 'sorgente', 'style.css'), 'utf8');
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fmtVel = (v) => (v >= 10 ? Math.round(v) : (Math.floor(v * 10) / 10).toFixed(1));
const giorno = (d) => new Date(d + 'T12:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9.]+/g, '-').replace(/^-|-$/g, '');
const voceNome = (n) => String(n).replace(/[-_]?\b20\d{6}\b/g, '').replace(/[-_]/g, ' ').replace(/\b(RTX|GTX)\s?(\d\d)(\d\d)\b/g, '$1 $2 $3').replace(/[()]/g, '').replace(/\s+/g, ' ').trim();

// ---------- 1. quale modello: il più recente con dimensioni note non ancora fatto ----------
const fatti = process.env.BRAG_FATTI && fs.existsSync(process.env.BRAG_FATTI) ? new Set(fs.readFileSync(process.env.BRAG_FATTI, 'utf8').split(/\s+/).filter(Boolean)) : new Set();
const candidati = [...dati.nuovi].filter((m) => m.hf && !m.gated).sort((a, b) => (b.creato || '').localeCompare(a.creato || ''));
const nomeVideo = (m) => `modello-${slug(m.nome)}`;
// chiesto un modello preciso (BRAG_MODELLO=<repo>) che non è fra i candidati (es. gated): niente video, non un altro al suo posto
if (process.env.BRAG_MODELLO && !candidati.some((x) => x.hf.repo === process.env.BRAG_MODELLO)) { console.log(`Modello non disponibile: ${process.env.BRAG_MODELLO}`); process.exit(0); }
const m = (process.env.BRAG_MODELLO && candidati.find((x) => x.hf.repo === process.env.BRAG_MODELLO)) || candidati.slice(0, 10).find((x) => !fatti.has(`video-${nomeVideo(x)}`));
if (!m) { console.log('Nessun modello nuovo da raccontare'); process.exit(0); }

// ---------- 2. la scheda del modello su Hugging Face ----------
async function scheda(repo) {
  const r = await fetch(`https://huggingface.co/${repo}/raw/main/README.md`);
  if (!r.ok) return { testo: '', licenza: '' };
  const grezzo = await r.text();
  const licenza = (/^---[\s\S]*?\nlicense:\s*([^\n]+)[\s\S]*?\n---/.exec(grezzo)?.[1] || '').trim();
  const testo = grezzo.replace(/^---[\s\S]*?\n---\n/, '')
    .replace(/<!--[\s\S]*?-->/g, ' ').replace(/!\[[^\]]*\]\([^)]*\)/g, ' ').replace(/<img[^>]*>/gi, ' ')
    .replace(/<[^>]+>/g, ' ').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/```[\s\S]*?```/g, ' [code example] ')
    .replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim().slice(0, 14000);
  return { testo, licenza };
}
const { testo: readme, licenza: licenzaGrezza } = await scheda(m.hf.repo);
const LICENZE = { mit: 'MIT', 'apache-2.0': 'Apache 2.0', 'gpl-3.0': 'GPL 3.0', 'cc-by-4.0': 'CC BY 4.0', 'cc-by-nc-4.0': 'CC BY-NC 4.0', 'bsd-3-clause': 'BSD 3-Clause' };
const licenza = /^(other|unknown|custom|)$/i.test(licenzaGrezza) ? '' : LICENZE[licenzaGrezza.toLowerCase()] || licenzaGrezza;
if (readme.length < 400) { console.log(`Scheda troppo corta o assente per ${m.hf.repo}: nessun video`); process.exit(0); }

// ---------- 3. i dati del sito ----------
const senzaSuffisso = String(m.org || '').replace(/-(ai|org|research|labs?|community)$/i, '');
const lab = nomeLab(m.org) !== nomeLab(senzaSuffisso) && /^[a-z]/.test(nomeLab(senzaSuffisso)) === false ? nomeLab(senzaSuffisso) : nomeLab(m.org);
const miliardi = Math.round(m.hf.b * 10) / 10, attivi = Math.round(m.hf.att * 10) / 10;
const moe = m.hf.att && m.hf.att < m.hf.b * 0.9;
const gb4 = Math.round(m.hf.b * 0.606 + 1.2 + 1.5);
const ctx = m.hf.ctx || 0;
const ctxTesto = ctx >= 1048576 ? `${Math.round(ctx / 1048576 * 10) / 10} million` : `${Math.round(ctx / 1024)}K`;
const schede = new Map(dati.schede.schede.map((s) => [s.id, s]));
const CASE = [['rtx3060-12', 32], ['rtx4090', 64], ['rtx5090', 64], ['m4max-128', 0], ['dgxspark', 0], ['strixhalo-128', 0], ['m3ultra-512', 0]];
const casa = CASE.map(([id, ram]) => { const s = schede.get(id); if (!s) return null; const r = simula(m.hf, daScheda(s, { n: 1, ram, bandaRam: 96, ctx: 8192 })); return r.dove !== 'no' && r.vel ? { s, ram, r } : null; }).filter(Boolean);
const veloci = casa.filter((x) => x.r.vel >= 10);
const usa = (s) => Math.round(s.gb * (s.unificata ? 0.75 : 1));
const piccola = dati.schede.schede.filter((s) => s.marca !== 'Data center').sort((a, b) => usa(a) - usa(b)).find((s) => usa(s) >= gb4);
const voto = dati.categorie.map((c) => ({ c, x: c.modelli.find((y) => y.hf?.repo === m.hf.repo || y.nome === m.nome) })).find((v) => v.x);
const api = m.or?.gratis ? m.or.id : null;
const FATTI = [
  `Model: ${m.nome}, by ${lab}, published on Hugging Face on ${giorno(m.creato)} (${m.hf.repo}).`,
  `Size: ${miliardi} billion parameters${moe ? `, ${attivi} billion active per token (mixture of experts)` : ''}. Context: ${ctxTesto} tokens.`,
  `License: ${licenza || 'see the model card'}. Downloads so far: ${m.download}.`,
  `Memory at 4-bit with 8K context: about ${gb4} GB. Smallest home machine that holds it fully: ${piccola ? piccola.nome : 'none on our list'}.`,
  ...casa.map((x) => `On ${x.s.nome}${x.ram ? ` with ${x.ram} GB of RAM` : ''}: about ${fmtVel(x.r.vel)} tokens per second (${x.r.dove === 'gpu' ? 'fully in GPU memory' : 'part in system RAM'}).`),
  voto ? `Arena: score ${voto.x.punti} in ${voto.c.nome}, rank #${voto.x.pos}.` : 'Arena: not voted yet.',
  api ? `Free API on OpenRouter: ${api}.` : 'No free API on OpenRouter yet; the open weights can be downloaded from Hugging Face.',
].join('\n');

// ---------- 4. il copione (Workers AI) ----------
const REGOLE = `You write the script of a 4 to 6 minute YouTube video for FreeLLMArena, a site that ranks AI models you can use for free.
Topic: the new open model ${m.nome} by ${lab}. Audience: people who run AI at home or look for free AI; smart, not experts.
Use ONLY facts from MODEL CARD and DATA. Never invent a benchmark, a number, a feature, a date or a comparison. If the model card makes a claim, say "according to ${lab}" or "the model card says".
Every number you write must appear in MODEL CARD or DATA exactly. Prefer few numbers, explained simply.
Style: spoken English, short sentences, concrete. No hype words (game-changer, revolutionary, insane, beast), no emojis, no "in this video we will". Say numbers as digits.
Return JSON: {"hook": "2 sentences that open the video, with the single most interesting fact", "sezioni": [{"titolo": "3 to 6 words", "punti": ["3 or 4 on-screen bullets, max 9 words each"], "voce": "narration for this part, 110 to 160 words"}], "descrizione": "2 sentences for the YouTube description"}.
Write 5 or 6 sections in this order when the card supports them: what the model is; what is new or different; what the benchmarks in the model card show (skip if the card has none); strengths and limits; who should try it. Do not write about hardware or where to use it: we add those parts from our data.`;
let copione;
if (process.env.BRAG_COPIONE) copione = JSON.parse(fs.readFileSync(process.env.BRAG_COPIONE, 'utf8'));
else copione = await chiediModello([{ role: 'system', content: REGOLE }, { role: 'user', content: `MODEL CARD:\n${readme}\n\nDATA:\n${FATTI}` }], { json: true, max: 3500, scopo: 'video' });

// ---------- 5. controllo dei fatti, in codice: via ogni frase con un numero che non sta nelle fonti ----------
const FONTI = `${readme}\n${FATTI}\n${m.nome}\n${m.hf.repo}`;
const ammessi = numeri(FONTI);
const semplice = (t) => String(t || '').replace(/[\u2010\u2011\u2012]/g, '-').replace(/\s*[\u2013\u2014]\s*/g, ', ').replace(/[\u00a0\u202f\u2009]/g, ' ');
const frasiDi = (t) => semplice(t).replace(/\s+/g, ' ').trim().split(/(?<=[.!?])\s+(?=[A-Z0-9"“])/);
const pulita = (t) => frasiDi(t).filter((f) => [...numeri(f)].every((n) => ammessi.has(n))).join(' ').trim();
const tolte = [];
const filtra = (t) => { const p = pulita(t); if (p !== semplice(t).replace(/\s+/g, ' ').trim()) tolte.push(t); return p; };
const gancio = filtra(copione.hook);
const sezioni = (copione.sezioni || []).slice(0, 6).map((s) => ({
  titolo: semplice(s.titolo).slice(0, 60),
  punti: (s.punti || []).map((p) => semplice(p).slice(0, 90)).filter((p) => [...numeri(p)].every((n) => ammessi.has(n))).slice(0, 4),
  voce: filtra(s.voce),
})).filter((s) => s.titolo && s.voce.split(' ').length >= 25);
const descrizioneAI = filtra(copione.descrizione);
if (!gancio || sezioni.length < 2) { console.error(`Copione inutilizzabile per ${m.nome} (dopo il controllo: ${sezioni.length} parti)`); process.exit(1); }
if (tolte.length) console.log(`Controllo dei fatti: tolte frasi con numeri senza fonte in ${tolte.length} pezzi`);

// ---------- 6. le scene ----------
const carta = (sopra, nome, sotto, i) => `<div class="carta riga" data-in="${0.5 + i * 0.3}"><small>${sopra}</small><b>${esc(nome)}</b><span>${sotto}</span></div>`;
const scene = [
  { min: 8, voce: gancio,
    corpo: `<span class="chip riga" data-in="0">New open model · ${esc(giorno(m.creato))}</span><p class="grande riga verde" data-in="0.2" style="font-size:${m.nome.length > 26 ? 92 : m.nome.length > 18 ? 116 : 140}px;overflow-wrap:anywhere">${esc(m.nome)}</p><p class="titolo riga" data-in="0.5">by ${esc(lab)}</p><p class="sotto-titolo riga" data-in="0.8">${miliardi}B parameters${moe ? ` · ${attivi}B active` : ''} · ${esc(ctxTesto)} context${licenza ? ` · ${esc(licenza)} license` : ''}</p>` },
  ...sezioni.map((s) => ({ min: 10, voce: s.voce,
    corpo: `<p class="titolo riga" data-in="0">${esc(s.titolo)}</p><div class="griglia due">${s.punti.map((p, i) => `<div class="carta riga" data-in="${0.6 + i * 0.5}"><b style="font-size:34px">${esc(p)}</b></div>`).join('')}</div>` })),
  { min: 12,
    voce: `What do you need to run it at home? At 4-bit it takes about ${gb4} gigabytes of memory. ${piccola ? `The smallest home machine that holds it fully is ${/^(Mac|NVIDIA)/.test(piccola.nome) ? 'the' : 'an'} ${voceNome(piccola.nome)}.` : 'No single home machine on our list holds it fully.'} ${veloci.length ? `${veloci.slice(0, 2).map((x) => `On ${/^(Mac|NVIDIA)/.test(x.s.nome) ? 'the' : 'an'} ${voceNome(x.s.nome)}${x.ram ? ` with ${x.ram} gigabytes of RAM` : ''} it writes about ${fmtVel(x.r.vel)} tokens per second.`).join(' ')}` : casa.length ? `It runs, but slowly: about ${fmtVel(casa[0].r.vel)} tokens per second on ${/^(Mac|NVIDIA)/.test(casa[0].s.nome) ? 'the' : 'an'} ${voceNome(casa[0].s.nome)}.` : ''}`,
    corpo: `<p class="titolo riga" data-in="0">Hardware: ~${gb4} GB at 4-bit</p><div class="griglia">${(casa.length ? casa.slice(0, 6) : []).map((x, i) => carta(esc(x.s.nome) + (x.ram ? ` + ${x.ram} GB RAM` : ''), `~${fmtVel(x.r.vel)} tok/s`, x.r.dove === 'gpu' ? 'fully in memory' : 'part in system RAM', i)).join('') || carta('Home machines', 'Too big', 'no single home machine on our list holds it', 0)}</div><p class="sotto-titolo riga" data-in="2">${piccola ? `Smallest machine that holds it: ${esc(piccola.nome)}` : 'Needs a data center or several GPUs'} · estimates from our simulator</p>` },
  { min: 8,
    voce: `${api ? `You can try it for free through OpenRouter, without a GPU.` : 'There is no free API for it yet.'} The weights are open: you can download them from Hugging Face${licenza ? ` under the ${licenza} license` : ', under the license written in its model card'}.${voto ? ` On the Arena leaderboard it scores ${voto.x.punti}.` : ' Arena has not ranked it yet: we add the score as soon as the votes arrive.'}`,
    corpo: `<p class="titolo riga" data-in="0">Where to use it for free</p><div class="griglia">${carta('Free API', api ? 'OpenRouter' : 'Not yet', api ? esc(api) : 'we check every night', 0)}${carta('Open weights', 'Hugging Face', esc(m.hf.repo), 1)}${carta('Arena', voto ? `${voto.x.punti} points` : 'Not ranked yet', voto ? `#${voto.x.pos} in ${esc(voto.c.nome)}` : 'waiting for votes', 2)}</div>` },
  { min: 7, voce: `Compare ${voceNome(m.nome)} with every free model, and check what your own GPU can run, on FreeLLMArena. The link is in the description.`,
    corpo: `<p class="titolo riga" data-in="0">Every free AI model, updated every night</p><p class="url riga" data-in="0.3">freellmarena.com</p><p class="sotto-titolo riga" data-in="0.6">Link in the description</p>` },
];
let t = 0;
const html = scene.map((s) => { const da = t; t += s.min; return `<section class="scena" data-da="${da}" data-a="${t}">${s.corpo}</section>`; });
const marchio = `<div class="marchio"><span class="segno"><i style="height:22px"></i><i style="height:36px"></i><i style="height:28px"></i></span><b>FreeLLM<span>Arena</span></b></div><div class="data-sett">New model · ${esc(giorno(m.creato))}</div>`;
fs.writeFileSync(path.join(OUT, 'scena-modello.html'), `<!doctype html><html lang="en"><head><meta charset="utf-8"><style>${css}${STILE_ORIZZONTALE}</style></head><body>
<div class="tela">${marchio}${html.join('\n')}<div class="sotto"><p></p></div><div class="avanza"><i></i></div></div>
<script>let DURATA = ${t};${MOTORE};render(0)</script></body></html>`);
fs.writeFileSync(path.join(OUT, 'fonti-modello.txt'), FONTI);

const titolo = `${m.nome}: What's New, Hardware Needed, How to Run It Free`.slice(0, 100);
const LOC = {
  it: [`${m.nome}: novità, hardware necessario, come usarlo gratis`, 'Il nuovo modello aperto spiegato: cosa fa, quanta memoria serve, dove provarlo gratis.'],
  es: [`${m.nome}: novedades, hardware necesario, cómo usarlo gratis`, 'El nuevo modelo abierto explicado: qué hace, cuánta memoria necesita, dónde probarlo gratis.'],
  de: [`${m.nome}: Neuerungen, nötige Hardware, kostenlos nutzen`, 'Das neue offene Modell erklärt: was es kann, wie viel Speicher es braucht, wo man es kostenlos testet.'],
  fr: [`${m.nome} : nouveautés, matériel nécessaire, l’utiliser gratuitement`, 'Le nouveau modèle ouvert expliqué : ce qu’il fait, la mémoire nécessaire, où l’essayer gratuitement.'],
  pt: [`${m.nome}: novidades, hardware necessário, como usar grátis`, 'O novo modelo aberto explicado: o que faz, quanta memória precisa, onde testar grátis.'],
};
const info = {
  nome: nomeVideo(m), titolo,
  descrizione: `${descrizioneAI || `${m.nome} by ${lab} is a new open model.`}\n\nSize: ${miliardi}B parameters${moe ? ` (${attivi}B active)` : ''} · context ${ctxTesto} · memory at 4-bit about ${gb4} GB.\n${casa.map((x) => `${x.s.nome}${x.ram ? ` + ${x.ram} GB RAM` : ''}: about ${fmtVel(x.r.vel)} tokens/s`).join('\n')}\nModel card: https://huggingface.co/${m.hf.repo}\nEvery free model, compared: https://freellmarena.com`,
  tag: ['free AI', 'open source AI', 'local LLM', m.nome, lab],
  condividi: `${m.nome} by ${lab}: ${miliardi}B parameters, about ${gb4} GB at 4-bit${piccola ? `; smallest home machine that holds it: ${piccola.nome}` : ''}. https://freellmarena.com`,
  lingua: 'en', formato: { w: 1920, h: 1080 }, fps: 24, copertina: 0,
  localizzazioni: Object.fromEntries(Object.entries(LOC).map(([l, [tt, dd]]) => [l, { titolo: tt.slice(0, 100), descrizione: `${dd}\nhttps://freellmarena.com/${l}` }])),
  hardware: { modelli: [{ nome: m.nome, gb: gb4, scheda: piccola ? { id: piccola.id, nome: piccola.nome, gb: piccola.gb, tiene: true } : null }], casa: casa.map((x) => ({ scheda: { id: x.s.id, nome: x.s.nome, gb: x.s.gb, tiene: true }, ram: x.ram, modello: m.nome, vel: Number(fmtVel(x.r.vel)), dove: x.r.dove })) },
  scene: scene.map((s) => ({ min: s.min, voce: s.voce })),
};
fs.writeFileSync(path.join(OUT, 'info-modello.json'), JSON.stringify(info, null, 1));

// ---------- piano del video a stampi (24/10/2026 sera, Marco: «li vorrei tutti così»; script/video-hf/) ----------
// Stesse voci delle scene di sopra (copione già controllato e parti scritte dai dati); a schermo i punti del copione
// (già filtrati) e i dati del sito. Nessuna chiamata in più a Workers AI.
const corto = (s, n) => (String(s).length > n ? String(s).slice(0, n - 1).trimEnd() + '…' : String(s));
const visto = (n) => String(n).replace(/[-_]?\b20\d{6}\b/g, '').replace(/[-_]+/g, ' ').trim();
const piano = [
  visto(m.nome).length <= 18
    ? { stampo: 'nome', etichetta: 'New open model', voce: scene[0].voce, dati: { nome: visto(m.nome), sopra: corto(`by ${lab}`, 30), etichette: [corto(`${miliardi}B parameters${moe ? ` · ${attivi}B active` : ''}`, 34), corto(`${ctxTesto} context${licenza ? ` · ${licenza}` : ''}`, 34)] } }
    : { stampo: 'titolo', etichetta: 'New open model', voce: scene[0].voce, dati: { testo: corto(visto(m.nome), 60), sopra: corto(`New open model · by ${lab}`, 40) } },
  ...sezioni.map((s, i) => {
    const punti = s.punti.filter((p) => p.length <= 60 && !/\S{23,}/.test(p)).slice(0, 4);
    return punti.length >= 2
      ? { stampo: 'punti', etichetta: corto(s.titolo, 24), voce: scene[1 + i].voce, dati: { titolo: corto(s.titolo, 32), punti } }
      : { stampo: 'titolo', etichetta: corto(s.titolo, 24), voce: scene[1 + i].voce, dati: { testo: corto(s.titolo, 60), sopra: corto(lab, 40) } };
  }),
  casa.length >= 2
    ? { stampo: 'barre', etichetta: 'Hardware', voce: scene.at(-3).voce, dati: { titolo: `About ${gb4} GB at 4-bit`, sotto: corto(piccola ? `Smallest machine that holds it: ${piccola.nome}` : 'No single home machine holds it', 50), voci: casa.slice(0, 6).map((x) => ({ nome: corto(`${x.s.nome.replace(/ \d+ GB$/, '')}${x.ram ? ` + ${x.ram} GB` : ''}`, 28), valore: Number(fmtVel(x.r.vel)), testo: `${fmtVel(x.r.vel)} tok/s`, nota: x.r.dove === 'gpu' ? 'fully in memory' : 'part in system RAM' })) } }
    : { stampo: 'numero', etichetta: 'Hardware', voce: scene.at(-3).voce, dati: { valore: String(gb4), unita: 'GB', etichetta: 'memory at 4-bit', dettaglio: corto(piccola ? `fits a ${piccola.nome}` : 'too big for home', 24) } },
  { stampo: 'punti', etichetta: 'Use it free', voce: scene.at(-2).voce, dati: { titolo: 'Where to use it for free', punti: [api ? 'Free API on OpenRouter' : 'No free API yet', 'Open weights on Hugging Face', voto ? `Arena: ${voto.x.punti} points` : 'Arena: not ranked yet'] } },
  { stampo: 'chiusura', etichetta: 'FreeLLMArena' },
];
fs.writeFileSync(path.join(OUT, 'piano-modello.json'), JSON.stringify({ formato: 'orizzontale', musica: 'vivace', copertina: 0, scene: piano }, null, 1));
console.log('ok', { modello: m.nome, parti: sezioni.length, minimo: t, tolte: tolte.length, casa: casa.map((x) => `${x.s.nome} ${fmtVel(x.r.vel)}`) });
