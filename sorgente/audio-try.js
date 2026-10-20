// Riquadro "Try it now" della pagina /audio: voce → testo (registra o carica un file) e testo → voce.
// La voce si converte qui, nel browser, in WAV 16 kHz mono: il server ne conosce la durata esatta (e il costo).
const box = document.getElementById('try-audio');
const SECONDI_MAX = Number(box?.dataset.secondi) || 30;

// audio qualsiasi (webm, mp4, mp3, wav…) → WAV 16 kHz mono 16 bit, tagliato a SECONDI_MAX
async function inWav(blob) {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  let dec;
  try { dec = await ctx.decodeAudioData(await blob.arrayBuffer()); } finally { ctx.close?.(); }
  const durata = Math.min(dec.duration, SECONDI_MAX);
  const off = new OfflineAudioContext(1, Math.max(1, Math.ceil(durata * 16000)), 16000);
  const src = off.createBufferSource();
  src.buffer = dec;
  src.connect(off.destination);
  src.start();
  const pcm = (await off.startRendering()).getChannelData(0);
  const buf = new ArrayBuffer(44 + pcm.length * 2);
  const v = new DataView(buf);
  const scrivi = (i, s) => [...s].forEach((c, k) => v.setUint8(i + k, c.charCodeAt(0)));
  scrivi(0, 'RIFF'); v.setUint32(4, 36 + pcm.length * 2, true); scrivi(8, 'WAVE'); scrivi(12, 'fmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, 16000, true);
  v.setUint32(28, 32000, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); scrivi(36, 'data'); v.setUint32(40, pcm.length * 2, true);
  for (let i = 0; i < pcm.length; i++) v.setInt16(44 + i * 2, Math.max(-1, Math.min(1, pcm[i])) * 0x7fff, true);
  return { b64: base64(new Uint8Array(buf)), tagliato: dec.duration > SECONDI_MAX + 0.2 };
}
function base64(u8) {
  let s = '';
  for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
  return btoa(s);
}
const rimasteTesto = (n) => (n > 0 ? `${n} free audio tr${n === 1 ? 'y' : 'ies'} left today.` : 'That was your last free audio try today.');
async function chiedi(corpo) {
  const r = await fetch('/api/audio', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(d.errore || 'Something went wrong. Try again in a minute.'), { rimaste: d.rimaste });
  return d;
}

if (box) {
  // ---- voce → testo
  const stt = box.querySelector('[data-parte="stt"]');
  const tastoReg = stt.querySelector('.reg');
  const file = stt.querySelector('input[type=file]');
  const statoS = stt.querySelector('.prova-stato');
  const uscitaS = stt.querySelector('.prova-risposta');
  let rec = null, timer = null, inizio = 0;

  async function trascrivi(blob) {
    tastoReg.disabled = true; file.disabled = true;
    statoS.textContent = 'Transcribing…';
    uscitaS.hidden = true;
    try {
      const { b64, tagliato } = await inWav(blob);
      const d = await chiedi({ tipo: 'stt', audio: b64 });
      uscitaS.textContent = d.testo;
      uscitaS.hidden = false;
      statoS.textContent = `${d.secondi} s of audio${d.lingua ? `, language: ${d.lingua}` : ''}${tagliato ? ` (only the first ${SECONDI_MAX} s)` : ''}. ${rimasteTesto(d.rimaste)}`;
      if (window.gtag) window.gtag('event', 'prova_audio', { tipo: 'stt' });
      if (d.rimaste <= 0) return;
    } catch (e) {
      statoS.textContent = e.name === 'EncodingError' || e.name === 'NotSupportedError' ? 'This file could not be read. Try an MP3, WAV or M4A.' : e.message;
      if (e.rimaste === 0) return;
    }
    tastoReg.disabled = false; file.disabled = false;
  }
  function ferma() {
    clearInterval(timer);
    if (rec && rec.state !== 'inactive') rec.stop();
  }
  tastoReg.addEventListener('click', async () => {
    if (rec && rec.state === 'recording') return ferma();
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) { statoS.textContent = 'This browser cannot record. Upload a file instead.'; return; }
    let flusso;
    try { flusso = await navigator.mediaDevices.getUserMedia({ audio: true }); } catch { statoS.textContent = 'Microphone blocked. Allow it in the browser, or upload a file.'; return; }
    const pezzi = [];
    rec = new MediaRecorder(flusso);
    rec.ondataavailable = (e) => e.data.size && pezzi.push(e.data);
    rec.onstop = () => {
      flusso.getTracks().forEach((t) => t.stop());
      tastoReg.textContent = 'Record';
      tastoReg.classList.remove('in-corso');
      trascrivi(new Blob(pezzi, { type: rec.mimeType }));
    };
    rec.start();
    inizio = Date.now();
    tastoReg.textContent = 'Stop';
    tastoReg.classList.add('in-corso');
    uscitaS.hidden = true;
    timer = setInterval(() => {
      const s = Math.floor((Date.now() - inizio) / 1000);
      statoS.textContent = `Recording… ${s} s of ${SECONDI_MAX}`;
      if (s >= SECONDI_MAX) ferma();
    }, 250);
  });
  file.addEventListener('change', () => { if (file.files[0]) trascrivi(file.files[0]); file.value = ''; });

  // ---- testo → voce
  const tts = box.querySelector('[data-parte="tts"]');
  const form = tts.querySelector('form');
  const campo = tts.querySelector('textarea');
  const lingua = tts.querySelector('select');
  const tastoT = tts.querySelector('button');
  const statoT = tts.querySelector('.prova-stato');
  const lettore = tts.querySelector('audio');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const testo = campo.value.trim();
    if (!testo) return;
    tastoT.disabled = true;
    statoT.textContent = 'Speaking…';
    lettore.hidden = true;
    try {
      const d = await chiedi({ tipo: 'tts', testo, lingua: lingua.value });
      const byte = Uint8Array.from(atob(d.audio), (c) => c.charCodeAt(0));
      if (lettore.src) URL.revokeObjectURL(lettore.src);
      lettore.src = URL.createObjectURL(new Blob([byte], { type: d.tipoAudio }));
      lettore.hidden = false;
      lettore.play().catch(() => {});
      statoT.textContent = `${d.secondi} s of speech. ${rimasteTesto(d.rimaste)}`;
      tastoT.disabled = d.rimaste <= 0;
      if (window.gtag) window.gtag('event', 'prova_audio', { tipo: 'tts' });
    } catch (err) {
      statoT.textContent = err.message;
      tastoT.disabled = err.rimaste === 0;
    }
  });
}
