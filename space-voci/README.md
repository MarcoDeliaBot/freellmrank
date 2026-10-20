---
title: FreeLLMArena voices
emoji: 🔊
colorFrom: green
colorTo: gray
sdk: gradio
sdk_version: 6.29.1
python_version: "3.12"
app_file: app.py
pinned: false
license: mit
short_description: Free Piper voices in Italian, German, Portuguese
---

# FreeLLMArena voices

Text to speech for [freellmarena.com/audio](https://freellmarena.com/audio) with open
[Piper](https://github.com/rhasspy/piper) voices (MIT license, from
[rhasspy/piper-voices](https://huggingface.co/rhasspy/piper-voices)): Italian, German and Portuguese.

Runs on free ZeroGPU hardware, but the voices use only the CPU: no GPU quota is used. Text is not stored. Limit: 600 characters.

API: `POST /gradio_api/call/parla` with `{"data": ["text", "it_IT-paola-medium"]}`, then `GET /gradio_api/call/parla/<event_id>` for the WAV link.
