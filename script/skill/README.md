# Agent Skills and tutorials

`node script/skill.mjs --prova` discovers candidates, scans pinned GitHub archives,
creates one skill and one tutorial, renders both formats through the existing
HyperFrames/Kokoro/Parakeet engine, and checks encoded frames and browser layouts.
The existing `npm run build` checks site generation, translations and internal
links; `node script/skill/heading.mjs` checks the new sections' titles and headings.
Trial output is under `video/skill-tutorial/` and never creates releases.

The daily workflow shares the `video` concurrency group. Production prepares the
same artifacts, then builds/checks the site before `--pubblica` creates the four
release assets. Publication is disabled on feature branches. YouTube delivery and
priority stay in the existing n8n flow. Page players reuse `legami-video.json` and
`youtube.json`, with the same GitHub MP4 fallback as news.

Sources are stored with their SHA-256 and pinned commit. Screens, speech, commands,
workflow steps and feature claims must have evidence in the source card. Explicit
editorial instructions and the security disclaimer are separately allowlisted.
Cards cannot reuse video approval after their content changes. Both formats of
every selected card must finish before any page is staged. Artifact hashes are
checked again before release creation. An existing incomplete release fails
closed instead of being overwritten.

Discovery works on SKILL.md installation units. A repository containing several
skills yields several candidates; a CLI or framework without the matching skill
unit is not an installable skill candidate. The pinned GitHub tree is used to
download only each selected directory, plus the root README as separate command
evidence. CLI sources, CI and unrelated documentation are not scanned as skill
code. All files inside the installed directory are reviewed, including scripts,
references and assets. Cache identity includes commit, policy and selected units.

Executable code blocks on dynamic evaluation, obfuscation, remote loading or
execution, secret reads, undocumented outbound hosts, opaque binaries and install
hooks. Markdown instructions become dated warnings, including official installers
and documented configuration/service access. Internal symlinks are allowed; links
leaving the skill directory block. Incomplete reviews fail closed. No skill code
is installed or executed. Static review is not a security certification.

The first 20 entries of the actual skills.sh trending payload are recorded in
`dati/skill-audit-top20.json`, with status, pinned revision and file/line evidence.
A separate content eligibility reason explains when a static pass cannot produce
a page: for example, a fork whose README installs a different repository. Generic
README install commands retain their exact syntax; the page and video instruct
the user to select only the reviewed skill in the installer.

Tutorials prioritize official evergreen guides and new free models. A tutorial
cannot cover a skill topic published or staged in the previous seven days.
Existing Strata/MiniMax guides remain links. Official installer commands are shown
as documented instructions with a warning; this pipeline never runs them.

Slide explanations use one bounded Workers AI request per selected card through
the shared writing transport. Dedicated daily caps: skill 200 neurons, tutorial
200. They come from the video-plan budget (3000 to 2600); news remains 1500 and
the sum of site caps remains 10000. The client first verifies the authenticated
budget-policy contract, so an older endpoint cannot charge an unknown scope to
bozze. An undeployed contract, exhausted cap, invalid output or unavailable writer
uses deterministic text, with the reason and usage retained in the delivery.
There is no fallback to another scope/provider. Each generated sentence cites
exact card facts and passes the existing news names/numbers gate plus a content
word check against its cited evidence. Commands and examples remain exact source
text. Usage is provider neurons when returned, otherwise a token-cost estimate.

Scenes have a large opening question, short one-line header, centered safe-area
content, source code examples and diagrams/fact groups. Automatic checks reject
repeated titles, duplicate visible text, wrapping or overlapping headers, small
Short fonts, empty safe areas, clipping and missing visual elements. Encoded
frame checks remain separate from DOM fact/layout checks.

Diagram rules were adapted from
[Diagram Design](https://github.com/cathrynlavery/diagram-design/tree/main/skills/diagram-design)
and the HyperFrames registry `flowchart` block: sparse source-backed steps,
orthogonal connectors, one focal accent, distinct treatments and no shadows.
The palette and type remain those of the existing FreeLLMArena video templates.

Checks:

```text
node --test script/skill/gate.test.mjs
python -m unittest discover -s script/skill -p '*_test.py'
npm run build
node script/skill/heading.mjs
```
