---
titolo: Top Free Open-Source Speech-to-Text and Text-to-Speech Models
descr: Find the best open STT models with low word error rates and top TTS models with high community scores, all under permissive licenses.
data: 2026-11-09
---

The top free and open speech-to-text (STT) models and the most popular text-to-speech (TTS) models are listed below, along with their error rates or community scores. All of them are available under permissive licenses.

## Best open speech-to-text models

The word error rate (WER) measures how many words a model gets wrong; lower percentages are better. The ranking uses eight English test sets.

| Rank | Model | WER | Parameters | License |
|------|-------|-----|------------|---------|
| 1 | Qwen/Qwen3-ASR-1.7B-hf | 4.31 % | 2.04 B | apache-2.0 |
| 2 | HojoAI/Hojo-ASR-V1 | 4.33 % | 5.18 B | apache-2.0 |
| 3 | bosonai/higgs-audio-v3-stt | 4.39 % | 2.68 B | apache-2.0 |
| 4 | ibm-granite/granite-speech-5.0-2b | 4.42 % | 2.31 B | apache-2.0 |
| 5 | nvidia/canary-qwen-2.5b | 4.43 % | 2.5 B | cc-by-4.0 |
| 6 | Edge0/ARK-ASR-3B | 4.47 % | 3.75 B | apache-2.0 |
| 7 | TheStageAI/thewhisper-large-v3-turbo | 4.54 % | 0.8 B | cc-by-4.0 |
| 8 | Edge0/ARK-ASR-0.6B | 4.56 % | 1.15 B | apache-2.0 |
| 9 | ibm-granite/granite-speech-4.1-2b | 4.62 % | 2 B | apache-2.0 |
|10 | OpenMOSS-Team/MOSS-Transcribe-Diarize | 4.64 % | 0.91 B | apache-2.0 |

All models are released under Apache 2.0 or CC-BY-4.0 licenses.

### How to try an STT model

1. **Pick a model**: The site offers Whisper Large v3 Turbo for a quick test, running up to 30 seconds of audio without an account.  
2. **Run inference**: A typical usage pattern with the `transformers` library looks like:

```python
from transformers import pipeline
asr = pipeline("automatic-speech-recognition", model="Qwen/Qwen3-ASR-1.7B-hf")
text = asr("audio.wav")["text"]
print(text)
```

## Best open text-to-speech models

Community votes on FreeLLMArena rank the TTS models. Higher scores indicate better perceived naturalness and quality.

| Rank | Model | Score | Votes |
|------|-------|-------|-------|
| 1 | hexgrad/kokoro | 1211 | 34 226 |
| 2 | MohamedRashad/Orpheus-TTS | 1198 | 18 700 |
| 3 | Qwen/Qwen3-TTS-Voice-Design | 1189 | 1 930 |
| 4 | Qwen/Qwen3-TTS | 1125 | 8 460 |
| 5 | coqui/xtts | 1114 | 10 822 |
| 6 | OpenMOSS-Team/MOSS-TTS | 1102 | 1 660 |
| 7 | ResembleAI/Chatterbox | 1099 | 5 597 |
| 8 | IndexTeam/IndexTTS | 1076 | 2 067 |
| 9 | ByteDance/MegaTTS3 | 1072 | 2 601 |
|10 | parler-tts/parler_tts | 1058 | 10 778 |

These models are also released under permissive licenses.

### How to try a TTS model

1. **Select a model**: MeloTTS can be tested instantly on the site without registration.  
2. **Generate speech**: Using the `transformers` pipeline:

```python
from transformers import pipeline
tts = pipeline("text-to-speech", model="hexgrad/kokoro")
audio = tts("Hello, welcome to FreeLLMArena!")
audio.save("welcome.wav")
```

## Quick start without installing anything

FreeLLMArena’s audio page lets visitors test two models directly in the browser:

* **Whisper Large v3 Turbo**: Speech-to-text, up to 30 seconds of audio.  
* **MeloTTS**: Text-to-speech, generates a short clip from typed text.

Both run in the cloud and return results instantly.

## Where to explore further

For a full list of free speech models, visit the [audio page](/audio) on FreeLLMArena. You’ll find download links, hardware compatibility tables, and community rankings to help you choose the best fit for your project.
