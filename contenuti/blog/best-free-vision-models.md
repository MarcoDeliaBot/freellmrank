---
titolo: GLM-5.3-Flash tops FreeLLMArena free vision models with 1272 score
descr: GLM-5.3-Flash leads free vision models at 1272, fitting on Mac Studio M3 Ultra 512 GB; Claude Fable 5 leads paid list with 1309.
data: 2026-11-16
---

FreeLLMArena ranks many open-weight vision models. The highest-scoring free model is GLM-5.3-Flash with a score of 1272, behind the top paid model Claude Fable 5 (score 1309).

## How the ranking works  

FreeLLMArena collects blind human votes from the Arena platform. Each model receives a score that reflects usefulness, accuracy, and overall user satisfaction. The list below includes only models that have open weights.

## Top free vision models  

| Rank | Model | Lab | Score | Parameters* | Approx. 4-bit size | Fits fully on |
|------|-------|-----|-------|-------------|--------------------|---------------|
| 36 | GLM-5.3-Flash | zai | 1272 | 321.3 B | ~197 GB | Mac Studio M3 Ultra 512 GB or bigger |
| 39 | Gemma 4 31B | google | 1265 | 31.3 B | ~22 GB | RTX 3090 or bigger |
| 40 | Kimi K2.6 | moonshot | 1265 | 1026.9 B | ~625 GB | no single home machine |
| 42 | DeepSeek-V4.1-Flash-20260910 (Max) | deepseek | 1263 | size not public | n/a | n/a |
| 51 | Kimi K2.5 (Thinking) | moonshot | 1252 | 1026.9 B | ~625 GB | no single home machine |
| 56 | MiMo-V2.6-Flash | xiaomi | 1248 | 310.8 B | ~191 GB | Mac Studio M3 Ultra 512 GB or bigger |
| 58 | MiMo-V2.6-Pro | xiaomi | 1247 | 1024.2 B | ~623 GB | no single home machine |
| 59 | Qwen3.5-397B-A17B | alibaba | 1246 | 403.4 B | ~247 GB | Mac Studio M3 Ultra 512 GB or bigger |
| 61 | Qwen3.8-27B | alibaba | 1243 | 27.8 B | ~20 GB | RX 7900 XT or bigger |
| 63 | Gemma 4 26B A4B | google | 1242 | 25.8 B | ~18 GB | RX 7900 XT or bigger |
| 67 | Kimi K2.5 (Instant) | moonshot | 1236 | 1026.9 B | ~625 GB | no single home machine |
| 70 | MiMo-V2.5 | xiaomi | 1234 | 310.8 B | ~191 GB | Mac Studio M3 Ultra 512 GB or bigger |

\*Parameters refer to the number of trainable weights. “B” stands for billion. The 4-bit size is the storage needed when the model is quantized to 4-bit precision.

## Choosing a model for your hardware  

1. **Memory requirement**: Use the “Fits fully on” column to see the minimum hardware that can hold the 4-bit model.  
2. **Model size**: Larger parameter counts need more memory and may need multi-GPU or cloud resources.  
3. **Task fit**: Select a model whose size matches your performance and resource constraints.

## Where to find the models  

All listed models have open weights available from their respective labs. FreeLLMArena provides links to the repositories and benchmark results in the **Vision** category. Visit the Vision page to explore the full ranking and download the models.
