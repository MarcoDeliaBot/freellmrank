---
titolo: AI models that run on your phone: what fits in 8, 12 and 16 GB of RAM
descr: Which free open AI models run offline on a phone with 8, 12 or 16 GB of RAM, how big their 4-bit files are, and the free apps to run them.
data: 2026-11-23
---

A phone can run a small AI model offline, with no account and no internet connection. What fits depends on the phone's memory (RAM): with 8 GB you can run models up to about 3.2 GB, with 12 GB up to about 4.8 GB, and with 16 GB up to about 6.4 GB.

## How much memory a model needs

A model is a file of numbers called parameters: the more parameters, the bigger and usually smarter the model. Phones run these models in **4-bit** form, a compressed version that keeps each number in 4 bits, so the file is much smaller than the original.

FreeLLMArena uses a cautious rule of thumb: the model can use about 40% of the phone's RAM, because the system and your other apps need the rest. That is where the limits above come from: 40% of 8 GB is about 3.2 GB, 40% of 12 GB about 4.8 GB, 40% of 16 GB about 6.4 GB.

## Phones with 8 GB of RAM

Most phones from 2023 on have at least 8 GB. These are the most downloaded open models that fit, by monthly downloads on Hugging Face:

| Model | Lab | Parameters | 4-bit file |
|-------|-----|------------|------------|
| Qwen3-0.6B | Qwen | 0.8 B | 0.9 GB |
| Qwen3-4B-Instruct-2507 | Qwen | 4 B | 2.8 GB |
| SmolVLM2-500M-Video-Instruct | HuggingFaceTB | 0.5 B | 0.7 GB |
| MiniCPM5-2B | openbmb | 2.5 B | 1.9 GB |
| MiniCPM-V-4.7-1B | openbmb | 1.6 B | 1.4 GB |
| DeepSeek-R1-Distill-Qwen-1.5B | deepseek-ai | 1.8 B | 1.5 GB |
| granite-4.1-3b | ibm-granite | 3.4 B | 2.5 GB |
| Phi-4-mini-instruct | microsoft | 3.8 B | 2.7 GB |

Qwen3-4B-Instruct-2507 is the largest of the popular ones that fits, at 2.8 GB.

## Phones with 12 GB of RAM

Recent flagship phones often have 12 GB. They run everything above, plus models up to about 4.8 GB:

| Model | Lab | Parameters | 4-bit file |
|-------|-----|------------|------------|
| OLMoE-1B-7B-0125-Instruct | allenai | 6.9 B | 4.6 GB |
| Molmo2-4B | allenai | 4.9 B | 3.4 GB |
| WeVisOne-VL-4B | tencent | 4.8 B | 3.3 GB |
| Apriel-5B-Instruct | ServiceNow-AI | 4.8 B | 3.3 GB |

## Phones and tablets with 16 GB of RAM

Top phones and tablets reach 16 GB. Here the popular 8 and 9 billion parameter models fit too:

| Model | Lab | Parameters | 4-bit file |
|-------|-----|------------|------------|
| Qwen3.5-9B | Qwen | 9.7 B | 6.3 GB |
| Qwen3-8B | Qwen | 8.2 B | 5.4 GB |
| Qwen3-VL-8B-Instruct | Qwen | 8.8 B | 5.7 GB |
| DeepSeek-R1-0528-Qwen3-8B | deepseek-ai | 8.2 B | 5.4 GB |
| DeepSeek-R1-Distill-Qwen-7B | deepseek-ai | 7.6 B | 5.0 GB |
| NVIDIA-Nemotron-Nano-9B-v2 | nvidia | 8.9 B | 5.8 GB |
| Llama-3.1-Nemotron-Nano-VL-8B-V1 | nvidia | 8.7 B | 5.7 GB |
| Olmo-3-7B-Instruct | allenai | 7.3 B | 4.8 GB |

The order in these tables is popularity, not quality: these small models have no Arena votes yet.

## The exception: MiniCPM-V 4.7 with expert streaming

MiniCPM-V 4.7 35B-A3B by OpenBMB has 35.2 billion parameters but uses only about 3 billion for each word (a mixture of experts). Its makers keep the experts in the phone's storage and load them just before they are needed, so only about 3 GB sit in memory. They report more than 13 tokens per second on an iPhone 17 Pro Max.

The catch: the whole model still needs about 22 GB of storage, it needs their special build of llama.cpp, and its speed depends on how fast the phone's storage is.

## Free apps to run them

- **PocketPal AI**: open-source app that downloads models from Hugging Face and runs them offline (MIT license).
- **Google AI Edge Gallery**: Google's open-source app to try on-device models, including Gemma (Apache-2.0).
- **MLC LLM**: engine with a chat app for phones; more technical (Apache-2.0).

Download the model inside the app, choosing a 4-bit or Q4 version, and it works offline. Bigger models drain the battery faster and make the phone warm.

## Where to check

The [phone page](/phone) keeps these lists up to date with every new model, and the [models page](/models) has every free model with its size.

*Updated on 24 November 2026: rewritten with the figures from the phone page.*
