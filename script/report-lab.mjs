// Report mensile per un laboratorio (quello promesso nelle mail): posizione di ogni suo modello
// nelle classifiche GRATIS del sito, punteggio e voti Arena, variazione sui 30 giorni, voti Free Arena.
// Solo numeri letti da sito/data.json, sito/history.json e /api/arena/ranking: nessuna stima.
// Uso: node script/report-lab.mjs <org> [<org> ...]   (org come in data.json: moonshot, xiaomi, nvidia...)
// Scrive lettere/report/<org>-<AAAA-MM>.html
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RADICE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const leggi = (f) => JSON.parse(fs.readFileSync(path.join(RADICE, 'sito', f), 'utf8'));
const dati = leggi('data.json');
const storia = leggi('history.json');
const ID_STORIA = { Chat: 'chat', Coding: 'code', Vision: 'vision', Image: 'image', Video: 'video', 'Image edit': 'edit', Documents: 'document', Search: 'search', 'Image to video': 'i2v', 'Video edit': 'vedit', Agents: 'agent' };
const NOMI_LAB = { moonshot: 'Moonshot AI', minimax: 'MiniMax', deepseek: 'DeepSeek', alibaba: 'Alibaba Qwen', cohere: 'Cohere', nvidia: 'NVIDIA', xiaomi: 'Xiaomi MiMo', tencent: 'Tencent Hunyuan', google: 'Google', bfl: 'Black Forest Labs', thinky: 'Thinking Machines Lab', zai: 'Z.ai', mistral: 'Mistral AI' };
const usabileGratis = (m) => m.aperto || m.or?.gratis;
const chiave = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

// voti della Free Arena del sito (alla cieca, modelli Workers AI); se non risponde il report lo dice
let arena = null;
try { const r = await fetch('https://freellmarena.com/api/arena/ranking'); if (r.ok) arena = await r.json(); } catch {}

const mese = dati.aggiornato.slice(0, 7);
const orgs = process.argv.slice(2);
if (!orgs.length) { console.error('Uso: node script/report-lab.mjs <org> [<org> ...]'); process.exit(1); }
const dir = path.join(RADICE, 'lettere', 'report');
fs.mkdirSync(dir, { recursive: true });

for (const org of orgs) {
  const righe = [];
  for (const c of dati.categorie) {
    const gratis = c.modelli.filter(usabileGratis);
    gratis.forEach((m, i) => {
      if ((m.org || '').toLowerCase() !== org) return;
      // variazione del punteggio sui 30 giorni, se lo storico ha il modello
      const s = storia.categorie[ID_STORIA[c.nome]];
      let delta = null;
      if (s) {
        // dal 20/10/2026 Arena scrive i nomi in un altro modo ("mimo-v2.6-pro" -> "MiMo-V2.6-Pro"):
        // lo storico ha due serie per lo stesso modello, qui si fondono data per data
        const ks = Object.keys(s.serie).filter((n) => chiave(n) === chiave(m.nome));
        const v = s.date.map((_, x) => ks.map((k) => s.serie[k][x]).find((y) => y != null) ?? null);
        const lim = new Date(new Date(dati.aggiornato).getTime() - 30 * 864e5).toISOString().slice(0, 10);
        const j = s.date.findIndex((d) => d >= lim);
        const ora = [...v].reverse().find((y) => y != null);
        if (ks.length && j >= 0 && v[j] != null && ora != null) delta = Math.round(ora - v[j]);
      }
      righe.push({ cat: c.nome, pos: i + 1, su: gratis.length, nome: m.nome, punti: m.punti, voti: m.voti, delta, scala: c.scala });
    });
  }
  righe.sort((a, b) => a.pos / a.su - b.pos / b.su);
  const nomeLab = NOMI_LAB[org] || org;
  const tabella = righe.map((r) => `<tr><td>${esc(r.cat)}</td><td class="n">#${r.pos} <span>of ${r.su}</span></td><td>${esc(r.nome)}</td><td class="n">${r.scala === 'agent' ? r.punti.toFixed(1) : r.punti}</td><td class="n">${r.voti.toLocaleString('en-US')}</td><td class="n">${r.delta == null ? '–' : (r.delta > 0 ? '+' : '') + r.delta}</td></tr>`).join('\n');
  const loro = arena ? arena.modelli.filter((m) => chiave(m.id).includes(org === 'thinky' ? 'thinkingmachines' : org)) : [];
  const parteArena = !arena ? '<p>Free Arena data could not be read when this report was generated.</p>'
    : `<p>Free Arena, our own blind vote between two free models, has ${arena.voti.toLocaleString('en-US')} vote${arena.voti === 1 ? '' : 's'} in total so far. ${loro.length ? `Votes on ${esc(nomeLab)} models: ${loro.map((m) => `${esc(m.id)} ${m.voti}`).join(', ')}.` : `${esc(nomeLab)} models are not in Free Arena yet: adding them is what we asked for.`}</p>`;
  const html = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(nomeLab)} on FreeLLMArena · ${mese}</title>
<style>body{font:16px/1.5 system-ui,sans-serif;max-width:52rem;margin:0 auto;padding:24px 16px;color:#1b2420;background:#fff}h1{font-size:1.5rem;margin:0 0 4px}p{max-width:65ch}table{border-collapse:collapse;width:100%;font-size:.95rem}th,td{text-align:left;padding:6px 8px;border-bottom:1px solid #d3ddd6}th{font-size:.8rem;text-transform:uppercase;letter-spacing:.04em;color:#5a6a62}.n{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}.n span{color:#5a6a62;font-size:.85em}.scorri{overflow-x:auto}small{color:#5a6a62}</style>
<h1>${esc(nomeLab)} on FreeLLMArena</h1>
<p><small>Monthly report · data of ${dati.aggiornato} · https://freellmarena.com</small></p>
<p>FreeLLMArena ranks the AI models people can use for free (open weights or a free API), using Arena's public blind human votes (CC BY 4.0). The position is among free models only. The score change compares the Arena score now with the score 30 days earlier.</p>
<div class="scorri"><table><thead><tr><th>Ranking</th><th class="n">Position</th><th>Model</th><th class="n">Arena score</th><th class="n">Votes</th><th class="n">30-day change</th></tr></thead><tbody>
${tabella || '<tr><td colspan="6">No free model of this lab in the rankings.</td></tr>'}
</tbody></table></div>
<h2>Free Arena</h2>
${parteArena}
<p><small>Source: Arena leaderboard dataset (lmarena-ai/leaderboard-dataset on Hugging Face, CC BY 4.0). FreeLLMArena is not affiliated with Arena.</small></p>
</html>`;
  const file = path.join(dir, `${org}-${mese}.html`);
  fs.writeFileSync(file, html);
  console.log(`${org}: ${righe.length} righe, ${righe.filter((r) => r.delta != null).length} con variazione -> ${path.relative(RADICE, file)}`);
}
