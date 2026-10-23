---
name: reel-editor
description: Main workflow. Turn a raw talking-head video (plus an optional reference edit) into a finished, motion-designed Reel/Short with this workspace's template engine. Use for any "edit this video" request.
---

# Reel editor — one prompt to final.mp4

The user drops a raw video (and maybe a reference) and asks for an edit. You run the whole job:
intake → transcript → design plan → previews → render → audio → QC → deliver. Every step is a
`python run.py <step> JOB` command (see `README.md`). Never open a timeline editor unless the
user asks for Premiere (`skills/premiere-edit`).

## Hard rules (house defaults — only the user can override them)

1. **Final cut.** The given video is already the final cut. Do NOT remove silences, fillers,
   retakes or "weak" parts, and do not shorten it. `plan.segments` = one segment over the whole
   video. Only when the user explicitly asks ("remove silences", "cut to 50 s", "remove repeats")
   run `run.py cutlist`, review every suggestion by listening, and pass the reviewed keep-list.
2. **On-screen text is English.** Speech may be Malayalam, English or mixed; the voice stays as
   recorded. Captions and graphics show natural English (translate meaning, not word order).
   Never burn Malayalam script. Keep names, numbers, negations and claims exact.
3. **Templates adapt to the content.** A reference or preset gives the look (fonts, colours,
   motion feel). The graphics you choose come from what is being said: a list gets a list card,
   steps get a route map, a comparison gets a split screen or phone swipe, a key phrase gets a
   chest caption. Never copy a reference's layout onto unrelated content.
4. **Motion.** Nothing jitters or pulses. Moves ease out with a slight spring or settle, then hold
   long enough to read. 180° motion blur only (engine does it). Source frames map 1:1.
5. **Audio.** Voice clean at −14 LUFS, true peak ≤ −1.5 dB. Music optional and quiet (original pad
   or a file the user owns). SFX sparse: shot changes, swipes, list rows, rewards. Never on every word.
6. **Restraint.** Graphics follow the density the user chose. Clean footage between beats is a feature.
7. **No identical looks.** A new video must not look exactly the same as the last one. Sharing some
   things is fine (same style, same name tag, similar captions); a viewer seeing both should still
   notice a different look. Run `python run.py history` before designing and change a few visible things,
   for example: accent/palette (`style_overrides`), caption faces or position, the graphics used for the
   main beats (list, steps, tool, CTA), shot rhythm, footage layout. The same style picked again →
   give it a visible variant (§ Fresh variants). Don't copy a previous job's plan wholesale.

## Step 0 — intake (decide the look before designing)

Look in `jobs/<name>/source/`: `raw.*` is the footage, `ref*.*` is a reference.
Create the job with `python run.py new NAME /path/raw.mp4 [/path/reference.mp4]` when the files
are elsewhere. Check `docs/preferences.md` for the user's standing choices, and run
`python run.py history` to see how the last video looked (rule 7) and note in `work/notes.md`
what will look different this time.

