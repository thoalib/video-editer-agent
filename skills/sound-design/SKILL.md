---
name: sound-design
description: Voice, music bed and SFX for reels — plan.audio options, auto cue rules, loudness targets, and how to check the mix.
---

# Sound design

`python run.py audio JOB` builds `work/mix.wav` from `plan.audio`:

```json
"audio": {"music": "pad", "music_db": -12.5, "lufs": -14, "sfx": "auto"}
```
- **Voice**: source audio cut by `plan.segments` (1:1 with picture), 70 Hz high-pass, light de-ess.
  It is the priority; never process it heavily.
- **Music**: `"pad"` = original synthesized ambient bed (Am–F–C–G, ducked under speech, fades);
  `"none"`; or a path to a file the user owns/licensed (`assets/music/x.wav`, looped, ducked).
  Never use copyrighted tracks the user did not supply.
- **SFX** `"auto"`: whoosh into each shot change, swipes and the phone squeeze, riser before a bloom,
  soft ticks on list rows / map markers / pointer lines / chips, pop on a map reward. Cues closer
  than 0.25 s are thinned. Or give a list: `[{"kind": "whoosh"|"tick"|"pop"|"riser"|"file", "at": t,
  "gain_db": -22, "path": "assets/sfx/soft-tick.wav"}]`. `"none"` disables.
- **Master**: two-pass loudnorm to `lufs` (−14 for Reels/Shorts/TikTok, −16 for podcasts/YouTube long-form
  if asked), true peak −1.5 dB, limiter.

Check: `run.py qc` reports LUFS and true peak of `output/final.mp4`. Listen to `work/sfx.wav` alone
(cues sit on the motion, nothing on every caption) and to the first 10 s of the master.
Do not overdo SFX: if a reel has more than ~1 cue per 2 s, switch to an explicit, shorter list.
