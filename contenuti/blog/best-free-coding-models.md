---
titolo: Best Free Coding Models and Which Ones Run at Home
descr: The highest-ranked free AI models for coding in the Arena, how much memory each needs at 4-bit, and which home machine can hold it.
data: 2026-10-31
---

The best free AI models for coding are the free models that score highest in the Arena Coding category. This list uses the Arena data of 28 October 2026: 152 models ranked, 60 of them free. The best paid model, Claude Opus 5.5 (Max), scores 1810. The best free one, DeepSeek-V4.1-Flash-20261017 (Max), scores 1665 and ranks 16th overall. All twelve models below have open weights.

## Highest-ranked free coding models

| Rank | Model | Lab | Score | Size, memory at 4-bit | Fits fully on |
|------|-------|-----|-------|-----------------------|---------------|
| 16 | DeepSeek-V4.1-Flash-20261017 (Max) | deepseek | 1665 | size not public | size not public |
| 18 | Kimi K3 (Max) | moonshot | 1656 | 2779.9 B, about 1687 GB | no single home machine |
| 22 | MiMo-V2.6-Flash | xiaomi | 1637 | 310.8 B, about 191 GB | Mac Studio M3 Ultra 512 GB |
| 23 | Hy4 preview | tencent | 1631 | size not public | size not public |
| 24 | Qwen3.8-Flash-Next | alibaba | 1628 | 180 B, about 112 GB | Mac Studio M3 Ultra 512 GB |
| 25 | MiMo-V2.6-Pro | xiaomi | 1625 | 1024.2 B, about 623 GB | no single home machine |
| 27 | GLM-5.3 (Max) | zai | 1623 | 753.3 B, about 459 GB | no single home machine |
| 29 | DeepSeek-V4.1-Flash-20260910 (Max) | deepseek | 1619 | size not public | size not public |
| 32 | GLM-5.3-Flash | zai | 1607 | 321.3 B, about 197 GB | Mac Studio M3 Ultra 512 GB |
| 33 | GLM-5.2 (Max) | zai | 1606 | 753.3 B, about 459 GB | no single home machine |
| 34 | Qwen3.8-27B | alibaba | 1590 | 27.8 B, about 20 GB | RX 7900 XT or bigger |
| 38 | MiniMax-M3.1-Flash | minimax | 1582 | 220.5 B, about 136 GB | Mac Studio M3 Ultra 512 GB |

Rank is the position among all 152 coding models, free and paid. Memory is our estimate for the 4-bit file plus a small working margin.

## Which of these you can run at home

Five of the twelve fit fully on one home machine. Qwen3.8-27B is the only one that runs on a single gaming card: it needs about 20 GB, so an RX 7900 XT or any bigger card holds it.

A Mac Studio M3 Ultra with 512 GB holds four more: MiMo-V2.6-Flash (about 191 GB), GLM-5.3-Flash (about 197 GB), MiniMax-M3.1-Flash (about 136 GB) and Qwen3.8-Flash-Next (about 112 GB). No smaller machine on our list has enough memory for them.

Kimi K3 (Max), MiMo-V2.6-Pro, GLM-5.3 (Max) and GLM-5.2 (Max) need more memory than any single home machine on our list. DeepSeek-V4.1-Flash (both versions) and Hy4 preview have no public size, so we cannot say which machine runs them.

To check your own setup, use the [Run at home simulator](/home) or compare cards on the [GPU page](/gpus).

## Free apps that run these models at home

| App | Price | What the free version includes |
|-----|-------|--------------------------------|
| LM Studio | free | Free for personal and internal business use; paid plans add cloud models. Easiest app to start with. |
| Ollama | free | Free on your own computer; optional cloud plans (Pro $20). |
| Jan | free | Free desktop app, works offline. |
| llama.cpp | free | The engine most other apps use; for technical users. |
| LocalAI | free | Free; an OpenAI-compatible server on your machine. |
| Open WebUI | free | Free web interface for Ollama and others; branding rules above 50 users. |

## Free coding agents that work with your own model

These four coding agents are free apps. You bring the model, so they cost nothing when the model runs on your own machine.

| Agent | What the free version includes |
|-------|--------------------------------|
| Aider | Free app; you pay only the model, or use a local one. |
| Cline | Free app for VS Code, JetBrains and the terminal. |
| OpenCode | Free app. Its Zen gateway lists free models "for a limited time". |
| Goose | Free app; desktop and terminal. |

App details were checked by hand on 20 October 2026. The full list, with paid plans, is on the [apps page](/apps).

## Where to find more details

The complete coding ranking is in the [Coding section of the home page](/#code). For memory and speed of each card, see the [GPU page](/gpus).
