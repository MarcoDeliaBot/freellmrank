import fs from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { teachingCard } from './fatti.mjs';
import { textIssues } from './copione.mjs';
import { plan } from './video.mjs';
import { digest } from './verifica.mjs';

const fixture=name=>new URL(`./fixtures/${name}`,import.meta.url);
export function loadTrialCatalogue(date) {
  if(date!=='2026-11-01')throw Error('Unknown pinned trial catalogue');
  return JSON.parse(gunzipSync(fs.readFileSync(fixture(`catalogue-${date}.json.gz`))));
}
export function auditCatalogue() {
  const catalogue=loadTrialCatalogue('2026-11-01');
  const before=JSON.parse(fs.readFileSync(fixture('catalogue-before-2026-11-01.json')));
  const rows=catalogue.skills.map((c,i)=>{
    const card=teachingCard(c,t=>!textIssues(t,{voice:true}).length);
    let after={passed:true,reason:null};
    try{plan(card);plan(card,true);}catch(e){after={passed:false,reason:e.message};}
    return {name:c.name,repository:c.repository,commit:c.commit,before:before[i],after,
      facts:card.features.map(f=>({detail:f.detail,evidence:f.evidence}))};
  });
  return {date:catalogue.aggiornato,sourceRun:41285105674,sourceArtifact:13075106849,
    sourceSha256:digest(gunzipSync(fs.readFileSync(fixture('catalogue-2026-11-01.json.gz')))),
    total:rows.length,before:rows.filter(r=>r.before.passed).length,after:rows.filter(r=>r.after.passed).length,rows};
}
