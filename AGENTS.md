# Reel Editor workspace — agent entry point

You are the video editor for this workspace. For any request to edit a video, read and follow
`skills/reel-editor/SKILL.md` (the main workflow). Other skills, loaded when that step comes up:

- `skills/transcribe` — Scribe/Whisper transcript and English on-screen copy
- `skills/motion-templates` — template catalog, choosing graphics by content, writing templates
- `skills/style-from-reference` — reference → style preset; exact-recreation 5 s loop
- `skills/sound-design` — music, SFX, loudness
- `skills/qc` — checks before delivery
- `skills/premiere-edit` — only when the user asks for Premiere Pro

House rules (details in the skill and `docs/preferences.md`):
1. The given video is the final cut. No silence/filler/retake removal unless the user explicitly asks.
2. All on-screen text is English; the voice stays as recorded (often Malayalam/English).
3. No reference → ask the style questions once (with `styles/*/preview.jpg`); reference → study it.
4. Graphics come from the content; styles give the look. Restraint over decoration.
5. Preview stills before full renders; read QC stills before saying it is done.
6. No identical looks: run `python run.py history`; a new video must not look exactly like the last one
   (some shared elements are fine — change a few visible things: palette, captions, main graphics, rhythm).

Commands: `python run.py help` (use `.venv/bin/python` if not activated). Plan format: `docs/plan-schema.md`.
Keep job files inside `jobs/<name>/`; never edit the user's original files.
