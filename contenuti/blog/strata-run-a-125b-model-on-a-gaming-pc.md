---
titolo: Strata: run a 125B model on a gaming PC, which size fits your RAM
descr: Strata runs Qwen3.8-Flash-Next on a normal PC with 32 GB of memory. What it is, which size to pick for your RAM, and how fast it is.
data: 2026-10-24
tema: Hardware
---

Strata is a free, open-source app (MIT license) that runs [Qwen3.8-Flash-Next](https://huggingface.co/Qwen/Qwen3.8-Flash-Next), a 125-billion-parameter model that normally needs a server, on a home PC. It chats, writes code and reads pictures, and your chats and files stay on your computer. The project is on [GitHub](https://github.com/Niko1221/Strata) and has passed 31,000 stars.

## What you need

The rule is simple: **at least 32 GB of RAM and graphics memory (VRAM) together**. On a Mac or a Ryzen AI Max, that is the unified memory. You also need about 80 GB of free disk, better on an SSD.

It supports NVIDIA RTX 20 to 50 series cards with 12 GB or more, AMD Radeon RX 6800 and newer, Intel Arc and Apple Silicon Macs (M1 or newer, macOS 15 or newer).

## Which size to pick

Strata offers the same model in several sizes, compressed more or less. Smaller sizes are faster, larger sizes are a bit smarter. The table counts RAM plus VRAM, less 5 GB for the system.

| Your memory (RAM + VRAM) | Take |
|---|---|
| 32 GB | Gyro-S, or the Coder for code |
| 40 GB | Swift 1.5 IQ2_XS, or Gyro-M |
| 48 GB | IQ3_XXS |
| 64 GB | IQ3_S: the slowest and the best |
| 96 GB or more | 4-bit to 8-bit versions, closer to the full model |

The **Coder** keeps half of the experts, so the project says it is weaker outside code. **Gyro-S** is the smallest way to run the model, with lower quality.

## How fast is it

The project measured these speeds on a 12 GB RTX 5070 with 64 GB of RAM:

| Size | Writes answers at |
|---|---|
| Q2_0 | 94 tokens/s |
| IQ2_XS | 79 tokens/s |
| IQ3_XXS | 62 tokens/s |
| IQ3_S | 53 tokens/s |
| Coder | 55 tokens/s |

On a 16 GB AMD RX 9070 XT with 47 GB of RAM, the Coder writes at 44 tokens/s. A token is about three quarters of a word, so 60 tokens per second is faster than you can read.

## How to install it

Download the app for your system and graphics card from the [releases page](https://github.com/Niko1221/Strata/releases/latest). On the first screen it reads your PC and recommends a size that fits. The model is a big download, about 40 to 70 GB.

Strata speaks the OpenAI and Anthropic APIs, so coding agents like Claude Code, Codex CLI and OpenCode can connect to it. There is no account and no telemetry.

## Before you start

- The installer is not code-signed yet: Windows may warn you before it runs.
- The speeds above are the project's own measurements, on its own PCs.
- The only feature that sends something off your PC is web search, which sends your search words.

To compare with other models your card can run, try the [Run at home simulator](/home.html).
