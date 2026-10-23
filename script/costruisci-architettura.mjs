// Legge config.json di ogni repository in dati/pesi.json e ricava ciò che serve al simulatore:
// strati, memoria del contesto (KV cache) per token, parametri attivi (MoE), contesto massimo.
// Scrive dati/architettura.json: { "<repo>": { ... } }. Rilegge solo i repository nuovi.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RADICE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pesi = JSON.parse(fs.readFileSync(path.join(RADICE, 'dati', 'pesi.json'), 'utf8'));
const fileOut = path.join(RADICE, 'dati', 'architettura.json');
const out = fs.existsSync(fileOut) ? JSON.parse(fs.readFileSync(fileOut, 'utf8')) : {};

// Byte per token di KV cache in fp16, separati per tipo di strato:
// pieni (crescono con tutto il contesto) e a finestra (crescono fino alla finestra).
export function analizza(cfg, totale, nomeRepo) {
  const c = cfg.text_config || cfg.language_config || cfg.llm_config || cfg;
  const strati = c.num_hidden_layers || c.n_layers || c.num_layers || c.layers_block_type?.length;
  if (!strati) return null;
  const teste = c.num_attention_heads || c.n_heads;
  const kvTeste = c.num_key_value_heads ?? c.multi_query_group_num ?? teste;
  const dimTesta = c.head_dim || (c.hidden_size && teste ? c.hidden_size / teste : null);
  let perStrato; // byte per token per strato con attenzione
  let tipo;
  if (c.kv_lora_rank) { // attenzione latente (DeepSeek, Kimi): un solo vettore compresso
    perStrato = (c.kv_lora_rank + (c.qk_rope_head_dim || 64)) * 2;
    tipo = 'MLA';
  } else if (kvTeste && dimTesta) {
    perStrato = 2 * kvTeste * dimTesta * 2;
    tipo = kvTeste < teste ? 'GQA' : 'MHA';
  } else return null;

  // quali strati hanno attenzione piena, a finestra o lineare (senza KV che cresce)
  let pieni = strati, finestra = 0;
  const tipi = c.layer_types || c.layers_block_type;
  if (Array.isArray(tipi) && tipi.length) {
    finestra = tipi.filter((t) => /sliding|local|chunk/.test(t)).length;
    // lineari, mamba e strati senza attenzione non tengono un KV che cresce
    pieni = tipi.filter((t) => !/sliding|local|chunk|linear|mamba|moe|mlp|ssm|conv/.test(t)).length;
  } else if (Array.isArray(c.hybrid_layer_pattern)) { // MiMo: 0 = pieno, 1 = a finestra
    pieni = c.hybrid_layer_pattern.filter((x) => x === 0).length;
    finestra = c.hybrid_layer_pattern.length - pieni;
  } else if (c.full_attention_interval) {
    pieni = Math.ceil(strati / c.full_attention_interval);
  } else if (c.sliding_window_pattern && c.sliding_window) {
    pieni = Math.ceil(strati / c.sliding_window_pattern);
    finestra = strati - pieni;
  }

  // parametri attivi per token nei modelli a esperti (MoE)
  const esperti = c.n_routed_experts || c.num_experts || c.num_local_experts || c.moe_num_experts;
  const perTok = c.num_experts_per_tok || c.moe_top_k || c.num_experts_per_token || c.moe_topk;
  let attivi = totale;
  // dal nome: "-A3B" (Qwen, Gemma) oppure "-17B-128E" (Llama 4: 17 B attivi, 128 esperti)
  const dalNome = /-A(\d+(?:\.\d+)?)B\b/i.exec(nomeRepo || '') || /-(\d+(?:\.\d+)?)B-\d+E\b/i.exec(nomeRepo || '');
  if (dalNome) attivi = Number(dalNome[1]) * 1e9;
  else if (esperti && perTok && esperti > perTok) {
    const inter = c.moe_intermediate_size || c.expert_ffn_hidden_size || c.expert_intermediate_size || c.intermediate_size;
    const larghezza = c.routed_expert_hidden_size || c.moe_latent_size || c.hidden_size; // esperti "latenti"
    let stratiMoe;
    if (Array.isArray(c.moe_layer_freq)) stratiMoe = c.moe_layer_freq.filter(Boolean).length;
    else if (Array.isArray(c.mlp_layer_types)) stratiMoe = c.mlp_layer_types.filter((t) => t !== 'dense').length;
    else if (Array.isArray(tipi) && tipi.some((t) => t === 'moe')) stratiMoe = tipi.filter((t) => t === 'moe').length;
    // strati densi elencati a parte (stile Qwen-MoE: «mlp_only_layers», es. Flint [0, 1]): prima li contavo a esperti e
    // Flint usciva con 1,3 B attivi invece dei ~2,5 della scheda (23/10/2026)
    else if (Array.isArray(c.mlp_only_layers) && c.mlp_only_layers.length) stratiMoe = Math.floor((strati - c.mlp_only_layers.length) / (c.decoder_sparse_step || 1));
    else stratiMoe = Math.floor((strati - (c.first_k_dense_replace || 0)) / (c.moe_layer_freq || c.decoder_sparse_step || c.interleave_moe_layer_step || 1));
    const spenti = stratiMoe * (esperti - perTok) * 3 * larghezza * inter;
    if (spenti > 0 && spenti < totale) attivi = totale - spenti;
    // la tabella delle parole in ingresso si legge, non si calcola: non conta fra gli attivi (come nelle schede ufficiali,
    // es. Flint «excludes the full input embedding matrix»); se è condivisa con l'uscita resta, perché l'uscita calcola
    if (attivi < totale && !c.tie_word_embeddings && c.vocab_size && c.hidden_size) attivi -= c.vocab_size * c.hidden_size;
  }

  return {
    strati, tipo, kvPerStrato: perStrato, pieni, finestra,
    larghezzaFinestra: c.sliding_window || null,
    contestoMax: c.max_position_embeddings || null,
    moe: attivi < totale,
    attivi: Math.round(attivi),
  };
}

