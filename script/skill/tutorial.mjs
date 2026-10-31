import fs from 'node:fs';
import path from 'node:path';
import { api, text, read, plain, slug, ROOT } from './fonti.mjs';
import { digest, GENERIC, topicExists, validateCard } from './verifica.mjs';
import { rank } from './raccogli.mjs';

export function existingTopics() {
  const out = [];
  for (const dir of ['contenuti/skills', 'contenuti/tutorials', 'contenuti/notizie', 'contenuti/video']) {
    const p = path.join(ROOT, dir);
    if (fs.existsSync(p)) for (const f of fs.readdirSync(p).filter(x => x.endsWith('.json'))) out.push(JSON.parse(fs.readFileSync(path.join(p,f), 'utf8')));
  }
  const p = path.join(ROOT, 'contenuti/blog');
  if (fs.existsSync(p)) for (const f of fs.readdirSync(p).filter(x => x.endsWith('.md'))) {
    const s = fs.readFileSync(path.join(p,f), 'utf8');
    out.push({ slug: f.slice(0,-3), titolo: /^titolo:\s*(.+)$/m.exec(s)?.[1] });
  }
  return out;
}

function source(url, testo) { return { url, testo, sha256: digest(testo), tipo: 'Official documentation' }; }
export function conflictsRecent(card,existing,date) {
  const cutoff=Date.parse(date)-7*864e5;
  return existing.filter(c=>c.tipo==='skill'&&Date.parse(c.date)>=cutoff&&Date.parse(c.date)<=Date.parse(date)).some(s=>
    card.repository===s.repository||card.skillSource===s.slug||card.name.toLowerCase()===s.name.toLowerCase());
}
export function skillTutorial(skill, date) {
  return { ...skill, tipo: 'tutorial', skillSource: skill.slug, slug: `install-and-use-${skill.slug}`, key: `how to install and use ${skill.repository} ${skill.name}`,
    titolo: `How to install and use ${skill.name}`, date,
    steps: [
      { title: 'Read the source', text: GENERIC[4] },
      { title: 'Install the skill', text: GENERIC[0], command: skill.install },
      { title: 'Try the documented example', text: GENERIC[5], command: skill.example },
      { title: 'Review the result', text: GENERIC[7] },
    ], selection: { reason: 'Measured skill popularity', metrics: skill.metrics } };
}

function documentedTutorial({ name, command, url, raw, date, steps, features, descr, score, key, hardware, officialInstaller=false, problemEvidence=name }) {
  const sourceURL=new URL(url);
  const githubSource=['github.com','raw.githubusercontent.com'].includes(sourceURL.hostname);
  const repository=githubSource?sourceURL.pathname.slice(1).split('/').slice(0,2).join('/'):sourceURL.hostname;
  const card = { tipo: 'tutorial', name, repository,
    slug: slug(key || `how to use ${name} locally`), key: key || `how to use ${name} locally`, titolo: key || `How to use ${name} locally`, date,
    descr, install: command, example: steps.find(s => s.command && s.command !== command)?.command || command,
    problem: `Need ${problemEvidence}?`, problemEvidence, audience: [], features, steps,officialInstaller,
    limits: [...(officialInstaller?['Warning: the official installer downloads and executes a script. Review it before running.']:[]),GENERIC[6]], screenshots: [], fonti: [source(url,raw)], claims: [descr, command, ...features.flatMap(f => [f.label, f.detail])],
    selection: { reason: 'Measured model novelty and downloads, then official tool popularity', score }, hardware };
  const errors = validateCard(card);
  if (errors.length) throw Error(errors.join('; '));
  return card;
}

