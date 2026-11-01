// Each item is its own transaction: only a card with both verified formats is
// staged. Rejected candidates remain diagnostics and cannot veto other cards.
export async function runCandidates({candidates,limit,processCard,onSuccess=async()=>{},onProgress=async()=>{},summary}) {
  let passed=0;
  for(const candidate of candidates) {
    if(passed>=limit)break;
    try {
      const result=await processCard(candidate);
      await onSuccess(result,candidate);
      summary.completed.push(result);passed++;
    } catch(error) {
      summary.rejected.push({tipo:candidate.tipo,slug:candidate.slug,name:candidate.name,reason:error.message});
    }
    await onProgress(summary);
  }
  return passed;
}

export async function finishNight(summary,{notify,trial=false,date=new Date().toISOString().slice(0,10)}={}) {
  if(summary.completed.length) {
    summary.finished=new Date().toISOString();return summary;
  }
  const error='No skill or tutorial passed all publication gates';
  if(!summary.errors.includes(error))summary.errors.push(error);
  if(!trial&&notify&&!summary.healthAttempted) {
    summary.healthAttempted=true;
    const issue=await notify(`Skill e tutorial: nessun contenuto verificato il ${date}`,
      `${error}.\n\nCorsa: ${process.env.GITHUB_RUN_ID||'locale'}\n\n${summary.rejected.map(c=>`${c.tipo} ${c.name||c.slug}: ${c.reason}`).join('\n').slice(0,30000)}`,['salute']);
    summary.healthIssue=issue.html_url;
  }
  throw Error(error);
}