let nuovi = 0, falliti = [];
// modelli votati da Arena + modelli piccoli (script/costruisci-piccoli.mjs)
const filePiccoli = path.join(RADICE, 'dati', 'piccoli.json');
const piccoli = fs.existsSync(filePiccoli) ? JSON.parse(fs.readFileSync(filePiccoli, 'utf8')) : [];
const totali = new Map();
for (const p of Object.values(pesi)) totali.set(p.repo, p.parametri);
for (const p of piccoli) if (!totali.has(p.repo)) totali.set(p.repo, p.parametri);
const fileNuovi = path.join(RADICE, 'dati', 'nuovi.json');
const modelliNuovi = fs.existsSync(fileNuovi) ? JSON.parse(fs.readFileSync(fileNuovi, 'utf8')) : [];
for (const p of modelliNuovi) if (p.repo && !totali.has(p.repo)) totali.set(p.repo, p.parametri);
const repos = [...totali.keys()];
for (const repo of repos) {
  if (out[repo] && !process.argv.includes('--rifai')) continue; // --rifai: ricalcola anche quelli già fatti
  const totale = totali.get(repo);
  try {
    let r = await fetch(`https://huggingface.co/${repo}/resolve/main/config.json`);
    // repository con licenza da accettare: la copia pubblica di Unsloth ha la stessa configurazione
    if (r.status === 401 || r.status === 403) r = await fetch(`https://huggingface.co/unsloth/${repo.split('/')[1]}/resolve/main/config.json`);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const a = analizza(await r.json(), totale, repo);
    if (!a) throw new Error('config senza dati di attenzione');
    out[repo] = a;
    nuovi++;
  } catch (e) { falliti.push(`${repo}: ${e.message}`); }
}
fs.writeFileSync(fileOut, JSON.stringify(out, null, 1));
console.log(`repository: ${repos.length}, con architettura: ${Object.keys(out).length}, nuovi: ${nuovi}`);
for (const [r, a] of Object.entries(out)) {
  const kv32k = (a.kvPerStrato * (a.pieni * 32768 + a.finestra * Math.min(32768, a.larghezzaFinestra || 32768))) / 1e9;
  console.log(`${r} | ${a.tipo} strati ${a.strati} pieni ${a.pieni} fin ${a.finestra} | KV 32k ${kv32k.toFixed(1)} GB | attivi ${(a.attivi / 1e9).toFixed(1)}B${a.moe ? ' MoE' : ''}`);
}
if (falliti.length) console.log('\nFALLITI:\n' + falliti.join('\n'));