export async function tutorials(skills, date, existing = existingTopics()) {
  const candidates = [];
  // New/free models are considered using the site's measured data. Publish only
  // when their own model card provides an exact local command; never invent tags.
  const models = [...read('dati/nuovi.json', []), ...read('dati/piccoli.json', [])].filter(m => !m.gated && m.repo && m.cat?.includes('chat')).sort((a,b) => (b.creato || '').localeCompare(a.creato || '') || (b.download || 0) - (a.download || 0));
  for (const m of [...new Map(models.map(m => [m.repo,m])).values()].slice(0,8)) {
    const key = `How to run ${m.nome} locally for free`;
    if (topicExists({ key, titolo: key, slug: slug(key) }, existing)) continue;
    try {
      const url = `https://huggingface.co/${m.repo}/raw/main/README.md`, raw = await text(url);
      const commands = [...raw.matchAll(/(?:^|\n)\s*((?:ollama run|llama-cli\s+-hf)[^\n`]+)/g)].map(x => x[1].trim()).filter(c => !/[<>|;&]|:cloud|--cloud/i.test(c));
      if (!commands.length) continue;
      const descr = plain(raw.split('\n').find(l => l.length >= 50 && l.length < 180 && !/^[#<|!]/.test(l)) || '');
      const featureLines = raw.split('\n').filter(l => /^[-*]\s/.test(l)).map(l => plain(l.replace(/^[-*]\s*/, ''))).filter(l => l.length > 20 && l.length < 150).slice(0,3);
      if (!descr || featureLines.length !== 3) continue;
      const hardware = { source: 'dati/nuovi.json + dati/piccoli.json + dati/schede.json', date: read('sito/data.json').aggiornato, parameters: m.parametri || null, note: 'Use the Run at home simulator for the selected quantization and context. Parameter count alone is not a measured RAM requirement.' };
      candidates.push(documentedTutorial({ name:m.nome, key, command:commands[0], url, raw, date, descr, score:1e12 + Date.parse(m.creato || date) / 1e5 + (m.download || 0), hardware,
        features:featureLines.map(s=>({label:s.split(' ').slice(0,6).join(' '),detail:s})),
        steps:[{title:'Prepare your machine',text:GENERIC[2]},...commands.slice(0,3).map(command=>({title:'Run the documented command',text:GENERIC[9],command})),{title:'Review the output',text:GENERIC[7]}] }));
    } catch (e) { console.log(`Tutorial model skipped ${m.repo}: ${e.message.slice(0,160)}`); }
  }
  // A topic published as a skill in the last seven days (including today's
  // staged card) cannot return as a tutorial under a different title.
  for (const skill of [...skills].sort(rank)) {
    const c = skillTutorial(skill,date);
    if (!topicExists(c,existing)&&!conflictsRecent(c,existing,date)) candidates.push(c);
  }
  // Evergreen fallbacks use exact commands from official maintained documentation.
  for (const spec of [
    { repo:'ollama/ollama', name:'Ollama', pattern:/^ollama (?:run|pull|list|show|stop|rm)[^\n`]+/gm },
    { repo:'lmstudio-ai/lms', name:'LM Studio', pattern:/^lms (?:get|load|chat|ls|server start)[^\n`]*/gm },
    { repo:'ggml-org/llama.cpp', name:'llama.cpp', pattern:/^(?:llama-cli|llama-server)\s[^\n`]+/gm },
    { repo:'vercel-labs/skills', name:'Agent Skills in Claude Code', pattern:/^npx skills add [^\n`]+(?:-a|--agent) claude-code[^\n`]*/gm },
    { repo:'vercel-labs/skills', name:'Agent Skills in Codex', pattern:/^npx skills add [^\n`]+(?:-a|--agent) codex[^\n`]*/gm },
    { repo:'vercel-labs/skills', name:'Agent Skills in Gemini CLI', pattern:/^npx skills add [^\n`]+(?:-a|--agent) gemini-cli[^\n`]*/gm },
  ]) {
    const key = `How to use ${spec.name} locally`;
    if (topicExists({key,titolo:key,slug:slug(key)},existing)) continue;
    try {
      const meta = await api(`repos/${spec.repo}`), commit = await api(`repos/${spec.repo}/commits/${meta.default_branch}`);
      const url = `https://raw.githubusercontent.com/${spec.repo}/${commit.sha}/README.md`, raw = await text(url);
      if(spec.repo==='ollama/ollama') {
        const cliURL=`https://raw.githubusercontent.com/${spec.repo}/${commit.sha}/docs/cli.mdx`;
        const cli=await text(cliURL);
        const section=heading=>new RegExp(`^#{2,3} ${heading}\\n([\\s\\S]*?)(?=^#{1,3} |$(?![\\s\\S]))`,'m').exec(raw)?.[1]||'';
        const features=['Chat with a model','Coding','REST API'].map(label=>{
          const body=section(label),example=/```[^\n]*\n([\s\S]*?)```/.exec(body)?.[1]?.trim();
          const excerpt=body.split('\n').map(plain).find(s=>s.length>20&&!s.startsWith('```'));
          const detail=excerpt?.replace(/:\s*$/,'.');
          return {label,detail,example};
        });
        const installer='curl -fsSL https://ollama.com/install.sh | sh';
        if(!raw.includes(installer)||features.some(f=>!f.detail||!f.example))throw Error('official Ollama walkthrough facts incomplete');
        // Both documents are pinned to the same commit, including download/list.
        const card=documentedTutorial({name:spec.name,command:installer,url,raw:raw+'\n'+cli,date,key,descr:'Start building with open models.',features:features.map((f,i)=>({...f,detail:['Run and chat with Gemma 4.','Launch a supported integration.','Ollama has a REST API for running and managing models.'][i]})),score:2e12+meta.stargazers_count,officialInstaller:true,problemEvidence:'open models',
          steps:[]});
        card.fonti=[source(url,raw),source(cliURL,cli)];
        card.commit=commit.sha;
        candidates.push(card);
        continue;
      }
      const commands = [...raw.matchAll(spec.pattern)].map(m=>m[0].trim()).filter(c=> !/[<>|;&]|\.\.\.|\$\(/.test(c));
      if (!commands.length) continue;
      const paragraphs = raw.split('\n').map(l=>plain(l.replace(/^[-*#]+\s*/,''))).filter(s=>s.length>30 && s.length<180 && !/^\||https?:|!|\[|<|npx|curl|irm/.test(s));
      if (paragraphs.length<4) continue;
      const features = paragraphs.slice(1,4).map(detail=>({ label:detail.split(' ').slice(0,6).join(' '),detail }));
      candidates.push(documentedTutorial({name:spec.name, command:commands[0], url, raw, date, key, descr:paragraphs[0], features, score:2e12+meta.stargazers_count,
        steps:[{title:'Install the official tool',text:GENERIC[2]},...commands.slice(0,3).map(command=>({title:'Use the documented command',text:GENERIC[9],command})),{title:'Check the result',text:GENERIC[7]}] }));
    } catch (e) { console.log(`Evergreen skipped ${spec.name}: ${e.message.slice(0,160)}`); }
  }
  return candidates.sort((a,b)=>(b.selection?.score ?? (b.skillSource?1e9:0))-(a.selection?.score ?? (a.skillSource?1e9:0))).filter(c=> !topicExists(c,existing)&&!conflictsRecent(c,existing,date));
}
