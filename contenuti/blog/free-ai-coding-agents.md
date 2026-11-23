---
titolo: Free AI coding agents and editors with no-cost plans
descr: Explore free terminal agents and editors with no-cost tiers or BYOK options, letting you try AI-assisted coding without paying.
data: 2026-11-23
---

FreeLLMArena lists a number of AI coding agents and editors that you can use without paying. All of the apps below have a free tier or are completely free if you provide your own model. The free tiers differ in limits, but each one lets you try AI-assisted coding at no cost.

## Terminal coding agents

These tools run in a command-line environment. They let you send prompts and receive code directly from the terminal.

| App | Price type | Free plan description |
|-----|------------|------------------------|
| OpenCode | byok | Free app. Its Zen gateway lists free models “for a limited time”. |
| Codex CLI | tier | Works with ChatGPT Free (limits not published), ChatGPT Go from $8, or your own API key. |
| Aider | byok | Free app; you pay only the model, or use a local one. |
| Goose | byok | Free app; desktop and terminal. |
| Qwen Code | byok | Free sign-in tier ended on 15 Apr 2026; now you need your own key or a local model. |
| Crush | byok | Free app; its Hyper provider has a free tier (limits not published). |
| Kilo Code | byok | Free plan with your own key and an “Auto Free” mode that picks free models; Kilo Pass $19 a month. |
| Cline | byok | Free app for VS Code, JetBrains and the terminal. |
| Kimi Code | unknown | Open source; pricing not verified. |
| Gemini CLI | byok | Free Google sign-in use ended on 18 Jun 2026; Google points to Antigravity CLI instead. |
| Antigravity CLI | tier | $0 plan with weekly limits (numbers not published). |
| GitHub Copilot CLI | tier | Included in Copilot Free; Copilot Pro $10 a month. |
| Amp | tier | Free Hobby plan with pay-as-you-go; $20 plan. |
| Cursor CLI | tier | Free tier “limited” (no numbers); Plus $8 a month. |
| Claude Code | paid | From Claude Pro, $20 a month ($17 billed yearly). Works only with Claude models. |

All of these apps are free to install. The “byok” (bring-your-own-key) entries require you to supply an API key or run a model locally. Tiered entries give a $0 plan but hide exact request counts.

## Integrated code editors

These editors embed AI assistance inside a graphical development environment. Some work as extensions for VS Code or JetBrains, others are stand-alone editors.

| App | Price type | Free plan description |
|-----|------------|------------------------|
| Zed | byok | Personal plan $0, unlimited with your own key or local models; Pro $10 a month. |
| VS Code + GitHub Copilot | tier | Copilot Free: 2 000 completions and a limited number of chats a month; Pro $10. Chat and agent also work with Ollama or your own key. |
| Trae | tier | Free: 5 000 autocompletions a month and a limited Auto mode; Pro $20. |
| Cursor | tier | Free: “limited” requests (no numbers); Plus $8, Premium $30. Own keys only for chat. |
| JetBrains AI (Junie) | tier | AI Free: 3 credits every 30 days; works with your own key, Ollama or LM Studio. |
| Kiro | tier | Free: 50 credits a month; Pro $20 (1 000 credits). Managed models only. |
| Google Antigravity | tier | $0 with weekly limits (numbers not published); Gemini-centric. |
| Devin Desktop (ex Windsurf) | tier | Free “light” quota (numbers not published); Pro $20. Renamed from Windsurf on 2 Jun 2026. |

The free plans let you write, autocomplete, and in some cases chat with the model. Limits are usually expressed as a number of completions, credits, or vague “limited” usage. If you have an API key you can often bypass those caps.

## Running models locally

If you prefer not to rely on external APIs, FreeLLMArena lists several open-source runtimes that let you host models on your own machine. These apps are free to download and run. Some also provide optional cloud services for a fee.

- **LM Studio**: free for personal and internal business use. Paid plans add cloud models. It is described as the easiest app to start with.  
- **Ollama**: free on your own computer; optional Pro cloud plan costs $20.  
- **Jan**: free desktop app that works offline.  
- **llama.cpp**: free engine used by many other apps; suited for technical users.  
- **AnythingLLM**: free; lets you chat with your own documents.  
- **Open WebUI**: free web interface for Ollama and others; branding rules apply above 50 users.  
- **KoboldCpp**: free; popular for stories and role-play.  
- **LocalAI**: free; an OpenAI-compatible server on your machine.  
- **vLLM**: free; fast serving for servers and many users.  
- **Lemonade**: free; optimised for AMD hardware.  
- **Msty Studio**: tiered; free with feature limits, Aurum $149 a year.  
- **GPT4All**: free, but the last release is from Feb 2025.  

These runtimes let you load the top free models that FreeLLMArena ranks. For example, the MiMo-V2.6-Flash model (310.8 B parameters, about 191 GB at 4-bit) fits fully on a Mac Studio M3 Ultra with 512 GB of RAM. A model such as Kimi K3.1 Pro (2 780.1 B parameters, ~1 687 GB at 4-bit) does not fit on any single home machine. **4-bit** compression reduces the memory needed to store a model; **parameters** are the learned weights that define the model’s behavior.

## Automation and AI agents

Beyond direct coding assistance, a few free platforms let you automate workflows or build custom AI agents.

- **n8n**: Community Edition is free to self-host and offers unlimited runs. You can plug in any model, local or free. Cloud service starts at €20 / month (annual).  

Other tools such as **Open Design**, **bolt.diy**, **Dyad**, **Onlook**, **Bolt.new**, **v0**, **Lovable**, **Replit Agent**, and **Google AI Studio Build** also provide free tiers, often with token or credit limits. Their pricing details are listed in the data but remain unchanged for the free plans.

## How to pick the right free tool

FreeLLMArena currently ranks 162 models in the “WebDev (coding)” category, with 73 of them marked as free. The ranking shows that the most capable free models still require substantial hardware. If you have a high-end workstation such as a Mac Studio M3 Ultra, you can run models like MiMo-V2.6-Flash or Qwen3.8-Flash-Next locally. If your machine is less powerful, you will need to rely on BYOK services, tiered APIs, or cloud-based free tiers.

When you choose a coding agent, consider three factors:

1. **Integration point**: Terminal agents work well for script-heavy workflows; editors integrate directly into your IDE.  
2. **Model source**: BYOK tools let you bring any model you host; tiered tools lock you into the provider’s free quota.  
3. **Usage limits**: Some free tiers hide exact numbers; plan for occasional throttling if you exceed the hidden caps.  

By matching your hardware, preferred workflow, and tolerance for limits, you can stay entirely within free offerings.

---

### Find more details

Explore the full list of free AI coding agents and editors on the [apps page](/apps). For guidance on which GPU can host the larger models, visit the [GPU page](/gpus).
