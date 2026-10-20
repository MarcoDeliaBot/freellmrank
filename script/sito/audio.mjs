// Pagina /audio: voce → testo (trascrizione) e testo → voce (voci sintetiche), solo modelli aperti e gratis.
// Dati da script/costruisci-audio.mjs (dati/audio.json). Arena non ha classifiche audio: le fonti sono altre, citate.
import fs from 'node:fs';
import path from 'node:path';
import { esc, pagina, NOME_PIENO, RADICE, fmtNum, fmtData, spiega, barraSezioni, nuovo } from './comune.mjs';
import { barre } from './grafici.mjs';
import { AUDIO_STT, AUDIO_TTS, AUDIO_PER_VISITATORE } from '../cf-modelli.mjs';

const SOGLIA_TTS = 300; // sotto questi voti un modello testo→voce non entra in classifica
const COLORI = ['s1', 's2', 's3', 's4', 's5'];
const nomeBreve = (x) => String(x).split('/').pop().replace(/[-_]/g, ' ').replace(/\b(api|demo|hf)\b/gi, '').replace(/\s+/g, ' ').trim();
const space = (s) => `https://huggingface.co/spaces/${s.split('/').slice(0, 2).join('/')}`;

export function paginaAudio(dati, blog) {
  const file = path.join(RADICE, 'dati', 'audio.json');
  if (!fs.existsSync(file)) return;
  const a = JSON.parse(fs.readFileSync(file, 'utf8'));
  const tts = a.tts.filter((x) => x.voti >= SOGLIA_TTS);
  const ttsPochi = a.tts.filter((x) => x.voti < SOGLIA_TTS);
  const asr = a.asr;

  const graficoAsr = barre(asr.slice(0, 12).map((m, i) => ({ nome: nomeBreve(m.repo), valore: Math.round((100 - m.wer) * 100) / 100, href: `https://huggingface.co/${m.repo}`, colore: COLORI[i], nota: `${m.wer}% of words wrong` })),
    { titoloAsse: 'Words transcribed right (%), English', testoColori: 'Higher is better. Average over 8 English test sets that every open model in the list has.' });
  const graficoTts = barre(tts.slice(0, 12).map((m, i) => ({ nome: nomeBreve(m.space), valore: m.punteggio, href: space(m.space), colore: COLORI[i], nota: `${fmtNum(m.voti)} votes` })),
    { titoloAsse: 'Score from blind votes (1000 = average)', testoColori: 'Higher is better. Computed by us from the arena’s public votes with the Bradley-Terry method, like Arena.' });

  const righeAsr = asr.map((m, i) => `<tr><td class="n">${i + 1}</td><td><a href="https://huggingface.co/${esc(m.repo)}" rel="noopener">${esc(nomeBreve(m.repo))}</a><br><span class="small muted">${esc(m.repo.split('/')[0])}</span></td>
<td class="n"><b>${m.wer}%</b></td><td class="n">${m.b ? m.b + ' B' : '—'}</td><td class="n">${m.lingue || '—'}</td><td class="n">${m.rtfx ? fmtNum(Math.round(m.rtfx)) + '×' : '—'}</td>
<td>${esc(m.licenza)}${m.commerciale ? '' : ' <span class="tag bad">non-commercial</span>'}</td></tr>`).join('');
  const righeTts = (lista) => lista.map((m, i) => `<tr><td class="n">${i + 1}</td><td><a href="${space(m.space)}" rel="noopener">${esc(nomeBreve(m.space))}</a><br><span class="small muted">${esc(m.space)}</span></td>
<td class="n"><b>${m.punteggio}</b></td><td class="n">±${m.ic ?? '—'}</td><td class="n">${fmtNum(m.voti)}</td><td class="n">${m.ultimo ? fmtData(m.ultimo) : '—'}</td></tr>`).join('');

  // riquadro «Try it now»: due modelli aperti su Cloudflare Workers AI, con la loro posizione nelle nostre classifiche
  const posAsr = asr.findIndex((m) => m.repo === 'openai/whisper-large-v3-turbo') + 1;
  const posTts = a.tts.findIndex((m) => /melotts/i.test(m.space)) + 1;
  const NOMI_LINGUE = { en: 'English', es: 'Spanish', fr: 'French', zh: 'Chinese', ja: 'Japanese', ko: 'Korean' };
  const prova = `<div class="panel prova" id="try-audio" data-secondi="${AUDIO_STT.secondiMax}"><h2>Try it now${nuovo('2026-10-20')}</h2>
<p class="small muted">No account, no payment. ${AUDIO_PER_VISITATORE} tries a day per visitor. It runs on <a href="https://developers.cloudflare.com/workers-ai/" rel="noopener">Cloudflare Workers AI</a>. We do not store your voice or your text. Do not record personal data.</p>
<div class="prova-audio">
<div data-parte="stt"><h3>Speech to text</h3><p class="small">Whisper Large v3 Turbo by OpenAI${posAsr ? `, #${posAsr} in the ranking below` : ''}. Speak up to ${AUDIO_STT.secondiMax} seconds, in any language.</p>
<div class="row"><button type="button" class="btn primary reg">Record</button><label class="btn">Upload a file<input type="file" accept="audio/*" hidden></label></div>
<p class="small muted prova-stato" aria-live="polite"></p><div class="prova-risposta" hidden></div></div>
<div data-parte="tts"><h3>Text to speech</h3><p class="small">MeloTTS by MyShell${posTts ? `, #${posTts} in the ranking below` : ''}. Up to ${AUDIO_TTS.caratteriMax} characters.</p>
<form class="prova-form"><label for="tts-text" class="small">Your text</label>
<textarea id="tts-text" rows="3" maxlength="${AUDIO_TTS.caratteriMax}" required placeholder="Example: Free models can now read text aloud on your own computer."></textarea>
<div class="row"><select aria-label="Language">${AUDIO_TTS.lingue.map((l) => `<option value="${l}">${NOMI_LINGUE[l]}</option>`).join('')}</select><button type="submit" class="btn primary">Speak</button></div></form>
<p class="small muted prova-stato" aria-live="polite"></p><audio controls hidden></audio></div>
</div>
<p class="small muted">These two are the open audio models Cloudflare runs for free; the top of the rankings below is better, but has to run on your own computer or on Hugging Face.</p></div>`;

  pagina({
    file: 'audio.html', attiva: '/audio.html', dati, blog, script: 'audio-try.js',
    titolo: `Best Free Speech-to-Text and Text-to-Speech Models · ${NOME_PIENO}`,
    descr: `Free, open audio AI models ranked: ${asr.length} speech-to-text models by word error rate and ${tts.length} text-to-speech voices by blind votes. Best now: ${nomeBreve(asr[0]?.repo)} and ${nomeBreve(tts[0]?.space)}.`,
    corpo: `<div style="display:grid;gap:.4rem">
<h1>Free audio AI models</h1>
<p class="lead">Two rankings of open models you can use free: <a href="#in">speech to text</a> (they write down what you say) and <a href="#out">text to speech</a> (they read text aloud). Arena does not rank audio, so these come from two other public leaderboards, credited below.</p>
</div>
<div class="tiles">
<div class="tile"><span class="small muted">Best speech to text</span><b>${esc(nomeBreve(asr[0]?.repo))}</b><span class="small muted">${asr[0]?.wer}% of words wrong · ${asr[0]?.b ? asr[0].b + ' B' : ''}</span></div>
<div class="tile"><span class="small muted">Best text to speech</span><b>${esc(nomeBreve(tts[0]?.space))}</b><span class="small muted">score ${tts[0]?.punteggio} · ${fmtNum(tts[0]?.voti || 0)} votes</span></div>
<div class="tile"><span class="small muted">Open models ranked</span><b>${asr.length + tts.length}</b><span class="small muted">${asr.length} speech to text, ${tts.length} text to speech</span></div>
</div>
${barraSezioni([['try-audio', 'Try it now'], ['in', 'Speech to text'], ['out', 'Text to speech'], ['v2', 'TTS Arena V2']])}
${prova}
<div class="panel" id="in"><h2>Speech to text (audio in)</h2>${graficoAsr}${spiega('The 12 open speech-to-text models that make the fewest mistakes on English recordings: meetings, phone calls, read books, accented speech.', 'Longer bar, more words right. Differences under half a point are small; pick by size and speed too, in the table below.')}
<div class="tw"><table><thead><tr><th>#</th><th>Model</th><th>Words wrong</th><th>Size</th><th>Languages</th><th>Speed</th><th>License</th></tr></thead><tbody>${righeAsr}</tbody></table></div>
<p class="small muted">Word error rate: the share of words the model gets wrong, lower is better; average over ${a.fonti.asr.prove.length} English test sets (${a.fonti.asr.prove.map(esc).join(', ')}). Speed: how many times faster than real time on the leaderboard’s GPU. Source: <a href="${a.fonti.asr.url}" rel="noopener">${esc(a.fonti.asr.nome)}</a>, open models only; we recompute the average on the test sets all of them share, so the order can differ slightly from the original page.</p></div>
<div class="panel" id="out"><h2>Text to speech (audio out)</h2>${graficoTts}${spiega('The 12 open voice models people preferred most in blind listening tests.', 'Longer bar, preferred more often. 1000 is the average voice; 100 points more means it wins about 64% of the time against an average one.')}
<div class="tw"><table><thead><tr><th>#</th><th>Voice model</th><th>Score</th><th>±</th><th>Votes</th><th>Last vote</th></tr></thead><tbody>${righeTts(tts)}</tbody></table></div>
<p class="small muted">People hear two voices reading the same text, without names, and pick the better one. Source: <a href="${a.fonti.tts.url}" rel="noopener">${esc(a.fonti.tts.nome)}</a>, ${fmtNum(a.tts.reduce((s, m) => s + m.voti, 0) / 2)} votes on open models running on Hugging Face Spaces; paid cloud voices are left out. Models need ${SOGLIA_TTS} votes to be ranked. Many votes are from 2024–2025: “last vote” shows how recent each model’s votes are.</p>
${ttsPochi.length ? `<details><summary class="small">${ttsPochi.length} models with fewer than ${SOGLIA_TTS} votes</summary><div class="tw"><table><thead><tr><th>#</th><th>Voice model</th><th>Score</th><th>±</th><th>Votes</th><th>Last vote</th></tr></thead><tbody>${righeTts(ttsPochi)}</tbody></table></div></details>` : ''}
</div>
${a.v2.length ? `<div class="panel" id="v2"><h2>Open voices on TTS Arena V2</h2><p class="small muted">TTS Arena V2 ranks mostly paid voices; these are the open ones it lists, with its own scores (a different scale from the table above). Source: <a href="${a.fonti.v2.url}" rel="noopener">${esc(a.fonti.v2.nome)}</a>.</p>
<div class="tw"><table><thead><tr><th>Voice model</th><th>TTS Arena V2 score</th><th>±</th><th>Votes</th><th>Still in the arena</th></tr></thead><tbody>${a.v2.map((m) => `<tr><td>${m.repo ? `<a href="https://huggingface.co/${esc(m.repo)}" rel="noopener">${esc(m.nome)}</a>` : esc(m.nome)}</td><td class="n">${m.elo}</td><td class="n">±${m.ic}</td><td class="n">${fmtNum(m.voti)}</td><td>${m.attivo ? 'yes' : 'retired'}</td></tr>`).join('')}</tbody></table></div></div>` : ''}
<div class="panel"><h2>About these rankings</h2><p class="small">These leaderboards are run by others, not by Arena and not by us. None of them states a license for reusing its results, so we show them with credit and a link to the original. Data updated ${fmtData(a.aggiornato)}. Want to compare text models instead? See the <a href="/">free leaderboard</a> or vote in <a href="/arena.html">Free Arena</a>.</p></div>`,
  });
}
