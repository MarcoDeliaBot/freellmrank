// Source-backed cards and synthetic observations exclusively for archive tests.
// The mock video approval is intentionally confined to a temporary fixture root.
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './fonti.mjs';
import { load,save } from './archivio.mjs';
import { digest, GENERIC } from './verifica.mjs';
import { skillTutorial } from './tutorial.mjs';
export function createFixture(root,{days=14}={}) {
  if(path.resolve(root)===path.resolve(ROOT))throw Error('Fixtures cannot be written into the project data');
  const catalogue=structuredClone(load(ROOT,'dati/skill.json'));
  const {category,archiveMetrics,videoVerified,...browser}=structuredClone(catalogue.skills.find(s=>s.name==='agent-browser'));
  const cards=[{...browser,videoVerified:{cardHash:digest(JSON.stringify(browser)),testOnly:true}}];
  for(const name of ['code-simplification','api-and-interface-design','performance-optimization','video-planning']) {
    const repository=name==='video-planning'?'fixture/media':'fixture/coding';
    const descr='This skill helps an assistant review project changes.';
    const facts=['Read the request carefully.','Check the proposed changes.','Report the review findings.'];
    const raw=[name,descr,'review a proposed change',`npx skills add ${repository}`,'Review the project.',...facts,'Review each finding against the original request before you share the finished review.'].join('\n');
    const c={tipo:'skill',slug:`fixture-${name}`,key:`agent skill ${repository} ${name}`,name,repository,skillPath:`skills/${name}/SKILL.md`,date:'2026-10-31',commit:'a'.repeat(40),titolo:`${name}: Agent Skill`,descr,problem:'review a proposed change',install:`npx skills add ${repository}`,example:'Review the project.',claims:[descr],limits:[GENERIC[1]],features:facts.map(detail=>({label:detail,detail})),fonti:[{url:`https://github.com/${repository}/blob/${'a'.repeat(40)}/README.md`,testo:raw,sha256:digest(raw),tipo:'Synthetic test source'}],metrics:{date:'2026-10-31',stars:1000,license:'MIT',lastCommit:'2026-10-31T00:00:00Z'},security:{passed:true,complete:true,date:'2026-10-31',commit:'a'.repeat(40),scope:`skills/${name}`,files:2,checked:['all-files','installation-scope'],errors:[],warnings:[]}};
    cards.push({...c,videoVerified:{cardHash:digest(JSON.stringify(c)),testOnly:true},category:name==='video-planning'?'video-media':'coding'});
  }
  const tutorial=skillTutorial(browser,browser.date);
  tutorial.videoVerified={cardHash:digest(JSON.stringify(tutorial)),testOnly:true};
  cards.push(tutorial);
  for(const c of cards)save(root,`contenuti/${c.tipo==='skill'?'skills':'tutorials'}/${c.slug}.json`,c);
  const links=Object.fromEntries(cards.map(c=>[`${c.tipo}-${c.slug}`,{lungo:`fixture-${c.tipo}-${c.slug}`,breve:`fixture-short-${c.slug}`} ]));
  save(root,'contenuti/legami-video.json',links);
  save(root,'dati/skill-categorie.json',load(ROOT,'dati/skill-categorie.json'));
  save(root,'dati/skill.json',catalogue);
  for(const f of fs.readdirSync(path.join(ROOT,'dati/skill-storico')))if(f.endsWith('.json'))save(root,`dati/skill-storico/${f}`,load(ROOT,`dati/skill-storico/${f}`));
  const history=[];
  for(let i=1;i<=days;i++) {
    const date=`2026-11-${String(i).padStart(2,'0')}`;
    const entries=cards.filter(c=>c.tipo==='skill').map(c=>({source:c.repository,skillId:c.name,name:c.name,installs:100+i}));
    if(i%2===0)entries.reverse();
    const day={date,stars:Object.fromEntries(cards.map((c,n)=>[c.repository,1000+n*100+i*10])),directory:{trending24h:entries,allTime:entries}};
    save(root,`dati/skill-storico/${date}.json`,day);history.push(day);
  }
  catalogue.aggiornato='2026-11-14';
  catalogue.skills=[...catalogue.skills.filter(s=>!cards.some(c=>c.name===s.name)),...cards.filter(c=>c.tipo==='skill').map(({videoVerified,category,...c})=>c)];
  save(root,'dati/skill.json',catalogue);
  return {root,cards,history,catalogue};
}
