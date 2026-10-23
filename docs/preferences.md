# Standing preferences (Mohammed Thoalib / QubesAI)

Confirmed by the user. Add new standing feedback here; video-specific choices go in the job's `work/notes.md`.

## Editing
- The given video is the **final cut**. Do not remove silences, fillers, false starts or retakes, and
  do not shorten, unless explicitly asked in that request.
- Main format: educational talking-head videos (AI tools, automation) for Reels/Shorts, 1080×1920.
  Landscape 1920×1080 when asked. Preserve the source frame rate (25 or 30).
- Graphics follow the meaning and order of what is said: reveal named tools/list items as they are
  spoken; switch deliberately between footage, framed footage and full-screen graphics.
- Restraint is about frequency and relevance, not a low ceiling on quality. A complex explanation can
  get a rich designed sequence; a simple sentence may get clean footage.
- A reference gives the look and feel; adapt graphics to this video's content, not the reference's layout.
- When an approved direction exists and only polish is asked, refine — do not redesign.

- Style library (2026-10-20): references the user gives become reusable presets in `styles/` (violet-tutorial,
  teal-tech, editorial-blue so far). We recreate the *style* matched to the new video's content, not the reference's
  timeline, unless the user explicitly asks for an exact recreation. No reference given → ask which style.

- No identical looks (2026-10-22): a new video must not look exactly the same as the last one. Some shared
  elements are fine; change a few visible things (palette/variant, captions, main graphics, rhythm) — see
  `python run.py history`. Create a new style or variant only when the next video needs one.
- Ratio (2026-10-22): ask it in the starter questions (9:16 default, 16:9, 1:1, 4:5).

- Landscape source → 9:16 (2026-10-20): do not crop to a full-height zoom. Keep the footage in a horizontal band
  (~1.2× scale, speaker `band` param {y 270, h 1325, feather}) with black gradients fading in at top and bottom.

## Language
- Speech is Malayalam and English (code-switching). Keep the original voice.
- All visible text is natural English. Never show Malayalam script. Check names, numbers, examples.
- Transcription: ElevenLabs Scribe first, local Whisper as fallback.

## Look and sound
- QubesAI brand: dark navy + purple/magenta, white logo. Name tag: "Mohammed Thoalib — Founder, QubesAI".
- Motion: smooth eases with slight spring, no jitter or size pulsing, 180° motion blur.
- Voice −14 LUFS; quiet original music bed; sparse purposeful SFX.

## Working style
- Concise, production-ready results. Ask only when the answer changes the edit (style, density, captions, extras).
- Premiere Pro only when asked.

## Feedback (2026-10-22, shabeeb-course-ad)
- Speaker framing: keep zoom moderate (~1.18× normal, ~1.35× punch-ins on 1080×1920 sources); not too tight.
- Lower-frame blur (azure-paper): subtle, not heavy.
- Glass cards: compact — header row, value left, small pills stacked right; keep card height small.
- Paper list scenes: smaller items, camera glides to each item as it is named, then pulls back.
- Brand logos: use the user's PNG (e.g. Claude symbol) rather than text when a logo exists.
