// Un colore per laboratorio, uguale in tutti i grafici (idea presa da Artificial Analysis, 20/10/2026).
// I laboratori con più modelli gratis hanno un colore loro; gli altri sono grigi.
const LAB = {
  alibaba: ['Qwen (Alibaba)', '#f97316'],
  deepseek: ['DeepSeek', '#4f6bfe'],
  zai: ['GLM (Z.ai)', '#8b5cf6'],
  meta: ['Meta', '#0ea5e9'],
  mistral: ['Mistral', '#e11d48'],
  moonshot: ['Kimi (Moonshot)', '#14b8a6'],
  google: ['Google', '#22c55e'],
  xiaomi: ['Xiaomi', '#eab308'],
  nvidia: ['NVIDIA', '#84cc16'],
  minimax: ['MiniMax', '#ec4899'],
  tencent: ['Tencent', '#b45309'],
  openai: ['OpenAI', '#64748b'],
};
const ALTRI = '#94a3b8';
export const coloreLab = (org) => (LAB[org] ? LAB[org][1] : ALTRI);
export const nomeLab = (org) => (LAB[org] ? LAB[org][0] : org ? org.charAt(0).toUpperCase() + org.slice(1) : 'Other');
export const chiaveLab = (org) => (LAB[org] ? org : 'other');
// legenda e filtro: i laboratori presenti, nell'ordine in cui compaiono
export function laboratoriDi(elenco) {
  const visti = new Map();
  for (const m of elenco) { const k = chiaveLab(m.org); if (!visti.has(k)) visti.set(k, { k, nome: k === 'other' ? 'Others' : nomeLab(m.org), colore: k === 'other' ? ALTRI : coloreLab(m.org), n: 0 }); visti.get(k).n++; }
  const lista = [...visti.values()];
  return [...lista.filter((x) => x.k !== 'other'), ...lista.filter((x) => x.k === 'other')];
}
