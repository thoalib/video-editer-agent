#!/usr/bin/env python3
"""One entry point for every pipeline step. Job = a folder under jobs/ (or any path).

  python run.py new NAME RAW_VIDEO [REFERENCE]   create jobs/NAME/source/ with the files copied in
  python run.py prep JOB [--lang ml] [--engine auto|scribe|whisper] [--keyterms "QubesAI,ChatGPT"]
                                                 ingest + transcribe (Scribe first, Whisper fallback)
  python run.py plan JOB --style NAME [--fps 25] [--keep work/cut_suggestions.json]
                                                 starter plan.json (final cut, speaker + subtitles)
  python run.py cutlist JOB                      ONLY if the user asked for cuts: suggestions to review
  python run.py frames JOB [--masks all|S1,S2]   extract plan frames, faces, masks, avatar
  python run.py preview JOB [--frames 10,200]    render stills -> work/stills/  (check before full render)
  python run.py render JOB                       full picture -> work/video_nosound.mp4
  python run.py audio JOB                        voice + music + sfx -> work/mix.wav (-14 LUFS)
  python run.py master JOB                       -> output/final.mp4
  python run.py qc JOB                           stills + motion check -> work/qc/
  python run.py sbs JOB                          reference vs ours -> output/side_by_side.mp4
  python run.py srt JOB                          English captions -> output/captions.srt
  python run.py finish JOB                       frames + render + audio + master + qc
  python run.py ref-study REFERENCE NAME         measure a reference into styles/NAME/study/
  python run.py styles                           list style presets
  python run.py styles-preview                   re-render styles/*/preview.jpg
  python run.py history [--last 5]               looks of recent delivered edits (the next one must differ)
"""
import argparse, asyncio, json, shutil, subprocess, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT / 'pipeline'))


def main():
    if len(sys.argv) < 2 or sys.argv[1] in ('-h', '--help', 'help'): print(__doc__); return
    cmd, rest = sys.argv[1], sys.argv[2:]
    from common import Job
    if cmd == 'new':
        name, raw = rest[0], Path(rest[1]).expanduser(); j = Job(ROOT / 'jobs' / name)
        shutil.copy(raw, j.source_dir / ('raw' + raw.suffix.lower()))
        if len(rest) > 2: r = Path(rest[2]).expanduser(); shutil.copy(r, j.source_dir / ('reference' + r.suffix.lower()))
        print('created', j.dir); return
    if cmd == 'styles':
        for d in sorted((ROOT / 'styles').iterdir()):
            if (d / 'style.json').exists():
                s = json.loads((d / 'style.json').read_text()); print(f"{d.name:18s} {s.get('description', '')}  preview: styles/{d.name}/preview.jpg")
        return
    if cmd == 'history':
        sys.argv = ['history.py', *rest]; from history import main as hist; hist(); return
    if cmd == 'styles-preview':
        from style_preview import preview; preview('jobs/intelligent-ui-reel', [92, 380, 650, 1100], []); return
    if cmd == 'ref-study':
        from ref_study import study; study(Path(rest[0]).expanduser().resolve(), rest[1], 5.0); return
    ap = argparse.ArgumentParser(prog=f'run.py {cmd}'); ap.add_argument('job')
    ap.add_argument('--lang'); ap.add_argument('--engine', default='auto'); ap.add_argument('--keyterms', default='')
    ap.add_argument('--style', default='violet-tutorial'); ap.add_argument('--fps', type=int); ap.add_argument('--size', default='1080x1920'); ap.add_argument('--keep'); ap.add_argument('--force', action='store_true')
    ap.add_argument('--masks', default=''); ap.add_argument('--frames'); ap.add_argument('--reference'); ap.add_argument('--lossless', action='store_true')
    a = ap.parse_args(rest); job = Job(a.job)
    py = sys.executable; P = ROOT / 'pipeline'
    step = lambda *args: subprocess.run([py, *map(str, args)], check=True, cwd=ROOT)
    if cmd == 'prep':
        step(P / 'ingest.py', job.dir)
        step(P / 'transcribe.py', job.dir, '--engine', a.engine, *(['--lang', a.lang] if a.lang else []), *(['--keyterms', a.keyterms] if a.keyterms else []))
    elif cmd == 'plan':
        from plan_init import init; init(job, a.style, a.fps, a.size, a.keep, a.force)
    elif cmd == 'cutlist': step(P / 'cutlist.py', job.dir)
    elif cmd == 'frames': step(P / 'frames.py', job.dir, *(['--masks', a.masks] if a.masks else []))
    elif cmd == 'preview':
        from render import render; asyncio.run(render(job, frames=[int(x) for x in (a.frames or '0').split(',')], stills=str(job.work / 'stills')))
    elif cmd == 'render': step(P / 'render.py', job.dir, *(['--lossless'] if a.lossless else []))
    elif cmd == 'audio': step(P / 'audio.py', job.dir)
    elif cmd == 'master': step(P / 'master.py', job.dir)
    elif cmd == 'qc': subprocess.run([py, P / 'qc.py', job.dir], cwd=ROOT)
    elif cmd == 'sbs': step(P / 'sbs.py', job.dir, *(['--reference', a.reference] if a.reference else []))
    elif cmd == 'srt': step(P / 'export_srt.py', job.dir)
    elif cmd == 'finish':
        step(P / 'frames.py', job.dir, *(['--masks', a.masks] if a.masks else [])); step(P / 'render.py', job.dir)
        step(P / 'audio.py', job.dir); step(P / 'master.py', job.dir); subprocess.run([py, P / 'qc.py', job.dir], cwd=ROOT)
    else: print(__doc__); sys.exit(f'unknown command {cmd}')


if __name__ == '__main__':
    main()
