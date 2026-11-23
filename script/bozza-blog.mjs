// Un articolo del blog a settimana (automatismo 9, deciso da Marco il 20/10/2026), scritto con i SOLI dati del sito.
// 23/11/2026, Marco: «GLI ARTICOLI DEVO ESSERE APPROVATI AUTOMATICAMENTE». L'articolo si pubblica da solo (commit su main,
// Cloudflare Pages lo mette online in 2 minuti) se:
//   1. tutti i numeri del testo si trovano nei dati del sito (dopo al più due correzioni automatiche);
//   2. il sito si costruisce senza errori con l'articolo dentro (npm run build: pagine e link controllati).
// Se no resta sul ramo «bozza/<slug>» e l'issue «Articolo NON pubblicato» dice perché. In entrambi i casi l'issue (etichetta
// «bozza», mandata per mail da n8n) porta il testo e i post social.
// Uso: node script/bozza-blog.mjs [--prova] [--rifai-bozze] [--quanti N] [--senza-build]
//   --prova: scrive solo video/prova-<slug>.md, niente commit né issue
//   --rifai-bozze: le bozze rimaste in attesa col vecchio sistema si scartano (ramo e issue) e si riscrivono coi dati di oggi
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { RADICE, REPO, MODELLO, leggiDati, gratis, chiediModello, REGOLE_SCRITTURA, senzaLineette, numeriDaControllare, apriIssue, chiudiIssue, cancellaRamo, postSocial, testoPost, rivedi } from './bozze.mjs';

const arg = (n) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : undefined; };
const PROVA = process.argv.includes('--prova');
const RIFAI = process.argv.includes('--rifai-bozze');
const BUILD = !process.argv.includes('--senza-build');
const dati = leggiDati();
const coda = JSON.parse(fs.readFileSync(path.join(RADICE, 'contenuti', 'blog-idee.json'), 'utf8')).idee;
const git = (...a) => execFileSync('git', a, { cwd: RADICE, encoding: 'utf8' }).trim();
const fileDi = (slug) => path.join(RADICE, 'contenuti', 'blog', `${slug}.md`);
const ramiBozza = () => (PROVA ? [] : git('ls-remote', '--heads', 'origin', 'bozza/*').split('\n').map((r) => r.split('refs/heads/')[1]).filter(Boolean));

// ---------- i dati del sito, in righe semplici ----------
const leggi = (f) => JSON.parse(fs.readFileSync(path.join(RADICE, 'dati', f), 'utf8'));
const memoria4 = (b) => Math.round(b * 0.606 + 2.7);
// chi lo tiene tutto in memoria, con la regola del simulatore del sito (unificata: circa 75% utile)
const usa = (s) => Math.round(s.gb * (s.unificata ? 0.75 : 1));
const casa = dati.schede.schede.filter((s) => s.marca !== 'Data center').sort((a, b) => usa(a) - usa(b));
const tiene = (b) => { const s = b ? casa.find((x) => usa(x) >= memoria4(b)) : null; return b ? (s ? `fits fully on: ${s.nome} or bigger` : 'fits fully on: no single home machine') : 'size not public'; };
function blocco(chiave) {
  const [tipo, id] = chiave.split(':');
  if (tipo === 'categoria') {
    const c = dati.categorie.find((x) => x.id === id);
    const free = c.modelli.filter(gratis).slice(0, 12);
    const pagato = c.modelli.find((m) => !gratis(m));
    return `Arena category "${c.nome}" (data ${c.data}, ${c.totale} models ranked, ${c.modelli.filter(gratis).length} free)${c.scala === 'agent' ? ', agent score scale' : c.scala === 'indice' ? `, ${c.id === 'agentcode' ? 'coding index' : 'Agent Arena Index'} for agents (real sessions, not blind votes)` : ''}. Best paid: ${pagato?.nome} ${pagato?.punti}.\nTop free models (rank among all, name, lab, score, open weights?, size):\n${free.map((m) => `#${m.pos} ${m.nome} | ${m.org} | ${m.punti} | ${m.aperto ? 'open weights' : 'free API only'}${m.hf?.b ? ` | ${m.hf.b} B params, ~${memoria4(m.hf.b)} GB at 4-bit, ${tiene(m.hf.b)}` : ' | size not public'}`).join('\n')}`;
  }
  if (tipo === 'schede') return `Home GPUs and machines (name | memory GB | memory bandwidth GB/s | unified memory?):\n${dati.schede.schede.filter((s) => s.marca !== 'Data center').map((s) => `${s.nome} | ${s.gb} | ${s.banda} | ${s.unificata ? 'unified (about 75% usable by a model)' : 'GPU VRAM'}`).join('\n')}`;
  if (tipo === 'velocita') { const v = leggi('misure-velocita.json').misure; return `Measured llama.cpp generation speeds (model | quant | hardware | tokens per second):\n${v.slice(0, 30).map((m) => `${m.model} | ${m.quant} | ${m.hw} | ${m.tg}`).join('\n')}\nOur speed estimate is calibrated on ${v.length} such measurements, median error 9%.`; }
  if (tipo === 'audio') { const a = leggi('audio.json'); return `Speech to text, open models, average word error rate on 8 English test sets (lower is better):\n${a.asr.slice(0, 10).map((m, i) => `${i + 1}. ${m.repo} | ${m.wer}% | ${m.b || '?'} B | license ${m.licenza}`).join('\n')}\nText to speech, open models, score from blind votes (1000 = average), only models with 300+ votes:\n${a.tts.filter((m) => m.voti >= 300).slice(0, 10).map((m, i) => `${i + 1}. ${m.space} | ${m.punteggio} | ${m.voti} votes`).join('\n')}\nOn freellmarena.com/audio visitors can try Whisper Large v3 Turbo (speech to text, up to 30 s) and MeloTTS (text to speech) free, without an account.`; }
  if (tipo === 'app') { const a = leggi('app.json'); return `AI apps checked by hand on ${a.controllato} (name | price type | free plan limits):\n${a.gruppi.map((g) => `${g.nome}:\n${g.app.map((x) => `${x.nome} | ${x.prezzo} | ${x.limiti}`).join('\n')}`).join('\n')}\nPrice types: free = free; byok = the app is free, you bring a model; tier = free plan with limits; paid = paid only.`; }
  if (tipo === 'telefono') return `Small open models most downloaded on Hugging Face (name | parameters | monthly downloads):\n${(dati.piccoli || []).slice(0, 15).map((m) => `${m.nome} | ${(m.parametri / 1e9).toFixed(1)} B | ${m.download}`).join('\n')}`;
  if (tipo === 'nuovi') return `New open models recently added (name | lab | release date | size | 4-bit memory | context):\n${[...dati.nuovi].sort((a, b) => (b.creato || '').localeCompare(a.creato || '')).slice(0, 12).map((m) => `${m.nome} | ${m.org} | ${m.creato} | ${m.hf?.b ? `${m.hf.b} B` : '?'} | ${m.hf?.b ? `~${memoria4(m.hf.b)} GB, ${tiene(m.hf.b)}` : '?'} | ${m.hf?.ctx || '?'} tokens`).join('\n')}`;
  return '';
}

