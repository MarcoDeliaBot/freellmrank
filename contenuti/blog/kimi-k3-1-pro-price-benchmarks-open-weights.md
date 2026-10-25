---
titolo: Kimi K3.1 Pro: what it is, what it costs, and when it becomes free
descr: Moonshot's new model is close to the best paid AI, but today it is paid only. Prices, real scores, what changes on 4 November when the weights arrive, and how to call it.
data: 2026-10-25
tema: Guides
---

Kimi K3.1 Pro is the new top model from Moonshot AI, released on the Kimi API on 23 October 2026. Moonshot calls it "our most capable 3T-class open-weight model to date", with a 1-million-token context window. There is also a faster variant, **Kimi K3.1 Pro Highspeed**, which Moonshot says runs 2 to 3 times faster.

The important detail for anyone looking for free AI: **today it is not free and not yet open**. Moonshot's guide says the full model weights "will be released by Nov 4". Until then you can only use it through paid APIs.

## Can you use it for free today?

Not yet. This is what we checked on 25 October 2026:

- **Moonshot's API** works on pay-as-you-go. K3.1 Pro is "unlocked after a successful top-up (minimum $1)", according to the official guide.
- **OpenRouter** lists it as `moonshotai/kimi-k3.1-pro` at $2 per million input tokens and $10 per million output tokens. There is no free version.
- **Hugging Face** has no K3.1 Pro weights yet. The newest Moonshot model there is still [Kimi K3](https://huggingface.co/moonshotai/Kimi-K3).

If you want a free Moonshot model now, use its predecessor. [Kimi K3](/model/kimi-k3-max) has open weights and its own free chat with daily limits at kimi.com.

## Prices

Prices from Moonshot's launch email, per million tokens. Both versions read up to 1,048,576 tokens, with no higher price for long prompts.

| Item | K3.1 Pro | K3.1 Pro Highspeed |
|---|---|---|
| Input | $2.00 | $4.00 |
| Output | $10.00 | $20.00 |
| Cached input | $0.20 | $0.20 |
| Cache write, kept 5 minutes | $2.00 | $4.00 |
| Cache write, kept 1 hour | $4.00 | $8.00 |

Caching is automatic: when the start of your prompt repeats, that part costs a tenth of the normal input price. The Decoder reports that these prices are 33 percent lower than K3's.

## How good is it?

Three independent signals, and Moonshot's own numbers.

**Arena, blind human votes.** In the Arena coding ranking (WebDev) of 23 October 2026, Kimi K3.1 Pro (Max) is 8th of 150 with 1692 points. Kimi K3 (Max) is 17th with 1655. The leader is Claude Opus 5.5 (Max) with 1807. See the [full coding ranking](/#code).

**Artificial Analysis.** Its Intelligence Index gives K3.1 Pro 55 points, as reported by [Simon Willison](https://simonwillison.net/2026/Oct/23/kimi-k31-pro/) and [The Decoder](https://the-decoder.com/chinese-ai-model-kimi-k3-1-pro-is-closing-in-on-anthropics-claude-opus-5-5/). Only Claude Opus 5.5 (58), Claude Sonnet 5.5 (56) and Muse Wonder Full (56) score higher. When the weights come out, it would be the highest-scoring open-weights model on that index.

**Simon Willison's comparison.** He notes the $2 / $10 price is the same as GPT-6.1 Sol and half the price of Claude Opus 5.5.

**Moonshot's numbers**, to read as claims from the maker:

- Terminal-Bench 4.0: 65.7%, against 66.4% for Claude Opus 5.5 and 13% for K3 (reported by The Decoder; on Moonshot's guide the figure is still a blank placeholder).
- BenchCAD, building 3D CAD models: 92.7% with tools and 72.8% without (The Decoder).
- Finance: on Moonshot's internal tests, +7.2 points over K3 in financial modeling, +11.6 points in financial research, and about 4.2 times K3's result in a simulated business.
- Fewer invented facts: on a stress test built from conversations where users flagged errors, the share of false claims fell from 23.35% with K3 to 6.85%. Moonshot says this is a deliberately hard test, not the error rate of normal use.

## What is new

Moonshot describes K3.1 Pro as K3 with much more post-training, mostly reinforcement learning across hundreds of tasks. The guide focuses on four areas:

- **Coding**, from small fixes to whole projects, including games in Unity, Unreal Engine and Godot. The demos include a 3D action game built in Godot 4.7.2 and a browser 3D robotic arm with 2,317 parts.
- **3D and CAD.** It writes and runs scripts for Blender, FreeCAD and similar tools directly, without special connectors. One demo is a turbofan engine in FreeCAD with 2,100 solid parts.
- **Finance**, with the results above.
- **Security limits.** Moonshot removed cyber-attack data from training for the open release. On its internal hacking test, the version without this cleaning solved 90.5% of tasks; the released model solves 81.0%. Moonshot says it stays behind the best paid models in this area on purpose.

## Can you run it at home?

No, and the weights will not change that. The Decoder reports that K3.1 Pro keeps K3's size: 2.8 trillion parameters, 104 billion of them active for each word. For [Kimi K3](/model/kimi-k3-max) that means about 1,685 GB of memory just for the weights at 4-bit. That is a rack of data-center GPUs, not a gaming PC.

What the open weights will change: other providers can host it, so cheaper prices and free tiers may appear, and companies can run it on their own servers. To see what fits your own GPU instead, use [Run at home](/home).

## For developers: calling the API

The API is compatible with the OpenAI SDK. Get a key in the [Kimi console](https://platform.kimi.ai/console/api-keys) after the $1 top-up.

```python
from openai import OpenAI

client = OpenAI(api_key="YOUR_KEY", base_url="https://api.moonshot.ai/v1")
reply = client.chat.completions.create(
    model="kimi-k3.1-pro",  # or kimi-k3.1-pro-highspeed
    reasoning_effort="low",  # low, high or max (default)
    messages=[{"role": "user", "content": "Explain Mixture of Experts in two sentences."}],
)
print(reply.choices[0].message.content)
```

Rules from the official guide that are easy to miss:

- The model **always thinks** before answering. You cannot turn it off; `reasoning_effort="low"` makes it shorter and cheaper.
- Answers can be up to 131,072 tokens by default, and up to 1,048,576 if you set `max_completion_tokens`.
- Temperature and the other sampling settings are fixed: leave them out of the request.
- In conversations with tools, send back the **whole** assistant message, not just its text.
- Images must be sent as base64 or as an uploaded file (`ms://` id). Public image links do not work.
- Moonshot's built-in web search "is being updated and is not recommended" for now.

One more change for Kimi users: from 31 October 2026, new accounts can no longer use the K2 models, and Moonshot plans to retire all K2 models by the end of December 2026.

## What happens next

When the weights appear on Hugging Face, we will add Kimi K3.1 Pro to our [free models catalog](/models.html), with its download size and the free providers that host it. Until then, the best free models are in the [free leaderboard](/).

Sources: [Kimi K3.1 Pro guide](https://platform.kimi.ai/docs/guide/kimi-k3-1-pro-quickstart), [Kimi API rate limits](https://platform.kimi.ai/docs/pricing/limits), Moonshot's launch email of 25 October 2026, [Simon Willison](https://simonwillison.net/2026/Oct/23/kimi-k31-pro/), [The Decoder](https://the-decoder.com/chinese-ai-model-kimi-k3-1-pro-is-closing-in-on-anthropics-claude-opus-5-5/), [OpenRouter](https://openrouter.ai/moonshotai/kimi-k3.1-pro), Arena coding ranking of 23 October 2026.
