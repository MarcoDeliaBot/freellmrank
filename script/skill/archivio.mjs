// Publication identity is permanent. Catalogue membership is only an observation.
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, api, scanRepository, growth } from './fonti.mjs';

export const archiveRoot = () => path.resolve(process.env.SKILL_ARCHIVE_ROOT || ROOT);
export const pageURL = c => `/${c.tipo === 'skill' ? 'skills' : 'tutorials'}/${c.slug}.html`;
export const categoryURL = slug => `/skills/for-${slug}.html`;
export const monthURL = month => `/skills/best-agent-skills-${month}.html`;
export const load = (root, file, fallback=null) => fs.existsSync(path.join(root,file)) ? JSON.parse(fs.readFileSync(path.join(root,file),'utf8')) : fallback;
export function save(root,file,value) {
  const dest=path.join(root,file), data=JSON.stringify(value,null,1)+'\n';
  fs.mkdirSync(path.dirname(dest),{recursive:true});
  if(!fs.existsSync(dest)||fs.readFileSync(dest,'utf8')!==data)fs.writeFileSync(dest,data);
}
export function readCards(root) {
  return ['skills','tutorials'].flatMap(dir=>{
    const base=path.join(root,'contenuti',dir);
    return fs.existsSync(base)?fs.readdirSync(base).filter(f=>f.endsWith('.json')).sort().map(f=>load(root,`contenuti/${dir}/${f}`)):[];
  });
}
export function histories(root) {
  const base=path.join(root,'dati/skill-storico');
  return fs.existsSync(base)?fs.readdirSync(base).filter(f=>/^\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort().map(f=>load(root,`dati/skill-storico/${f}`)):[];
}
const normalized = value => String(value||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
export function assignCategory(c,categories) {
  if(c.category)return c.category; // Deliberately sticky, including 'other'.
  const name=` ${normalized(c.name)} `,description=` ${normalized(c.descr)} `,topics=` ${normalized((c.topics||[]).join(' '))} `;
  const scores=categories.map((cat,i)=>({slug:cat.slug,i,score:cat.paroleChiave.reduce((n,k)=>{
    const term=` ${normalized(k)} `;
    return n+(name.includes(term)?6:0)+(description.includes(term)?2:0)+(topics.includes(term)?3:0);
  },0)})).sort((a,b)=>b.score-a.score||a.i-b.i);
  return scores[0]?.score?scores[0].slug:'other';
}
const identity = c => normalized(c.name || path.posix.basename(path.posix.dirname(c.skillPath||'')));
export function dailyHistory(c,history) {
  return history.map(h=>{
    const row=(h.directory?.trending24h||[]).findIndex(e=>e.source.toLowerCase()===c.repository?.toLowerCase()&&normalized(e.skillId||e.name)===identity(c));
    return {date:h.date,stars:Number.isFinite(h.stars?.[c.repository])?h.stars[c.repository]:null,position:row<0?null:row+1};
  }).filter(h=>h.stars!==null||h.position!==null);
}
export function historySummary(c,history) {
  const days=dailyHistory(c,history),ranked=days.filter(d=>d.position!==null);
  return {days,firstSeen:ranked[0]?.date||null,lastSeen:ranked.at(-1)?.date||null,best:ranked.length?Math.min(...ranked.map(d=>d.position)):null,stars:days.filter(d=>d.stars!==null).at(-1)?.stars??c.archiveMetrics?.stars??c.metrics?.stars};
}
export function currentPosition(c,catalogue,history) {
  if(c.retirement||!catalogue.skills.some(s=>s.repository===c.repository&&s.skillPath===c.skillPath))return null;
  return dailyHistory(c,history).find(d=>d.date===catalogue.aggiornato)?.position??null;
}
export function withdraw(c,reason,date,evidence) {
  if(!['security','repository','license'].includes(reason))throw Error('Unverified withdrawal reason');
  return {...c,retirement:{reason,date,evidence},revoked:false};
}
// Only a complete review of the SAME installation unit can withdraw it.
export function reviewDecision(c,{meta,scan,date}) {
  if(meta?.archived)return withdraw(c,'repository',date,'Repository archived on GitHub');
  const unit=scan?.units?.find(u=>u.skillPath===c.skillPath);
  if(scan?.complete&&unit?.complete&&unit.passed===false&&unit.errors?.length)
    return withdraw(c,'security',date,unit.errors.map(e=>e.reason).join('; '));
  return c;
}
// Positive evidence of incompatible terms, never a missing/unknown license.
export function licenseDisallows(meta,licenseText='') {
  return meta?.license?.spdx_id==='NONE'||/\b(?:redistribution|republication|reproduction)\s+(?:is\s+)?(?:not permitted|prohibited)\b/i.test(licenseText);
}
export function metricsDue(c,date) {
  return new Date(`${date}T12:00:00Z`).getUTCDay()===1&&c.archiveMetrics?.date!==date;
}
export async function refreshPublished({root=ROOT,date,catalogue,observed=new Map(),getAPI=api,scanner=scanRepository}={}) {
  const warnings=[],cache=new Map(),licenseCache=new Map(),measurements={},history=histories(root),published=readCards(root);
  for(let c of published) {
    if(c.retirement)continue;
    const candidate=catalogue.skills.find(s=>s.repository===c.repository&&s.skillPath===c.skillPath);
    const ranked=dailyHistory(c,history).some(d=>d.date===date&&d.position!==null)?candidate:null;
    // Outside the ranking, refresh weekly; reuse any current scan for security.
    // Reuse the scan's metadata to avoid an extra request for current candidates.
    try {
      let result=observed.get(c.repository);
      if(!result&&!ranked&&!metricsDue(c,date))continue;
      if(!result) {
        if(!cache.has(c.repository))cache.set(c.repository,c.skillPath?await scanner(c.repository,published.filter(x=>x.repository===c.repository&&x.skillPath).map(x=>path.posix.basename(path.posix.dirname(x.skillPath)))):{meta:await getAPI(`repos/${c.repository}`)});
        result=cache.get(c.repository);
      }
      c=reviewDecision(c,{...result,date});
      // A fresh license endpoint provides the license text, not just a classifier.
      const previousLicense=c.licenseReview?.date;
      if(previousLicense!==date) {
        try {
          if(!licenseCache.has(c.repository))licenseCache.set(c.repository,await getAPI(`repos/${c.repository}/license`));
          const license=licenseCache.get(c.repository);
          const content=license.encoding==='base64'?Buffer.from(license.content||'','base64').toString('utf8'):'';
          if(licenseDisallows(result.meta,content))c=withdraw(c,'license',date,'Current repository license prohibits republication');
          c.licenseReview={date,spdx:license.license?.spdx_id||result.meta.license?.spdx_id||null};
        } catch(e) { warnings.push(`${c.slug}: license review unavailable; retained: ${e.message}`); }
      }
      if(ranked)c.archiveMetrics=ranked.metrics;
      else if(metricsDue(c,date))c.archiveMetrics={...c.archiveMetrics||c.metrics,date,stars:result.meta.stargazers_count,growth7d:growth(history,c.repository,result.meta.stargazers_count,date),license:result.meta.license?.spdx_id||c.metrics?.license,lastCommit:result.commit?.commit?.committer?.date||c.metrics?.lastCommit};
      if(c.archiveMetrics?.date===date&&Number.isFinite(c.archiveMetrics.stars))measurements[c.repository]=c.archiveMetrics.stars;
    } catch(e) {
      // GitHub 404 must be verified on the repository endpoint, not a missing file.
      try { const meta=await getAPI(`repos/${c.repository}`);if(meta.archived)c=withdraw(c,'repository',date,'Repository archived on GitHub');else warnings.push(`${c.slug}: incomplete review, retained: ${e.message}`); }
      catch(metaError) { if(/\b404\b/.test(metaError.message))c=withdraw(c,'repository',date,'Repository endpoint returned HTTP 404');else warnings.push(`${c.slug}: repository unavailable, retained: ${metaError.message}`); }
    }
    if(c.revoked&&!c.retirement){delete c.revoked;delete c.revokedOn;}
    save(root,`contenuti/${c.tipo==='skill'?'skills':'tutorials'}/${c.slug}.json`,c);
  }
  // Retired records must not remain selectable as candidates or video topics.
  const retired=readCards(root).filter(c=>c.retirement);
  catalogue.skills=catalogue.skills.filter(c=>!retired.some(r=>r.repository===c.repository&&(r.skillPath===c.skillPath||['repository','license'].includes(r.retirement.reason))));
  const daily=load(root,`dati/skill-storico/${date}.json`);
  if(daily&&Object.keys(measurements).length)save(root,`dati/skill-storico/${date}.json`,{...daily,stars:{...daily.stars,...measurements}});
  save(root,'dati/skill.json',catalogue);
  return warnings;
}
function register(registry,entry) {
  const old=registry.find(p=>p.url===entry.url);
  if(old) {
    if(old.tipo!==entry.tipo||old.slug!==entry.slug)throw Error(`Registry identity changed: ${entry.url}`);
    Object.assign(old,{stato:entry.stato});
    if(entry.stato==='ritirata')Object.assign(old,{motivo:entry.motivo,data:entry.data});
    else {delete old.motivo;delete old.data;}
  } else registry.push(entry);
}
export function freezeMonths(root,history,cards,registry,date) {
  const months=[...new Set(history.map(h=>h.date.slice(0,7)))].filter(m=>m<date.slice(0,7)).sort();
  for(const month of months) {
    const file=`dati/skill-mesi/${month}.json`;
    if(fs.existsSync(path.join(root,file)))continue;
    const days=history.filter(h=>h.date.startsWith(month+'-'));
    if(new Set(days.map(d=>d.date)).size<14)continue;
    const entries=new Map();
    for(const day of days)for(const [i,e] of (day.directory?.trending24h||[]).entries()) {
      const key=`${e.source.toLowerCase()}/${e.skillId}`,old=entries.get(key)||{name:e.name||e.skillId,skillId:e.skillId,repository:e.source,positions:[],stars:[]};
      old.positions.push(i+1);entries.set(key,old);
    }
    for(const entry of entries.values()) {
      entry.stars=days.map(d=>({date:d.date,stars:d.stars?.[entry.repository]})).filter(d=>Number.isFinite(d.stars));
      entry.days=entry.positions.length;entry.average=entry.positions.reduce((a,b)=>a+b,0)/entry.days;entry.best=Math.min(...entry.positions);
      entry.startStars=entry.stars[0]?.stars??null;entry.endStars=entry.stars.at(-1)?.stars??null;
      entry.startDate=entry.stars[0]?.date??null;entry.endDate=entry.stars.at(-1)?.date??null;
      const card=cards.find(c=>c.tipo==='skill'&&c.repository===entry.repository&&identity(c)===normalized(entry.skillId));
      entry.url=card?pageURL(card):`https://skills.sh/${entry.repository}/${entry.skillId}`;
      delete entry.positions;delete entry.stars;
    }
    const top=[...entries.values()].sort((a,b)=>b.days-a.days||a.average-b.average||a.repository.localeCompare(b.repository)||a.skillId.localeCompare(b.skillId)).slice(0,10);
    // O_EXCL: a month snapshot is created once and is never rewritten.
    fs.mkdirSync(path.dirname(path.join(root,file)),{recursive:true});
    fs.writeFileSync(path.join(root,file),JSON.stringify({month,frozenOn:date,observedDays:days.length,entries:top},null,1)+'\n',{flag:'wx'});
  }
  const folder=path.join(root,'dati/skill-mesi');
  const frozen=fs.existsSync(folder)?fs.readdirSync(folder).filter(f=>/^\d{4}-\d{2}\.json$/.test(f)).sort().map(f=>load(root,`dati/skill-mesi/${f}`)):[];
  for(const m of frozen)register(registry,{url:monthURL(m.month),slug:`best-agent-skills-${m.month}`,tipo:'mese',repository:'',skillPath:'',primaPubblicazione:m.frozenOn,stato:'attiva'});
  return frozen;
}
export function prepareArchive({root=archiveRoot(),date=process.env.SKILL_ARCHIVE_DATE||new Date().toISOString().slice(0,10)}={}) {
  const categories=load(root,'dati/skill-categorie.json',load(ROOT,'dati/skill-categorie.json'));
  const catalogue=load(root,'dati/skill.json',{skills:[]}),registry=load(root,'dati/skill-pagine.json',[]),cards=readCards(root),history=histories(root);
  for(const c of [...catalogue.skills,...cards]) {
    c.category=assignCategory(c,categories);
    if(cards.includes(c)) {
      if(c.tipo==='skill'&&!c.archiveMetrics)c.archiveMetrics=c.metrics;
      if(c.revoked&&!c.retirement) {
        // Legacy revocations had exactly one trigger: absence from catalogue.
        delete c.revoked;delete c.revokedOn;
      }
      save(root,`contenuti/${c.tipo==='skill'?'skills':'tutorials'}/${c.slug}.json`,c);
      register(registry,{url:pageURL(c),slug:c.slug,tipo:c.tipo,repository:c.repository||'',skillPath:c.skillPath||'',primaPubblicazione:c.date,stato:c.retirement?'ritirata':'attiva',...(c.retirement?{motivo:c.retirement.reason,data:c.retirement.date}:{})});
    }
  }
  save(root,'dati/skill.json',catalogue);
  const publishedCategories=categories.filter(cat=>cards.filter(c=>c.tipo==='skill'&&!c.retirement&&c.category===cat.slug).length>=3||registry.some(p=>p.url===categoryURL(cat.slug)));
  for(const cat of publishedCategories)register(registry,{url:categoryURL(cat.slug),slug:`for-${cat.slug}`,tipo:'categoria',repository:'',skillPath:'',primaPubblicazione:date,stato:'attiva'});
  const months=freezeMonths(root,history,cards,registry,date);
  registry.sort((a,b)=>a.url.localeCompare(b.url));save(root,'dati/skill-pagine.json',registry);
  return {root,date,categories,publishedCategories,catalogue,cards,history,registry,months};
}
export function assertRegistry(context,output) {
  for(const p of context.registry) {
    if(!/^\/(skills|tutorials)\/[a-z0-9-]+\.html$/.test(p.url))throw Error(`Invalid registry URL: ${p.url}`);
    if(!fs.existsSync(path.join(output,p.url.slice(1))))throw Error(`Registered URL was not generated: ${p.url}`);
  }
}