// ---------- l'articolo ----------
const contestoDi = (idea) => `Site data updated ${dati.aggiornato}.\n\n${idea.dati.map(blocco).join('\n\n')}`;
const oggi = new Date().toISOString().slice(0, 10);
const titoloDi = (corpo) => chiediModello([
  { role: 'system', content: `${REGOLE_SCRITTURA}\nReturn JSON {"titolo": "title under 70 characters, specific, no colon reveal", "descr": "meta description under 155 characters"}.` },
  { role: 'user', content: corpo.slice(0, 4000) },
], { json: true, max: 200 });
const fileMd = (meta, corpo) => `---\ntitolo: ${senzaLineette(meta.titolo)}\ndescr: ${senzaLineette(meta.descr)}\ndata: ${oggi}\n---\n\n${senzaLineette(corpo).trim()}\n`;

async function scrivi(idea, contesto) {
  let corpo = await chiediModello([
    { role: 'system', content: `You write guides for the blog of FreeLLMArena (freellmarena.com), a free site that ranks only AI models you can use for free (open weights or free API), using Arena's blind human votes, and estimates which models fit your GPU and how fast they run. Readers are curious people and hobbyists, not experts. Always write the site name as FreeLLMArena, one word.\n${REGOLE_SCRITTURA}\nFormat: Markdown. Start with a 2-3 sentence intro that answers the question directly. Then 3-5 sections with ## headings. One table is welcome. 700-1000 words. End with a short section that points to the right page of the site. Link only to these site pages: ${idea.link.join(', ')} (use relative links like [the GPU page](/gpus)). Explain terms like "4-bit" or "parameters" in one plain sentence the first time. Do not mention that you are an AI and do not talk about "this article".` },
    { role: 'user', content: `Write the article: ${idea.idea}\n\nDATA:\n${contesto}\n\nReturn only the Markdown body (no title line, no front matter).` },
  ], { max: 3000 }).then((bozza) => rivedi(bozza, contesto));
  let meta = await titoloDi(corpo);
  let md = fileMd(meta, corpo);
  let dubbi = numeriDaControllare(md, contesto);
  // fino a due correzioni: si riscrivono solo le frasi con numeri che i dati non hanno
  for (let i = 0; i < 2 && dubbi.length; i++) {
    console.log(`Numeri non nei dati (${dubbi.join(', ')}): correzione ${i + 1}`);
    corpo = await chiediModello([
      { role: 'system', content: `You are a strict fact checker for FreeLLMArena. These numbers in the DRAFT are not in DATA: ${dubbi.join(', ')}. Rewrite only the sentences, headings or table cells that contain them, so that every number comes from DATA, or remove them. Keep everything else exactly as it is, with the same Markdown. ${REGOLE_SCRITTURA}` },
      { role: 'user', content: `DATA:\n${contesto}\n\nDRAFT:\n${corpo}\n\nReturn only the corrected Markdown.` },
    ], { max: 3000 });
    meta = await titoloDi(corpo);
    md = fileMd(meta, corpo);
    dubbi = numeriDaControllare(md, contesto);
  }
  return { corpo, meta, md, dubbi };
}

