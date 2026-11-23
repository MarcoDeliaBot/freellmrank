---
titolo: Top free open speech-to-text and text-to-speech models
descr: FreeLLMArena ranks open speech-to-text models by lowest word error rate and text-to-speech models by highest human vote scores.
data: 2026-11-23
---

The best free and open speech-to-text models have the lowest word error rates on English test sets. The best free and open text-to-speech models have the highest scores in blind human votes.

## Top speech-to-text models

FreeLLMArena lists open speech-to-text models by average word error rate (WER). Lower WER indicates more accurate transcription. The three models with the lowest WER are **Qwen/Qwen3-ASR-1.7B-hf**, **HojoAI/Hojo-ASR-V1**, and **bosonai/higgs-audio-v3-stt**.

| Rank | Model | WER | Parameters | License |
|------|-------|-----|------------|---------|
| 1 | Qwen/Qwen3-ASR-1.7B-hf | 4.31% | 2.04 B | apache-2.0 |
| 2 | HojoAI/Hojo-ASR-V1 | 4.33% | 5.18 B | apache-2.0 |
| 3 | bosonai/higgs-audio-v3-stt | 4.39% | 2.68 B | apache-2.0 |
| 4 | ibm-granite/granite-speech-5.0-2b | 4.42% | 2.31 B | apache-2.0 |
| 5 | nvidia/canary-qwen-2.5b | 4.43% | 2.5 B | cc-by-4.0 |
| 6 | Edge0/ARK-ASR-3B | 4.47% | 3.75 B | apache-2.0 |
| 7 | TheStageAI/thewhisper-large-v3-turbo | 4.54% | 0.8 B | cc-by-4.0 |
| 8 | Edge0/ARK-ASR-0.6B | 4.56% | 1.15 B | apache-2.0 |
| 9 | ibm-granite/granite-speech-4.1-2b | 4.62% | 2 B | apache-2.0 |
| 10 | OpenMOSS-Team/MOSS-Transcribe-Diarize | 4.64% | 0.91 B | apache-2.0 |

All models are released under permissive open licenses.

## Top text-to-speech models

FreeLLMArena measures text-to-speech quality with blind human votes. Higher scores indicate more natural speech. The table shows the ten models that received at least 300 votes.

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
| 10 | parler-tts/parler_tts | 1058 | 10 778 |

## How to try the models on FreeLLMArena

Visitors can test two models on the **audio** page without an account:

* Transcribe up to 30 seconds of audio with **Whisper Large v3 Turbo**. This model appears in the speech-to-text table with a 4.54 % WER.  
* Generate speech from text with **MeloTTS**.

## Running the models locally

Model files are available from links on each model’s page. The data set does not include “fits fully on” information, so parameter counts can help estimate memory needs. For example, the 5.18 B-parameter HojoAI/Hojo-ASR-V1 will require more GPU memory than the 0.8 B-parameter TheStageAI/thewhisper-large-v3-turbo.

## Next steps

Visit the **audio** section of FreeLLMArena to try the demos and explore the full list of speech-to-text and text-to-speech models.  

[the audio page](/audio)
