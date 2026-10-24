// Monta un video a stampi (24/10/2026) dal suo piano: voce per scena, tempi parola per parola, scene HyperFrames,
// sottotitoli, montaggio in MP4 (1920x1080, 30 fps), file .srt e copertina .jpg. Gratis, gira sul computer.
// Il piano lo scrive script/video-hf/piano.mjs: { scene: [{ stampo, voce, dati, etichetta }], copertina }
// Uso: node script/video-hf/monta.mjs <piano.json> <cartella>   → <cartella>/video.mp4, video.srt, copertina.jpg, tempi.json
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { STAMPI } from './stampi/index.mjs';
import { parla, ascolta, allinea, quando, hf } from './voce.mjs';
import { gruppi, composizione, srt } from './sottotitoli.mjs';

const QUI = path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1'));
const CODA = 0.45; // secondi di respiro dopo la voce di ogni scena
const ANTICIPO = 0.12; // un elemento compare un attimo prima che la voce lo nomini

export async function monta(piano, dir) {
  const d = (...p) => path.join(dir, ...p);
  for (const c of ['assets/voice', 'assets/fonts', 'compositions/frames', 'lavoro']) fs.mkdirSync(d(c), { recursive: true });
  for (const f of ['Source_Serif_4.ttf', 'JetBrains_Mono.ttf']) fs.copyFileSync(path.join(QUI, 'fonti', f), d('assets/fonts', f));

  // 1. voce e tempi, scena per scena
  let inizio = 0;
  const scene = piano.scene.map((sc, i) => {
    const st = STAMPI[sc.stampo];
    if (!st) throw new Error(`Stampo sconosciuto: ${sc.stampo}`);
    const testo = st.voceFissa || sc.voce;
    const n = String(i + 1).padStart(2, '0');
    const wav = d('assets/voice', `${n}.wav`);
    const durVoce = parla(testo, wav);
    const parole = allinea(testo, ascolta(wav, d('lavoro', `t${n}`)), durVoce);
    const durata = +Math.max(4, durVoce + CODA).toFixed(3);
    const out = { ...sc, n, testo, wav: `assets/voice/${n}.wav`, durVoce, durata, inizio: +inizio.toFixed(3), parole };
    inizio += durata;
    return out;
  });
  const totale = +inizio.toFixed(3);

  // 2. le scene: ogni elemento compare quando la voce lo nomina (se la parola non si trova, al tempo di riserva)
  const mancate = [];
  for (const [i, sc] of scene.entries()) {
    const st = STAMPI[sc.stampo];
    const istanti = {};
    let dopo = 0;
    for (const { chiave, parola } of st.parole(sc.dati || {})) {
      // prima dopo il pezzo precedente; se la voce la dice prima (ordine diverso dallo schermo), ovunque nella scena
      const t = quando(sc.parole, parola, dopo) ?? quando(sc.parole, parola, 0);
      if (t == null) { mancate.push(`${sc.n} ${sc.stampo}: «${parola}»`); continue; }
      istanti[chiave] = Math.max(0, t - ANTICIPO);
      dopo = t;
    }
    const t = (chiave, riserva) => Math.min(sc.durata - 0.6, istanti[chiave] ?? riserva);
    const id = `s${i + 1}-${sc.stampo}`;
    const html = st.html({ id, px: `s${i + 1}-`, dati: sc.dati || {}, durata: sc.durata, t, etichetta: sc.etichetta || '', numero: `${sc.n} / ${String(scene.length).padStart(2, '0')}` });
    sc.file = `compositions/frames/${sc.n}-${sc.stampo}.html`;
    sc.id = id;
    fs.writeFileSync(d(sc.file), html);
  }
  if (mancate.length) console.log(`Parole di attacco non trovate nella voce (uso il tempo di riserva): ${mancate.join(' · ')}`);

  // 3. sottotitoli e indice
  const tutte = scene.flatMap((sc) => sc.parole.map((w) => ({ text: w.text, start: +(w.start + sc.inizio).toFixed(3), end: +(w.end + sc.inizio).toFixed(3) })));
  const g = gruppi(tutte);
  fs.writeFileSync(d('compositions/captions.html'), composizione(g, totale));
  fs.writeFileSync(d('video.srt'), srt(g));
  fs.writeFileSync(d('index.html'), indice(scene, totale));
  fs.writeFileSync(d('tempi.json'), JSON.stringify({ totale, scene: scene.map(({ n, stampo, inizio: a, durata, testo }) => ({ n, stampo, inizio: a, durata, testo })) }, null, 1));

  // 4. controllo e montaggio
  const controllo = hf(['lint'], { cwd: dir });
  if (/[1-9]\d* error\(s\)/.test(controllo)) throw new Error(`Il controllo HyperFrames ha trovato errori:\n${controllo.slice(-3000)}`);
  hf(['render', '-o', 'video.mp4', '--fps', '30', '--quality', 'delivery', '--quiet'], { cwd: dir, timeout: 1800000 });
  if (!fs.existsSync(d('video.mp4'))) throw new Error('Montaggio non riuscito: video.mp4 mancante');

  // 5. copertina: la scena scelta dal piano, quando è completa
  const sc = scene[Math.min(scene.length - 1, Math.max(0, piano.copertina ?? 0))];
  const at = (sc.inizio + sc.durata - 0.3).toFixed(2);
  const r = spawnSync('ffmpeg', ['-v', 'error', '-y', '-ss', at, '-i', d('video.mp4'), '-frames:v', '1', '-vf', 'scale=1280:720', '-q:v', '3', d('copertina.jpg')]);
  if (r.status !== 0) throw new Error(`Copertina non creata: ${r.stderr}`);
  fs.rmSync(d('lavoro'), { recursive: true, force: true });
  return { totale, scene: scene.length, mancate };
}

function indice(scene, totale) {
  const pezzi = scene.map((sc) => `
      <div id="el-${sc.id}" class="scene" data-composition-id="${sc.id}" data-composition-src="${sc.file}" data-start="${sc.inizio}" data-duration="${sc.durata}" data-track-index="1"></div>
      <audio id="el-${sc.id}-voce" src="${sc.wav}" data-start="${sc.inizio}" data-duration="${sc.durVoce.toFixed(3)}" data-track-index="10" data-volume="1"></audio>`).join('');
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1920, height=1080" />
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { width: 1920px; height: 1080px; overflow: hidden; background: #000; }
      #root { position: relative; width: 1920px; height: 1080px; overflow: hidden; background: #31433a; }
      .scene { position: absolute; inset: 0; width: 100%; height: 100%; }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="${totale}" data-width="1920" data-height="1080">${pezzi}
      <div id="el-captions" class="scene" data-composition-id="captions" data-composition-src="compositions/captions.html" data-start="0" data-duration="${totale}" data-track-index="2" data-track-kind="captions"></div>
    </div>
    <script>
      window.__timelines = window.__timelines || {};
      window.__timelines["main"] = gsap.timeline({ paused: true });
    </script>
  </body>
</html>
`;
}

if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) {
  const [filePiano, cartella] = process.argv.slice(2);
  const r = await monta(JSON.parse(fs.readFileSync(filePiano, 'utf8')), path.resolve(cartella));
  console.log('ok', r);
}
