import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { STAMPI } from '../video-hf/stampi/index.mjs';
import { monta } from '../video-hf/monta.mjs';
import { titoloYT, capitoliYT, conCapitoli, controlli } from '../brag/controllo-yt.mjs';
import { approvedText, validateCard, digest } from './verifica.mjs';
import { ROOT, plain } from './fonti.mjs';
import { screenSentence } from './fatti.mjs';
import { lessonFor, textIssues, duplicateIssues, FORBIDDEN } from './copione.mjs';

const words=(s,n)=>String(s).split(/\s+/).slice(0,n).join(' ');
export function examplePanel(card,feature){return feature?.example||card.example;}
export function warningText(card){return lessonFor(card).limits;}
export function plan(card,short=false) {
  const errors=validateCard(card);if(errors.length)throw Error(errors.join('; '));
  const lesson=lessonFor(card);
  const scenes=(short?lesson.short:lesson.long).map((s,i)=>{
    const explanation=card.explanations?.[`${short?'short':'long'}:${i}`];
    const speech=explanation?explanation.sentences.map(s=>s.text):[s.voice];
    const data={titolo:s.title,testo:s.text,...(s.code?{comando:s.code,risultato:s.result}:{}),...(s.nodes?{nodi:s.nodes,ordine:!!s.order}:{}),...(s.elements?{elementi:s.elements}:{}),...(s.role==='problem'?{apertura:true}:{}),...(s.role==='link'?{link:true}:{})};
    const citations=(s.quotes||[]).map(quote=>({quote,urls:(card.fonti||[]).filter(f=>f.testo.includes(quote)||f.testo.replace(/\s+/g,' ').includes(quote)||quote===card.descr&&plain(f.testo).includes(card.descr)).map(f=>f.url)}));
    return {stampo:s.nodes?'diagramma':'passo',etichetta:s.label,capitolo:s.title,role:s.role,dati:data,parlato:speech,voce:speech.join(' '),durata:s.duration,evidence:s.quotes,citations};
  });
  const out={formato:short?'verticale':'orizzontale',tempiFissi:true,teaching:true,lessonProfile:lesson.profile||'source-adapter',copertina:1,musica:short?'vivace':'calma',cardHash:digest(JSON.stringify(card)),scene:scenes};
  const check=validatePlan(card,out);if(check.length)throw Error(check.join('; '));return out;
}

