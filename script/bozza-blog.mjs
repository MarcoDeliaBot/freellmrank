// Un articolo del blog in bozza a settimana (automatismo 9, deciso da Marco il 20/10/2026).
// Prende la prima idea libera da contenuti/blog-idee.json, la fa scrivere a GitHub Models con i SOLI dati del sito,
// la salva su un ramo «bozza/<slug>» e apre un'issue «bozza» con il testo, i numeri da controllare e i post social.
// Marco approva unendo il ramo (link nell'issue). Uso: node script/bozza-blog.mjs [--prova]  (--prova: niente ramo né issue)
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { RADICE, REPO, MODELLO, leggiDati, gratis, chiediModello, REGOLE_SCRITTURA, senzaLineette, numeriDaControllare, apriIssue, postSocial, testoPost } from './bozze.mjs';

const PROVA = process.argv.includes('--prova');
const dati = leggiDati();
const coda = JSON.parse(fs.readFileSync(path.join(RADICE, 'contenuti', 'blog-idee.json'), 'utf8')).idee;
const git = (...a) => execFileSync('git', a, { cwd: RADICE, encoding: 'utf8' }).trim();
const rami = PROVA ? '' : git('ls-remote', '--heads', 'origin', 'bozza/*');
const idea = coda.find((i) => !fs.existsSync(path.join(RADICE, 'contenuti', 'blog', `${i.slug}.md`)) && !rami.includes(`bozza/${i.slug}`));
if (!idea) { console.log('Nessuna idea libera in contenuti/blog-idee.json'); process.exit(0); }

// ---------- i dati del sito, in righe semplici ----------
const leggi = (f) => JSON.parse(fs.readFileSync(path.join(RADICE, 'dati', f), 'utf8'));
const memoria4 = (b) => Math.round(b * 0.606 + 2.7);
function blocco(chiave) {
  const [tipo, id] = chiave.split(':');
  if (tipo === 'categoria') {
    const c = dati.categorie.find((x) => x.id === id);
    const free = c.modelli.filter(gratis).slice(0, 12);
    const pagato = c.modelli.find((m) => !gratis(m));
    return `Arena category "${c.nome}" (data ${c.data}, ${c.totale} models ranked, ${c.modelli.filter(gratis).length} free)${c.scala === 'agent' ? ', agent score scale' : ''}. Best paid: ${pagato?.nome} ${pagato?.punti}.\nTop free models (rank among all, name, lab, score, open weights?, size):\n${free.map((m) => `#${m.pos} ${m.nome} | ${m.org} | ${m.punti} | ${m.aperto ? 'open weights' : 'free API only'}${m.hf?.b ? ` | ${m.hf.b} B params, ~${memoria4(m.hf.b)} GB at 4-bit` : ''}`).join('\n')}`;
  }
  if (tipo === 'schede') return `Home GPUs and machines (name | memory GB | memory bandwidth GB/s | unified memory?):\n${dati.schede.schede.filter((s) => s.marca !== 'Data center').map((s) => `${s.nome} | ${s.gb} | ${s.banda} | ${s.unificata ? 'unified (about 75% usable by a model)' : 'GPU VRAM'}`).join('\n')}`;
  if (tipo === 'velocita') { const v = leggi('misure-velocita.json').misure; return `Measured llama.cpp generation speeds (model | quant | hardware | tokens per second):\n${v.slice(0, 30).map((m) => `${m.model} | ${m.quant} | ${m.hw} | ${m.tg}`).join('\n')}\nOur speed estimate is calibrated on ${v.length} such measurements, median error 9%.`; }
  if (tipo === 'audio') { const a = leggi('audio.json'); return `Speech to text, open models, average word error rate on 8 English test sets (lower is better):\n${a.asr.slice(0, 10).map((m, i) => `${i + 1}. ${m.repo} | ${m.wer}% | ${m.b || '?'} B | license ${m.licenza}`).join('\n')}\nText to speech, open models, score from blind votes (1000 = average), only models with 300+ votes:\n${a.tts.filter((m) => m.voti >= 300).slice(0, 10).map((m, i) => `${i + 1}. ${m.space} | ${m.punteggio} | ${m.voti} votes`).join('\n')}\nOn freellmarena.com/audio visitors can try Whisper Large v3 Turbo (speech to text, up to 30 s) and MeloTTS (text to speech) free, without an account.`; }
  if (tipo === 'app') { const a = leggi('app.json'); return `AI apps checked by hand on ${a.controllato} (name | price type | free plan limits):\n${a.gruppi.map((g) => `${g.nome}:\n${g.app.map((x) => `${x.nome} | ${x.prezzo} | ${x.limiti}`).join('\n')}`).join('\n')}\nPrice types: free = free; byok = the app is free, you bring a model; tier = free plan with limits; paid = paid only.`; }
  if (tipo === 'telefono') return `Small open models most downloaded on Hugging Face (name | parameters | monthly downloads):\n${(dati.piccoli || []).slice(0, 15).map((m) => `${m.nome} | ${(m.parametri / 1e9).toFixed(1)} B | ${m.download}`).join('\n')}`;
  if (tipo === 'nuovi') return `New open models recently added (name | lab | release date | size | 4-bit memory | context):\n${[...dati.nuovi].sort((a, b) => (b.creato || '').localeCompare(a.creato || '')).slice(0, 12).map((m) => `${m.nome} | ${m.org} | ${m.creato} | ${m.hf?.b ? `${m.hf.b} B` : '?'} | ${m.hf?.b ? `~${memoria4(m.hf.b)} GB` : '?'} | ${m.hf?.ctx || '?'} tokens`).join('\n')}`;
  return '';
}
const contesto = `Site data updated ${dati.aggiornato}.\n\n${idea.dati.map(blocco).join('\n\n')}`;

