// Same free Groq account/model already used by bozze.mjs. Keep usage and length
// finish reasons; the legacy news transport returns only text.
export async function scriviGroq(messages,max=4000) {
  if(!process.env.GROQ_KEY)throw Error('Groq not configured');
  const response=await fetch('https://api.groq.com/openai/v1/chat/completions',{
    method:'POST',headers:{Authorization:`Bearer ${process.env.GROQ_KEY}`,'Content-Type':'application/json'},
    body:JSON.stringify({model:'openai/gpt-oss-120b',messages,max_tokens:max,reasoning_effort:'low'}),
    signal:AbortSignal.timeout(120000),
  });
  const data=await response.json();
  if(!response.ok)throw Object.assign(Error(`Groq ${response.status}: ${String(data.error?.message||'request failed').slice(0,160)}`),{status:response.status});
  const choice=data.choices?.[0];
  return {testo:String(choice?.message?.content||'').replace(/<think>[\s\S]*?<\/think>/g,''),usage:data.usage||null,tagliato:choice?.finish_reason==='length'};
}
