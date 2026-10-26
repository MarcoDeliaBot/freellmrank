---
titolo: GPU guide for 4-bit LLMs VRAM tiers and performance
descr: Compare budget, mid, high and extreme GPUs for 4-bit models, VRAM requirements and token-per-second benchmarks.
data: 2026-10-26
---

## 1. Budget tier, 8 GB to 12 GB VRAM  

| GPU | VRAM (GB) | Bandwidth (GB/s) |
|-----|-----------|------------------|
| RTX 4060 | 8 | 272 |
| RTX 5060 | 8 | 448 |
| RX 7600 | 8 | 288 |
| RTX 3060 | 12 | 360 |
| RTX 4070 / 4070 Super | 12 | 504 |
| RX 7700 XT | 12 | 432 |
| Arc B580 | 12 | 456 |

These cards can run 4-bit quantized models that require up to roughly 8 GB of VRAM, such as many 7 B-parameter LLMs. Models larger than 12 GB generally need a card with more memory.

## 2. Mid tier, 16 GB VRAM  

| GPU | VRAM (GB) | Bandwidth (GB/s) | Example speed* |
|-----|-----------|------------------|----------------|
| RTX 4060 Ti | 16 | 288 | n/a |
| RTX 4070 Ti Super | 16 | 672 | n/a |
| RTX 4080 Super | 16 | 736 | n/a |
| RTX 5060 Ti | 16 | 448 | 111 t/s (gpt-oss-20b MXFP4) |
| RTX 5070 Ti | 16 | 896 | n/a |
| RX 7800 XT | 16 | 624 | n/a |
| RX 9070 XT | 16 | 640 | 137 t/s (Llama 2 7B Q4_0) |
| RX 9060 XT | 16 | 322 | n/a |

*Speed figures are taken directly from the benchmark data.

These cards can accommodate most 20-B-parameter models quantized to 4-bit. The measured speeds show the impact of bandwidth: the RTX 5060 Ti (448 GB/s) achieved 111 t/s on gpt-oss-20b, while the RX 9070 XT (640 GB/s) reached 137 t/s on the smaller Llama 2 7B, so the two figures are not directly comparable.

## 3. High tier, 24 GB to 32 GB VRAM  

| GPU | VRAM (GB) | Bandwidth (GB/s) | Example speed* |
|-----|-----------|------------------|----------------|
| RTX 3090 | 24 | 936 | 162 t/s (gpt-oss-20b MXFP4) |
| RTX 3090 Ti | 24 | 1008 | n/a |
| RTX 4090 | 24 | 1008 | 198 t/s (Qwen3-30B-A3B Q4_K_M) |
| RTX 5090 | 32 | 1792 | 247 t/s (Qwen3-30B-A3B Q4_K_M) |
| RX 7900 XTX | 24 | 960 | 140 t/s (GLM-4.7-Flash Q4_0) |

*Speed figures are taken directly from the benchmark data.

These GPUs can run 30-B-parameter models at 4-bit. The RTX 4090 and RTX 5090 show higher token-per-second rates than the RTX 3090.

## 4. Extreme tier, 48 GB to 96 GB VRAM  

| GPU | VRAM (GB) | Bandwidth (GB/s) |
|-----|-----------|------------------|
| RTX A6000 | 48 | 768 |
| RTX 6000 Ada | 48 | 960 |
| RTX PRO 6000 Blackwell | 96 | 1792 |

These professional cards provide the largest memory capacities available for home-lab setups. They are required for the biggest 4-bit models that exceed 48 GB.

## 5. Unified-memory systems  

| System | Unified memory (GB) | Usable for model (≈ 75 %) | Bandwidth (GB/s) |
|--------|--------------------|---------------------------|------------------|
| Mac mini M4 Pro | 64 | ~48 | 273 |
| Mac M4 Max | 128 | ~96 | 546 |
| Mac Studio M3 Ultra | 512 | ~384 | 819 |
| Ryzen AI Max+ 395 | 128 | ~96 | 256 |
| NVIDIA DGX Spark | 128 | ~96 | 273 |

The DGX Spark achieved 83 t/s on gpt-oss-20b MXFP4, comparable to mid-range NVIDIA GPUs.

## Choosing the right GPU  

1. **Model size:** 4-bit 20-B-parameter models need about 12 GB VRAM; 30-B models need about 24 GB.  
2. **Memory match:** For ≤12 GB, budget cards such as RTX 3060 work. For 24 GB models, select RTX 4090, RTX 3090, or RX 7900 XTX.  
3. **Speed considerations:** Higher bandwidth generally yields higher token-per-second rates, as shown by the benchmark numbers.  
4. **Budget:** RTX 5060 Ti offers a 16 GB solution with measured 111 t/s on a 20-B model, while RX 9070 XT provides 137 t/s on a 7-B model.  

## Quick reference  

| Tier | Typical VRAM | Example GPUs | Example token-per-second (20 B model) |
|------|--------------|--------------|----------------------------------------|
| Budget | 8-12 GB | RTX 3060, RTX 4060 | n/a |
| Mid | 16 GB | RTX 5060 Ti, RX 9070 XT | 111 (RTX 5060 Ti) |
| High | 24-32 GB | RTX 4090, RTX 3090 | 162 to 225 |
| Extreme | 48 GB+ | RTX A6000, RTX PRO 6000 | n/a (handles the largest 4-bit models) |
| Unified | 64-512 GB | Mac Studio M3 Ultra, DGX Spark | 83 to 116 (bandwidth dependent) |
