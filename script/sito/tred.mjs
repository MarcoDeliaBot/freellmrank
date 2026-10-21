// Pagina /3d-models: «Free AI 3D model generators», decisa da Marco il 21/10/2026.
// Arena non vota i modelli 3D: l'ordine è per download su Hugging Face negli ultimi 30 giorni (dati/3d.json,
// da script/costruisci-3d.mjs), e la pagina lo dice. Elenco, licenze e demo stanno a mano in dati/3d-modelli.json.
import fs from 'node:fs';
import path from 'node:path';
import { esc, pagina, NOME_PIENO, RADICE, fmtNum, fmtData, barraSezioni, nuovo } from './comune.mjs';

export function pagina3d(dati, blog) {
  const file = path.join(RADICE, 'dati', '3d.json');
  if (!fs.existsSync(file)) return;
  const { aggiornato, licenze, modelli } = JSON.parse(fs.readFileSync(file, 'utf8'));
  const hf = (r) => `https://huggingface.co/${r}`;
  const ovunque = modelli.filter((m) => !licenze[m.licenza]?.avviso);
  const primo = modelli[0], primoOvunque = ovunque[0];
  const daTesto = modelli.filter((m) => /text/i.test(m.da));

  const riga = (m, i) => {
    const l = licenze[m.licenza];
    return `<tr id="m-${esc(m.repo.replace('/', '-'))}"${l.avviso ? '' : ' class="casa"'}><td class="n">${i + 1}</td>
<td class="m"><a class="nome-modello" href="${hf(m.repo)}" rel="noopener">${esc(m.nome)}</a><div class="org">${esc(m.lab)}</div></td>
<td>${esc(m.da)}</td>
<td class="n"><b>${fmtNum(m.download)}</b></td>
<td class="n">${fmtNum(m.like)}</td>
<td><span class="tag ${l.avviso ? 'api' : 'home'}">${esc(l.nome)}</span>${l.avviso ? '<div class="org">not in the EU, UK, South Korea</div>' : m.licenza === 'stability' ? '<div class="org">free under $1M revenue</div>' : ''}</td>
<td>${m.demo ? `<a class="tag free" href="https://huggingface.co/spaces/${esc(m.demo)}" rel="noopener">Try it ↗</a>` : '<span class="small muted">download only</span>'}</td></tr>`;
  };

  pagina({
    file: '3d-models.html', attiva: '/3d-models.html', dati, blog,
    titolo: `Free AI 3D Model Generators: ${primo.nome}, Hunyuan3D, TripoSR · ${NOME_PIENO}`,
    descr: `Free AI models that turn a picture or a sentence into a 3D object, with their license and an official demo to try. ${modelli.length} models, ordered by downloads on Hugging Face.`,
    corpo: `<div style="display:grid;gap:.4rem">
<h1>Free AI 3D model generators${nuovo('2026-10-21')}</h1>
<p class="lead">These models turn a picture, or a sentence, into a 3D object you can open in Blender, put in a game or send to a 3D printer. All of them are free to download, and most have an official demo you can try in the browser.</p>
<p class="small muted">Arena does not run blind votes on 3D models, so this is not a quality ranking. The order is by downloads on Hugging Face in the last 30 days: it tells you what people use, not what is best.</p>
</div>
<div class="tiles">
<div class="tile"><span class="small muted">Most downloaded</span><b>${esc(primo.nome)}</b><span class="small muted">${fmtNum(primo.download)} downloads in 30 days · ${esc(licenze[primo.licenza].nome)}</span></div>
<div class="tile"><span class="small muted">Free to use everywhere</span><b>${ovunque.length} of ${modelli.length}</b><span class="small muted">the Hunyuan3D license excludes the EU, UK and South Korea</span></div>
<div class="tile"><span class="small muted">From a sentence</span><b>${daTesto.length} models</b><span class="small muted">${esc(daTesto.map((m) => m.nome).join(', '))}</span></div>
</div>
${barraSezioni([['models', 'Models'], ['licenses', 'Licenses'], ['how', 'How to use them']])}
<div class="panel" id="models"><h2>Models, by downloads</h2>
<div class="tw"><table><thead><tr><th>#</th><th>Model</th><th>Makes 3D from</th><th>Downloads, 30 days</th><th>Likes</th><th>License</th><th>Demo</th></tr></thead><tbody>${modelli.map(riga).join('')}</tbody></table></div>
<p class="small muted">Green rows: licenses that let you use the model anywhere. Downloads and likes from Hugging Face, updated ${fmtData(aggiornato)}. Only the official repositories: copies and converted versions made by other people are not counted.</p></div>
<div class="panel" id="licenses"><h2>Licenses</h2>
<ul class="dove">${Object.values(licenze).map((l) => `<li><b>${esc(l.nome)}</b>: ${esc(l.nota)} ${esc(modelli.filter((m) => licenze[m.licenza] === l).map((m) => m.nome).join(', '))}.</li>`).join('')}</ul>
<p class="small muted">Licenses checked by hand on Hugging Face on ${fmtData('2026-10-21')}. Read the license before you sell what you make.</p></div>
<div class="panel" id="how"><h2>How to use them</h2>
<div class="faq-griglia">
<div class="faq-voce"><h3>Try one now</h3><p>Open a demo, upload a photo of one object on a plain background, and download the result as a GLB file. The demos run on Hugging Face’s shared GPUs with a free daily quota, so they can be busy.</p></div>
<div class="faq-voce"><h3>Best in the EU</h3><p>${primoOvunque ? `${esc(primoOvunque.nome)} by ${esc(primoOvunque.lab)} is the most downloaded model you can use in Europe, under the ${esc(licenze[primoOvunque.licenza].nome)} license.` : ''} Hunyuan3D models are popular, but their license does not cover the European Union.</p></div>
<div class="faq-voce"><h3>On your own computer</h3><p>The models run on an NVIDIA graphics card with the code on each model’s Hugging Face page. Check the memory each one asks for on its page before you start. See which <a href="/gpus.html">graphics cards</a> have the most memory.</p></div>
<div class="faq-voce"><h3>Why not ranked by votes?</h3><p>Every other ranking on ${NOME_PIENO} comes from Arena’s blind human votes. Arena has no 3D leaderboard, so here we show downloads, which anyone can check on Hugging Face. When blind votes for 3D appear, this page will use them.</p></div>
</div></div>`,
  });
}
