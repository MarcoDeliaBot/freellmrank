---
titolo: Free 4-bit AI model that fits Mac Studio M3 Ultra
descr: Only GLM-5.3-Flash (197 GB) fits the 512 GB Mac Studio M3 Ultra; smaller Macs cannot host top-ranked free models.
data: 2026-11-23
---

Running AI models on a Mac depends on the amount of unified memory you have and whether a model can fit inside the usable portion.  
A Mac with 512 GB of unified memory can run a 197 GB 4-bit model; a 64 GB Mac can host smaller models.

## Unified memory and model size  

Unified memory means the CPU and GPU share the same pool of RAM.  
Only about 75 % of that pool is usable by a language model, according to FreeLLMArena’s measurements.  

Models are often stored in a quantized format.  
A “4-bit” model stores each weight with four bits instead of the usual 32 bits, shrinking the size dramatically.  
Parameters (the numbers that the model learns) determine how large a model is; billions of parameters can still fit in a few hundred gigabytes when 4-bit quantization is applied.

## Mac machines and usable memory  

| Mac model | Unified memory (GB) | Usable (~75 %) |
|-----------|--------------------|----------------|
| Mac mini M4 Pro | 64 | ≈75 % |
| Mac M4 Max | 128 | ≈75 % |
| Mac Studio M3 Ultra | 512 | ≈75 % |

The usable figure is the amount of memory a model can actually occupy.  
If a model’s 4-bit size exceeds this proportion, the model will not run on that machine.

## Free models that fit the Macs  

FreeLLMArena ranks 241 free models in the Chat category.  
Only one of the top-ranked free models fits fully on any Mac in the list.

| Model | Parameters (B) | Size at 4-bit (GB) | Fits on |
|-------|----------------|-------------------|---------|
| GLM-5.3-Flash | 321.3 | 197 | Mac Studio M3 Ultra (512 GB) or larger |

All other top-ranked free models exceed the memory available on these Macs.

## Generation speed on Apple silicon  

FreeLLMArena measured generation speed with llama.cpp on several Apple machines.  

* gpt-oss-20B (MXFP4) runs at 115.52 tokens / s on the M3 Ultra.  
* The same model runs at 95.88 tokens / s on the M4 Max 40c.  
* On the M4 Pro the speed drops to 63.34 tokens / s.  

GLM-5.3-Flash has not been measured directly.

## Choosing a model for your Mac  

Start by checking your Mac’s unified memory and calculating the usable amount (≈75 %).  
Select a free model whose 4-bit size is smaller than that usable memory.  
If you own a Mac Studio M3 Ultra, GLM-5.3-Flash is the only high-ranked free model that fits.  
On a Mac mini M4 Pro or Mac M4 Max, no top-ranked free model fits.
