// Video lungo settimanale del CODICE (Marco, 22/11/2026: «gli smanettoni lo usano per il codice, e il video non parla mai di
// coding. fanne uno dedicato a settimana»). Gemello di lungo.mjs, ma sulle classifiche WebDev e Agent coding di Arena:
// i 10 migliori modelli gratis per programmare, chi sale e chi scende, chi è entrato, i migliori agenti di codice gratis
// e il miglior modello per programmare che gira a casa. Tutto dai dati veri del sito, niente scritto da un modello.
// Scrive video/brag/scena-codice.html, info-codice.json e piano-codice.json; lo registra registra.sh («codice»).
import fs from 'node:fs';
import path from 'node:path';
import { barre } from '../../script/sito/grafici.mjs';
import { coloreLab, nomeLab, chiaveLab } from '../../script/sito/laboratori.mjs';
import { simula, daScheda } from '../../sorgente/calc.mjs';
import { MOTORE, STILE_ORIZZONTALE as STILE } from './motore.mjs';
import { titoloYT } from './controllo-yt.mjs';

const QUI = path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1'));
const RADICE = path.join(QUI, '..', '..');
const OUT = path.join(RADICE, 'video', 'brag');
fs.mkdirSync(OUT, { recursive: true });
const dati = JSON.parse(fs.readFileSync(path.join(RADICE, 'sito', 'data.json'), 'utf8'));
const storia = JSON.parse(fs.readFileSync(path.join(RADICE, 'sito', 'history.json'), 'utf8'));
const css = fs.readFileSync(path.join(RADICE, 'sorgente', 'style.css'), 'utf8');
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
// stessa regola del sito e del video settimanale: gratis = pesi aperti o API gratis su OpenRouter
import { gratis, etichetta, SPIEGA_BREVE } from '../gratis.mjs';
const fmtVel = (v) => (v >= 10 ? Math.round(v) : v.toFixed(1));
const giorno = (d) => new Date(d + 'T12:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const voceNome = (n) => String(n).replace(/[-_]?\b20\d{6}\b/g, '').replace(/[-_]/g, ' ').replace(/\b(RTX|GTX)\s?(\d\d)(\d\d)\b/g, '$1 $2 $3').replace(/[()]/g, '').replace(/\s+/g, ' ').trim();
const settimanaFa = new Date(Date.parse(dati.aggiornato + 'T12:00:00Z') - 7 * 864e5).toISOString().slice(0, 10);

// ---------- dati della settimana ----------
const code = dati.categorie.find((c) => c.id === 'code');
// 22/11/2026: gli agenti di codice dalla classifica «Agent coding» (Coding Index di Arena); senza, dalla classifica Agents
const agenti = dati.categorie.find((c) => c.id === 'agentcode') || dati.categorie.find((c) => c.id === 'agent');
const nomeAgenti = agenti?.id === 'agentcode' ? 'Arena Agent coding' : 'Arena Agents';
// una sola versione per modello: «DeepSeek-V4.1-Flash-20261017» e «-20260910» si leggerebbero uguali (tiene la più votata)
const versione = (m) => String(m.nome).replace(/[-_ ]?\b20\d{6}\b/g, '').toLowerCase();
const unici = (lista) => lista.filter((m, i) => lista.findIndex((x) => versione(x) === versione(m)) === i);
const liberi = unici(code.modelli.filter(gratis));
const top10 = liberi.slice(0, 10);
const pagato = code.modelli.find((m) => !gratis(m));
const distacco = pagato.punti - top10[0].punti;
// chi sale e chi scende nel codice: oggi contro 7 giorni fa, fra i primi 30 gratis; sotto i 5 punti è rumore
const h = storia.categorie.code;
const iFa = h.date.findLastIndex((d) => d <= settimanaFa);
const mosse = liberi.slice(0, 30).map((m) => {
  const s = h.serie[m.nome];
  const prima = s && iFa >= 0 ? s[iFa] : null;
  return prima ? { m, d: m.punti - prima } : null;
}).filter((x) => x && Math.abs(x.d) >= 5).sort((a, b) => Math.abs(b.d) - Math.abs(a.d)).slice(0, 5);
const entrati = liberi.filter((m) => (h.primo?.[m.nome] || '') > settimanaFa).slice(0, 5);
// agenti di codice: altra scala (indice da sessioni vere, non voti alla cieca), si mostrano solo le posizioni
const agentiTop = agenti ? unici(agenti.modelli.filter(gratis)).slice(0, 5) : [];
// per programmare a casa: tre computer tipo, il miglior modello gratis per il CODICE che scrive almeno a 10 token/s
const CASE = [['rtx3060-12', 32], ['rtx4090', 64], ['m4max-128', 0]];
const casa = CASE.map(([id, ram]) => {
  const s = dati.schede.schede.find((x) => x.id === id);
  if (!s) return null;
  const hw = daScheda(s, { n: 1, ram, bandaRam: 96, ctx: 8192 });
  const x = liberi.filter((m) => m.hf).map((m) => ({ m, r: simula(m.hf, hw) })).find((y) => y.r.dove !== 'no' && y.r.vel >= 10);
  return x ? { s, ram, ...x } : null;
}).filter(Boolean);
// quanti dei primi 30 modelli di codice (a pagamento compresi) si usano gratis
const primi30 = code.modelli.slice(0, 30), gratis30 = primi30.filter(gratis).length, aperti30 = primi30.filter((m) => m.aperto).length;

const marchio = `<div class="marchio"><span class="segno"><i style="height:22px"></i><i style="height:36px"></i><i style="height:28px"></i></span><b>FreeLLM<span>Arena</span></b></div><div class="data-sett">Coding · week of ${esc(giorno(dati.aggiornato))}</div>`;
const carta = (sopra, nome, sotto, i) => `<div class="carta riga" data-in="${0.6 + i * 0.3}"><small>${sopra}</small><b>${esc(nome)}</b><span>${sotto}</span></div>`;

// ---------- scene ----------
const grafico = barre(top10.map((m) => ({ nome: m.nome, valore: m.punti, href: '#', lab: coloreLab(m.org), chiaveLab: chiaveLab(m.org), nomeLab: nomeLab(m.org) })), { riferimento: { valore: pagato.punti, nome: pagato.nome } })
  .replace(/<p class="small muted">[\s\S]*?<\/p>/, '');
const scene = [
  { min: 9, voce: `This is the free AI coding report for the week of ${giorno(dati.aggiornato)}. The best free model for coding is ${distacco} points behind the best paid one. Let's see which free models write the best code, and which one you can run at home.`,
    corpo: `<span class="chip riga" data-in="0">Coding report · free AI only</span><p class="titolo riga" data-in="0.2">Free AI for coding is</p><p class="grande riga verde" data-in="0.4">${distacco} points</p><p class="titolo riga" data-in="0.6">behind the best paid model.</p><p class="sotto-titolo riga" data-in="1">${esc(pagato.nome)} ${pagato.punti} · ${esc(top10[0].nome)} ${top10[0].punti}</p>` },
  { min: 14, voce: `Here are the ten best free models for coding, ranked by blind votes of developers on Arena's WebDev leaderboard: two anonymous models build the same app, and people pick the better one. In first place, ${voceNome(top10[0].nome)} from ${nomeLab(top10[0].org)}, with ${top10[0].punti} points. Then ${voceNome(top10[1].nome)}, and ${voceNome(top10[2].nome)}. The dashed line is the best paid model.`,
    corpo: `<p class="titolo riga" data-in="0">Top 10 free coding models</p><div class="grafico-v" data-luce="4">${grafico}</div>` },
  { min: 14, voce: `From fourth to tenth: ${top10.slice(3).map((m) => `${voceNome(m.nome)}, ${m.punti}`).join('; ')}.`,
    corpo: `<p class="titolo riga" data-in="0">Places 4 to 10</p><div class="griglia quattro">${top10.slice(3, 10).map((m, i) => carta(`#${i + 4} · ${esc(nomeLab(m.org))}`, m.nome, `${m.punti} points · ${etichetta(m)}`, i)).join('')}</div>` },
  { min: 14, voce: 'A quick note on what free means here. Open weights models you download and run on your own computer, free forever. A free API works online with daily limits, and the provider can change or end it at any time. A free trial gives new accounts credit for a few months, then you pay.',
    corpo: `<p class="titolo riga" data-in="0">What free means</p><div class="griglia">${carta('Open weights', 'On your computer', 'free forever · your hardware is the limit', 0)}${carta('Free API', 'Online', 'daily limits · can change or end any time', 1)}${carta('Free trial', 'New accounts', 'free credit for a few months, then paid', 2)}</div>` },
  { min: 9, voce: `Of the top 30 coding models on Arena, paid ones included, ${gratis30} can be used for free, and ${aperti30} have open weights you can download.`,
    corpo: `<p class="titolo riga" data-in="0">Of the top 30 coding models</p><div class="griglia due"><div class="carta riga" data-in="0.5"><small>Free to use</small><b class="verde" style="font-size:96px"><span data-conta="${gratis30}" data-da="0.6">0</span></b><span>free API or open weights</span></div><div class="carta riga" data-in="0.8"><small>Open weights</small><b class="verde" style="font-size:96px"><span data-conta="${aperti30}" data-da="0.9">0</span></b><span>download and run them yourself</span></div></div>` },
  mosse.length ? { min: 9, voce: `The biggest move in coding this week: ${voceNome(mosse[0].m.nome)} ${mosse[0].d > 0 ? 'went up' : 'went down'} ${Math.abs(mosse[0].d)} points.${mosse[1] ? ` ${voceNome(mosse[1].m.nome)} ${mosse[1].d > 0 ? 'gained' : 'lost'} ${Math.abs(mosse[1].d)}.` : ''}`,
    corpo: `<p class="titolo riga" data-in="0">Who moved this week</p><div class="griglia">${mosse.map((x, i) => carta(esc(nomeLab(x.m.org)), x.m.nome, `<span class="${x.d > 0 ? 'su' : 'giu'}">${x.d > 0 ? '▲ +' : '▼ '}${x.d}</span> · now ${x.m.punti}`, i)).join('')}</div>` } : null,
  entrati.length ? { min: 8, voce: `${entrati.length === 1 ? 'One free model' : `${entrati.length} free models`} entered the coding leaderboard this week. The highest is ${voceNome(entrati[0].nome)}, at number ${entrati[0].pos} overall.`,
    corpo: `<p class="titolo riga" data-in="0">${entrati.length} new on the coding board</p><div class="griglia">${entrati.map((m, i) => carta(esc(nomeLab(m.org)), m.nome, `${m.punti} points · #${m.pos} overall`, i)).join('')}</div>` } : null,
  agentiTop.length ? { min: 11, voce: `So far, the WebDev leaderboard: apps built from a single prompt. For coding agents, the ones that plan, edit files and run commands on their own, Arena has a separate coding index. The best free agents there are ${agentiTop.slice(0, 4).map((m) => `${voceNome(m.nome)}, number ${m.pos}`).join('; ')}.`,
    corpo: `<p class="titolo riga" data-in="0">Best free coding agents</p><div class="griglia">${agentiTop.map((m, i) => carta(`#${i + 1} free · ${esc(nomeLab(m.org))}`, m.nome, `#${m.pos} of ${agenti.totale} on ${nomeAgenti}`, i)).join('')}</div>` } : null,
  casa.length ? { min: 12, voce: `Which coding model can you run at home? ${casa.map((x, i) => `On ${x.s.nome.startsWith('Mac') ? 'a' : 'an'} ${voceNome(x.s.nome.replace(/ \d+ GB$/, ''))}${x.ram ? ` with ${x.ram} gigabytes of RAM` : ''}, the best free coding model is ${voceNome(x.m.nome)}, at about ${fmtVel(x.r.vel)} tokens per second.${casa.findIndex((y) => y.m === x.m) === i ? ` It is number ${x.m.pos} of ${code.totale} on the WebDev leaderboard.` : ""}`).join(' ')}`,
    corpo: `<p class="titolo riga" data-in="0">Best coding model at home</p><div class="griglia">${casa.map((x, i) => carta(esc(x.s.nome) + (x.ram ? ` + ${x.ram} GB RAM` : ''), x.m.nome, `~${fmtVel(x.r.vel)} tok/s · ${x.r.dove === 'gpu' ? 'fully on the GPU' : 'GPU + RAM'} · #${x.m.pos} of ${code.totale} in coding`, i)).join('')}</div><p class="sotto-titolo riga" data-in="1.6">4-bit, 8K context. Estimates from our simulator, calibrated on real llama.cpp tests.</p>` } : null,
  { min: 7, voce: 'Every free model, with its coding score, size and speed, is on FreeLLMArena, updated every night. The link is in the description. See you next week.',
    corpo: `<p class="titolo riga" data-in="0">Every free AI model, updated every night</p><p class="url riga" data-in="0.3">freellmarena.com</p><p class="sotto-titolo riga" data-in="0.6">Link in the description · new coding report every week</p>` },
].filter(Boolean);

let t = 0;
const html = scene.map((s) => { const da = t; t += s.min; return `<section class="scena" data-da="${da}" data-a="${t}">${s.corpo}</section>`; });
fs.writeFileSync(path.join(OUT, 'scena-codice.html'), `<!doctype html><html lang="en"><head><meta charset="utf-8"><style>${css}${STILE}</style></head><body>
<div class="tela">${marchio}${html.join('\n')}<div class="sotto"><p></p></div><div class="avanza"><i></i></div></div>
<script>let DURATA = ${t};${MOTORE};render(0)</script></body></html>`);

const info = {
  nome: `codice-${dati.aggiornato}`,
  // entro 60 caratteri; «best», «free» e «coding» sono le parole che si cercano
  titolo: titoloYT([
    `Best FREE AI for Coding This Week (${giorno(dati.aggiornato)}): Top 10`,
    `Best FREE AI for Coding This Week (${giorno(dati.aggiornato)})`,
    `Best FREE Coding AI This Week (${giorno(dati.aggiornato)})`,
  ]),
  descrizione: `The free AI coding report for the week of ${giorno(dati.aggiornato)}, from Arena: blind votes on the WebDev leaderboard (apps and websites built from one prompt) and the Agent coding index (real coding sessions of agents).\n\nTop 10 free coding models:\n${top10.map((m, i) => `${i + 1}. ${m.nome} (${nomeLab(m.org)}): ${m.punti}`).join('\n')}\nBest paid coding model: ${pagato.nome} (${pagato.punti}).\n\n${agentiTop.length ? `Best free coding agents (${nomeAgenti}): ${agentiTop.map((m) => `${m.nome} (#${m.pos} of ${agenti.totale})`).join(', ')}.\n\n` : ''}${casa.length ? `Best coding model at home: ${casa.map((x) => `${x.s.nome}${x.ram ? ` + ${x.ram} GB RAM` : ''}: ${x.m.nome} (#${x.m.pos} of ${code.totale} in WebDev), about ${fmtVel(x.r.vel)} tokens per second`).join('; ')}.\n\n` : ''}${SPIEGA_BREVE}\n\nEvery free model, with sizes, speeds and where to use it free: https://freellmarena.com`,
  tag: ['free AI for coding', 'best free coding model', 'AI coding', 'local LLM for coding', 'open source AI', 'coding agent'],
  condividi: `Free AI for coding this week: ${top10[0].nome} leads the free models at ${top10[0].punti}, ${distacco} points behind ${pagato.nome}. Full report: https://freellmarena.com`,
  lingua: 'en', formato: { w: 1920, h: 1080 }, fps: 24,
  hardware: { casa: casa.map((x) => ({ scheda: { id: x.s.id, nome: x.s.nome, gb: x.s.gb, tiene: true }, ram: x.ram, modello: x.m.nome, vel: Number(fmtVel(x.r.vel)), dove: x.r.dove })) },
  scene: scene.map((s) => ({ min: s.min, voce: s.voce })),
  titoli: scene.map((s) => s.corpo.match(/class="titolo[^>]*>([^<]+)/)?.[1] || 'Intro'),
};
fs.writeFileSync(path.join(OUT, 'info-codice.json'), JSON.stringify(info, null, 1));

// ---------- piano del video a stampi (script/video-hf/), come lungo.mjs ----------
const corto = (s, n) => (String(s).length > n ? String(s).slice(0, n - 1).trimEnd() + '…' : String(s));
const visto = (n) => String(n).replace(/[-_]?\b20\d{6}\b/g, '').replace(/[-_]+/g, ' ').trim();
const voceDi = (inizio) => scene.find((s) => s.voce.startsWith(inizio))?.voce;
const piano = [
  { stampo: 'numero', etichetta: 'Coding report', voce: scene[0].voce, dati: { valore: String(distacco), unita: '', etichetta: 'points behind', dettaglio: 'the best paid model', fonte: corto(`Week of ${giorno(dati.aggiornato)}`, 28) } },
  { stampo: 'barre', etichetta: 'Top 10', voce: scene[1].voce, dati: { titolo: 'Top 10 free coding models', sotto: 'Blind votes on Arena WebDev', voci: top10.map((m) => ({ nome: corto(visto(m.nome), 28), valore: m.punti, testo: String(m.punti), nota: corto(nomeLab(m.org), 34) })), riferimento: { nome: corto(visto(pagato.nome), 28), valore: pagato.punti, testo: String(pagato.punti) }, scala: { da: 1450 }, evidenza: 0, quando: { riferimento: 'dashed' } } },
  { stampo: 'barre', etichetta: 'Places 4 to 10', voce: scene[2].voce, dati: { titolo: 'Places 4 to 10', voci: top10.slice(3).map((m) => ({ nome: corto(visto(m.nome), 28), valore: m.punti, testo: String(m.punti), nota: corto(`${nomeLab(m.org)} · ${etichetta(m)}`, 34) })), scala: { da: 1450 } } },
  { stampo: 'punti', etichetta: 'What free means', voce: voceDi('A quick note on what free means'), dati: { titolo: 'What free means', punti: ['Open weights: on your computer, free forever', 'Free API: online, daily limits, can end', 'Free trial: credit for months, then you pay'] } },
  { stampo: 'numeri', etichetta: 'Top 30', voce: scene[3].voce, dati: { titolo: 'Of the top 30 coding models', voci: [{ valore: String(gratis30), unita: '', etichetta: 'free to use', grafico: 'nessuno' }, { valore: String(aperti30), unita: '', etichetta: 'open weights', grafico: 'nessuno' }] } },
  ...(mosse.length >= 2 ? [{ stampo: 'punti', etichetta: 'Who moved', voce: voceDi('The biggest move'), dati: { titolo: 'Who moved in coding', punti: mosse.slice(0, 4).map((x) => corto(`${visto(x.m.nome)} ${x.d > 0 ? '+' : ''}${x.d}, now ${x.m.punti}`, 60)) } }] : []),
  ...(entrati.length >= 2 ? [{ stampo: 'punti', etichetta: 'New on the board', voce: voceDi(entrati.length === 1 ? 'One free model' : `${entrati.length} free models`), dati: { titolo: `${entrati.length} new on the coding board`, punti: entrati.slice(0, 4).map((m) => corto(`${visto(m.nome)}: ${m.punti} points, #${m.pos} overall`, 60)) } }] : []),
  ...(agentiTop.length ? [{ stampo: 'punti', etichetta: 'Coding agents', voce: voceDi('So far, the WebDev'), dati: { titolo: 'Best free coding agents', punti: agentiTop.slice(0, 4).map((m, i) => corto(`${i + 1}. ${visto(m.nome)} (#${m.pos} on ${nomeAgenti})`, 60)) } }] : []),
  ...(casa.length >= 2 ? [{ stampo: 'barre', etichetta: 'At home', voce: voceDi('Which coding model can you run at home'), dati: { titolo: 'Best coding model at home', sotto: '4-bit · our simulator · rank on Arena WebDev', voci: casa.map((x) => ({ nome: corto(`${x.s.nome.replace(/ \d+ GB$/, '')}${x.ram ? ` + ${x.ram} GB` : ''}`, 28), valore: Number(fmtVel(x.r.vel)), testo: `${fmtVel(x.r.vel)} tok/s`, nota: corto(`#${x.m.pos} of ${code.totale} · ${visto(x.m.nome)}`, 34) })) } }] : []),
  { stampo: 'chiusura', etichetta: 'FreeLLMArena' },
].filter((s) => s.stampo === 'chiusura' || s.voce);
fs.writeFileSync(path.join(OUT, 'piano-codice.json'), JSON.stringify({ formato: 'orizzontale', musica: 'vivace', copertina: 1, scene: piano }, null, 1));
console.log('ok', { scene: scene.length, min: t, titolo: info.titolo, top: top10.slice(0, 3).map((m) => `${m.nome} ${m.punti}`), mosse: mosse.map((x) => `${x.m.nome} ${x.d}`), entrati: entrati.map((m) => m.nome), agenti: agentiTop.map((m) => m.nome), casa: casa.map((x) => `${x.s.nome}: ${x.m.nome} ${fmtVel(x.r.vel)}`) });
