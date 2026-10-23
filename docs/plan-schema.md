# plan.json — the edit, as data

`jobs/<job>/work/plan.json` fully describes an edit. The engine (`engine/`) renders it; nothing else
holds edit decisions. All times are **seconds on the final timeline**. Positions are **output pixels**
(1080×1920 for 9:16).

```jsonc
{
  "job": "my-video",
  "fps": 25,                       // output fps; source frames map 1:1 (use the source's rate: 25 or 30)
  "size": [1080, 1920],
  "source": "source/raw.mp4",
  "source_size": [1080, 1920],     // after rotation
  "style": "violet-tutorial",      // folder in styles/
  "style_overrides": {"colors": {"accent": "#7C3AED"}},   // optional deep-merge over style.json
  "watermark": "QubesAI",          // optional; else style.watermark
  "segments": [                    // source ranges in order. Default: ONE segment = whole video (final cut)
    {"id": "S1", "in": 0.0, "out": 52.4}
  ],
  "broll": [                       // optional extra clips (b-roll), extracted by run.py frames to work/broll/<id>/
    {"id": "b1", "src": "source/broll1.mp4", "in": 2.0, "out": 5.0}      // used by filmCards / stepCard media {broll}
  ],
  "shots": [                       // partition the timeline: exactly one shot active at any time
    {"id": "intro", "template": "speaker", "t0": 0, "t1": 5.2, "params": {"zoom": 1.15, "eye": [540, 680]}}
  ],
  "transitions": [{"type": "bloom", "at": 28.4}],   // optional; bloom = light flash across a cut
  "elements": [                    // graphics over (or inside) shots
    {"id": "c1", "template": "chestCaption", "t0": 1.5, "t1": 4.0,
     "layer": "world",             // "world" (default: moves with camera pushes) | "screen" (fixed)
     "in": "phoneShotId",          // optional: place inside a shot's container (phone / splitScreen cards)
     "ride": false,                // true: follow the footage when it moves into a phone frame
     "anchor": {"@": "chin", "fy": 0.2, "pin": "top-center"},   // optional: place relative to the speaker (see below)
     "params": {"line1": [["ChatGPT", 1.62], ["just", 2.12]], "big": [["big", 2.8], ["update", 3.06]], "underline": 2.96}}
  ],
  "audio": {"music": "pad", "music_db": -12.5, "lufs": -14, "sfx": "auto"},
  "reference_pairs": [{"name": "chest caption", "ref": [0, 1.6], "ours": [0, 5.2]}]   // optional, for sbs
}
```

## Words
Spoken text is always a list of `[text, t]` or `[text, t, opts]`: each word appears at its own time
`t` (reveal from style `motion.reveal`). `opts` is a CSS string or `{css, size, accent, box, thin, outline}`.
For Malayalam speech, the English words are timed to when the concept is spoken.

## Segments and timeline
Timeline time is the concatenation of segments: segment k starts at the sum of previous segment
lengths (rounded to frames). Shots should cut on segment boundaries when there are several segments.
Audio follows the same segments (8 ms fades at joins).

## Shots vs elements
- **Shot templates** draw the footage layer (crop, frame shape, background, camera). They return
  media rectangles the Python compositor fills with source frames.
- **Element templates** draw graphics only. They can sit in world space (pushed by the camera),
  screen space, or inside a shot container (`in`).

## Faces
`work/faces.json` (from `run.py frames`) gives smoothed eyes/mouth/face box per source frame.
Templates use it for framing (`eye`) and anchors (`pointerCaption` anchor `mouth`).

## Validation checklist
- Shots cover 0 → total with no gaps or overlaps.
- Every element has `t0 < t1` and lies within the timeline; word times inside `[t0, t1]`.
- Elements with `in` reference an existing shot `id`.
- `run.py preview` renders without engine console errors.

## Assets
Images (thumbnails, product shots, logos, card images) live in `jobs/<job>/assets/` and are referenced by
job-relative path (`"assets/thumb.jpg"`). B-roll clips go in `jobs/<job>/source/` and are declared in `broll`.
Never use the reference video's frames as assets in a delivered edit.

## Glass
Templates with frosted glass (videoCard, glassPanel, productCard, mixCaption bubble) ask the compositor to blur
the footage under their box (`frostBehind`), so glass reads as real glass over the speaker.

## Anchors (speaker-relative placement)
Overlays on speaker shots are placed relative to the face, not at fixed pixels: element `anchor`, point objects
`{"@": ...}` inside params, and `style.anchors.<template>` defaults. Full reference: `skills/motion-templates`
§ Placement relative to the speaker.
