// Formule del simulatore: memoria e velocità. Usate dal browser (run-at-home.js) e dalla build
// (pagine dei modelli), così le cifre sono le stesse ovunque.
export const EFF_GPU = 0.7, EFF_RAM = 0.8, RUNTIME = 0.6, ENCODER = 3;
export const PRECISIONI = [
  { id: 'q4', nome: '4-bit (Q4_K_M)', bpp: 0.606 },
  { id: 'q5', nome: '5-bit (Q5_K_M)', bpp: 0.711 },
  { id: 'q8', nome: '8-bit (Q8_0)', bpp: 1.0625 },
  { id: 'f16', nome: '16-bit (full)', bpp: 2 },
];

// Livelli di quantizzazione GGUF. Byte per parametro dalle dimensioni dei file di Llama 3 8B;
// perdita di qualità = aumento della perplexity rispetto a fp16, misurato da llama.cpp
// (tools/perplexity/README.md): Llama 3 8B senza imatrix e Llama 2 70B ("Old Numbers").
export const QUANTI = [
  { id: 'Q2_K', bpp: 0.40, p8: 56.5, p70: 8.82 },
  { id: 'Q3_K_M', bpp: 0.50, p8: 10.5, p70: 4.72 },
  { id: 'Q4_K_M', bpp: 0.606, p8: 2.82, p70: 1.20 },
  { id: 'Q5_K_M', bpp: 0.711, p8: 0.91, p70: 0.40 },
  { id: 'Q6_K', bpp: 0.82, p8: 0.35, p70: 0.16 },
  { id: 'Q8_0', bpp: 1.0625, p8: 0.04, p70: 0.02 },
  { id: 'F16', bpp: 2, p8: 0, p70: 0 },
];
// i modelli grandi perdono meno: interpolazione sul logaritmo dei parametri fra 8 e 70 miliardi
export function perditaQualita(q, miliardi) {
  const t = Math.min(1, Math.max(0, (Math.log(miliardi) - Math.log(8)) / (Math.log(70) - Math.log(8))));
  return q.p8 + (q.p70 - q.p8) * t;
}
export const giudizio = (p) => (p < 0.1 ? 'same as full' : p < 0.6 ? 'near-lossless' : p < 1.6 ? 'very small loss' : p < 3.5 ? 'small loss' : p < 12 ? 'noticeable loss' : 'large loss');

// memoria del contesto (KV cache) in GB, dalla vera architettura quando c'è
export function kvGB(hf, ctx, kvq = 1) {
  if (hf.kv) {
    const tok = hf.pf * ctx + hf.fw * Math.min(ctx, hf.w || ctx);
    return (hf.kv * tok * kvq) / 1e9;
  }
  return 0.000004 * hf.b * ctx * kvq; // stima grezza se la configurazione non c'è
}

// h = { n, vram, banda, ram, bandaRam, bpp, kvq, ctx }; soloPesi = modelli di immagini/video
export function simula(hf, h, soloPesi = false) {
  const pesi = hf.b * h.bpp;
  const kv = soloPesi ? 0 : kvGB(hf, h.ctx, h.kvq);
  const extra = RUNTIME * h.n + (soloPesi ? ENCODER : 0);
  const serve = pesi + kv + extra;
  let dove, inRam = 0;
  if (serve <= h.vram) dove = 'gpu';
  else if (h.ram && serve <= h.vram + h.ram * 0.8 && pesi > serve - h.vram) { dove = 'ram'; inRam = serve - h.vram; }
  else dove = 'no';
  let vel = null;
  if (!soloPesi && dove !== 'no') {
    const attivi = (hf.att || hf.b) * h.bpp;
    const quotaRam = inRam / pesi;
    const t = (attivi * (1 - quotaRam) + kv) / (h.banda * EFF_GPU) + (quotaRam ? (attivi * quotaRam) / (h.bandaRam * EFF_RAM) : 0);
    vel = (1 / t) / (1 + 0.03 * (h.n - 1));
  }
  return { pesi, kv, extra, serve, dove, inRam, vel };
}

// hardware da una scheda del catalogo
export function daScheda(s, { n = 1, ram = 0, bandaRam = 96, bpp = 0.606, kvq = 1, ctx = 32768 } = {}) {
  const unificata = !!s.unificata;
  const quanti = unificata ? 1 : n;
  const perScheda = unificata ? s.gb * 0.75 : s.gb;
  return { nome: s.nome, n: quanti, unificata, perScheda, banda: s.banda, vram: quanti * perScheda, ram: unificata ? 0 : ram, bandaRam, bpp, kvq, ctx };
}

export const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
