# Space Hugging Face «freellmarena-voices»: voci Piper (MIT) in italiano, tedesco e portoghese per freellmarena.com/audio.
# Gira sulla CPU gratuita di Hugging Face: il visitatore non scarica niente. Il testo non si salva da nessuna parte.
# POST /tts {"text": "...", "voice": "it_IT-paola-medium"} → audio/wav · GET / → stato e voci.
import io, os, time, wave, threading
from collections import defaultdict, deque
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
from huggingface_hub import hf_hub_download
from piper import PiperVoice

VOCI = {
    "it_IT-paola-medium": "it/it_IT/paola/medium",
    "it_IT-riccardo-x_low": "it/it_IT/riccardo/x_low",
    "de_DE-thorsten-medium": "de/de_DE/thorsten/medium",
    "pt_BR-faber-medium": "pt/pt_BR/faber/medium",
    "pt_PT-tugão-medium": "pt/pt_PT/tugão/medium",
}
MAX_CARATTERI = 600
PER_MINUTO = 10          # richieste per indirizzo al minuto: la CPU gratuita è una sola per tutti
ORIGINI = ["https://freellmarena.com", "http://127.0.0.1:8787", "http://localhost:8787"]

_caricate, _blocco = {}, threading.Lock()
def voce(id_):
    # ogni voce si scarica da rhasspy/piper-voices la prima volta che serve, poi resta in memoria
    with _blocco:
        if id_ not in _caricate:
            base = VOCI[id_]
            onnx = hf_hub_download("rhasspy/piper-voices", f"{base}/{id_}.onnx")
            hf_hub_download("rhasspy/piper-voices", f"{base}/{id_}.onnx.json")
            _caricate[id_] = PiperVoice.load(onnx)
        return _caricate[id_]

def sintetizza(v, testo):
    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        if hasattr(v, "synthesize_wav"):   # piper-tts 1.3
            v.synthesize_wav(testo, w)
        else:                              # piper-tts 1.2
            v.synthesize(testo, w)
    return buf.getvalue()

_visti = defaultdict(deque)
def troppe(ip):
    adesso, coda = time.time(), _visti[ip]
    while coda and adesso - coda[0] > 60: coda.popleft()
    if len(coda) >= PER_MINUTO: return True
    coda.append(adesso); return False

app = FastAPI(title="FreeLLMArena voices", docs_url=None, redoc_url=None)
app.add_middleware(CORSMiddleware, allow_origins=ORIGINI, allow_methods=["GET", "POST"], allow_headers=["Content-Type"])

@app.get("/")
def stato():
    return {"ok": True, "voices": list(VOCI), "loaded": list(_caricate), "max_chars": MAX_CARATTERI, "site": "https://freellmarena.com/audio"}

@app.post("/tts")
async def tts(richiesta: Request):
    ip = (richiesta.headers.get("x-forwarded-for") or richiesta.client.host or "x").split(",")[0].strip()
    if troppe(ip): return JSONResponse({"error": "Too many requests. Wait a minute."}, 429)
    try: corpo = await richiesta.json()
    except Exception: return JSONResponse({"error": "Bad request."}, 400)
    testo = str(corpo.get("text", "")).strip()[:MAX_CARATTERI]
    id_ = str(corpo.get("voice", ""))
    if id_ not in VOCI: return JSONResponse({"error": "Unknown voice."}, 400)
    if not testo: return JSONResponse({"error": "Write some text first."}, 400)
    wav = sintetizza(voce(id_), testo)
    return Response(wav, media_type="audio/wav", headers={"Cache-Control": "no-store"})

# all'avvio si prepara la voce italiana, così la prima richiesta non aspetta il download
threading.Thread(target=lambda: voce("it_IT-paola-medium"), daemon=True).start()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", 7860)))
