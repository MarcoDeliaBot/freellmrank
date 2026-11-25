// Sfida fra LLM: la stessa richiesta a più modelli gratuiti, poi ogni risposta va in un browser vero.
// Misura: secondi, token, velocità, costo al listino (solo se il prezzo è in dati/sfide/modelli.json), errori in console,
// animazione viva (due fotografie diverse), più un video di ogni risultato per il montaggio.
// Uso: node script/sfida.mjs <slug> [--uscita cartella] [--solo-genera] [--solo-prova cartella]
// Chiavi dalle variabili d'ambiente indicate in modelli.json: un fornitore senza chiave si salta.
import fs from 'node:fs';
import path from 'node:path';

const argv = process.argv.slice(2);
const slug = argv.find(a => !a.startsWith('--'));
const opz = (nome) => { const i = argv.indexOf(nome); return i >= 0 ? argv[i + 1] : null; };
if (!slug) { console.error('Uso: node script/sfida.mjs <slug>'); process.exit(2); }

const sfida = JSON.parse(fs.readFileSync(`dati/sfide/${slug}.json`, 'utf8'));
const conf = JSON.parse(fs.readFileSync('dati/sfide/modelli.json', 'utf8'));
const oggi = new Date().toISOString().slice(0, 10);
const USCITA = opz('--solo-prova') || opz('--uscita') || `sfide/${slug}/${oggi}`;
fs.mkdirSync(USCITA, { recursive: true });
const nomeFile = (s) => s.replace(/[^a-z0-9.-]+/gi, '_').toLowerCase();

async function elencaModelli(f, chiave) {
  const r = await fetch(`${f.base}/models`, { headers: { Authorization: `Bearer ${chiave}` } });
  if (!r.ok) throw new Error(`${f.nome} /models: HTTP ${r.status}`);
  const j = await r.json();
  const ids = (j.data || []).map(m => String(m.id).replace(/^models\//, ''));
  const scelti = [];
  for (const p of f.preferiti) {
    const re = new RegExp(p, 'i');
    for (const id of ids) {
      if (scelti.length >= f.quanti) break;
      if (re.test(id) && !f.escludi.some(e => new RegExp(e, 'i').test(id)) && !scelti.includes(id)) scelti.push(id);
    }
  }
  return scelti;
}

function estraiHtml(testo) {
  const blocchi = [...testo.matchAll(/```(?:html)?\s*\n([\s\S]*?)```/gi)].map(m => m[1]);
  const html = blocchi.sort((a, b) => b.length - a.length)[0] ?? (/<html[\s\S]*<\/html>/i.exec(testo) || [])[0];
  return html && /<(canvas|body|html|script)/i.test(html) ? html : null;
}

async function chiedi(f, chiave, modello) {
  const corpo = { model: modello, messages: [{ role: 'user', content: sfida.prompt }], temperature: 0.2, max_tokens: 12000 };
  const t0 = performance.now();
  const r = await fetch(`${f.base}/chat/completions`, {
    method: 'POST', headers: { Authorization: `Bearer ${chiave}`, 'Content-Type': 'application/json' }, body: JSON.stringify(corpo),
    signal: AbortSignal.timeout(300_000),
  });
  const secondi = (performance.now() - t0) / 1000;
  const testo = await r.text();
  if (!r.ok) return { esito: `errore HTTP ${r.status}`, secondi, dettaglio: testo.slice(0, 300) };
  const j = JSON.parse(testo);
  const risposta = j.choices?.[0]?.message?.content ?? '';
  const u = j.usage || {};
  const prezzo = conf.prezzi[`${f.nome}/${modello}`];
  const costo = prezzo && u.prompt_tokens != null ? (u.prompt_tokens * prezzo[0] + u.completion_tokens * prezzo[1]) / 1e6 : null;
  return {
    esito: 'ok', secondi, token_entrata: u.prompt_tokens ?? null, token_uscita: u.completion_tokens ?? null,
    token_al_secondo: u.completion_tokens ? u.completion_tokens / secondi : null, costo_listino_usd: costo,
    fine: j.choices?.[0]?.finish_reason ?? null, risposta,
  };
}

async function genera() {
  const risultati = [];
  for (const f of conf.fornitori) {
    const chiave = process.env[f.chiave];
    if (!chiave) { console.log(`- ${f.nome}: manca ${f.chiave}, saltato`); continue; }
    let modelli;
    try { modelli = await elencaModelli(f, chiave); } catch (e) { console.log(`- ${f.nome}: ${e.message}`); continue; }
    console.log(`- ${f.nome}: ${modelli.join(', ') || 'nessun modello adatto'}`);
    for (const m of modelli) {
      const nome = nomeFile(`${f.nome}__${m}`);
      let r;
      try { r = await chiedi(f, chiave, m); } catch (e) { r = { esito: `errore: ${e.message}`, secondi: null }; }
      const html = r.risposta ? estraiHtml(r.risposta) : null;
      if (r.risposta) fs.writeFileSync(path.join(USCITA, `${nome}.txt`), r.risposta);
      if (html) fs.writeFileSync(path.join(USCITA, `${nome}.html`), html);
      if (r.esito === 'ok' && !html) r.esito = 'nessun HTML nella risposta';
      delete r.risposta;
      risultati.push({ fornitore: f.nome, modello: m, file: html ? `${nome}.html` : null, kb: html ? +(Buffer.byteLength(html) / 1024).toFixed(1) : null, ...r });
      console.log(`  ${m}: ${r.esito}, ${r.secondi?.toFixed(1)} s, ${r.token_uscita ?? '?'} token`);
      await new Promise(ok => setTimeout(ok, 2500)); // limiti per minuto dei piani gratuiti
    }
  }
  return risultati;
}

async function prova(risultati) {
  const { chromium } = await import('playwright');
  const browser = await chromium.launch();
  for (const r of risultati.filter(x => x.file)) {
    const base = r.file.replace(/\.html$/, '');
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, recordVideo: { dir: path.join(USCITA, 'video'), size: { width: 1280, height: 720 } } });
    const page = await ctx.newPage();
    const errori = [];
    page.on('console', m => { if (m.type() === 'error') errori.push(m.text().slice(0, 200)); });
    page.on('pageerror', e => errori.push(String(e.message).slice(0, 200)));
    // niente rete: la sfida chiede un file che funziona offline
    await page.route(/^https?:/, rt => { errori.push(`richiesta di rete: ${rt.request().url().slice(0, 120)}`); rt.abort(); });
    try {
      await page.goto('file://' + path.resolve(USCITA, r.file), { timeout: 15000 });
      await page.waitForTimeout(1000);
      const a = await page.screenshot({ path: path.join(USCITA, `${base}-1s.png`) });
      await page.waitForTimeout(Math.max(1000, (sfida.secondi_video - 1) * 1000));
      const b = await page.screenshot({ path: path.join(USCITA, `${base}-fine.png`) });
      r.si_muove = !a.equals(b);
      r.canvas = await page.locator('canvas').count();
    } catch (e) { errori.push(`apertura: ${e.message.slice(0, 160)}`); }
    r.errori_console = errori.length;
    r.errori = errori.slice(0, 5);
    const video = page.video();
    await ctx.close();
    if (video) { const p = await video.path(); fs.renameSync(p, path.join(USCITA, 'video', `${base}.webm`)); r.video = `video/${base}.webm`; }
    console.log(`  prova ${r.modello}: ${r.errori_console} errori, si muove: ${r.si_muove}`);
  }
  await browser.close();
}

