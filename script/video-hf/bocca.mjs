// Quando Bit apre la bocca (5/11/2026, Marco: «la mascotte parla anche quando non c'è voce»): non più dai tempi delle
// parole, che a volte vanno oltre la fine dell'audio, ma dal volume vero della voce, fotogramma per fotogramma.
// aperture(wav) → [[inizio, fine], ...] in secondi dall'inizio del file: bocca aperta solo dove la voce è forte.
import { spawnSync } from 'node:child_process';

const FPS = 30, RATE = 24000, PASSO = RATE / FPS;

export function aperture(wav) {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-i', wav, '-f', 's16le', '-ac', '1', '-ar', String(RATE), '-'], { maxBuffer: 1 << 28 });
  if (r.status !== 0 || !r.stdout?.length) return [];
  const pcm = new Int16Array(r.stdout.buffer, r.stdout.byteOffset, Math.floor(r.stdout.length / 2));
  // volume (rms) di ogni fotogramma
  const n = Math.floor(pcm.length / PASSO), rms = new Float64Array(n);
  for (let f = 0; f < n; f++) {
    let s = 0;
    for (let k = f * PASSO; k < (f + 1) * PASSO; k++) s += (pcm[k] / 32768) ** 2;
    rms[f] = Math.sqrt(s / PASSO);
  }
  // soglia: una parte del volume tipico della voce, mai sotto il rumore di fondo
  const ordinati = [...rms].sort((a, b) => a - b);
  const alto = ordinati[Math.floor(n * 0.9)] || 0;
  const soglia = Math.max(0.012, alto * 0.3);
  const su = Array.from(rms, (v) => v > soglia);
  // niente scatti di un solo fotogramma: un'apertura isolata si toglie, una chiusura isolata in mezzo alla voce resta
  // solo se separa due sillabe (il volume scende davvero), altrimenti si riempie
  for (let f = 1; f < n - 1; f++) if (su[f] && !su[f - 1] && !su[f + 1]) su[f] = false;
  const out = [];
  let a = null;
  for (let f = 0; f <= n; f++) {
    const v = f < n && su[f];
    if (v && a == null) a = f;
    if (!v && a != null) {
      // le vocali lunghe: la bocca si richiude un attimo ogni 7 fotogrammi, come chi parla
      for (let s = a; s < f; s += 7) {
        const e = Math.min(f, s + 5);
        if (e - s >= 2) out.push([+(s / FPS).toFixed(3), +(e / FPS).toFixed(3)]);
      }
      a = null;
    }
  }
  return out;
}
