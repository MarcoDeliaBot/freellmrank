// Voce e tempi parola per parola dei video a stampi (24/10/2026). Tutto gira sul computer, gratis e senza account:
// voce Kokoro-82M («hyperframes tts», voce am_michael) e riconoscimento Parakeet («hyperframes transcribe»), che dice
// quando viene detta ogni parola. Il testo dei sottotitoli è sempre quello del copione, non quello riconosciuto:
// Parakeet serve solo per i tempi (allinea()).
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

export const HYPERFRAMES = 'hyperframes@0.8.192';
export const VOCE = 'am_michael';

export function hf(args, { cwd, timeout = 900000 } = {}) {
  const r = spawnSync('npx', ['--yes', HYPERFRAMES, ...args], { cwd, encoding: 'utf8', shell: process.platform === 'win32', timeout, maxBuffer: 64 * 1024 * 1024 });
  if (r.status !== 0) throw new Error(`hyperframes ${args[0]} uscito con ${r.status}: ${(r.stderr || r.stdout || '').slice(-1500)}`);
  return r.stdout;
}

// ultima riga JSON di un'uscita (la CLI può stampare avanzamento prima)
const json = (testo) => {
  const righe = String(testo).trim().split(/\r?\n/).reverse();
  for (const r of righe) { try { return JSON.parse(r); } catch { /* riga di avanzamento */ } }
  throw new Error(`Nessun JSON nell'uscita: ${String(testo).slice(-500)}`);
};

// scrive file .wav con la voce; restituisce la durata in secondi
export function parla(testo, file) {
  const txt = file.replace(/\.wav$/, '.txt');
  fs.writeFileSync(txt, testo);
  const r = json(hf(['tts', txt, '-v', VOCE, '-o', file, '--json']));
  if (!r.ok || !fs.existsSync(file)) throw new Error(`Voce non creata per: ${testo.slice(0, 80)}`);
  return r.durationSeconds;
}

// parole riconosciute con i tempi: [{ text, start, end }]
export function ascolta(file, cartella) {
  fs.mkdirSync(cartella, { recursive: true });
  const r = json(hf(['transcribe', file, '-d', cartella, '-l', 'en', '--json']));
  if (!r.ok) throw new Error(`Trascrizione non riuscita: ${JSON.stringify(r)}`);
  const t = JSON.parse(fs.readFileSync(r.transcriptPath || path.join(cartella, 'transcript.json'), 'utf8'));
  return (Array.isArray(t) ? t : t.words || []).map((w) => ({ text: String(w.text), start: Number(w.start), end: Number(w.end) }));
}

const norma = (w) => String(w).toLowerCase().replace(/[^a-z0-9]/g, '');

// tempi per le parole del copione: le parole uguali a quelle riconosciute prendono i loro tempi (sottosequenza comune
// più lunga), le altre («155» detto «one hundred fifty five», «DeepInfer» sentito «Deep Infer») si dividono lo spazio
// fra le due vicine riconosciute, in proporzione alla lunghezza
export function allinea(testo, sentite, durata) {
  const copione = String(testo).split(/\s+/).filter(Boolean);
  const a = copione.map(norma), b = sentite.map((w) => norma(w.text));
  const L = Array.from({ length: a.length + 1 }, () => new Int32Array(b.length + 1));
  for (let i = a.length - 1; i >= 0; i--) for (let j = b.length - 1; j >= 0; j--)
    L[i][j] = a[i] && a[i] === b[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const tempi = new Array(copione.length).fill(null);
  for (let i = 0, j = 0; i < a.length && j < b.length;) {
    if (a[i] && a[i] === b[j]) { tempi[i] = { start: sentite[j].start, end: sentite[j].end }; i++; j++; }
    else if (L[i + 1][j] >= L[i][j + 1]) i++; else j++;
  }
  const inizio = sentite.length ? Math.max(0, sentite[0].start) : 0;
  const fine = sentite.length ? Math.min(durata, sentite.at(-1).end) : durata;
  for (let i = 0; i < copione.length;) {
    if (tempi[i]) { i++; continue; }
    let k = i; while (k < copione.length && !tempi[k]) k++;
    const da = i > 0 ? tempi[i - 1].end : inizio;
    const a2 = k < copione.length ? tempi[k].start : fine;
    const pesi = copione.slice(i, k).map((w) => Math.max(2, w.length));
    const tot = pesi.reduce((x, y) => x + y, 0);
    let t = da;
    for (let m = i; m < k; m++) { const d = Math.max(0, a2 - da) * pesi[m - i] / tot; tempi[m] = { start: t, end: t + d }; t += d; }
    i = k;
  }
  return copione.map((text, i) => ({ text, start: +tempi[i].start.toFixed(3), end: +tempi[i].end.toFixed(3) }));
}

// istante (dall'inizio della scena) in cui la voce dice «parola» (anche più parole), cercando dopo «dopo»
export function quando(parole, cercata, dopo = 0) {
  const pezzi = String(cercata).split(/\s+/).map(norma).filter(Boolean);
  if (!pezzi.length) return null;
  for (let i = 0; i + pezzi.length <= parole.length; i++) {
    if (parole[i].start < dopo - 0.01) continue;
    if (pezzi.every((p, k) => { const w = norma(parole[i + k].text); return w === p || (k === pezzi.length - 1 && w.startsWith(p)); })) return parole[i].start;
  }
  return null;
}
