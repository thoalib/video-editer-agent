---
name: style-from-reference
description: Turn a reference edit into a reusable style preset (fonts, colours, caption look, motion feel) and, when asked for an exact recreation, run the 5-second REF/OURS/DIFF/PLAN matching loop.
---

# Style from a reference

Two uses: (a) a reference arrives with a video to edit — match its look for this edit; (b) the user says
"add this as a new style" (with or without a video to edit) — build a permanent, reusable preset in `styles/<name>/`.
Both follow the steps below; (b) must also finish § New style. Ask for a name only if the user gave none; otherwise
pick a short kebab-case name from the look (`violet-tutorial`, `teal-tech`, `editorial-blue`) and say it.

## 1. Study
```
python run.py ref-study jobs/JOB/source/reference.mp4 <style-name>
```
Writes `styles/<style-name>/study/`: `windows/wNN.jpg` contact sheets (5 fps, timestamps),
`wNN_REF.md` skeletons, `cuts.json`, `palette.json`, `camera.json`, `dots.json`.
If the reference is low-res or heavily compressed, ask for (or find) the sharpest version first;
font matching on blurry frames is guesswork.

## 2. Fill the REF docs
Read every contact sheet (and full-res frames where text is small: `ffmpeg -ss T -i ref -frames:v 1 x.png`).
For each window fill `wNN_REF.md`: layout, text (font family by x-height and letter shapes — a/g/R/e,
terminals, stroke contrast; weight; px size; tracking; case), colours (sample with `pipeline/measure.py`
`sat_color`/`ink_bbox`, not by eye), camera (`camera.json` start scale + settle), word reveal
(frames from first visible to 90%), transitions, motion blur, sound.

## 3. Write `styles/<style-name>/style.json`
Copy the closest preset (`violet-tutorial` = script + sans, step cards; `teal-tech` = cyan HUD;
`editorial-blue` = serif italics, paper frame; `bold-terracotta` = heavy caps) and change tokens: `fonts`, `colors`, `caption` (line1/big/underline),
`motion.reveal`, `camera`, `dots`, per-template blocks. Add `name`, `description`, and
`signature_templates` (the treatments the reference relies on, e.g. ["chestCaption","listCard","routeMap"]).
Missing font? Add an open-licence look-alike to `engine/fonts/` + `@font-face` in `engine/overlay.html`.
A treatment no template covers → write a template (`skills/motion-templates`).

## 3a. Placement as relationships
For every overlay on the speaker, measure the face in the same reference frames (MediaPipe face mesh: forehead
landmark 10, chin 152, face edges 234/454, eyes 33/263) and store the element's position as an anchor in
`style.anchors.<template>`: horizontal as `dx` (face heights from the face centre / edge), vertical distance from the
face as `fy` = (element y - chin) / (safe bottom 1650 - chin) (or `fx` toward the side edges). Never store reference
pixels for speaker overlays; fixed layouts are only for full-screen graphics without the speaker.

## 3b. Templates
List every distinct treatment in the reference (captions, badges, cards, panels, lists, transitions, b-roll inserts,
behind-head text, CTA). For each: an existing template that covers it (check `skills/motion-templates`, including the
2026-10-20 ones) → set its tokens in style.json; none → write a new template, generic enough for other content
(params for text/positions/timing, look from tokens), never hard-coded to the reference's words.

## 4. Verify
Render previews on the user's job (`run.py preview`) and compare with reference frames side by side.
Then `python run.py styles-preview` to refresh `styles/*/preview.jpg`.

## Exact recreation (only when the user asks for "identical / recreate")
Work in 5 s windows. For each window: REF.md (above) → build → `OURS.md` (same headings, measured on our
frames with the same `measure.py` functions) → `DIFF.md` (every difference, with numbers) → `PLAN.md`
(fixes) → fix → compare again → next window. Keep docs in `jobs/JOB/work/windows/wNN/`.
Finish with `python run.py sbs JOB` (set `reference_pairs` to pair each treatment) and the QC motion check.
Even then, adapt treatments to the user's content: same look and timing feel, content-true graphics.

## New style (when the user asks to add a reference as a style)
A finished style folder has:
1. `study/` — `reference.mp4` (the reference itself, unedited, kept), `windows/`, `frames/` (full-res stills used to
   measure), cuts/palette/camera json. Delete nothing from it.
2. `style.json` — built by deep-merging over the closest existing `styles/*/style.json` (e.g. `violet-tutorial`) so every
   template keeps its tokens, with
   `name`, `description`, `signature_templates`, `modes`, and caption faces in `mix.*` / `flash.*`.
3. `STYLE.md` — the measurements table (fonts with px sizes, colours, positions at 1080×1920, timings, cuts, camera)
   and a **Modes** table: "speaker says X → template Y". Copy the layout of `styles/violet-tutorial/STYLE.md`.
4. `preview.jpg` — 4 stills (1080×480 strip, name bar) rendered from a test plan of the new style on real footage
   (use `jobs/_style-test`: add `work/plan_<style>.json`, copy to `plan.json`, `run.py preview`). Read the stills and
   compare with `study/frames/` before calling the style done.
5. A row in `styles/README.md` and its name added to the style question in `skills/reel-editor`.
Fonts: identify by letter shapes on full-res stills; download open-licence look-alikes from Google Fonts
(`https://cdn.jsdelivr.net/npm/@fontsource/<family>@<ver>/files/<family>-latin-<weight>-<normal|italic>.woff2`)
into `engine/fonts/`, add `@font-face` in `engine/overlay.html` and the preload list in `engine/core.js`. Render a
comparison line of 2–4 candidates next to the reference crop and pick by eye.
