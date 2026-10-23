# Jobs

One folder per video:
```
jobs/<name>/
  source/    raw.mp4 (the footage)  reference.mp4 (optional style reference)   <- you put files here
  work/      transcript, plan.json, frames, faces, renders, QC (derived; safe to delete and rebuild)
  output/    final.mp4, plan.json, transcript.txt, side_by_side.mp4, captions.srt
```
Create one with `python run.py new <name> /path/raw.mp4 [/path/reference.mp4]`, or just tell the agent
where the video is. `intelligent-ui-reel/` is the worked example (its plan uses most templates).
