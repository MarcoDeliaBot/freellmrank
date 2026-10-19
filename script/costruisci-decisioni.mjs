// Modelli decisionali (stile Jev di TypeSafe AI): risultati del "Jev Decision Index",
// classifica comunitaria su Hugging Face (Space multimodalart/jev-decision-index).
// Scrive dati/decisioni.json. Uso: node script/costruisci-decisioni.mjs [--offline]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RADICE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FONTE = 'https://huggingface.co/spaces/multimodalart/jev-decision-index/resolve/main/data/index.json';
const grezzo = path.join(RADICE, 'dati', 'decision-index.json');
const OFFLINE = process.argv.includes('--offline');

if (!OFFLINE) {
  const r = await fetch(FONTE);
  if (!r.ok) throw new Error(`Decision Index: HTTP ${r.status}`);
  fs.writeFileSync(grezzo, await r.text());
}
const j = JSON.parse(fs.readFileSync(grezzo, 'utf8'));

const hf = (url) => { const k = /huggingface\.co\/([^/?#]+\/[^/?#]+)/.exec(url || ''); return k ? k[1] : null; };
const modelli = j.models
  .filter((m) => m.scores?.balanced_skill != null)
  .map((m) => ({
    id: m.engine,
    nome: m.name,
    org: m.meta?.org?.name || m.meta?.org?.id || '',
    tipo: m.meta?.kind || '',
    b: m.meta?.served_params ? +(m.meta.served_params / 1e9).toFixed(1) : null,
    stimato: !!m.meta?.params_estimated,
    repo: m.meta?.weights_repo || hf(m.meta?.model_url),
    base: m.meta?.base_model || null,
    nota: m.meta?.weights_note || null,
    punti: +m.scores.balanced_skill.toFixed(2),
    pubblico: m.scores.public_skill != null ? +m.scores.public_skill.toFixed(2) : null,
    ms: m.latency?.median ?? null,
    ece: m.calibration?.ece ?? null,
    acc: m.calibration?.acc ?? null,
  }))
  .sort((a, b) => b.punti - a.punti);

const jev = { nome: j.jev?.name || 'Jev', versione: j.jev?.version || '', punti: +(j.jev?.scores?.balanced_skill ?? 0).toFixed(2), edizione: j.jev?.edition || '' };
const uscita = { aggiornato: (j.generated_utc || '').slice(0, 10), suite: { versione: j.suite?.panel_id, test: j.suite?.benchmarks, hardware: j.suite?.hardware }, jev, modelli };
fs.writeFileSync(path.join(RADICE, 'dati', 'decisioni.json'), JSON.stringify(uscita, null, 1));
console.log(`Decision Index ${uscita.suite.versione} del ${uscita.aggiornato}: ${modelli.length} modelli, ${modelli.filter((m) => m.repo).length} con pagina Hugging Face, ${jev.nome} ${jev.punti}, sopra Jev: ${modelli.filter((m) => m.punti > jev.punti).length}`);
