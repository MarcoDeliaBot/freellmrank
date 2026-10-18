---
titolo: How much GPU memory do you need to run an AI model at home?
descr: A plain explanation of model size, 4-bit files, context memory and speed, with the numbers our simulator uses.
data: 2026-10-18
---

Three things decide whether a model runs on your computer: the size of its weights, the memory its context needs, and the speed of your graphics card's memory.

## 1. The weights

A model is a long list of numbers, its parameters. Stored at full precision each one takes 2 bytes. Almost everyone at home uses a compressed 4-bit file instead (the common format is called Q4_K_M), which takes about 0.6 bytes per parameter with little loss of quality.

So, roughly:

| Model size | 4-bit file | 8-bit file |
|---|---|---|
| 4 B | 2.4 GB | 4.3 GB |
| 9 B | 5.5 GB | 9.6 GB |
| 14 B | 8.5 GB | 15 GB |
| 31 B | 19 GB | 33 GB |
| 120 B | 73 GB | 128 GB |

## 2. The context

While it writes, a model keeps a memory of the conversation, called the KV cache. It grows with every token of the conversation, and it depends on how the model is built: newer models share or compress this memory, older ones do not. At 32,000 tokens it can be under 1 GB or more than 10 GB.

We read each model's real architecture from its configuration file on Hugging Face to compute this, instead of guessing.

## 3. The speed

To write one token, the card reads all the active weights once. So speed is mostly memory bandwidth divided by the size of what it reads. An RTX 4090 reads about 1,000 GB/s; a 19 GB model gives roughly 35 to 40 tokens per second, faster than anyone reads.

Mixture-of-experts models read only a part of their weights per token, so they are much faster than their size suggests.

## Several cards, or system RAM

With two or more cards, tools like llama.cpp and Ollama split the layers across them. You get the memory of all cards together, but the speed stays close to that of one card.

If a model does not fit, part of it can live in system RAM. It works, but RAM is 10 to 20 times slower than GPU memory, so speed drops sharply.

## Try it

The [Run at home simulator](/home.html) does all of this for your exact card, number of cards and RAM, and shows the best-voted model that fits. There are also {{piccoli}} small models for 4 to 12 GB cards that Arena has not voted on yet; we mark them clearly.
