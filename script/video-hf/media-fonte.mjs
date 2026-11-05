// Immagini vere della fonte nei video delle notizie (5/11/2026, Marco: «i prossimi video li voglio tutti con questo
// stile», lo Short Lemo-Opuscar con la pagina del repo e le immagini del README). Dopo piano.mjs, prima di monta.mjs:
// 1. sceglie la fonte: prima quella ufficiale, poi un repo GitHub. MAI i giornali (diritti): senza una delle due il
//    piano resta com'è;
// 2. foto della pagina (foto-pagina.py): larga per il video lungo, stretta per lo Short; pagine d'errore scartate;
// 3. immagini: dal README del repo (niente badge, loghi piccoli, svg, gif), o l'immagine di anteprima della pagina
//    ufficiale (og:image), mai quella generata da GitHub;
// 4. inserisce nel piano una scena «immagine» con la pagina (dopo l'apertura) e, se ci sono immagini, una scena
//    «immagine» o «griglia» a metà. Le voci nuove non hanno numeri né nomi nuovi: il controllo dei fatti resta valido.
// Non ferma mai il video: qualunque errore lascia il piano com'era.
// Uso: node script/video-hf/media-fonte.mjs <notizia.json> <cartella media> <piano.json>
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const QUI = path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1'));
const MAX_IMMAGINI = 4, MAX_BYTE = 8 * 1024 * 1024;
const SCARTA = /\.svg(\?|$)|\.gif(\?|$)|shields\.io|badgen|badge|star-history|contrib\.rocks|trendshift|visitor|hits\.|avatars\.githubusercontent|opengraph\.githubassets|api\.producthunt|komarev|readme-stats|vercel\.app\/api|deepwiki|buymeacoffee|ko-fi/i;

const corto = (s, n) => (s.length <= n ? s : s.slice(0, n - 1).trimEnd() + '…');

