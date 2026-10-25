---
titolo: Kimi K3.1 Pro: what it is, what it costs, and when it becomes free
descr: Moonshot's new model is close to the best paid AI, but today it is paid only. Prices, real scores, the license it will likely use, what changes on 4 November, the hardware it needs and how to call it.
data: 2026-10-25
tema: Guides
---

Kimi K3.1 Pro is the new top model from Moonshot AI, released on the Kimi API on 23 October 2026. Moonshot calls it "our most capable 3T-class open-weight model to date", with a 1-million-token context window. It comes with a faster twin, **Kimi K3.1 Pro Highspeed**, which Moonshot says runs 2 to 3 times faster.

For anyone looking for free AI, one sentence matters more than all the benchmarks: Moonshot's guide says the full model weights "will be released by Nov 4". Until that day, K3.1 Pro is a paid model. After that day, it should become the strongest open model for coding that anyone has published.

This guide collects everything we could verify on 25 October 2026: what it costs now, how good it really is, what license it will probably come with, what hardware it needs, and how to use the API. Where a number comes from Moonshot itself, we say so.

**In short**

- Released 23 October 2026 on the Kimi API; open weights promised by 4 November 2026.
- Same size as Kimi K3: 2.8 trillion parameters, 104 billion active for each token, 1,048,576-token context.
- $2 per million input tokens and $10 per million output tokens; Highspeed costs twice as much.
- 8th in the Arena coding ranking with 1692 points, above every open model on that list today.
- Not something you can run at home: Kimi K3 needs at least 8 data-center GPUs of the newest generation.

## Can you use it for free today?

Not yet. This is what we checked on 25 October 2026:

