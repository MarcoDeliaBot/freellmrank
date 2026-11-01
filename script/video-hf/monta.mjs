// Monta un video a stampi (24/10/2026) dal suo piano: voce per scena, tempi parola per parola, scene HyperFrames,
// sottotitoli, montaggio in MP4 (1920x1080, o 1080x1920 per gli Short con piano.formato «verticale»; 30 fps), file .srt e copertina .jpg. Gratis, gira sul computer.
// Il piano lo scrive script/video-hf/piano.mjs: { scene: [{ stampo, voce, dati, etichetta }], copertina }
// Uso: node script/video-hf/monta.mjs <piano.json> <cartella>   → <cartella>/video.mp4, video.srt, copertina.jpg, tempi.json
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { STAMPI } from './stampi/index.mjs';
import { parla, ascolta, allinea, quando, hf } from './voce.mjs';
import { gruppi, composizione, srt } from './sottotitoli.mjs';
import { formatoDi } from './base.mjs';
import { fitWindow } from './tempo.mjs';

const QUI = path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1'));
const CODA = 0.45; // secondi di respiro dopo la voce di ogni scena
const ANTICIPO = 0.12; // un elemento compare un attimo prima che la voce lo nomini

export async function monta(piano, dir) {
  const formato = piano.formato === 'verticale' ? 'verticale' : 'orizzontale';
  const F = formatoDi(formato);
  const d = (...p) => path.join(dir, ...p);
  for (const c of ['assets/voice', 'assets/fonts', 'compositions/frames', 'lavoro']) fs.mkdirSync(d(c), { recursive: true });
  for (const f of ['Source_Serif_4.ttf', 'JetBrains_Mono.ttf']) fs.copyFileSync(path.join(QUI, 'fonti', f), d('assets/fonts', f));
  // immagini e clip delle scene «immagine» (26/10/2026): il piano dà il percorso del file, lo stampo usa assets/media/<nome>
  for (const sc of piano.scene) {
    const m = sc.dati?.media;
    if (typeof m !== 'string' || !m) continue;
    if (!fs.existsSync(m)) throw new Error(`File della scena immagine non trovato: ${m}`);
    fs.mkdirSync(d('assets/media'), { recursive: true });
    fs.copyFileSync(m, d('assets/media', path.basename(m)));
  }

  // 1. voce e tempi, scena per scena
  let inizio = 0;
  const scene = piano.scene.map((sc, i) => {
    const st = STAMPI[sc.stampo];
    if (!st) throw new Error(`Stampo sconosciuto: ${sc.stampo}`);
    const testo = typeof st.voceFissa === 'function' ? st.voceFissa(sc.dati || {}, formato) : st.voceFissa || sc.voce;
    const n = String(i + 1).padStart(2, '0');
    const wav = d('assets/voice', `${n}.wav`);
    let durVoce = parla(testo, wav);
    // Optional editorial timing contract (skills/tutorials): fit the voice to its
    // window, then hold the finished slide. Existing news plans are unchanged.
    const fit=fitWindow(piano,sc,durVoce);
    const {fixed,target,speed,sustained}=fit;
    if (fixed != null) {
      // Teaching Shorts sustain narration in every beat. Fit real speech to
      // 92% of the scene, in either direction, without padding it with silence.
      if (speed > 1 || (sustained && speed < 1)) {
        if(speed<.5)throw new Error(`Narration is too short for its teaching window (${speed.toFixed(2)}x)`);
        const fitted = wav.replace(/\.wav$/, '-fit.wav');
        const r = spawnSync('ffmpeg', ['-v','error','-y','-i',wav,'-af',`atempo=${speed.toFixed(6)}`,fitted]);
        if (r.status !== 0) throw new Error('Could not fit narration to its scene');
        fs.renameSync(fitted,wav); durVoce = target;
      }
    }
    const parole = allinea(testo, ascolta(wav, d('lavoro', `t${n}`)), durVoce);
    const durata = fixed ?? +Math.max(4, durVoce + CODA).toFixed(3);
    const out = { ...sc, n, testo, wav: `assets/voice/${n}.wav`, durVoce, durata, timingFit:fit, inizio: +inizio.toFixed(3), parole };
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
    const ordine = [];
    for (const { chiave, parola, altre = [] } of st.parole(sc.dati || {}, formato)) {
      ordine.push(chiave);
      // prima dopo il pezzo precedente; se la voce la dice prima (ordine diverso dallo schermo), ovunque nella scena;
      // poi le altre parole del pezzo, ma solo dopo il pezzo precedente (una parola comune detta prima sarebbe un falso aggancio)
      let t = quando(sc.parole, parola, dopo) ?? quando(sc.parole, parola, 0);
      for (const p of altre.filter((x) => x !== parola)) { if (t != null) break; t = quando(sc.parole, p, dopo); }
      if (t == null) { mancate.push(`${sc.n} ${sc.stampo}: «${parola}»`); continue; }
      istanti[chiave] = Math.max(0, t - ANTICIPO);
      dopo = t;
    }
    // i pezzi senza aggancio si distribuiscono fra quelli agganciati (prima prova vera, 24/10: col tempo di riserva dello
    // stampo alcune scene restavano mezze vuote per secondi), dall'inizio della voce fino a poco prima della sua fine
    for (let k = 0; k < ordine.length;) {
      if (ordine[k] in istanti) { k++; continue; }
      let m = k; while (m < ordine.length && !(ordine[m] in istanti)) m++;
      const a = k > 0 ? istanti[ordine[k - 1]] : 0.3;
      let b = m < ordine.length ? istanti[ordine[m]] : sc.durVoce * 0.85;
      if (b < a + 0.5 * (m - k + 1)) b = Math.min(sc.durVoce * 0.95, a + 0.5 * (m - k + 1));
      for (let j = k; j < m; j++) istanti[ordine[j]] = k === 0 && j === 0 ? a : a + ((b - a) * (j - k + 1)) / (m - k + 1);
      k = m;
    }
    const t = (chiave, riserva) => Math.min(sc.durata - 0.6, istanti[chiave] ?? riserva);
    const id = `s${i + 1}-${sc.stampo}`;
    const html = st.html({ id, px: `s${i + 1}-`, dati: sc.dati || {}, durata: sc.durata, t, etichetta: sc.etichetta || '', formato, numero: `${sc.n} / ${String(scene.length).padStart(2, '0')}` });
    sc.file = `compositions/frames/${sc.n}-${sc.stampo}.html`;
    sc.id = id;
    fs.writeFileSync(d(sc.file), html);
  }
  if (mancate.length) console.log(`Parole di attacco non trovate nella voce (pezzi distribuiti fra quelli agganciati): ${mancate.join(' · ')}`);

  // 3. sottotitoli e indice
  const tutte = scene.flatMap((sc) => sc.parole.map((w) => ({ text: w.text, start: +(w.start + sc.inizio).toFixed(3), end: +(w.end + sc.inizio).toFixed(3) })));
  let g = gruppi(tutte);
  if(piano.teaching){
    // The SRT and burned-in captions have the same held intervals. Never carry
    // a previous scene's final caption into the following beat.
    g=[];
    for(const sc of scene){
      const local=gruppi(sc.parole.map(w=>({...w,start:w.start+sc.inizio,end:w.end+sc.inizio})));
      for(const [i,group] of local.entries()){
        group.start=i?group.start:sc.inizio;
        group.end=i+1<local.length?local[i+1].start:sc.inizio+sc.durata-.02;
      }
      g.push(...local);
    }
  }
  fs.writeFileSync(d('compositions/captions.html'), composizione(g, totale, formato,{teaching:piano.teaching}));
  fs.writeFileSync(d('video.srt'), srt(g));
  // musica di sottofondo (24/10/2026 sera, Marco: rimetterla): generata qui da musica.py, più presente negli Short,
  // bassa nei video lunghi; piano.musica = 'calma' | 'vivace' | 'nessuna'. Se Python o numpy mancano, video senza musica
  const stile = piano.musica || (formato === 'verticale' ? 'vivace' : 'calma');
  let musica = false;
  if (stile !== 'nessuna') {
    fs.writeFileSync(d('lavoro/musica.json'), JSON.stringify({ durata: totale, stile, livello: formato === 'verticale' ? 'presente' : 'basso',
      voce: scene.map((sc) => [sc.inizio, sc.inizio + sc.durVoce]), scene: scene.map((sc) => sc.inizio) }));
    const m = spawnSync(process.env.HYPERFRAMES_PYTHON || 'python', [path.join(QUI, 'musica.py'), d('lavoro/musica.json'), d('assets/musica.wav')], { encoding: 'utf8', timeout: 300000 });
    musica = m.status === 0 && fs.existsSync(d('assets/musica.wav'));
    console.log(musica ? m.stdout.trim() : `Musica non creata (video senza musica): ${(m.stderr || m.error?.message || '').slice(-400)}`);
  }
  fs.writeFileSync(d('index.html'), indice(scene, totale, F, musica));
  // etichetta, capitolo e titolo della scena: per i capitoli di YouTube nella descrizione (26/10/2026, script/brag/capitoli-yt.mjs)
  fs.writeFileSync(d('tempi.json'), JSON.stringify({ totale, scene: scene.map(({ n, stampo, inizio: a, durata, durVoce, timingFit, parole, testo, etichetta, capitolo, dati }) => ({ n, stampo, inizio: a, durata, durVoce, timingFit, voiceStart:parole[0]?.start, voiceEnd:parole.at(-1)?.end, testo, etichetta, capitolo, titolo: dati?.titolo })) }, null, 1));

  // 4. controllo e montaggio
  const controllo = hf(['lint'], { cwd: dir });
  if (/[1-9]\d* error\(s\)/.test(controllo)) throw new Error(`Il controllo HyperFrames ha trovato errori:\n${controllo.slice(-3000)}`);
  hf(['render', '-o', 'video.mp4', '--fps', '30', '--quality', 'delivery', '--quiet'], { cwd: dir, timeout: 1800000 });
  if (!fs.existsSync(d('video.mp4'))) throw new Error('Montaggio non riuscito: video.mp4 mancante');

  // 5. copertina: la scena scelta dal piano, quando è completa
  const sc = scene[Math.min(scene.length - 1, Math.max(0, piano.copertina ?? 0))];
  const at = (sc.inizio + sc.durata - 0.3).toFixed(2);
  const r = spawnSync('ffmpeg', ['-v', 'error', '-y', '-ss', at, '-i', d('video.mp4'), '-frames:v', '1', '-vf', formato === 'verticale' ? 'scale=720:1280' : 'scale=1280:720', '-q:v', '3', d('copertina.jpg')]);
  if (r.status !== 0) throw new Error(`Copertina non creata: ${r.stderr}`);
  fs.rmSync(d('lavoro'), { recursive: true, force: true });
  return { totale, scene: scene.length, mancate };
}

function indice(scene, totale, { W, H }, musica = false) {
  const pezzi = scene.map((sc) => `
      <div id="el-${sc.id}" class="scene" data-composition-id="${sc.id}" data-composition-src="${sc.file}" data-start="${sc.inizio}" data-duration="${sc.durata}" data-track-index="1"></div>
      <audio id="el-${sc.id}-voce" src="${sc.wav}" data-start="${sc.inizio}" data-duration="${sc.durVoce.toFixed(3)}" data-track-index="10" data-volume="1"></audio>`).join('')
    + (musica ? `
      <audio id="el-musica" src="assets/musica.wav" data-start="0" data-duration="${totale}" data-track-index="11" data-volume="1"></audio>` : '');
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=${W}, height=${H}" />
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { width: ${W}px; height: ${H}px; overflow: hidden; background: #000; }
      #root { position: relative; width: ${W}px; height: ${H}px; overflow: hidden; background: #31433a; }
      .scene { position: absolute; inset: 0; width: 100%; height: 100%; }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="${totale}" data-width="${W}" data-height="${H}">${pezzi}
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
