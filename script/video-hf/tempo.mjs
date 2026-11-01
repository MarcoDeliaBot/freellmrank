// Teaching windows may contract for a short, grounded reserve script. Keep
// enough time to read the slide and reject extreme stretching after adapting.
export function fitWindow(piano,scene,voiceSeconds) {
  const original=piano.tempiFissi===true?Number(scene.durata):null;
  if(original==null)return {fixed:null,target:null,speed:1,adapted:false};
  if(!(original>=2&&original<=60))throw Error(`Invalid fixed scene duration: ${original}`);
  const sustained=piano.teaching&&piano.formato==='verticale'&&scene.role!=='link';
  let fixed=original;
  const minimum=Math.min(original,Math.max(scene.role==='identity'?5:2,scene.dati?.comando?3:2));
  const nominal=sustained?fixed*.92:fixed-.15;
  if(piano.teaching&&scene.role!=='link'&&voiceSeconds/nominal<.5)
    fixed=+Math.min(original,Math.max(minimum,voiceSeconds/(sustained?.92:.75))).toFixed(3);
  if(sustained&&scene.role==='identity'&&voiceSeconds<original*.92)fixed=+Math.max(5,voiceSeconds/.92).toFixed(3);
  const target=sustained?fixed*.92:fixed-.15;
  const speed=voiceSeconds/target;
  if(speed>1.8)throw Error(`Narration exceeds its reading window (${speed.toFixed(2)}x)`);
  if(sustained&&scene.role==='identity'&&speed<.999)throw Error('Identity narration must fill at least five seconds without slowing down');
  if(piano.teaching&&scene.role!=='link'&&speed<.5)throw Error(`Narration is too short for its teaching window (${speed.toFixed(2)}x)`);
  return {fixed,target,speed,sustained,adapted:fixed!==original,original};
}
