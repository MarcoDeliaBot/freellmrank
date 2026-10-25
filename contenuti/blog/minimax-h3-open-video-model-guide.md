---
titolo: MiniMax H3: the best open video model, and the license catch you need to know
descr: First in the Arena image-to-video ranking and the only open model in the video top 10. What it does, how it works, the hardware it needs, where to try it free, and why it is not licensed in the EU, UK, US and Korea.
data: 2026-10-25
tema: Guides
---

MiniMax H3 is the strongest video model you can download. In blind Arena votes it is **first of 48 models in image-to-video**, ahead of Google, ByteDance and Alibaba, and it is the only model with open weights in the top 10 of all three video rankings. It makes up to 15 seconds of video with sound in a single pass: dialogue in 11 languages, sound effects and music, all generated together with the picture.

There is one catch, and it is a big one for many of our readers. The license that comes with the weights **does not cover the European Union, the United Kingdom, South Korea or the United States**. If you live there, the free download is not for you, at least for now.

This guide covers what we could verify on 25 October 2026: the rankings, what the model can do, how it is built, what is open and what is not, the license in plain words, the hardware it needs, and the free ways to try it.

**In short**

- Released on Hugging Face on 28 July 2026 by MiniMax, the company behind the Hailuo video app.
- Text, images, video and audio in; video with stereo sound out, 4 to 15 seconds, up to 2K through MiniMax's service.
- Arena: 1st in image-to-video (1495), 8th in text-to-video (1460), 3rd in video editing (1392).
- A 33-billion-parameter video model plus a 32-billion-parameter encoder: about 196 GB at full precision; ComfyUI's smallest build of the video part is 16 GB.
- License: free, including commercial use, everywhere except the EU, UK, South Korea and the US.

## Where it ranks

Arena runs blind tests: people see two videos made from the same prompt by two anonymous models and vote for the better one. These are the top of the three video rankings, from Arena's latest published data.

**Image to video** (22 September 2026, 48 models):

| # | Model | Score | Weights |
|---|---|---|---|
| 1 | **MiniMax H3** | **1495** | open |
| 2 | Gemini Omni 1.1 Flash | 1488 | closed |
| 3 | Wan 3.0 | 1480 | closed |
| 4 | Seedance 2.5 (720p) | 1477 | closed |
| 5 | Seedance 2.0 (720p) | 1475 | closed |

**Text to video** (22 September 2026, 48 models):

| # | Model | Score | Weights |
|---|---|---|---|
| 1 | Gemini Omni 1.1 Flash | 1516 | closed |
| 2 | Gemini Omni Flash | 1513 | closed |
| 3 | FLUX.3 Video | 1493 | closed |
| 4 | Grok Imagine Video 1.5 | 1492 | closed |
| 8 | **MiniMax H3** | **1460** | open |

**Video editing** (27 August 2026, 10 models):

| # | Model | Score | Weights |
|---|---|---|---|
| 1 | Wan 3.0 | 1414 | closed |
| 2 | Seedance 2.5 (720p) | 1410 | closed |
| 3 | **MiniMax H3** | **1392** | open |

Image-to-video is where it shines: you give it a picture and it brings it to life, and people prefer its results to every closed service in the test. From text alone it is 56 points behind Google's best. See all video rankings on our [leaderboard](/#video) and the [MiniMax H3 page](/model/minimax-h3).

## What it can do

