// /llms.txt e /llms-full.txt (formato llmstxt.org): riassunto e classifiche complete
// in Markdown, per i motori di ricerca AI. Rigenerati a ogni build, quindi ogni notte.
import fs from 'node:fs';
import path from 'node:path';
import { SITO, RADICE, URL_SITO, NOME_PIENO, CHAT_WEB } from './comune.mjs';

const usabileGratis = (m) => m.aperto || m.or?.gratis;
const gb4 = (b) => (b * 0.606 + 1.2).toFixed(b >= 10 ? 0 : 1);
const cella = (s) => String(s ?? '').replace(/\|/g, '/').replace(/\n/g, ' ');

function righeCategoria(dati, perNome, c, quante) {
  const visti = new Set();
  const out = [];
  for (const m of c.modelli.filter(usabileGratis)) {
    const u = perNome.get(m.nome);
    const k = u?.chiave || m.nome;
    if (visti.has(k)) continue;
    visti.add(k);
    out.push({ m, u });
    if (out.length === quante) break;
  }
  return out;
}

const dove = (m) => [m.or?.gratis ? `free API on OpenRouter (${m.or.id})` : null, m.aperto && CHAT_WEB[m.org] ? `free chat at ${CHAT_WEB[m.org]}` : null, m.aperto ? 'downloadable weights' : null].filter(Boolean).join('; ');

