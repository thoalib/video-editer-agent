# Reel Editor workspace

Give it a raw talking-head video (and optionally a reference edit) and one prompt. It returns a
finished, motion-designed vertical video: captions, graphics, camera moves, music, SFX, −14 LUFS.

Everything is code: FFmpeg + Python (OpenCV, NumPy, MediaPipe) + headless Chromium rendering
HTML/CSS/JS graphics frame by frame. No timeline editor (Premiere Pro is an optional mode).

## Use it (one prompt)

1. Put the files in a new folder: `jobs/<name>/source/raw.mp4` (and `reference.mp4` if you have one).
   Or tell the agent where they are.
2. Ask Claude or Codex in this folder, e.g.

   > Edit jobs/launch-video. Teal Tech style, balanced graphics, name tag "Mohammed Thoalib, Founder QubesAI".

   > Edit jobs/demo using the reference in its source folder.

   > Edit ~/Desktop/raw.mp4 — you choose the style.

   Without a reference, it asks a few quick questions (style with previews, graphics density, captions,
   extras), then works. The video is treated as the **final cut**: nothing is removed unless you ask
   ("remove silences", "cut it to 45 s").
3. Get `jobs/<name>/output/final.mp4` (+ `plan.json`, transcript, and `side_by_side.mp4` when a reference was used).

## First-time setup (macOS)
Double-click `Setup.command` in Finder (installs Python 3.11 via Homebrew if missing, then runs `setup.sh`). Or in Terminal:
```
./setup.sh              # Python 3.11 venv, packages, Chromium for rendering
./setup.sh --whisper    # optional: local Whisper fallback (~1.5 GB model download)
cp .env.example .env    # add ELEVENLABS_API_KEY for Scribe transcription (best for Malayalam)
```
Needs `ffmpeg` (`brew install ffmpeg`) and Python 3.11 (`brew install python@3.11`).

## Commands (`python run.py help`)
| Step | Command |
|---|---|
| New job from files | `python run.py new NAME raw.mp4 [reference.mp4]` |
| Probe + transcribe | `python run.py prep JOB --lang ml --keyterms "QubesAI,ChatGPT"` |
| Starter plan | `python run.py plan JOB --style teal-tech` |
| Cut suggestions (only on request) | `python run.py cutlist JOB` |
| Frames, faces, masks | `python run.py frames JOB [--masks S1]` |
| Preview stills | `python run.py preview JOB --frames 40,200,400` |
| Render / audio / master / QC | `python run.py render JOB`, `audio`, `master`, `qc` (or `finish`) |
| Reference → style | `python run.py ref-study ref.mp4 my-style` |
| Side by side, SRT | `python run.py sbs JOB`, `python run.py srt JOB` |
| Styles | `python run.py styles`, `python run.py styles-preview` |

## Layout
```
run.py                 single CLI
pipeline/              ingest, transcribe, cutlist, plan_init, frames, render, audio, master, qc, sbs, ref_study, ...
engine/                overlay.html + core.js + templates/*.js + fonts/   (graphics engine)
styles/<name>/         style.json (look tokens) + preview.jpg (+ study/ for reference-derived styles)
skills/                agent instructions: reel-editor (start here), transcribe, motion-templates,
                       style-from-reference, sound-design, qc, premiere-edit
docs/                  plan-schema.md, directing.md, preferences.md
jobs/<name>/           source/ (raw, reference)  work/ (derived, safe to delete)  output/ (deliverables)
premiere/              optional Premiere Pro MCP setup (vendor/premiere-pro-mcp holds the bridge)
assets/                sfx/, music/ (only files you own)
```
`jobs/intelligent-ui-reel` is the worked example: its `plan.json` uses almost every template.