// il sito si costruisce con l'articolo dentro? (stesso comando di Cloudflare Pages); poi via i file generati
function costruisce() {
  if (!BUILD) return true;
  try { execFileSync('npm', ['run', 'build'], { cwd: RADICE, stdio: 'inherit', shell: process.platform === 'win32' }); return true; }
  catch { return false; }
  finally { git('restore', '.'); }
}

function spingi() {
  for (let i = 0; i < 4; i++) {
    try { git('push', 'origin', 'HEAD:main'); return; } catch (e) { if (i === 3) throw e; git('pull', '--rebase', 'origin', 'main'); }
  }
}

const ID = ['-c', 'user.name=freellmarena-bot', '-c', 'user.email=41898282+github-actions[bot]@users.noreply.github.com'];

async function articolo(idea) {
  const contesto = contestoDi(idea);
  const { meta, md, dubbi } = await scrivi(idea, contesto);
  const url = `https://freellmarena.com/blog/${idea.slug}`;
  const social = await postSocial({ argomento: `New guide on the blog: ${meta.titolo}`, dati: `${meta.descr}\n${contesto}`, link: url });
  if (PROVA) {
    fs.writeFileSync(path.join(RADICE, 'video', `prova-${idea.slug}.md`), md);
    console.log(md.slice(0, 1500), '\n…\nNumeri non nei dati:', dubbi, '\n\n', testoPost(social, contesto));
    return;
  }
  const rel = `contenuti/blog/${idea.slug}.md`;
  let motivo = dubbi.length ? `numeri che non trovo nei dati del sito, anche dopo due correzioni: ${dubbi.join(', ')}` : '';
  if (!motivo) {
    fs.writeFileSync(fileDi(idea.slug), md);
    if (!costruisce()) motivo = 'il sito non si costruisce con questo articolo dentro (vedi il registro della corsa)';
  }
  const testo = `## ${meta.titolo}\n\n*${meta.descr}*\n\n${md.replace(/^---[\s\S]*?---\n/, '')}\n\n---\n\n## Post social\n\n${testoPost(social, contesto)}`;
  if (!motivo) {
    git('add', rel);
    git(...ID, 'commit', '-m', `Blog: ${meta.titolo} (pubblicato in automatico)`);
    spingi();
    await apriIssue(`Articolo pubblicato: ${meta.titolo}`, `Scritto da ${MODELLO} con i soli dati del sito (${dati.aggiornato}) e **pubblicato in automatico**: tutti i numeri del testo si trovano nei dati del sito e il sito si costruisce senza errori. Online in circa 2 minuti: ${url}

**Per correggerlo:** https://github.com/${REPO}/edit/main/${rel}

---

${testo}`, ['bozza', 'blog']);
    console.log('Pubblicato:', url);
    return;
  }
  // non passa: resta su un ramo, con il perché
  if (fs.existsSync(fileDi(idea.slug))) fs.rmSync(fileDi(idea.slug));
  const ramo = `bozza/${idea.slug}`;
  git('switch', '-c', ramo);
  fs.writeFileSync(fileDi(idea.slug), md);
  git('add', rel);
  git(...ID, 'commit', '-m', `Bozza blog: ${meta.titolo}`);
  git('push', 'origin', ramo);
  git('switch', '-');
  await apriIssue(`Articolo NON pubblicato: ${meta.titolo}`, `Scritto da ${MODELLO} con i soli dati del sito (${dati.aggiornato}). **Non è stato pubblicato in automatico** perché: ${motivo}.

**Per pubblicarlo lo stesso:** apri https://github.com/${REPO}/compare/main...${ramo}?expand=1, premi «Create pull request» e poi «Merge».
**Per correggerlo:** https://github.com/${REPO}/edit/${ramo}/${rel}

---

${testo}`, ['bozza', 'blog']);
  console.log('NON pubblicato:', motivo);
}

// ---------- le bozze del vecchio sistema (rami in attesa di approvazione) ----------
if (RIFAI && !PROVA) {
  for (const ramo of ramiBozza()) {
    const slug = ramo.replace(/^bozza\//, '');
    const gia = fs.existsSync(fileDi(slug));
    await chiudiIssue(`bozza/${slug}`, gia ? 'L’articolo è già pubblicato sul sito: chiudo la bozza.' : 'Bozza scartata: l’articolo si riscrive coi dati di oggi e si pubblica in automatico se passa i controlli (23/11/2026).');
    await cancellaRamo(ramo);
    console.log(gia ? `Già pubblicato: ${slug}` : `Da riscrivere: ${slug}`);
  }
}

const quanti = Number(arg('--quanti')) || (RIFAI ? 10 : 1);
for (let n = 0; n < quanti; n++) {
  const rami = ramiBozza();
  const idea = coda.find((i) => !fs.existsSync(fileDi(i.slug)) && !rami.includes(`bozza/${i.slug}`));
  if (!idea) { console.log('Nessuna idea libera in contenuti/blog-idee.json'); break; }
  console.log(`\n=== ${idea.slug} ===`);
  await articolo(idea);
  if (PROVA) break;
}
