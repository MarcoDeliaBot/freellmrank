// Pagina del radar YouTube (Marco, 25/10/2026: «fallo girare da solo ogni lunedì, con il resoconto su una pagina»).
// Legge il resoconto di script/radar-youtube.mjs e, se c'è, il file delle scelte scritto da chi legge il resoconto:
// .ai/radar/<data>-scelte.json = { "breve": ["frase", …], "nostri": ["idVideo", …], "fatti": ["idVideo", …] }
// «nostri» = il nostro argomento (modelli aperti o gratis, hardware per modelli locali); «fatti» = video o notizia già nostri.
// Uso: node script/radar-pagina.mjs [AAAA-MM-GG]  →  .ai/radar/radar-youtube.html (si pubblica sempre allo stesso indirizzo)

import { readFile, writeFile, readdir } from 'node:fs/promises';

const DIR = '.ai/radar';
const data = process.argv[2] || (await readdir(DIR)).filter((f) => /^\d{4}-\d\d-\d\d\.json$/.test(f)).sort().pop()?.slice(0, 10);
if (!data) throw new Error('nessun resoconto in .ai/radar: prima node script/radar-youtube.mjs');
const r = JSON.parse(await readFile(`${DIR}/${data}.json`, 'utf8'));
let s = { breve: [], nostri: [], fatti: [] };
try { s = { ...s, ...JSON.parse(await readFile(`${DIR}/${data}-scelte.json`, 'utf8')) }; } catch {}

const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const n = (x) => x.toLocaleString('it-IT');
const nostri = new Set([...s.nostri, ...s.fatti]), fatti = new Set(s.fatti);
const [a, m, g] = data.split('-');
const MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
const giorno = `${+g} ${MESI[m - 1]} ${a}`;

// la sintesi la scrive chi legge il resoconto; senza scelte resta solo il conteggio
const breve = [
  `Letti <b>${r.letti.length} canali</b> della nicchia AI. Trovati <b>${r.trovati.length} video</b> con almeno il doppio delle visite solite del loro canale.`,
  ...s.breve,
  ...(r.saltati.length ? [`Canali saltati: ${esc(r.saltati.join('; '))}.`] : []),
];

const righe = r.trovati.map((v) => {
  const chip = fatti.has(v.id) ? '<span class="chip n">già fatto da noi</span>' : nostri.has(v.id) ? '<span class="chip n">nostro tema</span>' : '';
  return `<tr class="${nostri.has(v.id) ? 'nostro' : ''}"><td class="n volte">${String(v.volte).replace('.', ',')}×</td><td class="titolo"><a href="https://youtu.be/${v.id}">${esc(v.titolo)}</a><br><span class="can">${esc(v.canale)} · ${v.short ? 'Short' : 'Lungo'}</span> ${chip}</td><td class="n">${n(v.visite)}<br><span class="can">solite ${n(v.mediana)}</span></td><td class="n">${v.giorni} g</td></tr>`;
}).join('\n');

