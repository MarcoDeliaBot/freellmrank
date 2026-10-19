// Una pagina per ogni scheda: /gpu/<id> «Best free AI models for the RTX 3060 12 GB».
// È la ricerca che la gente fa davvero ("best llm for rtx 3060"): rispondiamo con i modelli votati che ci stanno,
// la velocità stimata, quelli che girano con l'aiuto della RAM e i piccoli più scaricati.
import { esc, pagina, NOME_PIENO, URL_SITO, linkAmazon, fmtNum } from './comune.mjs';
import { simula, daScheda } from '../../sorgente/calc.mjs';
import { fmtVel } from '../../sorgente/gpu-table.mjs';

const CTX = 8192, RAM = 64;
const gb4 = (b) => b * 0.606 + 1.2; // file a 4-bit con un po' di margine, come nelle pagine dei modelli
const fmtGB = (g) => (g >= 100 ? Math.round(g) : g >= 10 ? g.toFixed(0) : g.toFixed(1)) + ' GB';

export function pagineGpu(dati, modelli, blog, { cercaAmazon }) {
  const schede = dati.schede.schede;
  const votati = modelli.filter((m) => m.hf && m.cat.chat).sort((a, b) => b.cat.chat.punti - a.cat.chat.punti);
  const piccoli = modelli.filter((m) => m.hf && m.senzaVoti && !m.nuovo && m.download).sort((a, b) => b.download - a.download);

  for (const s of schede) {
    const h1 = daScheda(s, { n: 1, ram: RAM, ctx: CTX });
    const h2 = daScheda(s, { n: 2, ram: RAM, ctx: CTX });
    const conVel = (lista, h) => lista.map((m) => ({ m, r: simula(m.hf, h) }));
    const inGpu = conVel(votati, h1).filter((x) => x.r.dove === 'gpu').slice(0, 15);
    const conRam = conVel(votati, h1).filter((x) => x.r.dove === 'ram').slice(0, 6);
    const piccoliOk = conVel(piccoli, h1).filter((x) => x.r.dove === 'gpu').slice(0, 6);
    const migliore = inGpu[0];
    // con due schede: solo se cambia qualcosa rispetto a una
    const due = !s.unificata && conVel(votati, h2).find((x) => x.r.dove === 'gpu');
    const migliore2 = due && (!migliore || due.m !== migliore.m) ? due : null;
    const conAiuto = !migliore && conRam[0];
    const maxB = Math.max(0, (h1.vram - 1.6) / (h1.bpp + 0.000004 * CTX));
    const amazon = cercaAmazon(s);
    // schede simili: memoria vicina, per girare fra le pagine
    const simili = schede.filter((x) => x !== s).sort((a, b) => Math.abs(a.gb - s.gb) - Math.abs(b.gb - s.gb) || b.banda - a.banda).slice(0, 6);

    const riga = ({ m, r }) => `<tr><td><a href="${m.href}">${esc(m.nome)}</a><br><span class="small muted">${esc(m.org)}${m.hf.att && m.hf.att < m.hf.b * 0.6 ? ` · MoE, ${m.hf.att} B active` : ''}</span></td>
<td class="n">${m.cat.chat ? m.cat.chat.punti : m.download ? fmtNum(m.download) : '—'}</td><td class="n">${m.hf.b} B</td><td class="n">${fmtGB(gb4(m.hf.b))}</td><td class="n"><b>${r.vel != null ? fmtVel(r.vel) : '—'}</b></td></tr>`;
    const tabella = (righe, titoloVoti = 'Arena score') => `<div class="tw"><table><thead><tr><th>Model</th><th>${titoloVoti}</th><th>Size</th><th>4-bit file</th><th>Tokens/s</th></tr></thead><tbody>${righe.map(riga).join('')}</tbody></table></div>`;

    const domande = [
      [`What is the best free AI model for the ${s.nome}?`, migliore
        ? `${migliore.m.nome} (Arena score ${migliore.m.cat.chat.punti}) is the highest-voted open model that fits entirely in ${s.unificata ? `the ~${Math.round(s.gb * 0.75)} GB of shared memory the GPU can use` : `${s.gb} GB of video memory`} at 4-bit, writing about ${fmtVel(migliore.r.vel)} tokens per second.`
        : `No voted model fits entirely in ${s.gb} GB at 4-bit. Small models without Arena votes do, and larger ones run with help from system RAM, more slowly.`],
      [`How big a model can the ${s.nome} run?`, `About ${Math.round(maxB)} billion parameters for a dense model at 4-bit with an 8K context, fully on the GPU. Mixture-of-experts models can be bigger, and with ${RAM} GB of system RAM larger models still run, more slowly.`],
      [`Is the ${s.nome} good for local LLMs?`, `It has ${s.gb} GB of memory and ${s.banda} GB/s of bandwidth. Memory decides which models fit; bandwidth decides how fast they write. ${s.gb >= 24 ? 'With 24 GB or more it runs 27–32 B models, the sweet spot of quality for home use.' : s.gb >= 16 ? 'With 16 GB it runs models up to about 20 B fully on the GPU; 27–32 B models need help from system RAM.' : 'With less than 16 GB it runs small models well; bigger ones need system RAM and get slow.'}`],
    ];

    pagina({
      file: `gpu/${s.id}.html`, attiva: '/gpus.html', dati, blog,
      titolo: `Best Free AI Models for the ${s.nome} (Local LLM, Speed) · ${NOME_PIENO}`,
      descr: `Which free AI models run on the ${s.nome}: ${migliore ? `${migliore.m.nome} is the best voted one that fits, at about ${fmtVel(migliore.r.vel)} tokens/s.` : 'small models fit, bigger ones need system RAM.'} Speed estimates for ${inGpu.length + piccoliOk.length} models.`,
      jsonld: [
        { '@type': 'FAQPage', mainEntity: domande.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) },
        { '@type': 'BreadcrumbList', itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'GPUs for local AI', item: `${URL_SITO}/gpus` },
          { '@type': 'ListItem', position: 2, name: s.nome, item: `${URL_SITO}/gpu/${s.id}` },
        ] },
      ],
      corpo: `<p class="briciole small"><a href="/gpus.html">GPUs</a> › ${esc(s.marca)}</p>
<div style="display:grid;gap:.4rem">
<h1>Best free AI models for the ${esc(s.nome)}</h1>
<p class="lead">${esc(s.nome)}: ${s.gb} GB${s.unificata ? ' of shared memory (about ' + Math.round(s.gb * 0.75) + ' GB usable by the GPU)' : ' of video memory'}, ${s.banda} GB/s. These are the free models it runs, ranked by Arena votes, with the speed you can expect.</p>
<p class="small"><a href="/home.html?gpu=${encodeURIComponent(s.id)}">Simulate your setup</a>${amazon ? ` · <a class="amazon" data-q="${esc(amazon)}" href="${esc(linkAmazon(amazon))}" rel="sponsored nofollow noopener" target="_blank">Check the price on Amazon ↗</a>` : ''} · <a href="/gpus.html">Compare all GPUs</a></p>
</div>
<div class="tiles">
${migliore ? `<div class="tile"><span class="small muted">Best voted model that fits</span><b>${esc(migliore.m.nome)}</b><span class="small muted">Arena ${migliore.m.cat.chat.punti} · ~${fmtVel(migliore.r.vel)} tokens/s</span></div>`
  : conAiuto ? `<div class="tile"><span class="small muted">Best voted model, with RAM help</span><b>${esc(conAiuto.m.nome)}</b><span class="small muted">Arena ${conAiuto.m.cat.chat.punti} · ~${fmtVel(conAiuto.r.vel)} tokens/s with ${RAM} GB RAM</span></div>` : ''}
<div class="tile"><span class="small muted">Largest dense model</span><b>~${Math.round(maxB)} B</b><span class="small muted">at 4-bit, 8K context, fully on the GPU</span></div>
<div class="tile"><span class="small muted">Memory</span><b>${s.gb} GB</b><span class="small muted">${s.banda} GB/s bandwidth</span></div>
${migliore2 ? `<div class="tile"><span class="small muted">With two cards</span><b>${esc(migliore2.m.nome)}</b><span class="small muted">${2 * s.gb} GB · ~${fmtVel(migliore2.r.vel)} tokens/s</span></div>` : ''}
</div>
${inGpu.length ? `<div class="panel"><h2>Voted models that fit fully on the GPU</h2>${tabella(inGpu)}</div>` : ''}
${conRam.length ? `<div class="panel"><h2>Bigger models with help from ${RAM} GB of system RAM</h2><p class="small muted">Part of the model sits in system memory, which is much slower than video memory.</p>${tabella(conRam)}</div>` : ''}
${piccoliOk.length ? `<div class="panel"><h2>Popular small models</h2><p class="small muted">Official small models with no Arena votes yet, ordered by downloads on Hugging Face (popularity, not quality).</p>${tabella(piccoliOk, 'Downloads/month')}</div>` : ''}
<p class="small muted">Estimates at 4-bit (Q4_K_M) with an 8K context, calibrated on 44 real llama.cpp tests (typical error about ±10%). Tokens per second: about 10 is reading speed.${amazon ? ` As an Amazon Associate, ${NOME_PIENO} earns from qualifying purchases; the links do not change the rankings.` : ''}</p>
<div class="panel"><h2>Questions</h2>${domande.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}</div>
<div class="panel"><h2>Similar cards</h2><ul class="vicini">${simili.map((x) => `<li><a href="/gpu/${x.id}.html">${esc(x.nome)}</a> <span class="muted small">${x.gb} GB · ${x.banda} GB/s</span></li>`).join('')}</ul></div>`,
      script: amazon ? 'amazon.js' : undefined,
    });
  }
}
