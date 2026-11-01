import { extractFacts } from './fatti.mjs';
import { plain, labelFrom } from './fonti.mjs';
// Deterministic teaching scripts. Source excerpts are assertions, never prompts.
// If a pinned source changes, an adapter stops instead of making up missing facts.
export const norm = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
export const FORBIDDEN = /source-based walkthrough|this pipeline|does not execute|this review covers|static checks cannot prove|remote-code-load|sensitive-read|environment-secret-read|download-and-execute|remote-eval|external-data-send|multiline-data-send|unsafe-path-or-symlink|[\w./-]+\.(?:md|py|js|mjs):\d+/i;
export const TECHNICAL_VOICE = /[<>/\\]|(?:^|\s)-[a-z0-9-]+\b|\b(?:npx|curl|wget|npm|pip|irm|iex|localhost)\b|\b[\w.-]+\.(?:md|html|json|py|mjs|js|txt|sh|png|com|org)\b|\b(?:ollama|agent-browser|lms|git|docker|brew|llama-cli)\s+(?:run|pull|launch|ls|open|snapshot|click|skills|install|chat|clone|status|diff|checkout|commit|build|get|load|serve)\b|@e\d|:\d+|[_{}=]|`/i;
export function textIssues(text, {voice=false, tool=false}={}) {
  const errors=[];
  if(FORBIDDEN.test(text))errors.push('forbidden internal wording');
  if(/:\s*$/.test(text))errors.push('unfinished sentence ending with colon');
  if(voice&&TECHNICAL_VOICE.test(text))errors.push('technical command or path in narration');
  if(tool&&/\bskills?\b/i.test(text))errors.push('skill wording in a tool tutorial');
  return errors;
}
const s=(label,title,text,voice,{code,nodes,quotes=[],duration=12,role='feature'}={})=>
  ({label,title,text,voice,code,nodes,quotes,duration,role});

const outcomes={
  'curl -fsSL https://ollama.com/install.sh | sh':'You will have the official tool installed for your next step.',
  'ollama pull gemma4':'You will have Gemma 4 available on your computer.',
  'ollama run gemma4':'You will see a conversation where you can ask the model a question.',
  'ollama launch claude':'You will open the Claude Code integration configured for Ollama.',
  'ollama ls':'You will see the models downloaded to your computer.',
  'agent-browser skills get core':'You will get the current workflow instructions for the installed tool.',
  'agent-browser open example.com':'You will have the example website open for inspection.',
  'agent-browser snapshot':'You will see page elements and their current references.',
  'agent-browser click @e2':'The selected element receives the click. Inspect the page again afterwards.',
  'npm install -g agent-browser\nagent-browser install':'You will have the command line tool and its Chrome browser ready.',
  'npx skills add vercel-labs/agent-browser':'Your selected assistant will have the browser skill instructions.',
};

export function lessonFor(card) {
  const corpus=(card.fonti||[]).map(f=>f.testo).join('\n').replace(/\r/g,'');
  const need=q=>{if(!corpus.includes(q))throw Error(`Teaching evidence missing: ${q.slice(0,90)}`);return q;};
  let lesson;
  if(card.repository==='ollama/ollama'&&card.tipo==='tutorial') {
    const chat=need('Run and chat with [Gemma 4]'), api=need('Ollama has a REST API for running and managing models.'),
      download=need('### Download a model'), list=need('### List models'), start=need('### Start Ollama'),
      launch=need('Configure and launch external applications to use Ollama models.'),
      platforms=need('### Linux');
    const installer=need('curl -fsSL https://ollama.com/install.sh | sh'),pull=need('ollama pull gemma4'),run=need('ollama run gemma4'),ls=need('ollama ls'),connect=need('ollama launch claude');
    const request=corpus.match(/curl http:\/\/localhost:11434\/api\/chat -d '\{[\s\S]*?\n\}'/)?.[0];
    if(!request)throw Error('Pinned REST chat example missing');
    lesson={
      problem:'Need a local AI chat?',description:'Ollama runs open models on your computer.',
      prerequisites:'Use the installer for your operating system. This walkthrough shows Linux and macOS commands.',
      check:'List your downloaded models and confirm that Gemma 4 appears. Then check that chat answers your question.',
      next:'Connect a supported application, or explore the documented Python and JavaScript libraries.',
      limits:'The installer runs a script from the internet. Read it before running it.',
      short:[
        s('The problem','Need a local AI chat?','Bring an open model to your computer.','Want to chat with an open model locally?',{duration:3,role:'problem',nodes:['Your computer','Open model','Conversation'],quotes:[chat]}),
        s('What it is','Ollama','Run open models on your own computer.','Ollama lets you run open models on your computer and chat with them directly.',{duration:7,role:'identity',nodes:['Ollama','Open models','Local chat'],quotes:[chat]}),
        s('Step 1','Download your model','Save Gemma 4 before starting your chat.','First, download the model you want. The documented example uses Gemma four for the local conversation.',{duration:7,role:'feature',nodes:['Choose a model','Download','Ready to run'],quotes:[download,pull]}),
        s('Step 2','Start a conversation','Run the model, then ask a question.','Next, start a conversation with the downloaded model. Ask a question and read the answer in your terminal.',{duration:7,role:'feature',code:run,quotes:[chat]}),
        s('Step 3','Connect your application','A local chat endpoint serves your requests.','You can also send a chat request from an application. The local interface runs and manages your models.',{duration:8,role:'feature',nodes:['Your application','Local chat API','Model response'],quotes:[api,request]}),
        s('Install','Get the official tool','Linux and macOS installer. Read the script first.','Use the official installer for your system. It downloads a script from the internet, so read that script before running it.',{duration:8,role:'install',code:installer,quotes:[installer,platforms]}),
        s('Repository','Continue with the docs','github.com/ollama/ollama','Link in the description.',{duration:5,role:'link',quotes:[]}),
      ],
      long:[
        s('Goal','Your first local conversation','Finish with a model you can chat with and call from an application.','By the end, you will have downloaded an open model, started a chat, and seen how an application sends it a request.',{role:'goal',nodes:['Download a model','Chat locally','Use the API'],quotes:[chat,api],duration:13}),
        s('Before you start','Choose your operating system','The commands here use Linux or macOS. Windows has its own installer.','Choose the official installer for your operating system. Follow the Windows instructions if you use Windows. Read any downloaded installation script before you run it.',{role:'prerequisites',nodes:['Linux','macOS','Windows'],quotes:[platforms,installer,need('### Windows')],duration:14}),
        s('Step 1','Install Ollama','This command downloads and starts the official installer.','Start by installing Ollama. This command gets the official installation script and runs it. Read the script first, then follow the instructions for your system.',{role:'step',code:installer,quotes:[installer],duration:14}),
        s('Step 2','Download Gemma 4','The pull command downloads the model for local use.','Now download the model. Gemma four is the example in the official guide. Finish this step before opening your conversation with that model.',{role:'step',code:pull,quotes:[download,pull,chat],duration:13}),
        s('Step 3','Chat in the terminal','Start the model and type your first question.','Open the downloaded model for a chat. Type a question in the terminal and read its reply. You now have the basic local conversation described in the guide.',{role:'step',code:run,quotes:[chat,run],duration:14}),
        s('Step 4','Send an API request','Ask the same model a question from a local application.','The local interface gives applications another way to talk to the model. This example sends a question about the sky. Look for the model response in the returned result.',{role:'step',code:request,quotes:[api,request],duration:16}),
        s('Step 5','Launch a supported integration','Configure Claude Code to use Ollama models.','You can also connect a supported coding application. The launch command configures and opens the selected integration. The example on screen uses Claude Code.',{role:'step',code:connect,quotes:[launch,connect],duration:13}),
        s('Verify','Check the model is available','List downloaded models, then confirm that your chat produces an answer.','List the models available on your computer. Check for the one you downloaded. If the chat does not answer, return to the installation and model steps before connecting another application.',{role:'verify',code:ls,quotes:[list,ls,chat],duration:15}),
        s('Next steps','Choose your next interface','Continue in an app, or use the official language libraries.','Keep the terminal for direct conversations, or use the application interface for your own software. The project also documents Python and JavaScript libraries when you want to build further.',{role:'next',nodes:['Terminal chat','REST API','Language libraries'],quotes:[api,need('### Python'),need('### JavaScript')],duration:14}),
        s('Source','Keep the reference handy','github.com/ollama/ollama','Link in the description.',{role:'link',duration:5}),
      ],
    };
  } else if(card.repository==='vercel-labs/agent-browser'&&card.name==='agent-browser') {
    const desc=need('Browser automation CLI for AI agents.'), core=need('agent-browser skills get core'),
      snapshot=need('agent-browser snapshot'), open=need('agent-browser open example.com'),
      click=need('agent-browser click @e2'), refs=need('Accessibility-tree snapshots with element refs for reliable interaction'),
      specialized=need('Specialized skills for Electron apps, Slack, exploratory testing, cloud providers'),
      install=need(card.install),chrome=need('Chrome/Chromium via CDP'),refresh=need('Re-snapshot after page changes');
    lesson={problem:'Need browser automation?',description:'An Agent Skill that teaches an assistant how to use the agent-browser tool.',
      prerequisites:'Use an assistant that supports Agent Skills. Install the browser tool and Chrome separately as documented.',
      check:'Take a fresh snapshot after the page changes. Use references from the current snapshot for the next action.',
      next:'Load a specialized workflow for desktop apps, exploratory testing or supported cloud browsers.',
      limits:'The skill loads workflow instructions from the installed tool. Review those instructions and browser permissions before use.',
      short:[
        s('The problem','Need browser automation?','Give your assistant a browser workflow.','Does your assistant need to operate a website?',{role:'problem',duration:3,nodes:['A website','Your assistant','Browser actions'],quotes:[desc]}),
        s('What it is','agent-browser skill','Teach an assistant to navigate, inspect and interact with websites.','The agent browser skill teaches an assistant to navigate websites, inspect pages, and use their controls.',{role:'identity',duration:7,nodes:['Agent Skill','Browser tool','Website'],quotes:[desc,open,snapshot,click]}),
        s('Feature 1','Load the right workflow','Get instructions that match the installed tool version.','First, load the core workflow from the installed tool. Its instructions match the version you are actually using.',{role:'feature',duration:7,code:core,quotes:[core,need('The CLI serves skill content that always matches the installed version')]}),
        s('Feature 2','Inspect before acting','A snapshot supplies references for the next browser action.','Next, inspect the page through a snapshot. Use the element references to choose the control your assistant should interact with.',{role:'feature',duration:7,nodes:['Open a page','Inspect a snapshot','Act on a reference'],quotes:[open,snapshot,click,refs]}),
        s('Feature 3','Go beyond web pages','Choose a specialized workflow when your task needs it.','Specialized workflows cover desktop apps, exploratory testing, and cloud browsers. Choose the workflow for your task.',{role:'feature',duration:8,nodes:['Desktop apps','Exploratory testing','Cloud browsers'],quotes:[specialized]}),
        s('Install','Add the Agent Skill','Install the skill in a supported assistant.','Add the skill with the documented installer. Set up the browser tool and Chrome separately before starting your first task.',{role:'install',duration:8,code:install,quotes:[install,chrome,need('agent-browser install')]}),
        s('Repository','Get the complete guide','github.com/vercel-labs/agent-browser','Link in the description.',{role:'link',duration:5}),
      ],
      long:[
        s('The problem','Automate a website with an assistant','Use an Agent Skill to guide browser tasks.','An assistant needs a clear workflow to operate websites. This skill points it to the browser instructions and the commands for navigating, inspecting, and interacting with a page.',{role:'goal',nodes:['Assistant','Browser instructions','Website interaction'],quotes:[desc,open,snapshot,click],duration:14}),
        s('How it works','Instructions come from the installed tool','The skill loads workflow content that matches your tool version.','The installed skill is a small entry point. It loads the actual workflow from the browser tool, so the instructions match the version installed on your computer.',{role:'prerequisites',nodes:['Installed skill','Installed tool','Current workflow'],quotes:[core,need('The CLI serves skill content that always matches the installed version')],duration:15}),
        s('Setup','Prepare the browser tool','Install the command line tool and its Chrome browser before use.','The Agent Skill and the browser tool have separate jobs. Set up the tool and Chrome using the documented installation instructions. Then choose an assistant supported by the skill installer.',{role:'step',code:'npm install -g agent-browser\nagent-browser install',quotes:[need('npm install -g agent-browser'),need('agent-browser install'),install],duration:16}),
        s('Add the skill','Install the assistant instructions','The installer adds the skill to your selected assistant.','Add the browser skill with the command shown here. The project lists supported assistants in its installation guide. Choose the host you use for the work.',{role:'step',code:install,quotes:[install],duration:14}),
        s('Load instructions','Start with the core workflow','Get the main workflow before issuing browser commands.','Before opening a website, load the core workflow. This gives the assistant the usage patterns and troubleshooting guidance served by the installed tool.',{role:'step',code:core,quotes:[core,need('workflows, common patterns, troubleshooting')],duration:13}),
        s('Navigate','Open a page','The example opens a website in the browser.','The first browser action is navigation. Open the example page, then inspect what is on it before deciding which control to use. Navigation gives you the page for that inspection.',{role:'step',code:open,quotes:[open,snapshot],duration:14}),
        s('Inspect','Read the current snapshot','The accessibility tree includes references to page elements.','Take a snapshot of the page. The accessibility tree provides element references that the assistant can use for interaction. Choose references from what the page shows now.',{role:'step',code:'agent-browser snapshot',quotes:[snapshot,refs],duration:14}),
        s('Interact','Use an element reference','Pick a reference from your own snapshot for the next action.','The example demonstrates clicking by reference. Use the reference from your current page rather than copying an example blindly. After the page changes, inspect it again before the next action.',{role:'step',code:'agent-browser click @e2',quotes:[click,refresh],duration:15}),
        s('Check and continue','Refresh your view after changes','A new snapshot keeps the next action tied to the current page.','Check the browser state after your action. A new snapshot is the basis for the next interaction. When the task moves beyond websites, load the matching specialized workflow.',{role:'verify',nodes:['Page changes','Fresh snapshot','Next interaction'],quotes:[refresh,specialized],duration:14}),
        s('Permissions','Review what the browser can access','Read the loaded instructions before granting access to a site or account.','Browser tasks can involve websites and signed in accounts. Read the workflow before granting access. Check the setup and permissions for the task you are about to perform.',{role:'limits',nodes:['Read the workflow','Check site access','Grant needed permissions'],quotes:[need('Sessions, authentication vault, state persistence, video recording')],duration:14}),
        s('Source','Explore the documented workflows','github.com/vercel-labs/agent-browser','Link in the description.',{role:'link',duration:5}),
      ],
    };
  } else {
    // Conservative general fallback: complete source sentences only. A source
    // too thin for three distinct facts is ineligible, rather than padded.
    if(card.tipo==='tutorial')throw Error('A tutorial needs a documented step-by-step procedure, not a reused feature list');
    const safe=t=>!textIssues(t,{voice:true,tool:card.tipo==='tutorial'&&!card.skillSource}).length&&/[.!?]$/.test(t)&&t.split(/\s+/).length<=28;
    const exact=(card.features||[]).map(f=>({label:f.label,detail:f.detail,voice:f.detail.split(/(?<=[.!?])\s+/).find(safe),quote:f.evidence?.quote}));
    const extracted=extractFacts(card,safe);
    const selected=[];
    for(const fact of [...exact,...extracted]) {
      if(!fact.voice||norm(fact.voice)===norm(card.descr)||selected.some(f=>norm(f.voice)===norm(fact.voice)))continue;
      if(!corpus.includes(fact.quote||fact.voice)&&!plain(corpus).includes(fact.voice))continue;
      selected.push(fact);if(selected.length===3)break;
    }
    if(selected.length!==3)throw Error('Source lacks three complete teachable facts');
    const description=card.descr.split(/(?<=[.!?])\s+/).find(safe)||extracted.find(f=>!selected.some(s=>s.voice===f.voice))?.voice;
    if(!description)throw Error('Source lacks a safe spoken description');
    const features=selected.map((f,i)=>s(`Feature ${i+1}`,`Documented action ${i+1}`,labelFrom(f.voice,70),`${['First','Next','Finally'][i]}, ${f.voice[0].toLowerCase()+f.voice.slice(1)}`,{quotes:[f.quote?need(f.quote):plain(corpus).includes(f.voice)?f.voice:need(f.voice)],nodes:[['Read the instructions','Choose your task','Apply the workflow'],['Inspect the project','Follow the guidance','Review your changes'],['Try the example','Check the result','Continue your work']][i]}));
    lesson={problem:card.problem,description,prerequisites:'Read the documented requirements before installation.',check:'Follow the example and check the result against the documented behavior.',next:'Continue with the complete project documentation.',limits:'Review the instructions before granting access to your project.',
      short:[s('The problem',card.problem,'Start with the task you need to solve.','Choose the workflow for your task.',{role:'problem',duration:3,nodes:['Your task','Instructions','Result']}),s('What it is',card.name,description,description,{role:'identity',duration:7,nodes:['Assistant','Instructions','Your project']}),...features.map((f,i)=>({...f,duration:[7,7,8][i]})),s('Install','Add the instructions','Use the documented command for your assistant.','Read the project requirements and choose your assistant. Use the installation command on screen, then follow the documented example in your own project.',{code:card.install,role:'install',duration:8}),s('Repository','Read the full guide',`github.com/${card.repository}`,'Link in the description.',{role:'link',duration:5})],
      long:[s('Goal',card.name,description,description,{role:'goal',nodes:['Your task','Agent Skill','Project workflow'],duration:14}),s('Requirements','Prepare your assistant','Read the requirements before granting access.','Check the project documentation for the supported assistant and setup. Review the instructions before installing.',{role:'prerequisites',nodes:['Project documentation','Assistant setup','Permissions'],duration:14}),s('Installation','Install the instructions','Use the exact command documented by the project.','Use the installation command and choose your assistant. Then return to the usage example in the project documentation.',{role:'step',code:card.install,duration:14}),...features.map(f=>({...f,duration:14})),s('Verify and continue','Compare with the documented example','Review the result in your own project.','Check the result against the documented behavior. Continue with the complete instructions for your next task.',{role:'verify',code:card.example,duration:14}),s('Source','Open the complete documentation',`github.com/${card.repository}`,'Link in the description.',{role:'link',duration:5})]};
  }
  if(card.tipo==='skill'&&!lesson.long.some(s=>s.role==='limits')){
    const reasons=(card.security?.warnings||[]).map(w=>w.reason).join(' ');
    const warning=/remote|download/.test(reasons)?'Some instructions can load code from the internet. Read them before use.':/sensitive|secret|credential/.test(reasons)?'Some instructions refer to credentials or configuration files. Check what access they require.':/api|send/.test(reasons)?'Some instructions contact a service. Check which data is sent.':'Review the instructions before granting access to your project.';
    lesson.limits=warning;
    lesson.long.splice(-1,0,s('Permissions','Review access before use',warning,'Check which files the instructions read and which services they contact. Grant only the access your task needs.',{role:'limits',duration:14,nodes:['Read the instructions','Check file access','Check network access']}));
  }
  // Arrows only on source-documented sequences; alternatives stay unconnected.
  const ordered=new Set(['Inspect before acting','Instructions come from the installed tool','Refresh your view after changes','Download your model','Your first local conversation']);
  for(const scene of [...lesson.short,...lesson.long]){
    if(scene.nodes&&ordered.has(scene.title))scene.order=true;
    if(scene.code)scene.result=outcomes[scene.code]||(scene.code.startsWith('curl http://localhost:11434/api/chat')?'You will receive the model response to the question about the sky.':scene.code===card.install?'The instructions are available to your assistant.':'Compare the output with the example in the project documentation.');
  }
  return lesson;
}

export function lessonStrings(lesson) {
  return [lesson.problem,lesson.description,lesson.prerequisites,lesson.check,lesson.next,lesson.limits,...[...lesson.short,...lesson.long].flatMap(s=>[s.label,s.title,s.text,s.voice,s.code,s.result,...(s.nodes||[])])].filter(Boolean);
}

export function duplicateIssues(scenes) {
  const errors=[],said=new Map(),shown=new Map(),code=new Map();
  const record=(map,text,i,channel)=>{
    // Names and short node labels are not sentences. Captions are a synchronized
    // rendering of the voice and are not counted as a second narration.
    for(const sentence of String(text||'').split(/(?<=[.!?])\s+|\n+/)) {
      const key=norm(sentence);if(!key||(key.split(' ').length<4&&!/[.!?]$/.test(sentence.trim())))continue;
      if(map.has(key))errors.push(`scene ${i+1}: repeated ${channel} from scene ${map.get(key)+1}: ${key}`);
      else map.set(key,i);
    }
  };
  scenes.forEach((s,i)=>{
    record(said,s.voce,i,'narration');
    for(const text of [s.dati?.titolo,s.dati?.testo,s.dati?.risultato,...(s.dati?.elementi||[]),...(s.dati?.nodi||[])])record(shown,text,i,'screen sentence');
    if(s.dati?.comando){const key=norm(s.dati.comando);if(code.has(key))errors.push(`scene ${i+1}: repeated code from scene ${code.get(key)+1}`);else code.set(key,i);}
  });
  return errors;
}
