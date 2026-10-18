// Formule del simulatore: memoria e velocità. Usate dal browser (casa.js) e dalla build
// (pagine dei modelli), così le cifre sono le stesse ovunque.
export const EFF_GPU = 0.7, EFF_RAM = 0.8, RUNTIME = 0.6, ENCODER = 3;
export const PRECISIONI = [
  { id: 'q4', nome: '4-bit (Q4_K_M)', bpp: 0.606 },
  { id: 'q5', nome: '5-bit (Q5_K_M)', bpp: 0.711 },
  { id: 'q8', nome: '8-bit (Q8_0)', bpp: 1.0625 },
  { id: 'f16', nome: '16-bit (full)', bpp: 2 },
];

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
