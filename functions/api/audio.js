// POST /api/audio
//   {tipo: 'stt', audio: '<WAV 16 kHz mono in base64>'}  →  {testo, secondi, rimaste}
//   {tipo: 'tts', testo: '...', lingua: 'en'}             →  {audio: '<WAV in base64>', secondi, rimaste}
// Prova senza account dei modelli audio aperti, sulla quota gratis Cloudflare Workers AI del sito.
// Tetto giornaliero a parte (TETTO_AUDIO) e poche prove al giorno per visitatore. Non conserviamo né audio né testo.
// Legami (impostati nel progetto Pages): AI = Workers AI, PROVA = KV per i contatori, SALE = segreto.
import { AUDIO_STT, AUDIO_TTS, TETTO_AUDIO, AUDIO_PER_VISITATORE } from '../../script/cf-modelli.mjs';

const ORIGINI = ['https://freellmarena.com', 'http://127.0.0.1:8788', 'http://localhost:8788'];
const json = (dati, stato = 200) => new Response(JSON.stringify(dati), { status: stato, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });

async function impronta(ip, giorno, sale) {
  // il contatore non conserva l'indirizzo IP: solo un'impronta che cambia ogni giorno
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${sale}|${giorno}|${ip}`));
  return [...new Uint8Array(b)].slice(0, 12).map((x) => x.toString(16).padStart(2, '0')).join('');
}

// legge l'intestazione WAV (i primi 44 byte) da una stringa base64; null se non è un WAV PCM
function intestazioneWav(b64) {
  let h;
  try { h = Uint8Array.from(atob(b64.slice(0, 60)), (c) => c.charCodeAt(0)); } catch { return null; }
  if (h.length < 44) return null;
  const v = new DataView(h.buffer);
  const testo = (i) => String.fromCharCode(...h.slice(i, i + 4));
  if (testo(0) !== 'RIFF' || testo(8) !== 'WAVE' || testo(12) !== 'fmt ' || v.getUint16(20, true) !== 1) return null;
  const byte = Math.floor((b64.length * 3) / 4) - (b64.endsWith('==') ? 2 : b64.endsWith('=') ? 1 : 0);
  const canali = v.getUint16(22, true), frequenza = v.getUint32(24, true), bit = v.getUint16(34, true);
  return { canali, frequenza, bit, secondi: (byte - 44) / (frequenza * canali * (bit / 8)) };
}

export async function onRequestPost({ request, env }) {
  const origine = request.headers.get('Origin');
  if (origine && !ORIGINI.includes(origine)) return json({ errore: 'Not allowed.' }, 403);
  if (!env.AI || !env.PROVA) return json({ errore: 'Audio try-out is not set up yet.' }, 503);

  let corpo;
  try { corpo = await request.json(); } catch { return json({ errore: 'Bad request.' }, 400); }
  const tipo = corpo?.tipo;
  if (tipo !== 'stt' && tipo !== 'tts') return json({ errore: 'Bad request.' }, 400);

  // costo massimo prima di chiamare il modello: per la voce → testo è esatto (durata del WAV)
  let peggiore, wav, testo, lingua;
  if (tipo === 'stt') {
    wav = String(corpo?.audio || '');
    const h = intestazioneWav(wav);
    if (!h || h.canali !== 1 || h.frequenza !== 16000 || h.bit !== 16) return json({ errore: 'The recording could not be read. Try again.' }, 400);
    if (h.secondi < 0.3) return json({ errore: 'The recording is empty. Speak for at least a second.' }, 400);
    if (h.secondi > AUDIO_STT.secondiMax + 0.5) return json({ errore: `Keep it under ${AUDIO_STT.secondiMax} seconds.` }, 400);
    peggiore = (h.secondi / 60) * AUDIO_STT.neuronsMinuto;
  } else {
    testo = String(corpo?.testo || '').trim();
    lingua = AUDIO_TTS.lingue.includes(corpo?.lingua) ? corpo.lingua : 'en';
    if (!testo) return json({ errore: 'Write some text first.' }, 400);
    if (testo.length > AUDIO_TTS.caratteriMax) return json({ errore: `Keep the text under ${AUDIO_TTS.caratteriMax} characters.` }, 400);
    peggiore = AUDIO_TTS.neuronsMinuto; // 300 caratteri si leggono in meno di un minuto
  }

  const giorno = new Date().toISOString().slice(0, 10); // la quota Cloudflare riparte a mezzanotte UTC
  const chiaveSpesa = `audio-spesa:${giorno}`;
  const chiaveIp = `audio-ip:${await impronta(request.headers.get('CF-Connecting-IP') || 'x', giorno, env.SALE || '')}`;
  const [spesaTesto, usateTesto] = await Promise.all([env.PROVA.get(chiaveSpesa), env.PROVA.get(chiaveIp)]);
  const spesa = Number(spesaTesto) || 0, usate = Number(usateTesto) || 0;

  if (usate >= AUDIO_PER_VISITATORE) return json({ errore: `You used your ${AUDIO_PER_VISITATORE} free audio tries for today. Come back tomorrow.`, rimaste: 0 }, 429);
  if (spesa + peggiore > TETTO_AUDIO) return json({ errore: 'Today’s free audio tries are finished for everyone. They come back at midnight UTC.', rimaste: 0 }, 429);

  // prima si conta la prova del visitatore, poi si chiama il modello
  await env.PROVA.put(chiaveIp, String(usate + 1), { expirationTtl: 60 * 60 * 26 });
  let r;
  try {
    r = tipo === 'stt'
      ? await env.AI.run(AUDIO_STT.id, { audio: wav, task: 'transcribe' })
      : await env.AI.run(AUDIO_TTS.id, { prompt: testo, lang: lingua });
  } catch {
    return json({ errore: 'The model did not answer. Try again in a minute.' }, 502);
  }
  const rimaste = AUDIO_PER_VISITATORE - usate - 1;

  if (tipo === 'stt') {
    const secondi = Number(r?.transcription_info?.duration) || (peggiore / AUDIO_STT.neuronsMinuto) * 60;
    await env.PROVA.put(chiaveSpesa, String(Math.round((spesa + (secondi / 60) * AUDIO_STT.neuronsMinuto) * 100) / 100), { expirationTtl: 60 * 60 * 48 });
    return json({ testo: String(r?.text || '').trim() || '(No words heard. Speak closer to the microphone.)', lingua: r?.transcription_info?.language || null, secondi: Math.round(secondi * 10) / 10, rimaste });
  }
  const audio = typeof r?.audio === 'string' ? r.audio : '';
  const h = intestazioneWav(audio);
  const secondi = h ? h.secondi : 60;
  await env.PROVA.put(chiaveSpesa, String(Math.round((spesa + (Math.min(secondi, 60) / 60) * AUDIO_TTS.neuronsMinuto) * 100) / 100), { expirationTtl: 60 * 60 * 48 });
  if (!audio) return json({ errore: 'The model returned no audio. Try a shorter text.', rimaste }, 502);
  return json({ audio, tipoAudio: h ? 'audio/wav' : 'audio/mpeg', secondi: Math.round(secondi * 10) / 10, rimaste });
}

export const onRequestGet = () => json({ errore: 'Use POST.' }, 405);