// ---------- l'articolo ----------
const oggi = new Date().toISOString().slice(0, 10);
const corpo = await chiediModello([
  { role: 'system', content: `You write guides for the blog of FreeLLMArena (freellmarena.com), a free site that ranks only AI models you can use for free (open weights or free API), using Arena's blind human votes, and estimates which models fit your GPU and how fast they run. Readers are curious people and hobbyists, not experts.\n${REGOLE_SCRITTURA}\nFormat: Markdown. Start with a 2-3 sentence intro that answers the question directly. Then 3-5 sections with ## headings. One table is welcome. 700-1000 words. End with a short section that points to the right page of the site. Link only to these site pages: ${idea.link.join(', ')} (use relative links like [the GPU page](/gpus)). Explain terms like "4-bit" or "parameters" in one plain sentence the first time. Do not mention that you are an AI and do not talk about "this article".` },
  { role: 'user', content: `Write the article: ${idea.idea}\n\nDATA:\n${contesto}\n\nReturn only the Markdown body (no title line, no front matter).` },
], { max: 3000 });
const meta = await chiediModello([
  { role: 'system', content: `${REGOLE_SCRITTURA}\nReturn JSON {"titolo": "title under 70 characters, specific, no colon reveal", "descr": "meta description under 155 characters"}.` },
  { role: 'user', content: corpo.slice(0, 4000) },
], { json: true, max: 200 });

const md = `---\ntitolo: ${senzaLineette(meta.titolo)}\ndescr: ${senzaLineette(meta.descr)}\ndata: ${oggi}\n---\n\n${senzaLineette(corpo).trim()}\n`;
const dubbi = numeriDaControllare(md, contesto);
const social = await postSocial({ argomento: `New guide on the blog: ${meta.titolo}`, dati: `${meta.descr}\n${contesto}`, link: `https://freellmarena.com/blog/${idea.slug}` });

if (PROVA) {
  fs.writeFileSync(path.join(RADICE, 'video', `prova-${idea.slug}.md`), md);
  console.log(md.slice(0, 1500), '\n…\nNumeri da controllare:', dubbi, '\n\n', testoPost(social, contesto));
  process.exit(0);
}

// ---------- ramo e issue ----------
const ramo = `bozza/${idea.slug}`;
git('switch', '-c', ramo);
fs.writeFileSync(path.join(RADICE, 'contenuti', 'blog', `${idea.slug}.md`), md);
git('add', `contenuti/blog/${idea.slug}.md`);
git('-c', 'user.name=freellmarena-bot', '-c', 'user.email=41898282+github-actions[bot]@users.noreply.github.com', 'commit', '-m', `Bozza blog: ${meta.titolo}`);
git('push', 'origin', ramo);
await apriIssue(`Articolo da approvare: ${meta.titolo}`, `Bozza scritta da ${MODELLO} con i soli dati del sito (${dati.aggiornato}). **Non è pubblicata.**

**Per pubblicarla:** apri https://github.com/${REPO}/compare/main...${ramo}?expand=1, premi «Create pull request» e poi «Merge». Il sito la pubblica in 2 minuti, a https://freellmarena.com/blog/${idea.slug}
**Per correggerla:** modifica il file sul ramo: https://github.com/${REPO}/edit/${ramo}/contenuti/blog/${idea.slug}.md
**Per scartarla:** chiudi questa issue e cancella il ramo ${ramo}.

${dubbi.length ? `> ⚠️ Numeri da controllare (non li trovo nei dati del sito): ${dubbi.join(', ')}\n` : '> Tutti i numeri del testo si trovano nei dati del sito.\n'}
---

## ${meta.titolo}

*${meta.descr}*

${md.replace(/^---[\s\S]*?---\n/, '')}

---

## Post social per quando l'articolo è online

${testoPost(social, contesto)}`, ['bozza', 'blog']);