const html = `<title>Radar YouTube FreeLLMArena</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@500;700;800&family=Source+Sans+3:wght@400;600&family=JetBrains+Mono:wght@500&display=swap">
<style>
/* Layout: una colonna stretta, la sintesi, poi la tabella del radar */
:root{
  --bg:#f6f7f9; --carta:#ffffff; --fg:#17202b; --fioco:#5b6676; --linea:#dde2e8;
  --accento:#d4312a; --nostro:#0f7a5a; --nostro-bg:#e3f4ed;
  --f-titolo:"Archivo",system-ui,sans-serif; --f-testo:"Source Sans 3",system-ui,sans-serif; --f-dati:"JetBrains Mono",ui-monospace,monospace;
}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){
  --bg:#12161c; --carta:#1a2029; --fg:#e8ecf1; --fioco:#9aa5b4; --linea:#2c3540;
  --accento:#ff6b5e; --nostro:#4fd1a5; --nostro-bg:#163a2f; color-scheme:dark}}
:root[data-theme="dark"]{
  --bg:#12161c; --carta:#1a2029; --fg:#e8ecf1; --fioco:#9aa5b4; --linea:#2c3540;
  --accento:#ff6b5e; --nostro:#4fd1a5; --nostro-bg:#163a2f; color-scheme:dark}
body{background:var(--bg);color:var(--fg);font:17px/1.55 var(--f-testo)}
.pagina{max-width:880px;margin:0 auto;padding-block:28px 48px;padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px));display:grid;gap:24px}
h1{font:800 clamp(28px,6vw,40px)/1.1 var(--f-titolo);margin:0;text-wrap:balance}
h1 span{color:var(--accento)}
.data{font:500 13px var(--f-dati);color:var(--fioco);letter-spacing:.04em;text-transform:uppercase}
h2{font:700 20px var(--f-titolo);margin:0 0 8px}
ul.punti{margin:0;padding-left:20px;display:grid;gap:6px;max-width:65ch}
.riquadro{background:var(--carta);border:1px solid var(--linea);border-radius:10px;padding:16px 18px}
.tab{overflow-x:auto;background:var(--carta);border:1px solid var(--linea);border-radius:10px}
table{border-collapse:collapse;width:100%;font-size:15px}
th,td{padding:9px 12px;text-align:left;border-bottom:1px solid var(--linea);vertical-align:top}
th{font:600 12px var(--f-dati);color:var(--fioco);text-transform:uppercase;letter-spacing:.05em}
td.n{font:500 14px var(--f-dati);font-variant-numeric:tabular-nums;white-space:nowrap}
td.volte{color:var(--accento);font-weight:700}
tr.nostro td{background:var(--nostro-bg)}
.chip{display:inline-block;font:600 11px var(--f-dati);padding:1px 7px;border-radius:99px;border:1px solid var(--linea);color:var(--fioco);white-space:nowrap}
.chip.n{border-color:var(--nostro);color:var(--nostro)}
a{color:inherit;text-decoration-color:var(--fioco);text-underline-offset:3px}
a:hover,a:focus-visible{color:var(--accento)}
td.titolo{min-width:220px}
.can{color:var(--fioco);font-size:14px}
.nota{color:var(--fioco);font-size:14px;max-width:70ch}
code{font:500 13px var(--f-dati)}
</style>
<div class="pagina">
  <div>
    <div class="data">Resoconto del lunedì · ${giorno}</div>
    <h1>Radar YouTube: cosa va forte <span>questa settimana</span></h1>
  </div>
  <section class="riquadro">
    <h2>In breve</h2>
    <ul class="punti">
${breve.map((b) => `      <li>${b}</li>`).join('\n')}
    </ul>
  </section>
  <section>
    <h2>I ${r.trovati.length} video</h2>
    <div class="tab">
      <table>
        <thead><tr><th>Volte</th><th>Video</th><th>Visite</th><th>Età</th></tr></thead>
        <tbody>
${righe}
        </tbody>
      </table>
    </div>
  </section>
  <p class="nota"><b>Come si legge.</b> «Volte» = visite del video diviso le visite solite del canale (la mediana dei suoi ultimi video dello stesso formato). Contano solo i video di 2–14 giorni. In verde: il nostro argomento (modelli aperti o gratis, hardware per modelli locali).</p>
  <p class="nota"><b>Da dove vengono i numeri.</b> Dal feed pubblico di ogni canale YouTube, letto il ${giorno}. Gratis, senza chiave e senza quota. Gli script sono <code>script/radar-youtube.mjs</code> e <code>script/radar-pagina.mjs</code>, i canali sono in <code>dati/radar-canali.json</code>.</p>
</div>
`;
await writeFile(`${DIR}/radar-youtube.html`, html);
console.log(`pagina: ${DIR}/radar-youtube.html (${data}, ${r.trovati.length} video, scelte ${s.breve.length ? 'sì' : 'no'})`);
