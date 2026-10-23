---
name: qc
description: Quality control before delivering — stills of every shot, per-region motion check, frame count, loudness — and how to act on flags.
---

# QC

```
python run.py qc JOB          # after master (or on work/video_nosound.mp4 before audio)
```
Writes `work/qc/`: `shot_stills.jpg` (3 stills per shot), `stills/`, `motion_plot.png`, `qc_report.json`.

1. **Look** at `shot_stills.jpg` and any doubtful still at full size. Check text spelling (English),
   safe areas, overlaps with the face, contrast, cut-off words, the watermark.
2. **Motion flags**: frames where some region's velocity jumps (> 9 px/frame², more than the raw footage's
   own movement explains) or reverses (jitter), outside cuts and planned fast moves (swipes, map, bloom).
   For each flag, render the neighbourhood (`run.py preview JOB --frames F-2,F-1,F,F+1`) and compare.
   Real problem → fix the template param (longer tau, settle2 instead of settle, smoother keys) and
   re-render. Not a problem (speaker's hand, natural head turn) → note why in the delivery.
3. **Size pulse**: `scale_sign_flips` > 6 within a shot means the framing breathes; lock or smooth it.
4. **Frame count** must equal the sum of segment frames (`frame_count_ok`). fps and size must match the plan.
5. **Loudness**: −14 LUFS ±1, true peak ≤ −1.0 dBFS.
6. **Sync**: watch the first 5 s and one late section; lips must match.

Do not claim QC passed without reading the stills. Report open items honestly.
