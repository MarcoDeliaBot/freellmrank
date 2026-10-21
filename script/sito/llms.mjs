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
    `- [Free Arena](${URL_SITO}/arena): ask a question, two anonymous free models answer, vote for the better one; votes become an open ranking of free models`,
    `- [Free audio AI models](${URL_SITO}/audio): open speech-to-text models ranked by word error rate (Open ASR Leaderboard) and open text-to-speech voices ranked by blind votes (TTS Spaces Arena)`,
    `- [AI apps, free and paid](${URL_SITO}/apps): coding agents, AI code editors, apps to run and fine-tune models at home, app builders; which are free, free with your own or local model, free plan with limits, or paid; best results (Terminal-Bench 2.0) and tokens per task (Artificial Analysis)`,
    `- [AI models on your phone](${URL_SITO}/phone): free models that run offline on phones with 8, 12 or 16 GB of RAM, apps to use, expert streaming explained`,
    `- [Free AI music generators](${URL_SITO}/music): text-to-music models ranked by Music Arena blind votes (CC BY 4.0), with licenses, sizes, example tracks and a blind test`,
    `- [Free AI 3D model generators](${URL_SITO}/3d-models): free models that turn an image or text into a 3D object (TRELLIS.2, Hunyuan3D, TripoSR...), ordered by Hugging Face downloads because Arena has no 3D votes; licenses and official demos`,
    `- [AI PCs](${URL_SITO}/ai-pcs): Mac Studio, MacBook Pro, NVIDIA DGX Spark and Ryzen AI Max+ 395 mini PCs compared on memory, bandwidth and the best free model each runs`,
    `- [How much RAM for local AI](${URL_SITO}/ram): DDR4 and DDR5 kits, how RAM speed changes tokens per second when a model spills out of the graphics card`,
    `- [Blog RSS feed](${URL_SITO}/blog/feed.xml): guides and weekly reports`,
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
    `- Translated versions of every page: ${['it', 'es', 'de', 'fr', 'pt', 'ja'].map((l) => `${URL_SITO}/${l}/`).join(', ')}`,
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
  // musica (Music Arena, voti ciechi) e 3D (download Hugging Face): stessi dati delle pagine /music e /3d-models
  const leggiDati = (n) => { const f = path.join(RADICE, 'dati', n); return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : null; };
  const mus = leggiDati('musica.json'), musInfo = leggiDati('musica-modelli.json');
  if (mus && musInfo) {
    const righe = mus.modelli.map((m) => ({ ...m, ...(musInfo.modelli[m.id] || { nome: m.id, lab: '?' }) })).filter((m) => m.voti >= 200);
    parti.push('## Music (text to music)', '', `Source: Music Arena blind votes (CC BY 4.0), ${mus.sfide} battles; Bradley-Terry score computed by us, 1000 = average. Updated ${mus.aggiornato}.`, '',
      '| Rank | Model | Lab | Score | Votes | Open weights | License | Page |', '|---|---|---|---|---|---|---|---|',
      ...righe.map((m, i) => `| ${i + 1} | ${cella(m.nome)} | ${cella(m.lab)} | ${m.punteggio} | ${m.voti} | ${m.aperto ? 'yes' : 'no'} | ${cella(m.aperto ? m.licenza : 'closed')} | ${URL_SITO}/music |`), '');
  }
  const tre = leggiDati('3d.json');
  if (tre) parti.push('## 3D models (image or text to 3D)', '', `Arena has no blind votes for 3D models: ordered by Hugging Face downloads in the last 30 days, not by quality. Updated ${tre.aggiornato}.`, '',
    '| Rank | Model | Lab | Makes 3D from | Downloads (30 days) | License | Demo | Weights |', '|---|---|---|---|---|---|---|---|',
    ...tre.modelli.map((m, i) => `| ${i + 1} | ${cella(m.nome)} | ${cella(m.lab)} | ${cella(m.da)} | ${m.download} | ${cella(tre.licenze[m.licenza].nome)}${tre.licenze[m.licenza].avviso ? ' (not valid in the EU, UK, South Korea)' : ''} | ${m.demo ? 'https://huggingface.co/spaces/' + m.demo : '—'} | https://huggingface.co/${m.repo} |`), '');
  fs.writeFileSync(path.join(SITO, 'llms-full.txt'), parti.join('\n'));
  return { breve: breve.length, pieno: parti.join('\n').length };
}
