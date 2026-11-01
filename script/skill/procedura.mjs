import { plain } from './fonti.mjs';
import { extractFacts, screenSentence, sectionTitle } from './fatti.mjs';

const commandStart=/^(?:npx|npm|pip|brew|winget|conda|git|cmake|lms|llama(?:-cli|-server)?|agent-browser|hyperframes|curl|\.\/)[\s\w/-]/;
const key=s=>s.toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const safe=t=>screenSentence(t)&&!/[<>/\\`_{}=]|\b(?:npx|npm|curl|pip|localhost)\b|\b\w+\.(?:md|html|json|js|py|com)\b|\b(?:lms|llama|git|hyperframes)\s+(?:status|load|ls|ps|cli|serve|lint|present|clone)\b|(?:^|\s)-\w|--[a-z]/i.test(t);

// Natural-language descriptions must occur alongside the exact command. These
// small paraphrases describe the documented operation; commands are never TTS.
function commandAction(description) {
  const value=plain(description);
  const rules=[
    [/curl[\s\S]*--(?:data|request)[\s\S]*prompt/i,'Send a completion request','Send the documented completion request. The example asks the running model to continue a prompt through the local application server.'],
    [/check the status/i,'Check application status','Check the status of the local application. This operation reports its current state before you move on to working with models.'],
    [/list all downloaded models/i,'List downloaded models','List the models that have already been downloaded. The list shows which models are available locally before you choose one to load.'],
    [/list all loaded models/i,'Check loaded models','List all loaded models available for inference. Compare the list of loaded models with the model selected during the loading step.'],
    [/load a model/i,'Load a model','Load a model for inference. Use the documented loading operation for the model you want to make available in the local application.'],
    [/start the local API server/i,'Start the local server','Start the local API server. This is the interface described in the guide for using the application through its local server.'],
    [/stop the local API server/i,'Stop the local server','Stop the local API server when you finish using it. The guide documents this operation alongside the command for starting that server.'],
    [/stream logs/i,'Read application logs','Stream the application logs. This operation lets you read the log stream from the local application while you work with the tool.'],
    [/download and run a model/i,'Download and run a model','Download and run a model directly from Hugging Face. The example combines downloading the selected model with running it on your computer.'],
    [/launch OpenAI-compatible API server/i,'Launch the application server','Launch the compatible API server. The quick start provides this server operation as another way to run the selected model locally.'],
  ];
  for(const [pattern,title,voice]of rules)if(pattern.test(value))return {title,voice,text:voice.split(/(?<=[.!?])\s+/)[0]};
  return null;
}

export function extractProcedure(card) {
  const steps=[],seen=new Set();
  const add=step=>{const id=key(step.voice);if(!seen.has(id)){seen.add(id);steps.push(step);}};
  for(const source of card.fonti||[]) {
    // The same commit must pin every input; mutable docs are never a procedure.
    if(!card.commit||!source.url.includes(card.commit))continue;
    const health=/^### GET `\/health`:[\s\S]*?(?=^### |$(?![\s\S]))/m.exec(source.testo)?.[0];
    if(health&&/HTTP status code 200/.test(health)&&/the model is successfully loaded and the server is ready/.test(health))add({role:'verify',title:'Check model readiness',text:'GET /health: HTTP 200 means the model is loaded and the server is ready.',voice:'Check the health endpoint shown here. A successful response means that the model has loaded and the server is ready.',quote:health,url:source.url,heading:'Health check'});
    const lines=source.testo.replace(/\r/g,'').split('\n');let heading='',active=false,fenced=false,comment='',quote=[],body=[];
    const pushCode=()=>{
      const raw=quote.join('\n'),code=body.join('\n').trim();
      if(!code||code===card.install||code.length>460||/[<>…]|\.\.\.|\$\(|[;&|]/.test(code))return;
      const action=commandAction(comment+' '+(code.startsWith('curl ')?code:''));
      if(action)add({...action,code,quote:raw,url:source.url,heading});
    };
    for(let i=0;i<lines.length;i++) {
      const line=lines[i],h=/^#{1,6}\s+(.+)/.exec(line);
      if(h&&!fenced){heading=plain(h[1]);active=/install|quick\s*start|getting\s*started|usage|using|workflow|step|present and hand off|general process/i.test(heading);continue;}
      if(/^\s*```/.test(line)){
        if(fenced){quote.push(line);if(active)pushCode();fenced=false;}
        else{fenced=true;quote=[line];body=[];comment=lines.slice(Math.max(0,i-3),i).join(' ');}
        continue;
      }
      if(fenced){
        if(/^\s*#\s+/.test(line)){if(body.length){if(active)pushCode();body=[];quote=[];}comment=line.replace(/^\s*#\s+/,'');quote.push(line);}
        else{quote.push(line);if(line.trim())body.push(line);}
        continue;
      }
      // Usage lists are procedures too: each entry has an exact command and
      // its own documented purpose, rather than an inferred command meaning.
      if(active){const inline=/^\s*- `([^`]+)`\s*-\s*(.+)/.exec(line);if(inline&&commandStart.test(inline[1])&&!/[<>;&|]/.test(inline[1])){const action=commandAction(inline[2]);if(action)add({...action,code:inline[1],quote:line,url:source.url,heading});}}
      // Numbered prose instructions in a reviewed skill are also real steps.
      const numbered=/^\s*\d+[.)]\s+(.+)/.exec(line);
      if(card.skillSource&&numbered&&/^(?:Read|Write|Check|Find|Review|Create|Run|Build|Test|Start|Follow|Define|Inspect|Report|Ask|Record|Measure|Verify|Add|Remove|Update|Summarize|Identify|List|Understand|Evaluate|Sharpen|Present|Name|Stop)\b/i.test(plain(numbered[1]))){const voice=plain(numbered[1]).replace(/[:;]$/,'.');const complete=/[.!?]$/.test(voice)?voice:voice+'.';if(safe(complete))add({title:sectionTitle(voice,24),voice:complete,text:complete,quote:line,url:source.url,heading});}
    }
  }
  return steps;
}

function priority(s){return /Check application status/.test(s.title)?0:/List downloaded/.test(s.title)?1:/Load a model/.test(s.title)?2:/Stop the local/.test(s.title)?9:3;}

export function tutorialLesson(card) {
  const procedure=extractProcedure(card);
  if(procedure.filter(s=>s.role!=='verify').length<3)throw Error(`A tutorial needs a documented step-by-step procedure: found ${procedure.length} usable steps, at least 3 required`);
  const facts=extractFacts(card,safe),used=new Set();
  const take=pattern=>{
    const fact=facts.find(f=>!used.has(f.voice)&&pattern.test(f.heading+' '+f.voice)&&!procedure.some(s=>key(s.voice)===key(f.voice)));
    if(fact)used.add(fact.voice);return fact;
  };
  // Respect dependencies: inspect/downloaded models, load, then serve. A stop
  // command is a next step, never a prerequisite for later loading.
  procedure.sort((a,b)=>priority(a)-priority(b));
  const selected=[],consumed=new Set();
  for(let i=0;i<procedure.length&&selected.length<3;i++){
    const step=procedure[i];consumed.add(step);
    if(step.role==='verify')continue;
    if(!step.code&&step.voice.split(/\s+/).length<12&&procedure[i+1]&&!procedure[i+1].code&&procedure[i+1].heading===step.heading){
      const second=procedure[++i];consumed.add(second);selected.push({...step,voice:step.voice+' '+second.voice,quotes:[step.quote,second.quote],text:step.voice});
    }else selected.push(step);
  }
  if(selected.length<3)throw Error('A tutorial needs a documented step-by-step procedure with three distinct teaching steps');
  const verify=procedure.find(s=>s.role==='verify')||procedure.find(s=>/check|status/i.test(s.title)&&!consumed.has(s))||take(/successfully loaded|server is ready/i)||take(/re-run verification|run.*test|verify.*result|check.*result/i);
  const next=procedure.find(s=>!consumed.has(s)&&s!==verify)||take(/visit the web front end/i)||take(/next|continue|hand.?off|restartable|load the relevant|create a rules file/i);
  if(!verify||!next)throw Error('Documented verification and next steps are required');
  const description=card.introduction?.voice||card.descr.split(/(?<=[.!?])\s+/).find(safe)||take(/./)?.voice;
  used.add(description);
  const identity=take(/./);
  if(!description||!identity)throw Error('Tutorial lacks complete introduction facts');
  const scene=(label,title,text,voice,role,duration,quotes,extra={})=>({label,title,text,voice,role,duration,quotes,...extra});
  const stepScene=(step,i,short)=>scene(`Step ${i+1}`,step.title,undefined,step.voice,short?'feature':'step',short?[7,7,8][i]:14,step.quotes||[step.quote],step.code?{code:step.code,result:step.text}:{elements:[step.text||step.voice]});
  const finish=(step,label,role)=>scene(label,step.title||sectionTitle(step.heading),undefined,step.voice,role,14,step.quotes||[step.quote],step.code?{code:step.code,result:step.text}:{elements:[step.text||step.voice]});
  const intro=card.introduction?description:description+' '+identity.voice;
  const introductionQuotes=card.introduction?[card.introduction.quote]:[identity.quote,description];
  const pre=card.requirements||take(/install|require|before|getting started|quick start/i)||take(/./);
  if(!pre)throw Error('Tutorial prerequisites have no source evidence');
  const context=[];
  if(card.skillSource){
    const said=[intro,pre.voice,verify.voice,next.voice,...selected.map(s=>s.voice)].join(' '),headings=new Set();
    for(const f of facts){
      if(context.length===3)break;
      if(said.includes(f.voice)||used.has(f.voice)||f.voice.split(/\s+/).length<14||headings.has(f.heading)||/README/i.test(f.url))continue;
      headings.add(f.heading);context.push(scene('Context',sectionTitle(f.heading),undefined,f.voice,'feature',14,[f.quote],{elements:[f.voice]}));
    }
  }
  return {profile:'documented-procedure',problem:card.problem,description,prerequisites:pre.voice,check:verify.voice,next:next.voice,limits:'Read the documented requirements before running the commands.',
    short:[scene('The problem',card.problem,'Start with the documented local workflow.','Want to use this tool on your computer?', 'problem',3,[],{nodes:['Local setup',card.name,'Documented usage']}),scene('What it is',sectionTitle(card.name),undefined,intro,'identity',7,introductionQuotes,{elements:[card.introduction?.text||identity.voice]}),...selected.map((s,i)=>stepScene(s,i,true)),scene('Install','Prepare the documented tool','Read the installation requirements first.','Use the installation command shown here. Check the installation requirements in the guide before continuing with the documented usage steps.','install',8,[card.install],{code:card.install}),scene('Repository','Continue with the full guide',`github.com/${card.repository}`,'Link in the description.','link',5,[])],
    long:[scene('Goal',sectionTitle(card.name),undefined,intro,'goal',14,introductionQuotes,{elements:[card.introduction?.text||identity.voice]}),scene('Before you start','Read the setup requirements',undefined,pre.voice,'prerequisites',14,[pre.quote],{elements:[pre.text||pre.voice]}),scene('Installation','Set up the official tool','Use the installation instructions for your system.','Begin with the documented installation command. Read the setup instructions for your system, then continue with the operations shown in the usage guide.','step',14,[card.install],{code:card.install}),...selected.map((s,i)=>stepScene(s,i,false)),...context,finish(verify,'Verify','verify'),finish(next,'Next steps','next'),scene('Source','Keep the documentation handy',`github.com/${card.repository}`,'Link in the description.','link',5,[])]};
}
