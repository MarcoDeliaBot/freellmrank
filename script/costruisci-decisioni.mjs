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

const FONTE_VISION = FONTE.replace('index.json', 'vision.json');
const grezzoVision = path.join(RADICE, 'dati', 'decision-vision.json');
if (!OFFLINE) {
  for (const [url, file] of [[FONTE, grezzo], [FONTE_VISION, grezzoVision]]) {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`Decision Index ${url}: HTTP ${r.status}`);
    fs.writeFileSync(file, await r.text());
  }
}
const j = JSON.parse(fs.readFileSync(grezzo, 'utf8'));
// classifica "Vision" dello stesso sito: chi capisce le immagini, con il suo punteggio
const vision = fs.existsSync(grezzoVision) ? JSON.parse(fs.readFileSync(grezzoVision, 'utf8')) : { entrants: [] };
const perVision = new Map((vision.entrants || []).map((e) => [e.engine, e]));
const AREE = (j.categories || []).map((c) => ({ id: c.id, nome: c.label }));

// licenza dal repository Hugging Face (in memoria fra una notte e l'altra)
const fileLicenze = path.join(RADICE, 'dati', 'decisioni-licenze.json');
const licenze = fs.existsSync(fileLicenze) ? JSON.parse(fs.readFileSync(fileLicenze, 'utf8')) : {};
async function licenza(repo) {
  if (!repo) return null;
  if (licenze[repo] !== undefined) return licenze[repo];
  if (OFFLINE) return null;
  try {
    const r = await fetch(`https://huggingface.co/api/models/${repo}`);
    if (!r.ok) { licenze[repo] = null; return null; }
    const m = await r.json();
    const t = (m.tags || []).find((x) => x.startsWith('license:'));
    licenze[repo] = m.cardData?.license || (t ? t.slice(8) : null);
  } catch { licenze[repo] = null; }
  return licenze[repo];
}

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
    p95: m.latency?.p95 ?? null,
    ece: m.calibration?.ece ?? null,
    acc: m.calibration?.acc ?? null,
    aree: Object.fromEntries((m.categories || []).filter((c) => c.skill != null).map((c) => [c.id, +(c.skill * 100).toFixed(1)])),
    vision: perVision.has(m.engine) ? { punti: +perVision.get(m.engine).full.toFixed(1), ms: perVision.get(m.engine).ms_row ?? null } : null,
  }))
  .sort((a, b) => b.punti - a.punti);
for (const m of modelli) m.licenza = await licenza(m.repo);
fs.writeFileSync(fileLicenze, JSON.stringify(licenze, null, 1));

const jev = { nome: j.jev?.name || 'Jev', versione: j.jev?.version || '', punti: +(j.jev?.scores?.balanced_skill ?? 0).toFixed(2), edizione: j.jev?.edition || '' };
jev.aree = Object.fromEntries((j.jev?.categories || []).filter((c) => c.skill != null).map((c) => [c.id, +(c.skill * 100).toFixed(1)]));
const uscita = { aggiornato: (j.generated_utc || '').slice(0, 10), suite: { versione: j.suite?.panel_id, test: j.suite?.benchmarks, hardware: j.suite?.hardware }, aree: AREE, visionEdizione: vision.edition || null, jev, modelli };
fs.writeFileSync(path.join(RADICE, 'dati', 'decisioni.json'), JSON.stringify(uscita, null, 1));
console.log(`Decision Index ${uscita.suite.versione} del ${uscita.aggiornato}: ${modelli.length} modelli, ${modelli.filter((m) => m.repo).length} con pagina Hugging Face, ${jev.nome} ${jev.punti}, sopra Jev: ${modelli.filter((m) => m.punti > jev.punti).length}`);
