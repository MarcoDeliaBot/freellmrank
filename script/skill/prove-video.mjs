// Opt-in integration proof for P1/P2: real pinned card, simulated transports,
// real Kokoro/Parakeet/HyperFrames/encoded-frame gates. No model requests here.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { explain } from './spiega.mjs';
import { plan, render } from './video.mjs';
import { digest } from './verifica.mjs';
import { ROOT, read, write } from './fonti.mjs';
import { loadTrialCatalogue } from './catalogo.mjs';
import { teachingCard } from './fatti.mjs';
import { textIssues } from './copione.mjs';

if(process.env.PROVA!=='true'||process.env.PROVA_CATALOGO!=='2026-11-01')throw Error('Video integration proofs require the pinned trial');
const delivery=read('video/skill-tutorial/esito.json');
const success=delivery.completed.find(c=>c.tipo==='skill');
if(!success)throw Error('P1 needs a successful real skill first');
const original=read(`contenuti/skills/${success.slug}.json`);
// This reproduces the exact failed production subject as a technical fixture;
// it is not selected for trial publication, which retains its top20 rule.
const card=teachingCard(loadTrialCatalogue('2026-11-01').skills.find(c=>c.name==='code-simplification'),t=>!textIssues(t,{voice:true}).length);
const shape=c=>digest(JSON.stringify([plan(c,false).scene,plan(c,true).scene]));
const cache=new Map([[shape(original),{mode:'P6',evidence:success.evidence}]]);
const cases=[];
const truncated={testo:'{',tagliato:true,usage:{prompt_tokens:40,completion_tokens:3200}};
const valid=messages=>{
  const facts=JSON.parse(messages[1].content).FACTS;
  const index=facts.findIndex(f=>f.includes('Simplify code by reducing complexity while preserving exact behavior.'));
  assert.ok(index>=0);
  return {testo:JSON.stringify({slides:[{index:3,sentences:[{text:'Simplify code by reducing complexity.',facts:[index]},{text:'Keep the exact behavior.',facts:[index]}]}]}),usage:{prompt_tokens:40,completion_tokens:80}};
};
for(const mode of ['workers','groq','deterministic']) {
  let called=0;
  const proposed=await explain(card,async messages=>mode==='workers'&&++called===2?valid(messages):truncated,
    {groqWriter:async messages=>mode==='groq'?valid(messages):truncated});
  assert.equal(proposed.writing.writer,mode);
  const key=shape(proposed);
  let rendered=cache.get(key),reusedFrom=rendered?.mode||null;
  if(!rendered) {
    rendered={mode,evidence:await render(proposed,path.join(ROOT,'video/skill-tutorial/prove-p1',mode))};
    cache.set(key,rendered);
  }
  assert.ok(rendered.evidence.evidence.every(e=>e.qa.passed));
  // A provider's accounting does not affect the video. Reuse is allowed only
  // after exact equality of BOTH scene arrays, including speech/evidence/time.
  cases.push({mode,writing:proposed.writing,sceneHash:key,reusedFrom,evidence:rendered.evidence});
  write('video/skill-tutorial/prove-p1/esito.json',{passed:true,complete:cases.length===3,cases});
}
assert.equal(cases.length,3);
console.log('P1/P2: all three simulated writer paths passed both actual video gates.');