- **Moonshot's API** works on pay-as-you-go. K3.1 Pro is "unlocked after a successful top-up (minimum $1)", according to the official guide. Moonshot's rate-limit page adds that when your total top-ups reach $5 you receive a $5 voucher, and that your total top-up decides your account tier and rate limits.
- **OpenRouter** lists it as `moonshotai/kimi-k3.1-pro` at $2 per million input tokens and $10 per million output tokens. There is no free version.
- **Hugging Face** has no K3.1 Pro weights yet. The newest Moonshot model there is still [Kimi K3](https://huggingface.co/moonshotai/Kimi-K3), published in June 2026.

If you want a free Moonshot model now, use its predecessor. [Kimi K3](/model/kimi-k3-max) has open weights and its own free chat with daily limits at kimi.com. In the Arena coding ranking it scores 1655, 37 points below K3.1 Pro.

## When will it be free, and under which license?

Moonshot promises the weights "by Nov 4". When they appear, three kinds of free access usually follow within days or weeks: download for anyone with the hardware, free tiers from inference companies that host popular open models, and free daily quotas on aggregators such as OpenRouter. None of these exists yet, and none is guaranteed. We will update this page when they do.

Moonshot has not published the K3.1 Pro license yet. Its predecessor uses the **Kimi K3 License**, and since K3.1 Pro is "a post-trained version of Kimi K3", that is the most likely starting point. We read the [K3 license](https://huggingface.co/moonshotai/Kimi-K3/blob/main/LICENSE) in full. In plain words:

- You can use, copy, modify, fine-tune, sell and redistribute the model, free of charge, as long as you keep the copyright notice.
- If your company sells access to language models as a service ("Model as a Service") and has more than $20 million in revenue over 12 months, you need a separate agreement with Moonshot before commercial use.
- If a commercial product built on it has more than 100 million monthly users, or more than $20 million in monthly revenue, it must show "Kimi K3" prominently in its interface.
- These two conditions do not apply to internal use inside a company, or to use through Moonshot's own products and certified partners.

For a person, a freelancer or a small company, that is close to a fully open license. Check the K3.1 license on the day it is published: Moonshot can change the terms.

## Prices

Prices from Moonshot's launch email, per million tokens. Both versions read up to 1,048,576 tokens, and the FAQ confirms there is no higher price for long prompts.

| Item | K3.1 Pro | K3.1 Pro Highspeed |
|---|---|---|
| Input | $2.00 | $4.00 |
| Output | $10.00 | $20.00 |
| Cached input | $0.20 | $0.20 |
| Cache write, kept 5 minutes | $2.00 | $4.00 |
| Cache write, kept 1 hour | $4.00 | $8.00 |

The Decoder reports that these prices are 33 percent lower than K3's. Simon Willison notes that $2 / $10 is the same as GPT-6.1 Sol and half the price of Claude Opus 5.5.

**What a request really costs.** Some examples with the standard model, rounded:

- A question of 2,000 tokens with an answer of 1,000 tokens: about 1.4 cents.
- A whole book or code base of 500,000 tokens, with a 3,000-token answer: about $1.03 the first time.
- The same 500,000-token text asked again within the cache window: the repeated part costs a tenth, about 10 cents, plus the answer.

Two things raise the bill. K3.1 Pro always thinks before answering, and the thinking is billed as output; with the default effort (`max`) the hidden reasoning can be longer than the answer. And writing a long prompt into the cache has its own one-time price, shown in the last two rows.

## How good is it?

Three independent signals first, then Moonshot's own numbers.

**Arena, blind human votes.** In the Arena coding ranking (WebDev) of 23 October 2026, where people compare two anonymous answers and vote for the better one, K3.1 Pro is 8th out of 150 models:

| # | Model | Arena score | Weights |
|---|---|---|---|
| 1 | Claude Opus 5.5 (Max) | 1807 | closed |
| 2 | GPT-6 Astra (Max) | 1774 | closed |
| 3 | Claude Sonnet 5.5 (xHigh) | 1769 | closed |
| 4 | GPT-6.1 Sol (Max) | 1749 | closed |
| 5 | Claude Fable 5.1 (Max) | 1742 | closed |
| 6 | Muse Wonder Full (Max) | 1726 | closed |
| 7 | Claude Sonnet 5.5 (High) | 1709 | closed |
| 8 | **Kimi K3.1 Pro (Max)** | **1692** | promised for 4 Nov |
| 9 | Claude Opus 5 (Max) | 1691 | closed |
| 10 | GPT-6 Sol (Max) | 1681 | closed |
| 14 | DeepSeek-V4.1-Flash (Max), best open model today | 1665 | open |
| 17 | Kimi K3 (Max) | 1655 | open |

If the weights arrive as promised, K3.1 Pro will be the open model with the highest coding score on Arena, 27 points above DeepSeek-V4.1-Flash. See the [full coding ranking](/#code).

**Artificial Analysis.** Its Intelligence Index gives K3.1 Pro 55 points, 11 more than K3, as reported by [Simon Willison](https://simonwillison.net/2026/Oct/23/kimi-k31-pro/) and [The Decoder](https://the-decoder.com/chinese-ai-model-kimi-k3-1-pro-is-closing-in-on-anthropics-claude-opus-5-5/). Only Claude Opus 5.5 (58), Claude Sonnet 5.5 (56) and Muse Wonder Full (56) score higher. The Decoder notes that the open-weights release would shrink the gap between the best open and the best closed model on that index from 12 points to 3. On GDPval-AA, a test of real office work, Artificial Analysis gives it 1,846 Elo, 312 points above K3 and just behind Claude Opus 5.5 (1,866).

**Moonshot's own numbers**, to read as claims from the maker:

- Terminal-Bench 4.0, real tasks in a computer terminal: 65.7%, against 66.4% for Claude Opus 5.5, 58.2% for GPT-6 Astra and 13% for K3 (reported by The Decoder; on Moonshot's guide this figure is still a blank placeholder).
- BenchCAD, building 3D CAD models: 92.7% with tools and 72.8% without (The Decoder).
- Finance: on Moonshot's internal tests, +7.2 points over K3 in financial modeling, +11.6 points in financial research, and about 4.2 times K3's result in a simulated business that has to be run over a long period.
- Fewer invented facts: on a stress test built from real conversations where users had flagged errors, the share of false claims fell from 23.35% with K3 to 6.85%, and responses with at least one error fell to 46.4% of K3's rate. Moonshot stresses that this is a deliberately hard test, not the error rate of normal use. On launch day The Decoder reported 8.3% for the same test; the guide now says 6.85%.

A note on honesty: at the time of writing, Moonshot's own guide still shows "[xx.x%]" in the place of three benchmark scores. We report only numbers that are written out somewhere we can link to.

## What is new, in detail

Moonshot describes K3.1 Pro as K3 with much more post-training, mostly reinforcement learning (the model tries tasks, gets scored, and learns from the result) across hundreds of domains at once. To make that stable, the company says it rebuilt every layer: the training framework, long-context inference, the sandboxes where the model runs code, and quality checks for the training environments.

**Coding.** The guide covers quick fixes in real code bases and complete projects, including games built with Unity, Unreal Engine and Godot. The published demos were made "end to end" by the model:

- a mythical palace in Unreal Engine 5.8 with 36 million triangles and a dragon modeled in Blender;
- a 3D action-adventure game in Godot 4.7.2 with five regions, combat, a two-phase boss fight and a day-night cycle;
- a 3D robotic arm in the browser with 2,317 parts and 268 wire routes, checked by 55 automated browser tests.

The most interesting example is about patience, not graphics. In an internal test, K3.1 Pro built a simulator of human walking on top of an open anatomical model with 296 bones and 402 muscles. Over 167 missions and 420 reviews, it took the simulated person from falling within seconds to walking with alternating steps for 11.2 seconds. When the arms still moved badly, it did not just keep tuning the reward: it tested the simulator itself, found 36 errors in the shoulder-muscle calculations, fixed them and trained again.

**3D and CAD.** It writes and runs scripts for Blender, FreeCAD and similar tools directly, without special connectors, to build parametric objects such as mechanical parts, furniture and buildings. Demos include a turbofan engine in FreeCAD with 2,100 solid parts and moving spools, a five-part 3D-printable lamp, and a cathedral interior with about 3.3 million triangles that runs in the browser.

**Finance.** Beyond the internal scores above, Moonshot says K3.1 Pro reaches the best results on OfficeQA Pro v2 (questions over real financial documents) and SpreadsheetBench v2 (complete spreadsheet work, including formulas across sheets and finding errors).

**Security limits.** This is the most unusual section of the guide. Moonshot found that hacking skill grew together with general coding skill, because security material is mixed into normal training data. For the open release, it removed that material from two training stages. On its internal test of real, recently disclosed vulnerabilities (in the Linux kernel, Node.js and others), the version without this cleaning solved 90.5% of tasks; the released model solves 81.0%. Moonshot says the released model stays behind the best paid models in this area on purpose, and argues that open weights help defenders audit code they maintain.

## Under the hood

Kimi K3.1 Pro shares its architecture with Kimi K3. From the [Kimi K3 model card](https://huggingface.co/moonshotai/Kimi-K3):

| Item | Kimi K3 |
|---|---|
| Total parameters | 2.8 trillion |
| Active for each token | 104 billion |
| Experts | 896, of which 16 used for each token, plus 2 shared |
| Layers | 93 |
| Context | 1,048,576 tokens |
| Input | text and images (vision encoder MoonViT-V2, 401M parameters) |
| Native precision | MXFP4 weights with MXFP8 activations |

It is a "mixture of experts": the model is huge, but each word only goes through a small part of it, which keeps it fast for its size. It was also trained directly at 4-bit precision (MXFP4), so the official weights are already compressed and lose little quality from it.

## Can you run it at home?

No, and the weights will not change that.

- **Size.** At 4-bit, Kimi K3 needs about 1,685 GB just for the weights, by our [model page](/model/kimi-k3-max) estimate. K3.1 Pro has the same size.
- **Official hardware.** The vLLM recipe for Kimi K3 lists "at least 8x GB300", NVIDIA's newest data-center GPUs, and several machines for real traffic.

That is a server room, not a gaming PC. What the open weights will change is everything around it: other companies can host it, prices can fall, free tiers can appear, and companies can run it on their own servers for privacy. To see the best model that does fit your own GPU, use [Run at home](/home).

## A short history of Kimi

Moonshot has released a new open model every few months, each time with a longer context and more agent skills. Publication dates on Hugging Face:

- Kimi K2 Thinking: 4 November 2025
- Kimi K2.5: 1 January 2026
- Kimi K2.6: 14 April 2026
- Kimi K2.7 Code: 11 June 2026
- Kimi K3: 13 June 2026
- Kimi K3.1 Pro: API on 23 October 2026, weights promised by 4 November 2026

The K2 family is now being retired: from 31 October 2026, new accounts can no longer use K2 models on the API, and Moonshot plans to switch them off by the end of December 2026.

## For developers: using the API

The API is compatible with the OpenAI SDK. Get a key in the [Kimi console](https://platform.kimi.ai/console/api-keys) after the $1 top-up. The model names are `kimi-k3.1-pro` and `kimi-k3.1-pro-highspeed`.

```python
from openai import OpenAI

client = OpenAI(api_key="YOUR_KEY", base_url="https://api.moonshot.ai/v1")
reply = client.chat.completions.create(
    model="kimi-k3.1-pro",
    reasoning_effort="low",  # low, high or max (default)
    messages=[{"role": "user", "content": "Explain Mixture of Experts in two sentences."}],
)
print(reply.choices[0].message.content)
```

What the official guide documents, and the rules that are easy to miss:

- **Thinking is always on.** You choose only how much: `reasoning_effort` accepts `low`, `high` and `max`, and `max` is the default. Use `low` for simple tasks to save time and money.
- **Answer length.** Up to 131,072 tokens by default, up to 1,048,576 with `max_completion_tokens`.
- **Fixed settings.** Temperature 1.0, top_p 0.95 and the penalties are fixed: leave them out of the request.
- **Streaming** sends the reasoning (`reasoning_content`) and the answer (`content`) as separate pieces, so you can show or hide the thinking.
- **Images and video.** Send images as base64, or upload a file and pass its `ms://` id; public image links do not work. Video files are uploaded the same way and can be summarized.
- **Structured output.** `response_format` with a JSON schema and `strict: true` forces the answer into your format. Parse `content`, never the reasoning.
- **Partial mode** lets you start the answer yourself (for example "Conclusion: ") and have the model continue.
- **Tools.** Standard function calling, with `tool_choice="required"` to force a call. In multi-turn conversations, send back the **whole** assistant message, not just its text, or the model loses its reasoning.
- **Dynamic tools.** You can add a tool definition halfway through a conversation, inside a `system` message, and it becomes available from that point.
- **Caching** is automatic. The cache lasts 5 minutes by default; for workloads with longer pauses, ask for the 1-hour cache with `prompt_cache_options`.
- **Moonshot's own tools** (through its "Formula" system) can be plugged in, but its web search "is being updated and is not recommended" for now.

## Questions

**Is Kimi K3.1 Pro open source?** Not yet. Today it is an API model. Moonshot promises the full weights by 4 November 2026; until then nobody outside Moonshot can download it.

**Is it free?** No. The API needs a $1 top-up and costs $2 / $10 per million tokens. The free option today is Kimi K3.

**Is it better than Claude or GPT?** Not at the top. In blind Arena votes for coding, the best Claude and GPT models are still ahead, by up to 115 points. It is close to the best closed models, ahead of all open ones, and much cheaper than Claude Opus 5.5.

**What is the difference between Pro and Highspeed?** Same model family, Highspeed answers 2 to 3 times faster and costs twice as much (cached input costs the same).

**Can I turn off the thinking?** No. You can only reduce it with `reasoning_effort="low"`.

**Can I use it commercially?** Through the API, yes, under Moonshot's terms of service. For the open weights, wait for the K3.1 license; K3's license allows commercial use, with extra conditions only for very large companies.

## What happens next

When the weights appear on Hugging Face, we will add Kimi K3.1 Pro to our [free models catalog](/models.html) with its real download size, its license, and the free providers that host it, and update this guide. Until then, the best models you can use for free are in the [free leaderboard](/).

Sources: [Kimi K3.1 Pro guide](https://platform.kimi.ai/docs/guide/kimi-k3-1-pro-quickstart), [Kimi API rate limits](https://platform.kimi.ai/docs/pricing/limits), Moonshot's launch email of 25 October 2026, [Kimi K3 model card](https://huggingface.co/moonshotai/Kimi-K3) and [license](https://huggingface.co/moonshotai/Kimi-K3/blob/main/LICENSE), [vLLM recipe for Kimi K3](https://recipes.vllm.ai/moonshotai/Kimi-K3), [Simon Willison](https://simonwillison.net/2026/Oct/23/kimi-k31-pro/), [The Decoder](https://the-decoder.com/chinese-ai-model-kimi-k3-1-pro-is-closing-in-on-anthropics-claude-opus-5-5/), [OpenRouter](https://openrouter.ai/moonshotai/kimi-k3.1-pro), Arena coding ranking of 23 October 2026.
