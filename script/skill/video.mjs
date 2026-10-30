import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { STAMPI } from '../video-hf/stampi/index.mjs';
import { monta } from '../video-hf/monta.mjs';
import { titoloYT, capitoliYT, conCapitoli, controlli } from '../brag/controllo-yt.mjs';
import { approvedText, validateCard, GENERIC, SECURITY_TEXT, DISCLAIMER, digest } from './verifica.mjs';
import { labelFrom, ROOT } from './fonti.mjs';

const HEADINGS = ['The problem','What it is','How it works','Install','Try it','Read the source','Limits and review','Feature','Step by step'];
const words = (s,n) => String(s).split(/\s+/).slice(0,n).join(' ');
function slide(title, body, speech, duration, command) {
  return { stampo:'passo',etichetta:title,capitolo:title,dati:{titolo:title,testo:body,...(command?{comando:command}:{})},parlato:speech,voce:speech.join(' '),durata:duration };
}
export function plan(card, short=false) {
  const base = validateCard(card);
  if (base.length) throw Error(base.join('; '));
  let scenes;
  if (short) {
    scenes=[slide(card.problem,card.problem,[card.problem],3),
      slide(card.name,words(card.descr,24),[card.name,words(card.descr,14)],7),
      ...card.features.map((f,i)=>slide(f.label,words(f.detail,32),[words(f.detail,i===2?18:16)],[7,7,8][i])),
      slide('Install','',[card.install],8,card.install),
      slide('Read the source',`github.com/${card.repository}`,[`github.com/${card.repository}`],5)];
  } else {
    scenes=[slide('The problem',card.problem,[card.descr,GENERIC[8]],16),
      slide('What it is',card.descr,[card.descr,GENERIC[9]],18)];
    const flow = card.flow;
    if (flow?.length===3) scenes.push({stampo:'diagramma',etichetta:'How it works',capitolo:'How it works',dati:{titolo:'How it works',nodi:flow.map(s=>labelFrom(s))},parlato:flow,voce:flow.join(' '),durata:20});
    else scenes.push(slide('How it works',words(card.example,45),[card.example,GENERIC[8]],20));
    if (card.tipo==='tutorial') for (const step of card.steps) scenes.push(slide(step.title,step.text,[step.text,...(step.command?[step.command]:[])],16,step.command));
    else scenes.push(slide('Install',GENERIC[4],[GENERIC[4],card.install],20,card.install));
    for (const f of card.features) scenes.push(slide(f.label,f.detail,[f.detail,GENERIC[3]],16));
    scenes.push(slide('Limits and review',`${words(card.limits[0],24)}\n\n${DISCLAIMER}`,[card.limits[0],...(card.security?[SECURITY_TEXT]:[GENERIC[6]]),DISCLAIMER],24));
    scenes.push(slide('Read the source',`github.com/${card.repository}`,[GENERIC[8],`github.com/${card.repository}`],14));
  }
  const out={formato:short?'verticale':'orizzontale',tempiFissi:true,copertina:1,musica:short?'vivace':'calma',cardHash:digest(JSON.stringify(card)),scene:scenes};
  const errors=validatePlan(card,out);
  if(errors.length) throw Error(errors.join('; '));
  return out;
}

export function validatePlan(card,piano) {
  const e=[...validateCard(card)];
  if (piano.cardHash!==digest(JSON.stringify(card))) e.push('plan does not match the reviewed card');
  const short=piano.formato==='verticale';
  for (const [i,s] of (piano.scene || []).entries()) {
    const st=STAMPI[s.stampo];
    if(!st) {e.push(`unknown template ${s.stampo}`);continue;}
    e.push(...st.valida(s.dati || {}).map(x=>`scene ${i+1}: ${x}`));
    if(!s.parlato?.length || s.voce!==s.parlato.join(' ') || s.parlato.some(t=>!approvedText(card,t))) e.push(`scene ${i+1}: unsupported narration`);
    const strings=o=>typeof o==='string'?[o]:Array.isArray(o)?o.flatMap(strings):o&&typeof o==='object'?Object.values(o).flatMap(strings):[];
    for(const t of strings(s.dati).flatMap(t=>t.split(/\n{2,}/)).filter(Boolean)) if(!HEADINGS.includes(t) && !approvedText(card,t)) e.push(`scene ${i+1}: unsupported on-screen text ${t}`);
    if(!HEADINGS.includes(s.etichetta)&&!approvedText(card,s.etichetta)) e.push('unapproved scene label');
  }
  const total=piano.scene?.reduce((a,s)=>a+s.durata,0);
  if(short) {
    if(total!==45 || piano.scene.length!==7 || piano.scene.map(s=>s.durata).join(',')!=='3,7,7,7,8,8,5') e.push('Short timing does not match 0-3 / 3-10 / 10-32 / 32-40 / 40-45');
    if(card.problem.split(/\s+/).length>6) e.push('hook exceeds six words');
    if(piano.scene[5]?.dati.comando!==card.install || piano.scene[6]?.dati.testo!==`github.com/${card.repository}`) e.push('exact command or repository missing');
  } else if(!(total>=120&&total<=240)) e.push(`long video outside 2-4 minutes: ${total}`);
  return e;
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
    // A real README screenshot replaces a feature slide while keeping the exact
    // voice/timing contract. The caption remains a verified source phrase.
    if(screenshots.length) {
      const shot=screenshots[0], index=short?2:piano.scene.findIndex(s=>s.dati.titolo===card.features[0].label);
      if(index>=0) {
        const original=piano.scene[index];
        const ratio=JSON.parse(run(process.env.PYTHON || (process.platform==='win32'?'python':'python3'),['-c','from PIL import Image;import json,sys;im=Image.open(sys.argv[1]);print(json.dumps(im.width/im.height))',shot.file]));
        piano.scene[index]={...original,stampo:'immagine',dati:{media:shot.file,rapporto:ratio,didascalia:words(card.features[0].label,6).slice(0,48),credito:card.repository.slice(0,44)}};
      }
    }
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
    const info={nome,sourceHash:digest(JSON.stringify(card)),titolo:titoloYT([card.titolo,card.name],{shorts:short}),descrizione:`${words(card.descr,20).slice(0,155)}\n\nFull story: ${page}\nSources: ${card.fonti.map(s=>s.url).join('\n')}\n\n${DISCLAIMER}`,tag:['Agent Skills',card.name,'FreeLLMArena',card.tipo==='skill'?'AI tools':'AI tutorial'],lingua:'en',formato:{w:short?1080:1920,h:short?1920:1080},...(short?{lungo:`video-${card.tipo}-${card.slug}`}:{})};
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
