---
titolo: Free models that fit Mac unified memory, GLM-5.3-Flash only
descr: Only GLM-5.3-Flash fits Mac Studio M3 Ultra’s usable memory; all other top free models exceed Mac unified memory limits.
data: 2026-11-02
---

Running AI models on a Mac depends mainly on the amount of unified memory you have and whether the model can be stored in that space after quantisation. FreeLLMArena’s data shows that only a handful of free, high-scoring models fit inside a Mac’s unified memory pool. The key factor is the 4-bit (or similar) quantisation level, which compresses a model’s parameters to about one-sixth of their original size.

## How much unified memory is usable on a Mac?

Mac machines list their total unified memory, but only about 75 % is usable by a single model. The usable amount is therefore:

| Mac model | Total unified memory | Usable for a model (≈ 75 %) |
|-----------|---------------------|-----------------------------|
| Mac mini M4 Pro | 64 GB | 48 GB |
| Mac M4 Max | 128 GB | 96 GB |
| Mac Studio M3 Ultra | 512 GB | 384 GB |

If a model’s quantised size exceeds the usable memory, it cannot run on that machine. For example, a 4-bit version of a 2 TB model would need roughly 2 TB ÷ 16 ≈ 125 GB, which is larger than the 96 GB available on a Mac M4 Max.

## Which free models fit on a Mac?

FreeLLMArena ranks 227 free models in the “Chat” category. Most of the top-scoring models are too large to fit on any home-machine memory pool, even after 4-bit quantisation. The only model that explicitly fits on a Mac is:

| Rank | Model | Lab | Score | Parameters (B) | 4-bit size (GB) | Fits on |
|------|-------|-----|-------|----------------|----------------|---------|
| 33 | GLM-5.3-Flash | zai | 1477 | 321.3 | ~197 | Mac Studio M3 Ultra (512 GB) or larger |

All other high-scoring free models list “no single home machine” as their fit target. Their 4-bit footprints range from ~197 GB up to ~972 GB, far beyond the 384 GB usable on the largest Mac listed.

## What does “4-bit” mean?

A model’s parameters are usually stored as 16- or 32-bit floating-point numbers. Quantising to 4-bit reduces each parameter to a 4-bit integer, shrinking the model size by roughly a factor of 4-to-8. This makes it possible to load larger models into limited memory, at the cost of a small loss in precision.

## Performance expectations on Mac hardware

FreeLLMArena also measures token-per-second generation speeds with the llama.cpp engine. The only Mac-based measurement is for the M3 Ultra running the 20 B-parameter gpt-oss-20b model (MXFP4 quantisation) at **115 tokens / s**. The same model runs much faster on high-end GPUs (e.g., 225 tokens / s on RTX 4090). This suggests that even when a model fits, a Mac’s CPU-centric architecture will be slower than a dedicated GPU.

If you have a Mac Studio M3 Ultra, you can expect:

* **GLM-5.3-Flash** at ~197 GB (4-bit) will occupy about half of the usable memory, leaving room for the operating system and other apps.
* Generation speed will likely be in the 80-120 tokens / s range, based on the M3 Ultra benchmark for a similar-size model.

## Practical tips for running a model on a Mac

1. **Reserve memory for the OS.** Even though 384 GB is usable, keep a safety margin (e.g., 20 %) to avoid swapping.  
2. **Use llama.cpp with the appropriate quantisation flag** (e.g., `-q4_0` for 4-bit). The engine automatically maps the model into unified memory.  
3. **Monitor CPU temperature.** Long inference runs can push the Mac’s cooling system, especially on the compact mini.  
4. **Consider off-loading.** If you need a larger model, you can run it on a remote GPU and stream results to your Mac.  

## Where to find more details

For a full list of Mac hardware specifications, see the GPU page. To explore all free models, their scores, and size estimates, visit the models page. FreeLLMArena updates these pages regularly, so you can check whether new models become compatible with your Mac’s memory pool.
