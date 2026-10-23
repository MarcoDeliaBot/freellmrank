---
titolo: Free AI that forecasts your numbers: Timestral vs TimesFM 3.0
descr: Two open models predict sales, traffic or energy use with no training. What they do, how they compare, and which license lets you sell with them.
data: 2026-10-24
tema: Guides
---

Chat models predict the next word. Time series models predict the next numbers: tomorrow's orders, next week's website traffic, next month's energy use. Two new open models do this "zero-shot": you give them your history and they forecast, with no training on your data.

## The two models

**Timestral** by Mistral AI came out on 14 October 2026 in four sizes: [5M](https://huggingface.co/mistralai/Timestral-5M), [28M](https://huggingface.co/mistralai/Timestral-28M), [123M](https://huggingface.co/mistralai/Timestral-123M) and [209M](https://huggingface.co/mistralai/Timestral-209M) parameters. The model card says it runs with PyTorch on CPU or GPU, reads up to 32,768 past time steps and forecasts up to 1,024 steps in one pass, with 21 quantiles (a likely value plus a range).

**TimesFM 3.0** by Google Research is on Hugging Face as [google/timesfm-3.0-pytorch](https://huggingface.co/google/timesfm-3.0-pytorch). Its card lists 20 transformer layers and patches of 32 steps for the history and 64 for the forecast.

Timestral also accepts extra inputs you already know about the future, such as holidays or planned promotions. These are called known-future covariates, and they matter: a model that does not know Monday is a holiday will forecast a normal Monday.

## How they compare

Mistral's model card compares the two on three public benchmarks. Lower is better for MASE and CRPS, higher is better for the skill scores.

| Benchmark | Metric | Timestral-209M | TimesFM-3 |
|---|---|---|---|
| GIFT-Eval | MASE | 0.658 | 0.667 |
| GIFT-Eval | CRPS | 0.446 | 0.456 |
| TIME | MASE | 0.626 | 0.640 |
| fev-bench | SQL skill score | 50.39 | 48.99 |

These numbers come from Mistral, not from an independent test, and the gaps are small. Even the smallest Timestral, with 5M parameters, scores 0.705 MASE on GIFT-Eval.

## The license decides what you can build

This is the biggest practical difference.

- **TimesFM 3.0** uses the TimesFM Non-Commercial License v1.0. You can test it, but not sell a product built on the weights you host yourself.
- **TimesFM 2.5**, the previous version, is under Apache 2.0, so commercial use is allowed.
- **Timestral** uses a modified MIT license: free for commercial use, unless your company's monthly revenue is above $20 million. Above that, you need a license from Mistral.

For a small business, Timestral is the one you can put into a product today.

## Before you trust a forecast

- A model can only learn from what moved in your history. If you never changed a price, no model knows how your customers react to a new price.
- Test first: hide the last weeks of your data, forecast them, and compare with what really happened.
- Check the range, not only the line. A good forecast tells you how wrong it might be.

These models are tiny next to chat models, so you do not need a big GPU. To see which chat models your computer can run, try the [Run at home simulator](/home.html).