**Graphics are chosen per style mode.** Every style folder has `STYLE.md` with a Modes table ("speaker says X →
template Y"): read it before the beat sheet and pick the mode for each beat from what is being said — captions-only
beats, speaker + overlay beats, full-screen text/graphic beats without the speaker (stepCard, paperFrame, filmCards).
Not every beat gets a graphic; density follows the user's choice.
**Placement follows this video's speaker**: leave positions out (style anchors apply) or write `anchor` objects;
use fixed x/y only on full-screen graphics. Check stills where the speaker leans, moves or is framed differently.

**"Add this as a new style"** → `skills/style-from-reference` § New style (permanent preset), then continue the edit
with it if a video was given.

**A reference was given** → `python run.py ref-study source/reference.mp4 <style-name>` and follow
`skills/style-from-reference` to create `styles/<style-name>/style.json`. If the user said
"recreate it exactly", run the full 5-second REF/OURS/DIFF/PLAN loop; otherwise match the look
and choose graphics by content.

**No reference** → ask ONE round of questions before designing. AskUserQuestion holds 4 questions per
call, so send two calls back to back: (1) Ratio, Style, Graphics density, Captions; (2) Extras.
Show `styles/*/preview.jpg` (send the images) first so they can pick by eye:

| Question | Options (first = default) |
|---|---|
| Style | Violet Tutorial (script + sans captions, step badges, glowing step screens) · Teal Tech (cyan HUD: ring stats, glass panels, product card) · Editorial Blue (serif italics, paper frame, film b-roll, text behind head) · Bold Terracotta (heavy caps, terracotta boxes) · Azure Paper (blurred-chest captions, azure diamonds, glass cards, grid-paper scenes) · "Create a new style" · "I'll send a reference" (list every folder from `python run.py styles`; AskUserQuestion shows 4 options, so offer the 3 best fits — putting the style used last at the end — + reference, and mention the rest) |
| Ratio | 9:16 vertical — Reels/Shorts (`--size 1080x1920`) · 16:9 landscape — YouTube (`1920x1080`) · 1:1 square (`1080x1080`) · 4:5 feed post (`1080x1350`) |
| Graphics density | Balanced (a designed beat every 5–8 s) · Rich (most sentences get a treatment) · Light (captions + 1–2 key moments) |
| Captions | Key-phrase captions (designed, selective) · Full subtitles (every word, active-word highlight) · Both · None |
| Extras (multi-select) | Name tag (ask name + role) · Music bed · SFX · Watermark/logo |

Pass the ratio to `run.py plan JOB --size WxH`. Not 9:16: overlays placed by anchors and subtitles adapt
(safe area scales with the frame, subtitles sit in the lower third), but full-screen templates (`stepCard`,
`paperFrame`, `filmCards`, `routeMap`, `phone`, `splitScreen`) have 9:16 layouts — give them explicit
rects for the frame or choose other treatments, and check every beat in previews. A landscape source in
16:9 needs no band. If the user is away or says "you decide": 9:16, the style used least recently (`run.py history`), as a fresh variant,
Balanced, key-phrase captions, music pad + auto SFX, name tag only if the name is known. State the
choices at the top of your reply.

## Fresh variants (rule 7)
When the chosen style was used for the previous video, or the user picks "Create a new style":
- Variant of an existing style → `style_overrides` in the plan: a new accent/highlight palette (keep contrast on
  footage), different caption faces from `mix.*` (e.g. bold+thin instead of sans+script), another caption position,
  and different hero templates from `skills/motion-templates` (the style's Modes table is a starting point, not a limit).
- New style → copy the closest folder in `styles/` to `styles/<new-name>/`, change fonts, colours, caption faces,
  motion feel and `signature_templates`, write `STYLE.md` (Modes table) and render `preview.jpg`
  (`skills/style-from-reference` § New style, steps 3–5; no reference study needed). Show the preview before the full render.
Name the differences from the last video in the delivery message.

## Step 1 — prep
```
python run.py prep JOB --lang ml --keyterms "QubesAI,ChatGPT,Claude"   # Scribe first, Whisper fallback
```
Read `work/transcript.txt`, `work/contact.jpg`, `work/probe.json`. Follow `skills/transcribe`
to produce a reviewed English meaning per phrase (keep it in `work/notes.md`). For Malayalam,
Whisper is a weak fallback: if Scribe is unavailable, say so and ask for the key or a script.

## Step 2 — plan
```
python run.py plan JOB --style <style>        # final cut, speaker shot + subtitles starter
```
Then design `work/plan.json` (schema: `docs/plan-schema.md`, catalog: `skills/motion-templates`,
directing guidance: `docs/directing.md`):
1. Write a beat sheet in `work/notes.md`: time range · what is said (English) · purpose
   (hook, claim, list, steps, comparison, example, CTA) · treatment · why.
2. Map treatments to templates (shots partition the timeline; elements sit on top).
   Typical Balanced reel: hook = speaker + chestCaption (+ nameTag); list = listCard on dimmed
   footage; steps = routeMap; comparison = phone swipe with chatMock or splitScreen; key line =
   stackedCaption/wallWords; CTA = chestCaption. Change shot every 4–10 s.
3. Word times come from the transcript (timeline seconds). English words for Malayalam speech:
   time each English word to when its concept is spoken; reveal a list row as that item is said.
4. `audio`: music `pad`|`none`|file, `sfx` `auto` (or an explicit list).
5. Delete the starter `subtitles` element unless full subtitles were chosen.

## Step 3 — frames + previews (cheap; iterate here, not on full renders)
```
python run.py frames JOB [--masks S1]                # --masks only for wallWords behindHead
python run.py preview JOB --frames 40,130,260,...    # one frame per beat, mid-move + held
```
Look at every still (Read the jpgs). Check: text inside safe area (x 60–1020, y 200–1650 for
9:16), nothing covers the face unless intended, line breaks, colours, legibility over footage.
Fix the plan and re-preview until right.

## Step 4 — render, audio, master, QC
```
python run.py render JOB && python run.py audio JOB && python run.py master JOB && python run.py qc JOB
```
Follow `skills/qc`. Open the shot stills and motion plot; every motion flag gets a look and either
a fix or a one-line reason (e.g. the speaker's hand). Re-render only the affected range if needed:
`python pipeline/render.py JOB --start F --end F --out work/part.mp4` (or just re-render all).
With a reference: `python run.py sbs JOB` → `output/side_by_side.mp4`.

## Step 5 — deliver
`output/final.mp4` (+ `side_by_side.mp4`, `plan.json`, `transcript.txt`). Reply with: duration,
style, what each beat does (one line each), QC result, anything unverified. Send the file.
Record new standing preferences the user states in `docs/preferences.md`.

## When a template is missing
Write a new one in `engine/templates/<name>.js` (copy the closest one, read `skills/motion-templates`
"Writing a template"), add the `<script>` tag in `engine/overlay.html`, put its look in style tokens,
and add it to the catalog. Keep it deterministic: everything is a function of `t`.
