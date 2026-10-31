// Daily Agent Skills + tutorials. Shares the site's build, video engine and links.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { collect } from './skill/raccogli.mjs';
import { tutorials, existingTopics } from './skill/tutorial.mjs';
import { render } from './skill/video.mjs';
import { explain } from './skill/spiega.mjs';
import { read, write, ROOT } from './skill/fonti.mjs';
import { digest, topicExists } from './skill/verifica.mjs';
import { plan } from './skill/video.mjs';

function run(command,args) {
  const r=spawnSync(command,args,{cwd:ROOT,encoding:'utf8',timeout:300000,maxBuffer:8e6});
  if(r.status!==0)throw Error(`${command}: ${(r.stderr||r.stdout||r.error?.message||'').slice(-2000)}`);
  return r.stdout;
}
const args=process.argv.slice(2);
const prova=args.includes('--prova') || process.env.PROVA==='true' || process.env.GITHUB_REF!=='refs/heads/main';
const offline=args.includes('--offline'); // reuse a dated, reviewed local catalogue for tests
if(prova&&process.env.SCRIVI_URL&&!/^https:\/\/[a-z0-9-]+\.freellmrank\.pages\.dev$/.test(process.env.SCRIVI_URL))throw Error('Trial Workers endpoint must be this project\'s Cloudflare Pages preview');
const count=prova?1:Math.max(1,Math.min(2,Number(process.env.MAX_SKILL || 2)));
const folder=path.join(ROOT,'video/skill-tutorial');
fs.mkdirSync(folder,{recursive:true});
if(args.includes('--pubblica')) {
  if(prova)throw Error('Publication is disabled in trial mode and on feature branches');
  const delivery=read('video/skill-tutorial/esito.json');
  if(!delivery?.finished||delivery.errors?.length||delivery.prova)throw Error('No complete production delivery');
  for(const result of delivery.completed) for(const video of result.evidence.evidence) {
    for(const file of video.files) if(digest(fs.readFileSync(file))!==video.hashes[path.basename(file)])throw Error(`Artifact changed after verification: ${file}`);
    const previous=spawnSync('gh',['release','view',video.release,'--json','assets'],{encoding:'utf8'});
    if(previous.status===0) {
      const assets=JSON.parse(previous.stdout).assets.map(a=>a.name);
      if(!video.files.every(f=>assets.includes(path.basename(f))))throw Error(`Existing release incomplete: ${video.release}; no overwrite`);
      const checkDir=fs.mkdtempSync(path.join(ROOT,'.ai/release-check-'));
      const jsonName=`${video.nome}.json`;
      run('gh',['release','download',video.release,'--pattern',jsonName,'--dir',checkDir]);
      const old=JSON.parse(fs.readFileSync(path.join(checkDir,jsonName),'utf8'));
      if(old.sourceHash!==result.evidence.cardHash)throw Error(`Existing release belongs to a different reviewed card: ${video.release}; no overwrite`);
      continue;
    }
    const info=JSON.parse(fs.readFileSync(video.files.find(f=>f.endsWith('.json')),'utf8'));
    run('gh',['release','create',video.release,...video.files,'--target',process.env.GITHUB_SHA || run('git',['rev-parse','HEAD']).trim(),'--title',info.titolo,'--notes',`Full story: https://freellmarena.com/${result.tipo==='skill'?'skills':'tutorials'}/${result.slug}`,'--latest=false']);
  }
  console.log(`Published ${delivery.completed.length*2} verified releases`);
  process.exit(0);
}
const summary={prova:!!prova,started:new Date().toISOString(),completed:[],errors:[]};
try {
  const catalogue=offline?read('dati/skill.json'):await collect();
  if(!catalogue)throw Error('missing reviewed catalogue');
  const existing=existingTopics();
  const teaches=c=>{try{plan(c,false);plan(c,true);return true;}catch(error){console.log(`Teaching skipped ${c.name}: ${error.message.slice(0,200)}`);return false;}};
  const wanted=prova?process.env.PROVA_SKILL:null;
  const eligible=catalogue.skills.filter(c=>!topicExists(c,existing)&&(!wanted||c.name===wanted));
  const skillCards=eligible.filter(teaches).slice(0,count);
  if(wanted&&!catalogue.audit.entries.some(e=>e.skill===wanted&&['passed','warning'].includes(e.status)))throw Error('Requested trial skill is not eligible in the measured top20');
  const requestedTutorial=prova?process.env.PROVA_TUTORIAL:null;
  const tutorialCards=(await tutorials(catalogue.skills,catalogue.aggiornato,[...existing,...skillCards])).filter(c=>(!requestedTutorial||c.name===requestedTutorial)&&teaches(c)).slice(0,1);
  if(prova&&(skillCards.length!==1||tutorialCards.length!==1))throw Error('Trial requires one eligible skill and one eligible tutorial');
  // No content is published until BOTH formats of EVERY selected card pass.
  const staged=[];
  for(const candidate of [...skillCards,...tutorialCards]) {
    const card=await explain(candidate,undefined,{trial:prova});
    const result=await render(card,path.join(folder,`${card.tipo}-${card.slug}`));
    if(result.cardHash!==digest(JSON.stringify(card))||result.evidence.length!==2||result.evidence.some(e=>!e.qa.passed))throw Error('incomplete video evidence');
    staged.push({...card,videoVerified:{date:new Date().toISOString(),cardHash:result.cardHash,formats:result.evidence.map(e=>({release:e.release,seconds:e.seconds,frames:e.qa.frames}))}});
    summary.completed.push({tipo:card.tipo,slug:card.slug,writing:card.writing,evidence:result});
    write('video/skill-tutorial/esito.json',summary);
  }
  // Trial pages are written only in the disposable runner checkout, then uploaded.
  // Production pages use the same legami-video/youtube mechanism as news.
  for(const card of staged) {
    write(`contenuti/${card.tipo==='skill'?'skills':'tutorials'}/${card.slug}.json`,card);
    run(process.execPath,['script/brag/lega.mjs',`${card.tipo}-${card.slug}`,`${card.tipo}-${card.slug}`,`breve-${card.tipo}-${card.slug}`]);
  }
  // Re-check previously published skills every day too. A failed or incomplete
  // current review removes the page from the next build, without erasing history.
  if(!offline) for(const dir of ['skills','tutorials']) {
    const base=path.join(ROOT,'contenuti',dir);
    if(!fs.existsSync(base))continue;
    for(const f of fs.readdirSync(base).filter(f=>f.endsWith('.json'))) {
      const c=JSON.parse(fs.readFileSync(path.join(base,f),'utf8'));
      if((c.tipo==='skill'||c.skillSource)&&!catalogue.skills.some(s=>s.repository===c.repository&&s.skillPath===c.skillPath&&s.security.passed))write(`contenuti/${dir}/${f}`,{...c,revoked:true,revokedOn:catalogue.aggiornato});
    }
  }
  summary.finished=new Date().toISOString();
  write('video/skill-tutorial/esito.json',summary);
  console.log(`${prova?'Trial':'Production'}: ${staged.length} pages, ${summary.completed.length*2} videos, all publication gates passed.`);
} catch(error) {
  summary.errors.push(error.stack || error.message);write('video/skill-tutorial/esito.json',summary);
  console.error(`::error::Skill/tutorial publication stopped: ${error.message}`);process.exitCode=1;
}
