---
title: FreeLLMArena voices
emoji: 🔊
colorFrom: green
colorTo: gray
sdk: gradio
sdk_version: 5.9.1
app_file: app.py
pinned: false
license: mit
short_description: Free Piper voices in Italian, German, Portuguese
---

# FreeLLMArena voices

Text to speech for [freellmarena.com/audio](https://freellmarena.com/audio) with open
[Piper](https://github.com/rhasspy/piper) voices (MIT license, from
[rhasspy/piper-voices](https://huggingface.co/rhasspy/piper-voices)): Italian, German and Portuguese.

Runs on the free CPU of Hugging Face. Text is not stored. Limit: 600 characters, 10 requests a minute per visitor.

`POST /tts` with `{"text": "...", "voice": "it_IT-paola-medium"}` returns a WAV file.