export function scriviLlms(dati, modelli, blog) {
  const perNome = new Map();
  for (const m of modelli) for (const n of Object.values(m.nomi || {})) perNome.set(n, m);
  const fileDec = path.join(RADICE, 'dati', 'decisioni.json');
  const dec = fs.existsSync(fileDec) ? JSON.parse(fs.readFileSync(fileDec, 'utf8')) : null;
  const senzaHtml = (h) => h.replace(/.html$/, '');
  const link = (u) => (u ? URL_SITO + senzaHtml(u.href) : URL_SITO + '/models');

  // ---------- llms.txt: corto, i link e i primi 5 per categoria ----------
  const breve = [
    `# ${NOME_PIENO}`,
    '',
    `> ${NOME_PIENO} ranks the AI models you can use for free (open weights you can download, or a free API today) using Arena's public human-preference votes (CC BY 4.0), and shows the GPU memory and speed each model needs at home. Updated every night; data as of ${dati.aggiornato}.`,
    '',
    'Scores are Arena ratings (Elo-style, higher is better; rank counts all models, paid ones included). Sizes come from the official Hugging Face repositories. Speed and memory are estimates (4-bit Q4_K_M, about ±30%). Not affiliated with Arena or TypeSafe AI.',
    '',
    '## Best free model in each category',
    '',
    ...dati.categorie.map((c) => {
      const [p] = righeCategoria(dati, perNome, c, 1);
      return p ? `- [${c.nome}: ${p.m.nome}](${link(p.u)}): Arena score ${p.m.punti}, #${p.m.pos} of ${c.totale}${p.m.hf ? `, ${p.m.hf.b} B parameters, about ${gb4(p.m.hf.b)} GB at 4-bit` : ''}. ${dove(p.m)}` : '';
    }).filter(Boolean),
    '',
    '## Rankings',
    '',
    ...dati.categorie.map((c) => `- [Best free ${c.nome.toLowerCase()} models](${URL_SITO}/#${c.id}): ${c.modelli.filter(usabileGratis).length} free models of ${c.totale} in Arena's ${c.nome} ranking`),
    `- [Decision models (Jev-style)](${URL_SITO}/decision): ${dec ? `${dec.modelli.length} open decision models ranked by the Jev Decision Index; ${dec.modelli.filter((m) => m.punti > dec.jev.punti).length} score better than ${dec.jev.nome}` : 'open decision models ranked'}`,
    `- [New models waiting for Arena votes](${URL_SITO}/#new): released in the last 60 days by the labs' official Hugging Face pages`,
    `- [All free models](${URL_SITO}/models): ${modelli.length} models with size, memory needs and where to use them free`,
    '',
    '## Tools',
    '',
    `- [Run at home](${URL_SITO}/home): pick your graphics card (1 to 10 cards) and RAM; shows which models fit, memory split, tokens per second and the best quantization level`,
    `- [GPUs for local AI, compared](${URL_SITO}/gpus): every graphics card and AI computer in our catalogue with memory, bandwidth, estimated tokens per second on real open models, and the best free model that fits`,
    `- [Try & compare](${URL_SITO}/compare): one prompt to two free models side by side, blind voting, on your own free OpenRouter account`,
    '',
    '## Guides',
    '',
    ...blog.filter((p) => p.tipo === 'Guide').map((p) => `- [${p.titolo}](${URL_SITO}/blog/${p.slug}): ${p.descr}`),
    '',
    '## Optional',
    '',
    `- [Full rankings in Markdown](${URL_SITO}/llms-full.txt): every free model in every category with score, size, memory, quality at 4-bit and where to use it`,
    `- [Raw data (JSON)](${URL_SITO}/data.json): rankings, sizes, architectures, GPU catalogue`,
    `- [How we rank](${URL_SITO}/about): method, sources and FAQ`,
    `- [Weekly reports](${URL_SITO}/blog/): what changed among free models each week`,
    '',
  ].join('\n');
  fs.writeFileSync(path.join(SITO, 'llms.txt'), breve);

  // ---------- llms-full.txt: tutte le tabelle ----------
  const parti = [`# ${NOME_PIENO}: full rankings`, '', `> Free AI models ranked by Arena votes, data as of ${dati.aggiornato}. Source: Arena leaderboard dataset by Arena Intelligence (CC BY 4.0), filtered to free models; sizes from Hugging Face; memory at 4-bit (Q4_K_M) with 8K context is our estimate. Site: ${URL_SITO}`, ''];
  for (const c of dati.categorie) {
    const lista = righeCategoria(dati, perNome, c, 60);
    parti.push(`## ${c.nome}`, '', `${c.modelli.filter(usabileGratis).length} of ${c.totale} models are free. Votes as of ${c.data}.`, '',
      '| Free rank | Model | Lab | Arena score | Overall rank | Parameters | Downloadable | License | 4-bit memory | Free online | Page |',
      '|---|---|---|---|---|---|---|---|---|---|---|',
      ...lista.map(({ m, u }, i) => `| ${i + 1} | ${cella(m.nome)} | ${cella(m.org)} | ${m.punti} | ${m.pos}/${c.totale} | ${m.hf ? m.hf.b + ' B' + (m.hf.att && m.hf.att < m.hf.b ? ` (${m.hf.att} B active)` : '') : '—'} | ${m.aperto ? 'yes' : 'no'} | ${cella(m.licenza)} | ${m.hf ? gb4(m.hf.b) + ' GB' : '—'} | ${cella([m.or?.gratis ? 'OpenRouter free API' : '', m.aperto && CHAT_WEB[m.org] ? 'lab chat' : ''].filter(Boolean).join(', ') || '—')} | ${link(u)} |`), '');
  }
  const nuovi = modelli.filter((m) => m.nuovo);
  if (nuovi.length) parti.push('## New, waiting for Arena votes', '', '| Released | Model | Lab | Parameters | 4-bit memory | Page |', '|---|---|---|---|---|---|',
    ...nuovi.map((m) => `| ${m.primo || '—'} | ${cella(m.nome)} | ${cella(m.org)} | ${m.hf ? m.hf.b + ' B' : '—'} | ${m.hf ? gb4(m.hf.b) + ' GB' : '—'} | ${URL_SITO}${senzaHtml(m.href)} |`), '');
  const piccoli = modelli.filter((m) => m.senzaVoti && !m.nuovo);
  if (piccoli.length) parti.push('## Small models without Arena votes (ordered by downloads)', '', '| Model | Lab | Parameters | Downloads/month | 4-bit memory | Page |', '|---|---|---|---|---|---|',
    ...piccoli.sort((a, b) => (b.download || 0) - (a.download || 0)).map((m) => `| ${cella(m.nome)} | ${cella(m.org)} | ${m.hf.b} B | ${m.download || 0} | ${gb4(m.hf.b)} GB | ${URL_SITO}${senzaHtml(m.href)} |`), '');
  if (dec) parti.push(`## Decision models (Jev-style)`, '', `Source: Jev Decision Index (community leaderboard, ${dec.suite.versione}, updated ${dec.aggiornato}). ${dec.jev.nome} by TypeSafe AI scores ${dec.jev.punti}.`, '',
    '| Rank | Model | Lab | Decision Index | vs Jev | Type | Parameters | Downloadable | Time per decision |', '|---|---|---|---|---|---|---|---|---|',
    ...dec.modelli.map((m, i) => `| ${i + 1} | ${cella(m.nome)} | ${cella(m.org)} | ${m.punti} | ${(m.punti - dec.jev.punti).toFixed(1)} | ${cella(m.tipo)} | ${m.b ? m.b + ' B' : '—'} | ${m.repo ? 'https://huggingface.co/' + m.repo : 'no'} | ${m.ms != null ? Math.round(m.ms) + ' ms' : '—'} |`), '');
  fs.writeFileSync(path.join(SITO, 'llms-full.txt'), parti.join('\n'));
  return { breve: breve.length, pieno: parti.join('\n').length };
}