function tabella(risultati) {
  const n = (v, d = 1) => v == null ? 'n.d.' : Number(v).toFixed(d);
  const righe = risultati.map(r => `| ${r.fornitore} | ${r.modello} | ${r.esito} | ${n(r.secondi)} | ${r.token_uscita ?? 'n.d.'} | ${n(r.token_al_secondo, 0)} | ${r.costo_listino_usd == null ? 'n.d.' : '$' + r.costo_listino_usd.toFixed(4)} | ${r.errori_console ?? 'n.d.'} | ${r.si_muove == null ? 'n.d.' : r.si_muove ? 'sì' : 'no'} | ${r.kb ?? 'n.d.'} |`);
  return [`# Sfida: ${sfida.titolo} (${oggi})`, '', '```', sfida.prompt, '```', '',
    '| Fornitore | Modello | Esito | Secondi | Token uscita | Token/s | Costo al listino | Errori console | Si muove | KB |',
    '|---|---|---|---|---|---|---|---|---|---|', ...righe, ''].join('\n');
}

const fileRis = path.join(USCITA, 'risultati.json');
let risultati;
if (opz('--solo-prova')) risultati = JSON.parse(fs.readFileSync(fileRis, 'utf8')).risultati;
else risultati = await genera();
if (!argv.includes('--solo-genera')) await prova(risultati);
fs.writeFileSync(fileRis, JSON.stringify({ sfida: sfida.slug, data: oggi, prompt: sfida.prompt, risultati }, null, 1));
fs.writeFileSync(path.join(USCITA, 'RISULTATI.md'), tabella(risultati));
console.log(tabella(risultati));
if (!risultati.some(r => r.esito === 'ok')) { console.error('Nessun modello ha risposto con un HTML'); process.exit(1); }
