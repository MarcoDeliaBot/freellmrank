// Confronta la formula della velocità con misure vere (dati/misure-velocita.json).
// Uso: node script/calibra-velocita.mjs   → errore per misura e riassunto, dense e MoE separati
import fs from 'node:fs';
import path from 'node:path';
import { velocitaGpu } from '../sorgente/calc.mjs';
import { RADICE } from './sito/comune.mjs';

const { misure } = JSON.parse(fs.readFileSync(path.join(RADICE, 'dati', 'misure-velocita.json'), 'utf8'));
const righe = misure.map((m) => {
  const stima = velocitaGpu({ attiviGB: (m.active_b * m.bpw) / 8, banda: m.bw, n: m.n_gpu || 1, moe: m.active_b < m.total_b * 0.6, apple: m.backend === 'Metal' });
  return { ...m, stima, err: stima / m.tg - 1 };
});
const riassunto = (l) => {
  const e = l.map((r) => Math.abs(r.err)).sort((a, b) => a - b);
  return `${l.length} misure · errore mediano ${(e[Math.floor(e.length / 2)] * 100).toFixed(0)}% · peggiore ${(e.at(-1) * 100).toFixed(0)}% · entro ±30%: ${l.filter((r) => Math.abs(r.err) <= 0.3).length}`;
};
for (const r of righe) console.log(`${(r.err >= 0 ? '+' : '') + (r.err * 100).toFixed(0).padStart(4)}%  stima ${r.stima.toFixed(0).padStart(4)} vero ${String(r.tg).padStart(6)}  ${r.model} · ${r.hw} (${r.backend})`);
const moe = righe.filter((r) => r.active_b < r.total_b * 0.6);
console.log('\nDENSI', riassunto(righe.filter((r) => !moe.includes(r))));
console.log('MoE  ', riassunto(moe));
console.log('TUTTI', riassunto(righe));
