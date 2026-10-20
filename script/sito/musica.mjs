// Pagina /music: «Free AI music generators», decisa da Marco il 20/10/2026.
// Classifica da Music Arena (voti ciechi, CC BY 4.0) calcolata in script/costruisci-musica.mjs (dati/musica.json);
// i fatti sui modelli (aperto, licenza, dimensione) stanno a mano in dati/musica-modelli.json.
import fs from 'node:fs';
import path from 'node:path';
import { esc, pagina, NOME_PIENO, RADICE, fmtNum, fmtData, spiega, barraSezioni, nuovo } from './comune.mjs';
import { barre } from './grafici.mjs';

const SOGLIA = 200; // sotto questi voti un modello va nell'elenco a parte

export function paginaMusica(dati, blog) {
  const fv = path.join(RADICE, 'dati', 'musica.json');
  const fm = path.join(RADICE, 'dati', 'musica-modelli.json');
  if (!fs.existsSync(fv) || !fs.existsSync(fm)) return;
  const v = JSON.parse(fs.readFileSync(fv, 'utf8'));
  const info = JSON.parse(fs.readFileSync(fm, 'utf8'));
  const tutti = v.modelli.map((m) => ({ ...m, ...(info.modelli[m.id] || { nome: m.id, lab: '?', aperto: false }) }));
  const classificati = tutti.filter((m) => m.voti >= SOGLIA);
  const pochi = tutti.filter((m) => m.voti < SOGLIA);
  const aperti = classificati.filter((m) => m.aperto);
  const migliore = classificati[0], migliorAperto = aperti[0];
  const hf = (r) => `https://huggingface.co/${r}`;

  const grafico = barre(classificati.slice(0, 14).map((m) => ({ nome: m.nome, valore: m.punteggio, href: `#m-${m.id}`, lab: m.aperto ? '#10b981' : '#94a3b8', chiaveLab: m.aperto ? 'aperto' : 'chiuso', nomeLab: m.aperto ? 'Open weights' : 'Closed', nota: `${fmtNum(m.voti)} votes` })),
    { titoloAsse: 'Score from blind votes (1000 = average)', testoColori: '' })
    .replace('Color = the lab that made the model, the same in every chart.', 'Green = open weights you can download, grey = closed.');

  const riga = (m, i) => `<tr id="m-${esc(m.id)}"${m.aperto ? ' class="casa"' : ''}><td class="n">${i + 1}</td>
<td class="m">${m.repo ? `<a class="nome-modello" href="${hf(m.repo)}" rel="noopener">${esc(m.nome)}</a>` : `<span class="nome-modello">${esc(m.nome)}</span>`}<div class="org">${esc(m.lab)}</div></td>
<td class="n"><b>${m.punteggio}</b><div class="org">±${m.ic ?? '—'}</div></td>
<td class="n">${fmtNum(m.voti)}</td>
<td>${m.aperto ? `<span class="tag home">${esc(m.licenza)}</span>${m.commerciale === false ? '<div class="org">non-commercial only</div>' : m.condizioni ? `<div class="org">${esc(m.condizioni)}</div>` : ''}` : `<span class="tag api">${m.anonimo ? 'Anonymous' : 'Closed'}</span>`}</td>
<td class="n">${m.b ? `${m.b} B` : '—'}${m.vram ? `<div class="org">${esc(m.vram)}</div>` : ''}</td>
<td class="n">${m.aperto && m.lentezza ? `${m.lentezza < 1 ? 'faster' : 'slower'} than real time<div class="org">${m.lentezza} s of compute per s of music</div>` : '—'}</td>
<td class="n">${m.ultimo ? fmtData(m.ultimo) : '—'}</td></tr>`;
  const tabella = (lista) => `<div class="tw"><table><thead><tr><th>#</th><th>Model</th><th>Score</th><th>Votes</th><th>Weights</th><th>Size</th><th>Speed (open models)</th><th>Last vote</th></tr></thead><tbody>${lista.map(riga).join('')}</tbody></table></div>`;

  // A. esempi veri da ascoltare (brani pubblici di Music Arena, CC BY 4.0), solo per i modelli in classifica
  const conEsempi = classificati.filter((m) => (v.esempi || {})[m.id]?.length);
  const esempiHtml = conEsempi.map((m) => `<div class="mus-scheda${m.aperto ? ' aperto' : ''}"><div class="mus-testa"><b>${esc(m.nome)}</b><span class="cat-chip${m.aperto ? '' : ' tenue'}">${m.aperto ? 'Open' : 'Closed'} · ${m.punteggio}</span></div>
${v.esempi[m.id].map((e) => `<figure><figcaption>“${esc(e.prompt)}”</figcaption><audio controls preload="none" src="${esc(e.url)}"></audio></figure>`).join('')}</div>`).join('');
  const senza = classificati.filter((m) => !(v.esempi || {})[m.id]?.length).map((m) => m.nome);
  // B. generatori ufficiali gratuiti su Hugging Face (ZeroGPU): si caricano solo se il visitatore li apre
  const GENERATORI = [
    ['Stable Audio 3', 'Stability AI', 'stabilityai/stable-audio-3', 'https://stabilityai-stable-audio-3.hf.space'],
    ['ACE-Step 1.5', 'ACE-Step', 'ACE-Step/Ace-Step-v1.5', 'https://ace-step-ace-step-v1-5.hf.space'],
  ];
  // C. arena: coppie già pronte, senza nomi; si vota e poi si scoprono i modelli
  const nomeDi = Object.fromEntries(tutti.map((m) => [m.id, { n: m.nome, o: Boolean(m.aperto) }]));
  const coppie = (v.coppie || []).filter((c) => nomeDi[c.a.s] && nomeDi[c.b.s]).map((c) => ({ id: c.id, p: c.prompt, a: c.a.url, b: c.b.url, sa: c.a.s, sb: c.b.s, v: c.vinse }));

  pagina({
    file: 'music.html', attiva: '/music.html', dati, blog, script: 'music.js',
    titolo: `Best Free AI Music Generators, Ranked by Blind Votes · ${NOME_PIENO}`,
    descr: `AI music models ranked by ${fmtNum(v.sfide)} blind votes on Music Arena. Best open model you can download: ${migliorAperto?.nome}. See licenses, sizes and which ones you can use commercially.`,
    corpo: `<div style="display:grid;gap:.4rem">
<h1>Free AI music generators${nuovo('2026-10-20')}</h1>
<p class="lead">Text-to-music models ranked by people who listened to two tracks without knowing which model made them, and picked the better one. Green rows are open models: you can download them and make music on your own computer, free.</p>
</div>
<div class="tiles">
<div class="tile"><span class="small muted">Best open model</span><b>${esc(migliorAperto?.nome || '—')}</b><span class="small muted">score ${migliorAperto?.punteggio} · ${esc(migliorAperto?.licenza || '')}</span></div>
<div class="tile"><span class="small muted">Best overall</span><b>${esc(migliore?.nome || '—')}</b><span class="small muted">score ${migliore?.punteggio} · ${migliore?.aperto ? 'open weights' : 'closed'}</span></div>
<div class="tile"><span class="small muted">Blind votes</span><b>${fmtNum(v.sfide)}</b><span class="small muted">${classificati.length} models ranked, ${aperti.length} open</span></div>
</div>
${barraSezioni([['ranking', 'Ranking'], ['listen', 'Listen'], ['make', 'Make music'], ['blind', 'Blind test'], ['open', 'Open models'], ['about', 'About the data']])}
<div class="panel" id="ranking"><h2>Ranking</h2>${grafico}${spiega('Every music model with at least ' + SOGLIA + ' blind votes on Music Arena, by how often listeners preferred it.', 'Longer bar, preferred more often. 1000 is the average model; 100 points more means it wins about 64% of the time against an average one. Green bars are open models you can download.')}
${tabella(classificati)}
${pochi.length ? `<details><summary class="small">${pochi.length} models with fewer than ${SOGLIA} votes</summary>${tabella(pochi)}</details>` : ''}</div>
<div class="panel" id="listen"><h2>Listen to real examples</h2>
<p class="small muted">Tracks made in Music Arena’s blind tests from the same list of prompts, published under CC BY 4.0. They play from Hugging Face.${senza.length ? ` No public tracks for ${esc(senza.join(', '))}: their makers did not allow the release.` : ''}</p>
<div class="mus-griglia">${esempiHtml}</div></div>
<div class="panel" id="make"><h2>Make music now, free</h2>
<p class="small muted">The official free demos on Hugging Face. They run on Hugging Face’s shared GPUs with a free daily quota for each visitor, so they can be busy; signing in to Hugging Face gives you more. Nothing runs on our servers.</p>
<div class="mus-gen">${GENERATORI.map(([n, lab, id, host]) => `<div class="mus-gen-voce"><div><b>${esc(n)}</b> <span class="small muted">by ${esc(lab)}</span></div><button type="button" class="btn primary" data-space="${esc(host)}">Open the ${esc(n)} demo here</button><a class="small" href="https://huggingface.co/spaces/${esc(id)}" rel="noopener">or open it on Hugging Face ↗</a><div class="mus-cornice" hidden></div></div>`).join('')}</div></div>
<div class="panel" id="blind"><h2>Blind test: which track is better?</h2>
<p class="small muted">Two tracks for the same prompt, made by two different models. Listen, pick the better one, then see who made them and what the original Music Arena voter chose.</p>
<div class="mus-arena" id="mus-arena"><p class="mus-prompt"></p>
<div class="mus-due"><div><b>Track A</b><audio controls preload="none"></audio><span class="mus-chi"></span></div><div><b>Track B</b><audio controls preload="none"></audio><span class="mus-chi"></span></div></div>
<div class="row mus-voti"><button type="button" class="btn" data-voto="a">A is better</button><button type="button" class="btn" data-voto="b">B is better</button><button type="button" class="btn" data-voto="pari">Tie</button></div>
<p class="small mus-esito" aria-live="polite"></p><button type="button" class="btn primary mus-avanti" hidden>Next pair →</button></div>
<script type="application/json" id="mus-coppie">${JSON.stringify({ coppie, nomi: nomeDi }).replace(/</g, '\u003c')}</script></div>
<div class="panel" id="open"><h2>Open music models you can run yourself</h2>
<ul class="dove">${aperti.map((m) => `<li><a href="${hf(m.repo)}" rel="noopener"><b>${esc(m.nome)}</b></a> by ${esc(m.lab)}: ${esc(m.licenza)}${m.commerciale === false ? ', <b>non-commercial use only</b>' : m.condizioni ? `, ${esc(m.condizioni)}` : ', commercial use allowed'}.${m.b ? ` ${m.b} B parameters.` : ''}${m.vram ? ` Runs with ${esc(m.vram.replace(', says the official card', ''))} (official card).` : ''}</li>`).join('')}</ul>
<p class="small muted">Licenses checked by hand on Hugging Face on ${fmtData(info.controllato)}. Always read the license before using the music commercially. Speed: seconds of GPU time for each second of music on the arena's NVIDIA A6000; under 1 means faster than real time.</p></div>
<div class="panel" id="about"><h2>About the data</h2><p class="small">Votes come from <a href="https://huggingface.co/spaces/music-arena/music-arena" rel="noopener">Music Arena</a>, a research project by Carnegie Mellon University, LMArena and Sony AI, published as an <a href="${esc(v.fonte.url)}" rel="noopener">open dataset</a> under ${esc(v.fonte.licenza)}: ${fmtNum(v.sfide)} battles from ${esc(v.fonte.mesi[0].replace('_', '-'))} to ${esc(v.fonte.mesi.at(-1).replace('_', '-'))}. We compute the scores ourselves with the Bradley-Terry method, as Arena does; “both bad” and “tie” count half a point to each model, so our order can differ slightly from Music Arena’s own page. We are not affiliated with Music Arena. Data updated ${fmtData(v.aggiornato)}. Looking for voices instead? See <a href="/audio.html">free audio models</a>.</p></div>`,
  });
}
