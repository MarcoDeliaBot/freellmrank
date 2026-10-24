// Video lungo della settimana (prova chiesta da Marco il 22/10/2026, dopo aver studiato Codedigipt e Julian Goldie):
// orizzontale 1920x1080, in inglese, 3-4 minuti, voce e sottotitoli come gli Shorts. Tutto dai dati veri del sito:
// classifica, chi sale e chi scende, chi è entrato in classifica, i migliori per categoria, i modelli aperti nuovi, cosa gira a casa.
// Scrive video/brag/scena-lungo.html e video/brag/info-lungo.json; lo registra registra.py («video lungo»).
import fs from 'node:fs';
import path from 'node:path';
import { barre } from '../../script/sito/grafici.mjs';
import { coloreLab, nomeLab, chiaveLab } from '../../script/sito/laboratori.mjs';
import { simula, daScheda } from '../../sorgente/calc.mjs';
import { MOTORE, STILE_ORIZZONTALE as STILE } from './motore.mjs';

const QUI = path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1'));
const RADICE = path.join(QUI, '..', '..');
const OUT = path.join(RADICE, 'video', 'brag');
fs.mkdirSync(OUT, { recursive: true });
const dati = JSON.parse(fs.readFileSync(path.join(RADICE, 'sito', 'data.json'), 'utf8'));
const storia = JSON.parse(fs.readFileSync(path.join(RADICE, 'sito', 'history.json'), 'utf8'));
const css = fs.readFileSync(path.join(RADICE, 'sorgente', 'style.css'), 'utf8');
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const gratis = (m) => m.aperto || m.or?.gratis;
const fmtVel = (v) => (v >= 10 ? Math.round(v) : v.toFixed(1));
const giorno = (d) => new Date(d + 'T12:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
// per la voce: trattini e trattini bassi diventano spazi, «RTX 4090» si legge «forty ninety»
const voceNome = (n) => String(n).replace(/[-_]?\b20\d{6}\b/g, '').replace(/[-_]/g, ' ').replace(/\b(RTX|GTX)\s?(\d\d)(\d\d)\b/g, '$1 $2 $3').replace(/[()]/g, '').replace(/\s+/g, ' ').trim();
const settimanaFa = new Date(Date.parse(dati.aggiornato + 'T12:00:00Z') - 7 * 864e5).toISOString().slice(0, 10);

// ---------- dati della settimana ----------
const chat = dati.categorie.find((c) => c.id === 'chat');
const liberi = chat.modelli.filter(gratis);
const top10 = liberi.slice(0, 10);
const pagato = chat.modelli.find((m) => !gratis(m));
const distacco = pagato.punti - top10[0].punti;
// chi sale e chi scende: punteggio di oggi contro quello di 7 giorni fa (history.json), fra i primi 30 gratis;
// sotto i 5 punti è rumore (sul sito: 10 punti non contano), e la scena non c'è
const h = storia.categorie.chat;
const iFa = h.date.findLastIndex((d) => d <= settimanaFa);
const mosse = liberi.slice(0, 30).map((m) => {
  const s = h.serie[m.nome];
  const prima = s && iFa >= 0 ? s[iFa] : null;
  return prima ? { m, d: m.punti - prima } : null;
}).filter((x) => x && Math.abs(x.d) >= 5).sort((a, b) => Math.abs(b.d) - Math.abs(a.d)).slice(0, 5);
// entrati in classifica questa settimana (prima data su Arena negli ultimi 7 giorni)
const entrati = liberi.filter((m) => (h.primo[m.nome] || '') > settimanaFa).slice(0, 5);
// i migliori gratis per categoria
const CATS = ['code', 'vision', 'image', 'video', 'search', 'agent'];
const capi = CATS.map((id) => dati.categorie.find((c) => c.id === id)).filter(Boolean).map((c) => ({ c, m: c.modelli.find(gratis) })).filter((x) => x.m);
// modelli aperti nuovi su Hugging Face questa settimana, dal più grande
const nuoviSett = dati.nuovi.filter((m) => m.hf && (m.creato || '') > settimanaFa).sort((a, b) => b.hf.b - a.hf.b).slice(0, 5);
// cosa gira a casa: tre computer tipo, il miglior modello gratis che scrive almeno a 10 token/s
const CASE = [['rtx3060-12', 32], ['rtx4090', 64], ['m4max-128', 0]];
const casa = CASE.map(([id, ram]) => {
  const s = dati.schede.schede.find((x) => x.id === id);
  if (!s) return null;
  const hw = daScheda(s, { n: 1, ram, bandaRam: 96, ctx: 8192 });
  const x = liberi.filter((m) => m.hf).map((m) => ({ m, r: simula(m.hf, hw) })).find((y) => y.r.dove !== 'no' && y.r.vel >= 10);
  return x ? { s, ram, ...x } : null;
}).filter(Boolean);

// quanti dei primi 50 modelli di chat (a pagamento compresi) si usano gratis
const primi50 = chat.modelli.slice(0, 50), gratis50 = primi50.filter(gratis).length, aperti50 = primi50.filter((m) => m.aperto).length;
// il modello nuovo della settimana: il più recente con dimensioni note, e la scheda di casa più piccola che lo tiene tutto
const nuovo = [...dati.nuovi].filter((m) => m.hf).sort((a, b) => (b.creato || '').localeCompare(a.creato || ''))[0];
const gb4 = nuovo ? Math.round(nuovo.hf.b * 0.606 + 1.2 + 1.5) : 0;
const usa = (s) => Math.round(s.gb * (s.unificata ? 0.75 : 1));
const tiene = nuovo ? dati.schede.schede.filter((s) => s.marca !== 'Data center').sort((a, b) => usa(a) - usa(b)).find((s) => usa(s) >= gb4) : null;

const marchio = `<div class="marchio"><span class="segno"><i style="height:22px"></i><i style="height:36px"></i><i style="height:28px"></i></span><b>FreeLLM<span>Arena</span></b></div><div class="data-sett">Week of ${esc(giorno(dati.aggiornato))}</div>`;
const carta = (sopra, nome, sotto, i, extra = '') => `<div class="carta riga" data-in="${0.6 + i * 0.3}"><small>${sopra}</small><b>${esc(nome)}</b><span>${sotto}</span>${extra}</div>`;

// ---------- scene ----------
const grafico = barre(top10.map((m) => ({ nome: m.nome, valore: m.punti, href: '#', lab: coloreLab(m.org), chiaveLab: chiaveLab(m.org), nomeLab: nomeLab(m.org) })), { riferimento: { valore: pagato.punti, nome: pagato.nome } })
  .replace(/<p class="small muted">[\s\S]*?<\/p>/, '');
const scene = [
  { min: 9, voce: `This is the free AI report for the week of ${giorno(dati.aggiornato)}. The best free chat model is ${distacco} points behind the best paid one. Let's see who is on top, what's new, and what you can run at home.`,
    corpo: `<span class="chip riga" data-in="0">Weekly report · free AI only</span><p class="titolo riga" data-in="0.2">Free AI is</p><p class="grande riga verde" data-in="0.4">${distacco} points</p><p class="titolo riga" data-in="0.6">behind the best paid model.</p><p class="sotto-titolo riga" data-in="1">${esc(pagato.nome)} ${pagato.punti} · ${esc(top10[0].nome)} ${top10[0].punti}</p>` },
  { min: 14, voce: `Here are the ten best free chat models, ranked by blind human votes on Arena. In first place, ${voceNome(top10[0].nome)} from ${nomeLab(top10[0].org)}, with ${top10[0].punti} points. Then ${voceNome(top10[1].nome)}, and ${voceNome(top10[2].nome)}. The dashed line is the best paid model.`,
    corpo: `<p class="titolo riga" data-in="0">Top 10 free chat models</p><div class="grafico-v" data-luce="4">${grafico}</div>` },
  { min: 14, voce: `From fourth to tenth: ${top10.slice(3).map((m) => `${voceNome(m.nome)}, ${m.punti}`).join('; ')}.`,
    corpo: `<p class="titolo riga" data-in="0">Places 4 to 10</p><div class="griglia quattro">${top10.slice(3, 10).map((m, i) => carta(`#${i + 4} · ${esc(nomeLab(m.org))}`, m.nome, `${m.punti} points${m.aperto ? ' · open weights' : ' · free API'}`, i)).join('')}</div>` },
  { min: 9, voce: `Of the top 50 chat models on Arena, paid ones included, ${gratis50} can be used for free, and ${aperti50} have open weights you can download.`,
    corpo: `<p class="titolo riga" data-in="0">Of the top 50 chat models</p><div class="griglia due"><div class="carta riga" data-in="0.5"><small>Free to use</small><b class="verde" style="font-size:96px"><span data-conta="${gratis50}" data-da="0.6">0</span></b><span>free API or open weights</span></div><div class="carta riga" data-in="0.8"><small>Open weights</small><b class="verde" style="font-size:96px"><span data-conta="${aperti50}" data-da="0.9">0</span></b><span>download and run them yourself</span></div></div>` },
  mosse.length ? { min: 9, voce: `The biggest move this week: ${voceNome(mosse[0].m.nome)} ${mosse[0].d > 0 ? 'went up' : 'went down'} ${Math.abs(mosse[0].d)} points.${mosse[1] ? ` ${voceNome(mosse[1].m.nome)} ${mosse[1].d > 0 ? 'gained' : 'lost'} ${Math.abs(mosse[1].d)}.` : ''}`,
    corpo: `<p class="titolo riga" data-in="0">Who moved this week</p><div class="griglia">${mosse.map((x, i) => carta(esc(nomeLab(x.m.org)), x.m.nome, `<span class="${x.d > 0 ? 'su' : 'giu'}">${x.d > 0 ? '▲ +' : '▼ '}${x.d}</span> · now ${x.m.punti}`, i)).join('')}</div>` } : null,
  entrati.length ? { min: 8, voce: `${entrati.length === 1 ? 'One free model' : `${entrati.length} free models`} entered the leaderboard this week. The highest is ${voceNome(entrati[0].nome)}, at number ${entrati[0].pos} overall.`,
    corpo: `<p class="titolo riga" data-in="0">${entrati.length} new on the leaderboard</p><div class="griglia">${entrati.map((m, i) => carta(esc(nomeLab(m.org)), m.nome, `${m.punti} points · #${m.pos} overall`, i)).join('')}</div>` } : null,
  { min: 12, voce: `Now the best free model in each category. ${capi.map((x) => `For ${x.c.nome.toLowerCase()}: ${voceNome(x.m.nome)}.`).join(' ')}`,
    corpo: `<p class="titolo riga" data-in="0">Best free model in each category</p><div class="griglia">${capi.map((x, i) => carta(esc(x.c.nome), x.m.nome, `${esc(nomeLab(x.m.org))} · ${x.m.punti} · #${x.m.pos} overall`, i)).join('')}</div>` },
  nuoviSett.length ? { min: 9, voce: `${nuoviSett.length === 1 ? 'One new open model' : `${nuoviSett.length} new open models`} came out on Hugging Face this week. The biggest is ${voceNome(nuoviSett[0].nome)}, with ${Math.round(nuoviSett[0].hf.b)} billion parameters.`,
    corpo: `<p class="titolo riga" data-in="0">New open models this week</p><div class="griglia">${nuoviSett.map((m, i) => carta(esc(nomeLab(m.org)), m.nome, `${Math.round(m.hf.b * 10) / 10}B parameters · about ${Math.round(m.hf.b * 0.606 + 1.2)} GB at 4-bit`, i)).join('')}</div>` } : null,
  nuovo ? { min: 11, voce: `The model of the week is ${voceNome(nuovo.nome)}, from ${nomeLab(nuovo.org)}. It has ${Math.round(nuovo.hf.b)} billion parameters. At 4-bit it needs about ${gb4} gigabytes of memory. ${tiene ? `The smallest home machine that holds it fully is ${tiene.nome.startsWith('Mac') || tiene.nome.startsWith('NVIDIA') ? 'the' : 'an'} ${voceNome(tiene.nome)}.` : 'No single home machine on our list can hold it.'}`,
    corpo: `<span class="chip riga" data-in="0">Model of the week</span><p class="titolo riga" data-in="0.2">${esc(nuovo.nome)}</p><div class="griglia"><div class="carta riga" data-in="0.6"><small>Size</small><b>${Math.round(nuovo.hf.b)}B parameters</b><span>by ${esc(nomeLab(nuovo.org))} · open weights</span></div><div class="carta riga" data-in="0.9"><small>Memory at 4-bit</small><b>~${gb4} GB</b><span>plus context</span></div><div class="carta riga" data-in="1.2"><small>Smallest machine that holds it</small><b>${tiene ? esc(tiene.nome) : 'None at home'}</b><span>${tiene ? 'fully in memory' : 'needs a data center'}</span></div></div>` } : null,
  casa.length ? { min: 12, voce: `What can you run at home? ${casa.map((x) => `On ${x.s.nome.startsWith('Mac') ? 'a' : 'an'} ${voceNome(x.s.nome.replace(/ \d+ GB$/, ''))}${x.ram ? ` with ${x.ram} gigabytes of RAM` : ''}, the best free model is ${voceNome(x.m.nome)}, at about ${fmtVel(x.r.vel)} tokens per second.`).join(' ')}`,
    corpo: `<p class="titolo riga" data-in="0">What runs at home</p><div class="griglia">${casa.map((x, i) => carta(esc(x.s.nome) + (x.ram ? ` + ${x.ram} GB RAM` : ''), x.m.nome, `~${fmtVel(x.r.vel)} tok/s · ${x.r.dove === 'gpu' ? 'fully on the GPU' : 'GPU + RAM'} · Arena ${x.m.punti}`, i)).join('')}</div><p class="sotto-titolo riga" data-in="1.6">4-bit, 8K context. Estimates from our simulator, calibrated on real llama.cpp tests.</p>` } : null,
  { min: 7, voce: 'Every free model, with sizes and speeds, is on FreeLLMArena, updated every night. The link is in the description. See you next week.',
    corpo: `<p class="titolo riga" data-in="0">Every free AI model, updated every night</p><p class="url riga" data-in="0.3">freellmarena.com</p><p class="sotto-titolo riga" data-in="0.6">Link in the description · new report every Sunday</p>` },
].filter(Boolean);

let t = 0;
const html = scene.map((s) => { const da = t; t += s.min; return `<section class="scena" data-da="${da}" data-a="${t}">${s.corpo}</section>`; });
fs.writeFileSync(path.join(OUT, 'scena-lungo.html'), `<!doctype html><html lang="en"><head><meta charset="utf-8"><style>${css}${STILE}</style></head><body>
<div class="tela">${marchio}${html.join('\n')}<div class="sotto"><p></p></div><div class="avanza"><i></i></div></div>
<script>let DURATA = ${t};${MOTORE};render(0)</script></body></html>`);

const capitoli = (inizi) => scene.map((s, i) => `${new Date(inizi[i] * 1000).toISOString().slice(14, 19)} ${s.corpo.match(/class="titolo[^>]*>([^<]+)/)?.[1] || 'Intro'}`);
const info = {
  nome: `lungo-${dati.aggiornato}`,
  titolo: `Best FREE AI Models This Week (${giorno(dati.aggiornato)}): Top 10, New Models, What Runs at Home`.slice(0, 100),
  descrizione: `The free AI report for the week of ${giorno(dati.aggiornato)}, from blind human votes on Arena.\n\nTop 10 free chat models:\n${top10.map((m, i) => `${i + 1}. ${m.nome} (${nomeLab(m.org)}): ${m.punti}`).join('\n')}\nBest paid model: ${pagato.nome} (${pagato.punti}).\n\nBest free model per category: ${capi.map((x) => `${x.c.nome}: ${x.m.nome}`).join('; ')}.\n\nEvery free model, with sizes, speeds and where to use it free: https://freellmarena.com`,
  tag: ['free AI', 'open source AI', 'AI leaderboard', 'local LLM', 'best AI models'],
  condividi: `Free AI this week: ${top10[0].nome} leads the free models at ${top10[0].punti}, ${distacco} points behind ${pagato.nome}. Full report: https://freellmarena.com`,
  lingua: 'en', formato: { w: 1920, h: 1080 }, fps: 24,
  // hardware (22/10/2026): i tre computer di casa e il miglior modello che ci gira
  hardware: { casa: casa.map((x) => ({ scheda: { id: x.s.id, nome: x.s.nome, gb: x.s.gb, tiene: true }, ram: x.ram, modello: x.m.nome, vel: Number(fmtVel(x.r.vel)), dove: x.r.dove })) },
  scene: scene.map((s) => ({ min: s.min, voce: s.voce })),
  titoli: scene.map((s) => s.corpo.match(/class="titolo[^>]*>([^<]+)/)?.[1] || 'Intro'),
};
fs.writeFileSync(path.join(OUT, 'info-lungo.json'), JSON.stringify(info, null, 1));

// ---------- piano del video a stampi (24/10/2026 sera, Marco: «li vorrei tutti così»; script/video-hf/) ----------
// Stesse voci delle scene di sopra (dai dati del sito), a schermo solo dati del sito. Niente Workers AI.
const corto = (s, n) => (String(s).length > n ? String(s).slice(0, n - 1).trimEnd() + '…' : String(s));
// nomi dei modelli nelle liste: senza la data finale e con spazi, così vanno a capo («DeepSeek-V4.1-Flash-20261017» → «DeepSeek V4.1 Flash»)
const visto = (n) => String(n).replace(/[-_]?\b20\d{6}\b/g, '').replace(/[-_]+/g, ' ').trim();
const voceDi = (inizio) => scene.find((s) => s.voce.startsWith(inizio))?.voce;
const piano = [
  { stampo: 'numero', etichetta: 'Weekly report', voce: scene[0].voce, dati: { valore: String(distacco), unita: '', etichetta: 'points behind', dettaglio: 'the best paid model', fonte: corto(`Week of ${giorno(dati.aggiornato)}`, 28) } },
  { stampo: 'barre', etichetta: 'Top 10', voce: scene[1].voce, dati: { titolo: 'Top 10 free chat models', sotto: 'Blind human votes on Arena', voci: top10.map((m) => ({ nome: corto(m.nome, 28), valore: m.punti, testo: String(m.punti), nota: corto(nomeLab(m.org), 34) })), riferimento: { nome: corto(pagato.nome, 28), valore: pagato.punti, testo: String(pagato.punti) }, scala: { da: 1400 }, evidenza: 0, quando: { riferimento: 'dashed' } } },
  { stampo: 'barre', etichetta: 'Places 4 to 10', voce: scene[2].voce, dati: { titolo: 'Places 4 to 10', voci: top10.slice(3).map((m) => ({ nome: corto(m.nome, 28), valore: m.punti, testo: String(m.punti), nota: corto(`${nomeLab(m.org)} · ${m.aperto ? 'open weights' : 'free API'}`, 34) })), scala: { da: 1400 } } },
  { stampo: 'numeri', etichetta: 'Top 50', voce: scene[3].voce, dati: { titolo: 'Of the top 50 chat models', voci: [{ valore: String(gratis50), unita: '', etichetta: 'free to use', grafico: 'nessuno' }, { valore: String(aperti50), unita: '', etichetta: 'open weights', grafico: 'nessuno' }] } },
  ...(mosse.length ? [{ stampo: 'punti', etichetta: 'Who moved', voce: voceDi('The biggest move'), dati: { titolo: 'Who moved this week', punti: mosse.slice(0, 4).map((x) => corto(`${visto(x.m.nome)} ${x.d > 0 ? '+' : ''}${x.d}, now ${x.m.punti}`, 60)) } }] : []),
  ...(entrati.length >= 2 ? [{ stampo: 'punti', etichetta: 'New on the board', voce: voceDi(entrati.length === 1 ? 'One free model' : `${entrati.length} free models`), dati: { titolo: `${entrati.length} new on the leaderboard`, punti: entrati.slice(0, 4).map((m) => corto(`${visto(m.nome)}: ${m.punti} points, #${m.pos} overall`, 60)) } }] : []),
  { stampo: 'punti', etichetta: 'By category', voce: voceDi('Now the best free model'), dati: { titolo: 'Best free model per category', punti: capi.slice(0, 4).map((x) => corto(`${x.c.nome}: ${visto(x.m.nome)}`, 60)) } },
  ...(nuoviSett.length >= 2 ? [{ stampo: 'punti', etichetta: 'New open models', voce: voceDi(nuoviSett.length === 1 ? 'One new open model' : `${nuoviSett.length} new open models`), dati: { titolo: 'New open models this week', punti: nuoviSett.slice(0, 4).map((m) => corto(`${visto(m.nome)}: ${Math.round(m.hf.b * 10) / 10}B parameters`, 60)) } }] : []),
  ...(nuovo ? [{ stampo: 'numeri', etichetta: 'Model of the week', voce: voceDi('The model of the week'), dati: { titolo: corto(nuovo.nome, 32), voci: [{ valore: String(Math.round(nuovo.hf.b)), unita: 'B', etichetta: 'parameters', grafico: 'nessuno' }, { valore: String(gb4), unita: 'GB', etichetta: 'memory at 4-bit', grafico: 'nessuno' }] } }] : []),
  ...(casa.length >= 2 ? [{ stampo: 'barre', etichetta: 'At home', voce: voceDi('What can you run at home'), dati: { titolo: 'What runs at home', sotto: '4-bit · 8K context · our simulator', voci: casa.map((x) => ({ nome: corto(`${x.s.nome.replace(/ \d+ GB$/, '')}${x.ram ? ` + ${x.ram} GB` : ''}`, 28), valore: Number(fmtVel(x.r.vel)), testo: `${fmtVel(x.r.vel)} tok/s`, nota: corto(x.m.nome, 34) })) } }] : []),
  { stampo: 'chiusura', etichetta: 'FreeLLMArena' },
].filter((s) => s.stampo === 'chiusura' || s.voce);
fs.writeFileSync(path.join(OUT, 'piano-lungo.json'), JSON.stringify({ formato: 'orizzontale', musica: 'vivace', copertina: 1, scene: piano }, null, 1));
console.log('ok', { scene: scene.length, min: t, mosse: mosse.map((x) => `${x.m.nome} ${x.d}`), entrati: entrati.map((m) => m.nome), nuovi: nuoviSett.map((m) => m.nome), casa: casa.map((x) => `${x.s.nome}: ${x.m.nome} ${fmtVel(x.r.vel)}`) });
