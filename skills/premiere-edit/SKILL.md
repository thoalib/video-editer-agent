---
name: premiere-edit
description: Optional mode — only when the user asks for Premiere Pro. Assemble or revise the edit in Adobe Premiere Pro through the local Premiere MCP bridge, verifying every operation against the real timeline.
---

# Premiere Pro (optional mode)

Default delivery is `output/final.mp4` from the engine. Use Premiere only when the user asks
("use Premiere", "give me a Premiere project", "I want to adjust it in Premiere").
Setup, verified fixes and limits: `premiere/SETUP.md`. Readiness check: `node premiere/check.mjs`
(`--launch` may start Premiere). This runs on the user's Mac only.

## Connect
1. Call the MCP's `get_capabilities`, then `verify_premiere_connection`. A running process is not a connection.
2. If Extensions is disabled on Premiere Home, open an editing project first
   (media-free scratch: `premiere/bridge-setup/Bridge Setup_1.prproj`), then Window → Extensions →
   MCP Bridge (CEP). Keep the panel open during calls.
3. Search the live tool catalog and read each tool's schema. Never invent tool names, IDs or units.

## What to put in Premiere
Run the normal workflow up to `master` first, then:
- V1: original source media (imported into a named bin), cut by `plan.segments`.
- V2: `work/video_nosound.mp4` (the full composite) — or, for editable layers, the rendered graphics as
  separate clips per beat. Rendered graphics are baked; keep `plan.json` as the source for revisions.
- Captions: `python pipeline/export_srt.py JOB` → `output/captions.srt`, imported as native captions.
- A1 voice, A2 music, A3 SFX from `work/voice.wav`, `work/music.wav`, `work/sfx.wav` (independently adjustable).
Convert times with the sequence's real rational frame rate; check whether the API wants ticks, frames or seconds.

## Verify, then report
Read back clips after each batch (gaps, offline media, sync, trims, track order). If a call times out,
check whether it applied before retrying. Save the project; give the project path, sequence name/ID,
asset paths, what is editable vs baked, and what was not verified. Media Encoder queue acceptance is not
a finished export: confirm the file exists, stops growing, probes and plays. Never claim a Premiere
sequence exists without a verified live operation; if disconnected, deliver the engine render and say
Premiere assembly is pending.