export function repoDi(url) {
  const m = String(url || '').match(/^https?:\/\/github\.com\/([\w.-]+)\/([\w.-]+?)(?:\.git)?(?:[/?#]|$)/i);
  return m && !['orgs', 'topics', 'trending', 'collections', 'features', 'sponsors'].includes(m[1].toLowerCase()) ? { owner: m[1], repo: m[2] } : null;
}

// la fonte da fotografare: ufficiale prima, poi GitHub; i giornali no
export function scegliFonte(notizia) {
  const fonti = (notizia.fonti || []).filter((f) => /^https?:\/\//.test(f.url || ''));
  return fonti.find((f) => f.ufficiale && !repoDi(f.url)) || fonti.find((f) => repoDi(f.url)) || fonti.find((f) => f.ufficiale) || null;
}

// immagini del README: markdown e <img>, con il testo alternativo; i percorsi relativi vanno sul file grezzo del repo
export function immaginiReadme(md, { owner, repo }) {
  const trovate = [];
  for (const m of md.matchAll(/!\[([^\]]*)\]\(\s*<?([^)\s>]+)>?(?:\s+"[^"]*")?\s*\)/g)) trovate.push({ alt: m[1], src: m[2] });
  for (const m of md.matchAll(/<img\b[^>]*>/gi)) {
    const src = m[0].match(/\bsrc\s*=\s*["']([^"']+)["']/i)?.[1];
    if (src) trovate.push({ alt: m[0].match(/\balt\s*=\s*["']([^"']*)["']/i)?.[1] || '', src });
  }
  const viste = new Set();
  return trovate.map(({ alt, src }) => {
    let u = src.trim();
    const blob = u.match(/^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/(?:blob|raw)\/(.+)$/i);
    if (blob) u = `https://raw.githubusercontent.com/${blob[1]}/${blob[2]}/${blob[3]}`;
    else if (!/^https?:\/\//i.test(u)) u = `https://raw.githubusercontent.com/${owner}/${repo}/HEAD/${u.replace(/^\.?\//, '')}`;
    return { alt: alt.trim(), url: u };
  }).filter((x) => !SCARTA.test(x.url) && !viste.has(x.url) && viste.add(x.url));
}

async function scarica(url, file) {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(20000), headers: { 'user-agent': 'FreeLLMArena-video/1.0' } });
    if (!r.ok) return null;
    const tipo = r.headers.get('content-type') || '';
    const est = /png/.test(tipo) ? '.png' : /jpe?g/.test(tipo) ? '.jpg' : /webp/.test(tipo) ? '.webp' : null;
    if (!est) return null;
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length > MAX_BYTE || buf.length < 8000) return null;
    fs.writeFileSync(file + est, buf);
    return file + est;
  } catch { return null; }
}

// larghezza e altezza con ffprobe; le immagini piccole (loghi, icone) o troppo strette si scartano
function misure(file) {
  const r = spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', file], { encoding: 'utf8' });
  const [w, h] = String(r.stdout || '').trim().split(',').map(Number);
  return w > 0 && h > 0 ? { w, h } : null;
}
const buona = (m) => m && m.w >= 480 && m.h >= 270 && m.w / m.h >= 0.5 && m.w / m.h <= 3.2;

async function readme({ owner, repo }) {
  const h = { accept: 'application/vnd.github.raw', 'user-agent': 'FreeLLMArena-video/1.0' };
  if (process.env.GITHUB_TOKEN) h.authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  try {
    const r = await fetch(`https://api.github.com/repos/${owner}/${repo}/readme`, { headers: h, signal: AbortSignal.timeout(20000) });
    return r.ok ? await r.text() : '';
  } catch { return ''; }
}

const etichetta = (alt, i) => {
  const a = alt.replace(/[^\w .,&+'-]/g, ' ').replace(/\s+/g, ' ').trim();
  return a.length >= 3 && a.length <= 22 && !/^(image|img|screenshot|picture|banner|logo)\s*\d*$/i.test(a) ? a : `Preview ${i + 1}`;
};

export async function mediaFonte(notizia, cartella) {
  const fonte = scegliFonte(notizia);
  if (!fonte) return { motivo: 'nessuna fonte ufficiale o GitHub' };
  fs.mkdirSync(cartella, { recursive: true });
  const larga = path.join(cartella, 'pagina-larga.png'), stretta = path.join(cartella, 'pagina-stretta.png');
  const py = process.env.HYPERFRAMES_PYTHON || 'python';
  const f = spawnSync(py, [path.join(QUI, 'foto-pagina.py'), fonte.url, larga, stretta], { encoding: 'utf8', timeout: 120000 });
  let foto = {};
  try { foto = JSON.parse(String(f.stdout || '').trim().split('\n').pop() || '{}'); } catch { /* foto non riuscita */ }
  const u = new URL(fonte.url);
  const indirizzo = (u.host.replace(/^www\./, '') + u.pathname.replace(/\/$/, ''));
  const out = { fonte: fonte.url, pagina: null, immagini: [] };
  if (foto.ok && fs.existsSync(larga) && fs.existsSync(stretta)) {
    out.pagina = { media: larga, mediaVerticale: stretta, rapporto: 1.6, rapportoVerticale: 0.875,
      didascalia: corto(indirizzo.length <= 48 ? indirizzo : u.host.replace(/^www\./, ''), 48), credito: 'Screenshot of the source page' };
  }
  const gh = repoDi(fonte.url);
  const candidate = gh ? immaginiReadme(await readme(gh), gh) : (fonte.ufficiale && foto.og && !SCARTA.test(foto.og) ? [{ alt: '', url: foto.og }] : []);
  for (const c of candidate) {
    if (out.immagini.length >= MAX_IMMAGINI) break;
    const file = await scarica(c.url, path.join(cartella, `immagine-${out.immagini.length + 1}`));
    if (!file) continue;
    const m = misure(file);
    if (!buona(m)) { fs.rmSync(file, { force: true }); continue; }
    out.immagini.push({ media: file, alt: c.alt, rapporto: +(m.w / m.h).toFixed(3) });
  }
  out.credito = corto(gh ? `${gh.owner}/${gh.repo} · README` : `Image: ${u.host.replace(/^www\./, '')}`, 44);
  out.gh = !!gh;
  return out;
}

// le scene nuove dentro il piano: la pagina dopo l'apertura, le immagini a metà, sempre prima della chiusura
export function conMedia(piano, m) {
  // rilanciato sullo stesso piano non raddoppia: le scene con le immagini di prima si tolgono
  const scene = piano.scene.filter((s) => !s.media);
  const fine = () => (scene.at(-1)?.stampo === 'chiusura' ? scene.length - 1 : scene.length);
  if (m.pagina) {
    scene.splice(Math.min(1, fine()), 0, { stampo: 'immagine', etichetta: '', media: true,
      voce: m.gh ? 'Here is the project page on GitHub.' : 'Here is the official page.', dati: m.pagina });
  }
  if (m.immagini.length) {
    const voce = m.gh ? "And this is what it looks like, from the project's own page." : 'And this is the picture that comes with it.';
    const sc = m.immagini.length === 1
      ? { stampo: 'immagine', dati: { media: m.immagini[0].media, rapporto: m.immagini[0].rapporto, didascalia: m.gh ? 'From the project README' : 'From the official page', credito: m.credito } }
      : { stampo: 'griglia', dati: { titolo: m.gh ? 'From the project README' : 'From the official page', credito: m.credito,
          immagini: m.immagini.map((x, i) => ({ media: x.media, etichetta: etichetta(x.alt, i) })) } };
    scene.splice(Math.max(m.pagina ? 2 : 1, Math.min(fine(), Math.ceil(fine() / 2) + 1)), 0, { etichetta: '', media: true, voce, ...sc });
  }
  return { ...piano, scene };
}

if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) {
  const [notizia, cartella, piano] = process.argv.slice(2);
  try {
    const n = JSON.parse(fs.readFileSync(notizia, 'utf8'));
    const m = await mediaFonte(n, cartella);
    if (!m.pagina && !m.immagini?.length) { console.log(`Immagini della fonte: nessuna (${m.motivo || 'foto e immagini non riuscite'})`); process.exit(0); }
    const p = conMedia(JSON.parse(fs.readFileSync(piano, 'utf8')), m);
    fs.writeFileSync(piano, JSON.stringify(p, null, 1));
    console.log(`Immagini della fonte (${m.fonte}): pagina ${m.pagina ? 'sì' : 'no'}, immagini ${m.immagini.length} → ${p.scene.map((s) => s.stampo).join(' → ')}`);
  } catch (e) {
    console.log(`Immagini della fonte saltate: ${e.message}`);
  }
}
