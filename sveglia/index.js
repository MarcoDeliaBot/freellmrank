// Sveglia dell'aggiornamento notturno (Cloudflare Worker con cron, piano gratuito).
// GitHub a volte fa partire l'aggiornamento programmato con ore di ritardo o lo salta.
// Due volte al giorno questo Worker guarda l'ultima corsa: se è più vecchia di 10 ore la fa partire.
// Segreto necessario: GITHUB_TOKEN (fine-grained, solo il repository freellmrank, permesso "Actions: Read and write").
const REPO = 'MarcoDeliaBot/freellmrank';
const WORKFLOW = 'aggiorna-dati.yml';
const ORE = 10;

async function gh(env, percorso, opzioni = {}) {
  return fetch(`https://api.github.com/repos/${REPO}${percorso}`, {
    ...opzioni,
    headers: { Authorization: `Bearer ${env.GITHUB_TOKEN}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'freellmarena-sveglia', ...(opzioni.headers || {}) },
  });
}

async function controlla(env) {
  if (!env.GITHUB_TOKEN) return { stato: 'manca GITHUB_TOKEN' };
  const r = await gh(env, `/actions/workflows/${WORKFLOW}/runs?per_page=1`);
  if (!r.ok) return { stato: `GitHub risponde ${r.status}` };
  const ultima = (await r.json()).workflow_runs?.[0];
  const ore = ultima ? (Date.now() - Date.parse(ultima.created_at)) / 3.6e6 : Infinity;
  if (ultima && (ultima.status !== 'completed' || ore < ORE)) return { stato: 'niente da fare', ultima: ultima.created_at, ore: Math.round(ore * 10) / 10 };
  const d = await gh(env, `/actions/workflows/${WORKFLOW}/dispatches`, { method: 'POST', body: JSON.stringify({ ref: 'main' }) });
  return { stato: d.status === 204 ? 'aggiornamento avviato' : `avvio fallito (${d.status})`, ultima: ultima?.created_at || null };
}

export default {
  async scheduled(evento, env, ctx) { ctx.waitUntil(controlla(env).then((x) => console.log(JSON.stringify(x)))); },
  // GET: mostra solo lo stato dell'ultima corsa, senza avviare niente (per controllare che il token funzioni)
  async fetch(request, env) {
    if (!env.GITHUB_TOKEN) return Response.json({ stato: 'manca GITHUB_TOKEN' });
    const r = await gh(env, `/actions/workflows/${WORKFLOW}/runs?per_page=1`);
    if (!r.ok) return Response.json({ stato: `GitHub risponde ${r.status}: token sbagliato o senza permesso Actions` });
    const u = (await r.json()).workflow_runs?.[0];
    return Response.json({ stato: 'token ok', ultima_corsa: u?.created_at, esito: u?.conclusion, evento: u?.event });
  },
};