export function validatePlan(card,piano) {
  const errors=[...validateCard(card)],short=piano.formato==='verticale',tool=card.tipo==='tutorial'&&!card.skillSource;
  if(piano.tempiFissi!==true)errors.push('fixed timing contract is required');
  if(piano.cardHash!==digest(JSON.stringify(card)))errors.push('plan does not match the reviewed card');
  errors.push(...duplicateIssues(piano.scene||[]));
  for(const [i,s] of (piano.scene||[]).entries()) {
    const st=STAMPI[s.stampo];if(!st){errors.push(`unknown template ${s.stampo}`);continue;}
    errors.push(...st.valida(s.dati||{}).map(e=>`scene ${i+1}: ${e}`));
    if(s.etichetta.length>26)errors.push(`scene ${i+1}: scene label too long`);
    if(!approvedText(card,s.etichetta))errors.push(`scene ${i+1}: unsupported scene label`);
    errors.push(...textIssues(s.etichetta,{tool}).map(e=>`scene ${i+1}: ${e}`));
    if(!s.parlato?.length||s.voce!==s.parlato.join(' ')||s.parlato.some(t=>!approvedText(card,t)))errors.push(`scene ${i+1}: unsupported narration`);
    errors.push(...textIssues(s.voce,{voice:true,tool}).map(e=>`scene ${i+1}: ${e}`));
    for(const t of [s.dati?.titolo,s.dati?.testo,s.dati?.risultato,...(s.dati?.elementi||[]),...(s.dati?.nodi||[])].filter(Boolean)){
      if(!approvedText(card,t))errors.push(`scene ${i+1}: unsupported on-screen text ${t}`);
      errors.push(...textIssues(t,{tool}).map(e=>`scene ${i+1}: ${e}`));
    }
    if(s.role==='feature'&&lessonFor(card).profile==='general'){
      if(s.dati.titolo.length>40||/Documented action/i.test(s.dati.titolo))errors.push('generic or oversized feature title');
      if((s.dati.elementi||[]).some(t=>!screenSentence(t)))errors.push('incomplete visible sentence');
    }
    if(s.dati?.comando&&!approvedText(card,s.dati.comando))errors.push(`scene ${i+1}: unsupported code`);
    if(s.dati?.comando&&FORBIDDEN.test(s.dati.comando))errors.push(`scene ${i+1}: forbidden internal wording in code`);
  }
  const total=piano.scene?.reduce((a,s)=>a+s.durata,0);
  if(short){
    if(total!==45||piano.scene.length!==7||piano.scene.map(s=>s.durata).join(',')!=='3,7,7,7,8,8,5')errors.push('Short timing does not match 0-3 / 3-10 / 10-32 / 32-40 / 40-45');
    if(piano.scene[0]?.dati.titolo.split(/\s+/).length>6)errors.push('hook exceeds six words');
    if(piano.scene[1]?.etichetta!=='What it is'||piano.scene[1]?.role!=='identity')errors.push('Short identity scene required');
    if(piano.scene.slice(2,5).some(s=>s.role!=='feature'))errors.push('Short needs exactly three features or documented steps');
    if(piano.scene[5]?.dati.comando!==card.install||piano.scene[6]?.dati.testo!==`github.com/${card.repository}`||piano.scene[6]?.voce!=='Link in the description.')errors.push('exact command or repository missing');
  }else{
    if(!(total>=90&&total<=240))errors.push(`long video outside 90 seconds to 4 minutes: ${total}`);
    // Source-backed quotation panels are valid when there is no real enumeration.
    if(tool){const roles=piano.scene.map(s=>s.role);if(roles[0]!=='goal'||roles[1]!=='prerequisites'||!roles.includes('verify')||!roles.includes('next')||roles.at(-1)!=='link')errors.push('tutorial structure incomplete');}
  }
  return errors;
}
function run(command,args,options={}) {
  const r=spawnSync(command,args,{encoding:'utf8',timeout:120000,maxBuffer:4e6,...options});
  if(r.status!==0) throw Error(`${command} failed (${r.status}): ${[r.stdout,r.stderr,r.error?.message].filter(Boolean).join('\n').slice(-3000)}`);
  return r.stdout;
}
export async function render(card,folder) {
  const evidence=[];
  // Download only pinned README images, never images generated from a claim.
  const screenshots=[];
  for(const [i,s] of (card.screenshots || []).entries()) {
    const r=await fetch(s.url,{signal:AbortSignal.timeout(30000)});
    if(!r.ok) throw Error(`README screenshot unavailable: ${r.status}`);
    const data=Buffer.from(await r.arrayBuffer());
    if(data.length>5e6) throw Error('README screenshot exceeds size limit');
    const f=path.join(folder,`readme-${i}${path.extname(new URL(s.url).pathname)}`);
    fs.mkdirSync(folder,{recursive:true});fs.writeFileSync(f,data);screenshots.push({file:f,...s,sha256:digest(data)});
  }
  for(const short of [false,true]) {
    const piano=plan(card,short);
    // Media paths are validated separately; they are not factual text.
    const checkCard={...card};
    const errors=validatePlanWithMedia(checkCard,piano,screenshots);
    if(errors.length) throw Error(errors.join('; '));
    const dir=path.join(folder,short?'breve':'lungo');fs.mkdirSync(dir,{recursive:true});
    fs.writeFileSync(path.join(dir,'piano.json'),JSON.stringify(piano,null,1));
    await monta(piano,dir);
    run(process.env.PYTHON || (process.platform==='win32'?'python':'python3'),[path.join(ROOT,'script/skill/fotogrammi.py'),dir],{timeout:180000});
    const qa=JSON.parse(fs.readFileSync(path.join(dir,'controllo.json'),'utf8'));
    if(!qa.passed) throw Error(`Frame/layout gate failed: ${JSON.stringify(qa.errors)}`);
    const nome=`${short?'breve-':''}${card.tipo}-${card.slug}`;
    const page=`https://freellmarena.com/${card.tipo==='skill'?'skills':'tutorials'}/${card.slug}`;
    const info={nome,sourceHash:digest(JSON.stringify(card)),titolo:titoloYT([card.titolo,card.name],{shorts:short}),descrizione:`${words(card.descr,20).slice(0,155)}\n\nFull story: ${page}\nSources: ${card.fonti.map(s=>s.url).join('\n')}`,tag:[card.tipo==='skill'?'Agent Skills':'AI tutorial',card.name,'FreeLLMArena','AI tools'],lingua:'en',formato:{w:short?1080:1920,h:short?1920:1080},...(short?{lungo:`video-${card.tipo}-${card.slug}`}:{})};
    const times=JSON.parse(fs.readFileSync(path.join(dir,'tempi.json'),'utf8'));
    if(!short) info.descrizione=conCapitoli(info.descrizione,capitoliYT(times.scene.map(s=>({inizio:s.inizio,titolo:s.capitolo})),times.totale));
    const ytErrors=controlli({...info,durata:times.totale}).filter(e=>['titolo-100','descrizione-5000','tag','shorts-rotto','senza-capitoli','capitoli-errati'].includes(e.codice));
    if(ytErrors.length) throw Error(JSON.stringify(ytErrors));
    for(const [source,ext] of [['video.mp4','mp4'],['copertina.jpg','jpg'],['video.srt','srt']])fs.copyFileSync(path.join(dir,source),path.join(dir,`${nome}.${ext}`));
    fs.writeFileSync(path.join(dir,`${nome}.json`),JSON.stringify(info,null,1));
    const files=['mp4','jpg','srt','json'].map(ext=>path.join(dir,`${nome}.${ext}`));
    evidence.push({nome,release:`video-${nome}`,dir,qa,seconds:times.totale,files,hashes:Object.fromEntries(files.map(f=>[path.basename(f),digest(fs.readFileSync(f))]))});
  }
  return {cardHash:digest(JSON.stringify(card)),screenshots,evidence};
}

function validatePlanWithMedia(card,piano,shots) {
  const ordinary=structuredClone(piano);
  ordinary.scene=ordinary.scene.map((s,i)=>{
    if(s.stampo!=='immagine')return s;
    const shot=shots.find(x=>x.file===s.dati.media);
    if(!shot||digest(fs.readFileSync(shot.file))!==shot.sha256)throw Error('unverified screenshot');
    const original=plan(card,piano.formato==='verticale').scene[i];
    const errors=STAMPI.immagine.valida(s.dati);
    if(errors.length||!approvedText(card,s.dati.didascalia)||!approvedText(card,s.dati.credito))throw Error('invalid screenshot caption');
    return original;
  });
  return validatePlan(card,ordinary);
}
