# Space Hugging Face «freellmarena-voices»: voci Piper (MIT) in italiano, tedesco e portoghese per freellmarena.com/audio.
# Account gratuito: Hugging Face permette solo Space Gradio su ZeroGPU (CPU Basic richiede PRO, 20/10/2026).
# Piper gira sulla CPU dello Space: la funzione delle voci NON usa la GPU e non consuma la quota ZeroGPU di nessuno.
# API (la usa il sito): POST /gradio_api/call/parla {"data": [testo, voce]} → event_id; GET /gradio_api/call/parla/<event_id>.
# Il testo non si salva da nessuna parte.
import os, tempfile, threading, wave
import gradio as gr
import spaces
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

def parla(testo, id_voce):
    testo = str(testo or "").strip()[:MAX_CARATTERI]
    if id_voce not in VOCI: raise gr.Error("Unknown voice.")
    if not testo: raise gr.Error("Write some text first.")
    v = voce(id_voce)
    fd, percorso = tempfile.mkstemp(suffix=".wav"); os.close(fd)
    with wave.open(percorso, "wb") as w:
        if hasattr(v, "synthesize_wav"): v.synthesize_wav(testo, w)   # piper-tts 1.3
        else: v.synthesize(testo, w)                                  # piper-tts 1.2
    return percorso

# ZeroGPU vuole almeno una funzione con @spaces.GPU: questa non viene mai chiamata dalle voci,
# che restano sulla CPU (fuori da ZeroGPU il decoratore non fa niente)
@spaces.GPU(duration=5)
def _gpu_non_usata():
    return "unused"

with gr.Blocks(title="FreeLLMArena voices") as demo:
    gr.Markdown("# FreeLLMArena voices\nOpen Piper voices (MIT) in Italian, German and Portuguese, for [freellmarena.com/audio](https://freellmarena.com/audio). Text is not stored. Up to 600 characters.")
    testo = gr.Textbox(label="Text", max_length=MAX_CARATTERI, value="Ciao! Questa voce è aperta e gratuita.")
    scelta = gr.Dropdown(list(VOCI), value="it_IT-paola-medium", label="Voice")
    audio = gr.Audio(label="Speech", type="filepath")
    gr.Button("Speak").click(parla, [testo, scelta], audio, api_name="parla", concurrency_limit=2)

# all'avvio si prepara la voce italiana, così la prima richiesta non aspetta il download
threading.Thread(target=lambda: voce("it_IT-paola-medium"), daemon=True).start()
demo.queue(max_size=30).launch()
