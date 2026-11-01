// Candidates are pinned SKILL.md installation units, not repositories or CLIs.
import fs from 'node:fs';
import path from 'node:path';
import { api, directory, scanRepository, growth, installFrom, licenseFrom, labelFrom, plain, read, write, text, slug, ROOT } from './fonti.mjs';
import { digest, validateCard, GENERIC, DISCLAIMER } from './verifica.mjs';
import { refreshPublished, assignCategory, load, readCards } from './archivio.mjs';
import { teachingCard, extractFacts } from './fatti.mjs';
import { textIssues } from './copione.mjs';

export function cardFrom(repo, entry, result, date, history) {
  const {scan,meta,commit}=result;
  if(!scan.passed||!scan.complete)throw Error('security gate');
  const skillPath=scan.skillPath,skillText=scan.texts[skillPath];
  const evidence={...result.evidence,...scan.texts};
  const local=Object.keys(scan.texts).find(p=>/^readme\.md$/i.test(path.posix.basename(p)));
  const readmePath=local||Object.keys(result.evidence||{}).find(p=>/^readme\.md$/i.test(p));
  const readme=evidence[readmePath];
  if(!readme)throw Error('README missing');
  const install=installFrom(readme,repo,entry.skillId);
  if(!install)throw Error('no exact installation command for this repository in README');
  const identity=/^name:\s*["']?([^\r\n"']+)/m.exec(skillText)?.[1]?.trim()||entry.skillId;
  const name=identity;
  const rawFront=/^description:\s*(.+)$/m.exec(skillText)?.[1]?.replace(/^["']|["']$/g,'');
  const front=/^[>|]/.test(rawFront||'')?/^description:[^\n]*\n((?:[ \t]+[^\n]*\n)+)/m.exec(skillText)?.[1]?.trim():rawFront;
  const content=skillText.replace(/^---[\s\S]*?---\s*/, '');
  const lines=content.replace(/\r/g,'').split('\n');
  const prose=lines.filter(l=>!/^\s*(?:#|```|\||>|!\[|<)/.test(l)).map(l=>plain(l.replace(/^[-*\d.]+\s*/,''))).filter(s=>s.length>=28&&s.length<=250&&!/https?:|npx |^belt |^curl |^npm |^Plugin installs:|^Before |^Never /i.test(s));
  const descr=(front?plain(front).split(/(?<=[.!?])\s/)[0].slice(0,260):prose.find(s=>!s.includes('`')))||prose[0];
  if(!descr)throw Error('no scoped skill description');
  const sections=[...content.matchAll(/^#{2,4}\s+([^\n]+)\n([\s\S]*?)(?=^#{1,4}\s|$(?![\s\S]))/gm)];
  const features=[];
  const featureSources=new Set();
  for(const section of sections) {
    const label=labelFrom(plain(section[1]),56);
    if(/^(?:install|prerequisite)|reference|resource|license|security|contributing|troubleshoot|when to|overview|introduction|quick start/i.test(label))continue;
    const detail=section[2].split('\n').filter(l=>!/^\s*(?:#|```|\||>|!\[|<)/.test(l)).map(l=>plain(l.replace(/^[-*\d.]+\s*/,''))).find(s=>s.length>=28&&s.length<=230&&!/https?:|^npx |^curl |^belt /.test(s));
    if(detail&&detail!==descr)features.push({label,detail,...(/```[^\n]*\n([\s\S]*?)```/.exec(section[2])?{example:/```[^\n]*\n([\s\S]*?)```/.exec(section[2])[1].trim()}: {})});
    if(features.length===3)break;
  }
  for(const detail of [...new Set(prose)]) {
    if(features.length>=3)break;
    if(detail!==descr&&!features.some(f=>f.detail===detail))features.push({label:labelFrom(detail,52),detail});
  }
  // The registry's install/search/wire contract is explicit. Keep these useful
  // operations instead of turning plugin prerequisites into feature slides.
  if(identity==='hyperframes-registry') {
    const bullet=label=>lines.find(l=>new RegExp(`^- \\*\\*${label}\\*\\*:`).test(l));
    const block=bullet('Block'),component=bullet('Component');
    const search=lines.find(l=>l.startsWith('- Search is local'));
    const commands=/```bash\n([\s\S]*?)```/.exec(content)?.[1]?.trim().split('\n');
    const ref=Object.keys(scan.texts).find(p=>p.endsWith('/references/wiring-components.md'));
    const refExample=ref&&/```html\n([\s\S]*?)```/.exec(scan.texts[ref])?.[1]?.trim();
    if(block&&component&&search&&commands?.length>=2&&refExample) {
      const fact=s=>plain(s.replace(/^- /,'')).split(/(?<=[.!?])\s/).slice(0,2).join(' ');
      features.splice(0,3,{label:'Search',detail:fact(search),example:commands[0]},
        {label:'Block',detail:fact(block),example:commands[1]},
        {label:'Component',detail:fact(component),example:refExample});
      featureSources.add(ref);
    }
  }
  if(features.length!==3) {
    const scoped=Object.entries(scan.texts).filter(([p])=>/\.(?:md|mdx)$/i.test(p)).map(([p,testo])=>({testo,url:`https://github.com/${repo}/blob/${commit.sha}/${p}`,tipo:p===skillPath?'SKILL.md':'Skill reference'}));
    features.splice(0,features.length,...extractFacts({fonti:scoped},t=>!textIssues(t,{voice:true}).length).slice(0,3).map(({label,detail,quote,url})=>({label,detail,evidence:{quote,url}})));
  }
  if(features.length!==3)throw Error('not enough scoped skill facts');
  const blocks=[...content.matchAll(/```[^\n]*\n([\s\S]*?)```/g)].map(m=>m[1].trim()).filter(t=>t&&t.length<=1100&&!/^(?:curl|wget).*\|/s.test(t)&&!t.includes('npx skills add'));
  const example=blocks.find(s=>s.length<=600)||blocks[0];
  if(!example)throw Error('no actual usage code block in skill or README');
  const exampleLine=skillText.slice(0,skillText.indexOf(example)).split('\n').length;
  const fonti=Object.entries(evidence).filter(([p])=>p===readmePath||p===skillPath||p.startsWith(scan.scope+'/')&&/\.(?:md|mdx)$/i.test(p)||featureSources.has(p)||scan.warnings.some(w=>w.file===p)).map(([p,t])=>({url:`https://github.com/${repo}/blob/${commit.sha}/${p}`,testo:t,sha256:digest(t),tipo:p===readmePath?'README':p===skillPath?'SKILL.md':'Skill reference'}));
  const corpus=plain(skillText);
  const task=['browser automation','blocks and components','video editing','find skills','mobile app screens','AI images','videos','images','skills'].find(t=>corpus.toLowerCase().includes(t.toLowerCase()))||name;
  const problem=`Need ${task}?`;
  const hosts=['Claude Code','Codex','Gemini CLI','Cursor','Windsurf','OpenCode'].filter(h=>readme.includes(h)||skillText.includes(h));
  const warnings=scan.warnings.map(w=>`${w.reason}: ${w.file}:${w.line}`);
  const screenshots=[...readme.matchAll(/!\[[^\]]*\]\(([^) ]+)\)|<img\b[^>]*\bsrc="([^"]+)"/g)].map(m=>m[1]||m[2])
    .filter(p=>/\.(png|jpe?g|webp)$/i.test(p)&&!/^https?:/.test(p)&&!/(?:sponsor|badge|logo|wordmark|icon)/i.test(p))
    .map(p=>path.posix.normalize(path.posix.join(path.posix.dirname(readmePath),p)))
    .filter(p=>!p.startsWith('../')&&!p.startsWith('/')).slice(0,3)
    .map(p=>({url:`https://raw.githubusercontent.com/${repo}/${commit.sha}/${p}`,source:`https://github.com/${repo}/blob/${commit.sha}/${readmePath}`}));
  const ordered=lines.filter(l=>/^\d+\.\s/.test(l)).map(l=>plain(l.replace(/^\d+\.\s*/,''))).filter(s=>s.length>=12&&s.length<=150);
  const flow=ordered.length>=3?ordered.slice(0,3):identity==='hyperframes-registry'?['npx hyperframes catalog','npx hyperframes add','Wiring']:null;
  const card={tipo:'skill',slug:slug(`${repo}-${identity}`),key:`agent skill ${repo} ${identity}`,name,repository:repo,commit:commit.sha,skillPath,installSelection:`In the installer, select only ${name}. This review covers ${scan.scope}.`,
    titolo:`${name}: Agent Skill`,date,descr,problem,problemEvidence:task,audience:hosts,install,example,exampleSource:{file:skillPath,line:exampleLine},features,
    limits:[...warnings.slice(0,3),GENERIC[1],DISCLAIMER],screenshots,fonti,
    claims:[descr,install,example,...features.flatMap(f=>[f.label,f.detail])],...(flow?{flow}:{}),
    topics:meta.topics||[],metrics:{date,stars:meta.stargazers_count,growth7d:growth(history,repo,meta.stargazers_count,date),installs:entry.totalInstalls??null,installs24h:entry.trendingInstalls??null,license:licenseFrom(readme,meta.license?.spdx_id),lastCommit:commit.commit.committer.date},
    security:{passed:true,complete:true,date,commit:commit.sha,scope:scan.scope,skillPath,files:scan.files,checked:scan.checked,errors:[],warnings:scan.warnings,status:scan.status,version:scan.version,policySha256:scan.policySha256,manifest:scan.manifest}};
  const taught=teachingCard(card,t=>!textIssues(t,{voice:true}).length);
  const errors=validateCard(taught);if(errors.length)throw Error(errors.join('; '));
  return taught;
}

export async function collect({maxRepos=24,date=new Date().toISOString().slice(0,10)}={}) {
  const warnings=[],rejected=[],audit=[];
  const all=directory(await text('https://skills.sh/')),trending=directory(await text('https://skills.sh/trending'));
  const top=trending.slice(0,20);
  const historyDir=path.join(ROOT,'dati/skill-storico');
  const history=fs.existsSync(historyDir)?fs.readdirSync(historyDir).filter(f=>f.endsWith('.json')).map(f=>read(`dati/skill-storico/${f}`)):[];
  const old=read('dati/skill.json',{skills:[]}).skills;
  let github=[];
  for(const topic of ['agent-skills','claude-skills']) {
    try{github.push(...(await api(`search/repositories?q=${encodeURIComponent(`topic:${topic} archived:false`)}&sort=stars&per_page=10`)).items.map(r=>({source:r.full_name})));}
    catch(e){warnings.push(e.message);}
  }
  const repos=[...new Set([...top.map(x=>x.source),...trending.slice(20,32).map(x=>x.source),...github.map(x=>x.source)])].slice(0,maxRepos);
  const cards=[],stars={},observed=new Map();
  for(const repo of repos) {
    const choices=trending.filter(x=>x.source===repo);
    try {
      if(!/^[\w.-]+\/[\w.-]+$/.test(repo))throw Error('directory entry is not a GitHub skill repository');
      const result=await scanRepository(repo,choices.map(c=>c.skillId));
      observed.set(repo,result);
      if(result.meta.archived)throw Error('repository is archived');
      if(!result.scan.complete)throw Error(result.scan.errors?.map(e=>e.reason).join('; ')||'incomplete scan');
      stars[repo]=result.meta.stargazers_count;
      const units=result.scan.units;
      for(const entry of choices.length?choices:units.map(u=>({source:repo,skillId:path.posix.basename(u.scope)}))) {
        const unit=units.find(u=>path.posix.basename(u.scope).toLowerCase()===entry.skillId.toLowerCase()||u.scope==='.');
        const row={rank:trending.indexOf(entry)+1,repository:repo,skill:entry.skillId,date,commit:result.commit.sha,skillPath:unit?.skillPath,status:unit?.status||'blocked',reasons:unit?[...unit.errors,...unit.warnings]:[{file:'SKILL.md',line:1,reason:'no matching installable SKILL.md unit'}]};
        if(top.some(x=>x.source===repo&&x.skillId===entry.skillId))audit.push(row);
        if(!unit?.passed){rejected.push({...row,reasons:unit?.errors||row.reasons});continue;}
        const a=all.find(x=>x.source===repo&&x.skillId===entry.skillId);
        try{cards.push(cardFrom(repo,{...entry,totalInstalls:a?.installs,trendingInstalls:entry.installs},{...result,scan:{...unit,policySha256:result.scan.policySha256},evidence:result.scan.evidence},date,history));row.publishable=true;}
        catch(e){row.publishable=false;row.contentReason=e.message;rejected.push({...row,reasons:[{file:unit.skillPath,line:1,reason:e.message}]});}
      }
    } catch(e) {
      for(const entry of choices.length?choices:[{skillId:null}]) {
        const row={rank:trending.indexOf(entry)+1,repository:repo,skill:entry.skillId,date,status:'blocked',reasons:[{file:null,line:null,reason:`incomplete review: ${e.message}`}]};
        rejected.push(row);if(top.some(x=>x.source===repo&&x.skillId===entry.skillId))audit.push(row);
      }
    }
  }
  cards.sort(rank);audit.sort((a,b)=>a.rank-b.rank);
  const report={date,source:'https://skills.sh/trending',observedAt:new Date().toISOString(),entries:audit,counts:Object.fromEntries(['passed','warning','blocked'].map(s=>[s,audit.filter(x=>x.status===s).length]))};
  if(audit.length!==20)throw Error(`top20 audit incomplete: ${audit.length}`);
  write('dati/skill-audit-top20.json',report);
  write('dati/skill-scartate.json',{aggiornato:date,scartate:rejected});
  write(`dati/skill-storico/${date}.json`,{date,stars:{...(history.find(x=>x.date===date)?.stars||{}),...stars},directory:{allTime:all,trending24h:trending}});
  const data={aggiornato:date,metodologia:'Pinned SKILL.md units; seven-day star growth when observed, then measured skills.sh 24-hour installs, total installs and stars.',warnings,skills:cards,audit:report,weekly:{date,complete:new Date(`${date}T12:00:00Z`).getUTCDay()===0,slugs:cards.slice(0,10).map(c=>c.slug)}};
  const categories=load(ROOT,'dati/skill-categorie.json'),published=readCards(ROOT);
  for(const c of cards)c.category=old.find(s=>s.repository===c.repository&&s.skillPath===c.skillPath)?.category||published.find(s=>s.repository===c.repository&&s.skillPath===c.skillPath)?.category||assignCategory(c,categories);
  warnings.push(...await refreshPublished({root:ROOT,date,catalogue:data,observed}));
  data.weekly.slugs=data.skills.slice(0,10).map(c=>c.slug);
  write('dati/skill.json',data);
  console.log(`Skills: ${cards.length} publishable units; top20 ${JSON.stringify(report.counts)}`);
  return data;
}

export function rank(a,b) {
  const ga = a.metrics.growth7d?.value, gb = b.metrics.growth7d?.value;
  if (ga != null || gb != null) return (gb ?? -Infinity) - (ga ?? -Infinity) || (b.metrics.stars - a.metrics.stars);
  return (b.metrics.installs24h ?? -1) - (a.metrics.installs24h ?? -1) || (b.metrics.installs ?? -1) - (a.metrics.installs ?? -1) || b.metrics.stars - a.metrics.stars;
}
