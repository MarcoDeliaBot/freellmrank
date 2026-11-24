---
titolo: New open-weight AI models this month: sizes and memory needs
descr: New open models from inclusionAI, Microsoft, ByteDance and others, from 1.9 B to 1,779.8 B parameters, with 4-bit memory and the GPU each one fits.
data: 2026-11-23
---

The latest open-weight models arrive with a range of sizes and memory footprints.

## Model sizes and 4-bit memory usage  
4-bit quantization stores each weight in four bits, cutting memory needs dramatically. Parameters refer to the total number of trainable weights in a model.

| Model | Lab | Release date | Size (parameters) | 4-bit memory | Fits fully on | Context length |
|-------|-----|--------------|-------------------|--------------|----------------|----------------|
| LingSante-3.1-air-VL | inclusionAI | 2026-11-19 | 124.8 B | ~78 GB | RTX PRO 6000 Blackwell or bigger | 131 072 tokens |
| LingSante-3.1-flash | inclusionAI | 2026-11-19 | 572.1 B | ~349 GB | Mac Studio M3 Ultra 512 GB or bigger | 262 144 tokens |
| Aion-1.0-Instruct-2.3B | microsoft | 2026-11-18 | 2.3 B | ~4 GB | RTX 4060 or bigger | 32 768 tokens |
| SingVL_S1_4B | inclusionAI | 2026-11-11 | 4.5 B | ~5 GB | RTX 4060 or bigger | 262 144 tokens |
| Cola2 | ByteDance-Seed | 2026-11-06 | 8.8 B | ~8 GB | RTX 4060 or bigger | n/a |
| LongCat-2.5 | meituan-longcat | 2026-11-04 | 1 779.8 B | ~1 081 GB | no single home machine | 524 288 tokens |
| Mage-VL-Cowork | microsoft | 2026-10-30 | 4.7 B | ~6 GB | RTX 4060 or bigger | 262 144 tokens |
| Ling-3.1-flash-1019 | inclusionAI | 2026-10-27 | 572.1 B | ~349 GB | Mac Studio M3 Ultra 512 GB or bigger | 262 144 tokens |
| d1-2B | LiquidAI | 2026-10-24 | 1.9 B | ~4 GB | RTX 4060 or bigger | 128 000 tokens |
| Flint | RecursiveSI | 2026-10-21 | 39.8 B | ~27 GB | RTX 5090 or bigger | 262 144 tokens |
| Fibo-2.0-edit-turbo | briaai | 2026-10-19 | 8.1 B | ~8 GB | RTX 4060 or bigger | n/a |
| Fibo-2.0-dev | briaai | 2026-10-18 | 8.1 B | ~8 GB | RTX 4060 or bigger | n/a |

## Small models for consumer GPUs  
Aion-1.0-Instruct-2.3B, SingVL_S1_4B, Cola2, Mage-VL-Cowork, d1-2B, and the Fibo-2.0 variants all need roughly 4 to 8 GB in 4-bit mode. They run on any RTX 4060 with 8 GB VRAM or larger. RTX 4060 provides 272 GB/s bandwidth. RTX 4060 Ti has 16 GB VRAM. RTX 4070 series have 12-16 GB VRAM.

## Mid-range models that need more VRAM  
LingSante-3.1-air-VL and the two LingSante-3.1-flash variants demand 78 GB and 349 GB respectively. The air-VL model fits on the RTX PRO 6000 Blackwell, a 96 GB card. The flash versions require a machine with at least 512 GB of unified memory, such as the Mac Studio M3 Ultra.

## Very large models that exceed home hardware  
LongCat-2.5 holds 1 779.8 B parameters. Its 4-bit memory estimate exceeds a terabyte. Flint, at 39.8 B parameters, needs about 27 GB. It runs on RTX 5090, a 32 GB card, or any larger professional GPU.

## Choosing the right hardware  
Match model memory to GPU capacity. If your GPU lists 8 GB, look at the 4-bit memory column. Anything above that threshold will not fit. For unified memory systems, only about 75 % is usable by a model. The Mac Studio M3 Ultra offers 512 GB total; about 75 % is usable for model loading. Check the “fits fully on” field to avoid guesswork.

---

If you want to explore the full list of new open-weight models, visit the [new models page](/#new). To see which GPU matches your setup, head to the [GPU page](/gpus).