The [official model card](https://huggingface.co/MiniMaxAI/MiniMax-H3) lists these outputs:

| Item | Specification |
|---|---|
| Length | 4 to 15 seconds |
| Shapes | 21:9, 16:9, 4:3, 1:1, 3:4, 9:16 and others |
| Resolution | short side 768 pixels by default; 2K through MiniMax's regeneration service |
| Frame rate | 24 frames per second |
| Sound | 32 kHz stereo, in the same pass as the video |
| Spoken languages | stable in Arabic, Chinese, English, French, German, Italian, Japanese, Korean, Portuguese, Russian and Spanish |

It comes as two checkpoints for different jobs:

- **FL2VA (first and last frame).** With no image, it makes video from text. With one image, it uses it as the first or the last frame. With two images, it fills the motion between them.
- **Ref2VA (references).** It takes up to 9 images, 3 video clips and 3 audio clips as references, up to 12 files in total. You can keep a character's face, reuse a song from a clip, or make someone speak with the voice from a recording. One official example takes a man holding a lamb in a field, makes him say two new lines with the voice from a separate recording, and keeps the original background music under the speech.

Italian is on the list of stable dialogue languages, which is rare: most video models with sound speak only English and Chinese well.

## How it works

MiniMax describes H3 as three blocks, and only one of them is fully in the download.

**1. H3-Context-IR (not open).** Before generating, a hosted system reads your text, images, audio and clips, works out how they relate, and rewrites everything into a long, structured description: shots with timestamps, the soundscape, and the music. MiniMax says this step is "critical to the quality of the final output". Because it uses several hosted models and services, it is not part of the release. You can call it through MiniMax's API, or write prompts in the same style yourself (see the tips below).

**2. H3-Base (open).** This is the model you download. Text is read by an encoder built on the full weights of **Qwen3-VL-32B** (H3 uses its 50th layer). Pictures go through both that encoder and a video autoencoder that compresses each frame 16 times in each direction and the time axis 4 times; audio goes through its own autoencoder at 40 steps per second for each channel. A single **33-billion-parameter transformer** then predicts video and sound together, so lips, footsteps and music land on the right frames. About 13 billion of those parameters sit in modulation branches whose outputs can be computed in advance, so a deployment that only generates does not need to load them.

**3. H3-Regenerate-2K (not open yet).** Instead of a classic upscaler, MiniMax feeds the 768p result back into H3 together with the original context and lets the model redraw it at 2K. This recovers small text and fine details that an upscaler would have to guess. MiniMax says it will release this module "once it is ready"; for now it is only in the API.

Two more things are missing from the first release: the "sparse attention" that MiniMax used at the end of training to make long videos cheaper (promised for a future update), and the 2K module above. The open model runs with full attention at 768p.

## The license, in plain words

We read the [MiniMax H3 Community License](https://huggingface.co/MiniMaxAI/MiniMax-H3/blob/main/LICENSE) and MiniMax's [questions and answers about it](https://huggingface.co/MiniMaxAI/MiniMax-H3/blob/main/docs/QA-about-License.md).

**Where it applies.** The license covers the whole world **except** the European Union, the United Kingdom, the Republic of Korea and the United States. In those places, it says you may not use, copy, modify, distribute or display the model, its derivatives **or their outputs**. People and companies there can [apply for a separate license](https://platform.minimax.io/h3-license), which MiniMax grants case by case after checking the safeguards.

MiniMax explains why: the rules for video models that can generate real people's faces and voices are still being written in those regions, and the company is involved in copyright cases about video AI in the US. It calls the restriction "not yet", not "not ever", and promises to announce changes openly. Its official API stays available worldwide, because there MiniMax runs the servers and controls the safety filters.

**Where it applies, what you can do.** Use, modify, fine-tune and redistribute the model royalty-free, including in commercial products, with these conditions:

- If your commercial products and services make more than $20 million, you need written authorization from MiniMax first.
- A commercial product that uses H3 must show "MiniMax H3" prominently in its interface.
- You may not use H3 or its outputs to train or improve any other AI model.
- If you offer H3 generation to other people as a service, you take on extra obligations described in the license.
- MiniMax claims no rights over the videos you make; you are responsible for them.

One more detail: ComfyUI's official guide states that commercial use of videos generated locally requires a MiniMax commercial license, sold through Comfy, and that videos made on Comfy Cloud already include commercial rights. Read the current terms before you sell anything made with H3.

## Where to try it for free

- **The official demo on Hugging Face.** MiniMax publishes [MiniMax H3 Turbo LoRA](https://huggingface.co/spaces/MiniMaxAI/MiniMax-H3-Turbo-Lora), a Space running on free ZeroGPU hardware. You sign in with a free Hugging Face account; free accounts get a limited daily amount of GPU time. Its notes explain how it fits the full 195.9 GiB model by splitting it across two Spaces.
- **Community demos.** Others run faster, compressed versions, such as [multimodalart/minimax-h3](https://huggingface.co/spaces/multimodalart/minimax-h3).
- **Your own computer**, with the hardware below.

Important: if you are in the EU, UK, US or South Korea, the license as written also covers using the outputs of hosted copies, including these demos. In those regions, use H3 through MiniMax itself: its API, which MiniMax says is available worldwide, or its [Hailuo app](https://hailuoai.video/tools/minimax-h3), under MiniMax's terms and prices.

## Hardware: can you run it at home?

Yes, with a strong GPU and plenty of system RAM, and with patience. The parts, at full precision (from the [vLLM recipe](https://recipes.vllm.ai/MiniMaxAI/MiniMax-H3)):

| Part | Size (BF16) |
|---|---|
| Video and sound transformer, one per checkpoint | 66.3 GB |
| Text and image encoder (Qwen3-VL layers) | 51.5 GB |
| Video autoencoder | about 10 GB |
| Audio autoencoder | about 0.6 GB |

Ways to make it fit:

- **ComfyUI** offers compressed builds. The video transformer comes in four sizes: 16 GB (6-bit weights, the smallest), 21 GB (8-bit, the default in its templates), 40 GB (pruned, full precision) and 66 GB (complete). The pruned builds drop the modulation branches that generation does not need. Comfy's advice: "Pick the smallest build that fits in VRAM." The encoder and autoencoders come on top, and ComfyUI can keep parts in system RAM.
- **vLLM** documents a low-memory setup for **two RTX 5090 (32 GB) or two RTX 4090 (24 GB)** cards that streams parts of the model from system memory, and recommends a host with about 384 GB of RAM for it. On two RTX 4090s it starts from 1024×576 instead of 1344×768.
- **SGLang**, MiniMax's own example, uses 4 GPUs.

So with ComfyUI's 16 GB or 21 GB build, a 24 GB card such as an RTX 4090 is the natural starting point, with plenty of system RAM for the parts that do not fit. We have not timed it ourselves, so we give no speed figures. Check which models fit your card in [Run at home](/home).

**Getting started with ComfyUI** (from Comfy's guide): update ComfyUI to the latest version, open Template Library, then Video, pick a MiniMax H3 workflow, and let it download the models it asks for. It is tens of GB, so allow time and disk space. The weights for ComfyUI are in [Comfy-Org/MiniMax-H3](https://huggingface.co/Comfy-Org/MiniMax-H3).

## Prompt tips

Because the open release lacks the Context-IR step, your prompt quality matters more than with the hosted service. MiniMax publishes [prompt writing guides and skills](https://github.com/MiniMax-AI/MiniMax-H3/tree/main/skills). The official examples show the structure it expects:

- **Describe shots, not just a scene.** "[Shot 1] Cinematic, medium wide shot, pushing in slowly..." and, for a cut, "[Shot 2] At 00:04.500, the camera cuts to a close-up..."
- **Write the sound separately.** A paragraph for what you hear in the scene (steam, footsteps, a crowd) and a separate one for the music (instrument, tempo, mood).
- **Put dialogue in tags with its language**, as the examples do: `<d>[English] Follow the wind, live free.</d>` Italian works the same way.
- **Be concrete about people and objects**: age, clothes, materials, light. The official examples run to several hundred words for 5 to 10 seconds of video.

## Questions

**Is MiniMax H3 open source?** It has open weights you can download, under a custom license with regional limits. Two parts of the full system (prompt preparation and the 2K pass) are not open.

**Is it free?** Downloading and running it is free where the license applies. The official Hugging Face demo is free with daily GPU limits. MiniMax's API and app follow MiniMax's own pricing.

**Can I use it in Italy or elsewhere in the EU?** Not the downloaded weights or their outputs, under the current license, unless MiniMax grants you a separate license. MiniMax says its official API is available worldwide, EU included.

**Does it speak Italian?** Yes. Italian is one of the 11 languages MiniMax lists as stable for dialogue.

**How long and how sharp are the videos?** 4 to 15 seconds at 24 frames per second. The open model makes 768p; 2K comes from MiniMax's hosted regeneration.

**Can I use it to train my own model?** No. The license forbids using H3 or its outputs to improve any other AI model.

## What happens next

MiniMax has promised the sparse-attention code, which should make longer videos cheaper to generate, and the 2K module. It has also said it will keep reviewing the regional limits. We will update this guide when any of that happens.

Sources: [MiniMax H3 model card](https://huggingface.co/MiniMaxAI/MiniMax-H3), [license](https://huggingface.co/MiniMaxAI/MiniMax-H3/blob/main/LICENSE) and [license Q&A](https://huggingface.co/MiniMaxAI/MiniMax-H3/blob/main/docs/QA-about-License.md), [ComfyUI MiniMax H3 guide](https://docs.comfy.org/tutorials/video/minimax/minimax-h3), [vLLM recipe](https://recipes.vllm.ai/MiniMaxAI/MiniMax-H3), [official demo Space](https://huggingface.co/spaces/MiniMaxAI/MiniMax-H3-Turbo-Lora), Arena video rankings of 22 September and 27 August 2026.
