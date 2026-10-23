---
name: transcribe
description: Word-level transcription (ElevenLabs Scribe first, local Whisper fallback) and English on-screen copy for Malayalam/English speech. Use in prep and whenever caption text or timing is in doubt.
---

# Transcribe → English copy

## Run
```
python run.py prep JOB --lang ml --keyterms "QubesAI,ChatGPT,Claude,Gemini"
```
- `--engine auto` (default): ElevenLabs **Scribe** (`scribe_v2`, word timestamps, audio events) when
  `ELEVENLABS_API_KEY` is in `.env`; otherwise local **Whisper** (`WHISPER_MODEL`, default `medium`,
  needs `./setup.sh --whisper`).
- `--lang`: `ml` / `mal` Malayalam, `en`, `hi`, `ta`, `ar`… Omit for auto-detect on mixed speech.
- `--keyterms`: brand and product names (improves both engines).
- Output: `work/transcript.json` {engine, language, words[{w,s,e,type}], phrases} and `work/transcript.txt`.

Whisper is a weak fallback for Malayalam (it often returns nothing or romanised noise). If Scribe
is unavailable for Malayalam speech, tell the user and ask for the API key or a script; do not invent text.

## Make the English copy (Malayalam or mixed speech)
1. Read `transcript.txt` phrase by phrase; listen to unclear spans (`ffmpeg -ss A -t D -i source/raw.* clip.wav`).
2. Write natural English per phrase in `work/notes.md`: meaning, not word order. Keep names,
   numbers, amounts, negations, certainty and examples exact. Keep English loanwords the speaker used.
3. Captions are short thought groups, not full sentences: 2–6 words per line, at most two lines.
4. Timing: English word order differs, so time each English word to when its concept is spoken
   (Scribe word times of the matching Malayalam word). Reveal list items on their spoken word.
5. Mark anything uncertain and ask rather than guess. Never put Malayalam script on screen.

## Full subtitles
For "full captions/subtitles": `plan_init` already writes a `subtitles` element from phrases. Replace
each phrase's words with the reviewed English words and times. Keep ≥ 0.8 s per phrase, gaps in silence.
