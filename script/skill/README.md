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

The scanner reads every archive member without extracting or executing it. It
rejects known remote execution, code loading, obfuscation, secret reads, data
sends, install hooks, symlinks and opaque binaries. Document images are recognized
by raster signatures; they are not executed. Archive/file/count limits fail
closed. Cache keys include the pinned commit and scanner policy hash. These are
conservative static checks, not a safety guarantee; legitimate repositories can
be rejected. Reasons are retained in `dati/skill-scartate.json`.

Discovery reviews at most 24 repositories per run, prioritizes known candidates,
and rotates the remaining discovery window. Missing seven-day history is `null`,
never a fabricated zero. Ranking then uses observed 24-hour installs, total
installs and repository stars. The weekly hub uses dated eligible publications;
it does not invent ten entries when fewer pass. A collected README must provide
three relevant features; other skills in the same collection cannot fill them.

Tutorial selection considers site model novelty/downloads, eligible skills, then
official evergreen tools. Commands must be present verbatim in official sources;
unsupported model tags are skipped. Installation tutorials cannot bypass the
target skill's repository review. Existing Strata/MiniMax guides remain links.
No model is called to write content: the dedicated Workers AI budgets are zero,
and the news budget is unchanged.

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
