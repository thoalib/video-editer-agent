"""Write a starting plan.json the agent then designs on top of.
Default = FINAL CUT: one segment covering the whole video (no silence/filler/retake removal unless the user asked;
then pass --keep work/cut_suggestions.json after reviewing it). One speaker shot + subtitles from the transcript.
usage: python pipeline/plan_init.py JOB --style violet-tutorial [--fps 25|30] [--size 1080x1920] [--keep FILE] [--force]"""
import argparse, json, sys
from common import Job


def init(job, style, fps=None, size='1080x1920', keep=None, force=False):
    if job.plan() and not force: sys.exit('plan.json exists (use --force to overwrite)')
    pr = json.loads((job.work / 'probe.json').read_text()); W, H = map(int, size.split('x'))
    fps = fps or (25 if abs(pr['fps'] - 25) < 0.5 or abs(pr['fps'] - 50) < 1 else 30 if pr['fps'] < 45 or abs(pr['fps'] - 60) < 1 else round(pr['fps']))
    if keep: ranges = json.loads(open(keep).read())['keep']
    else: ranges = [[0.0, int(pr['duration'] * fps) / fps]]
    segs = [{'id': f'S{i + 1}', 'in': round(round(a * fps) / fps, 4), 'out': round(round(b * fps) / fps, 4)} for i, (a, b) in enumerate(ranges)]
    total = sum(round((s['out'] - s['in']) * fps) for s in segs) / fps
    tr = json.loads((job.work / 'transcript.json').read_text()) if (job.work / 'transcript.json').exists() else None
    # map source time -> timeline time through segments
    def tl(t):
        acc = 0.0
        for s in segs:
            if s['in'] <= t < s['out']: return round(acc + t - s['in'], 3)
            acc += round((s['out'] - s['in']) * fps) / fps
        return None
    els = []
    if tr:
        phrases = []
        for p in tr['phrases']:
            ws = [[w['w'], tl(w['s']), tl(w['e'])] for w in tr['words'] if w['type'] == 'word' and p['s'] <= w['s'] < p['e'] and tl(w['s']) is not None]
            if ws: phrases.append({'t0': ws[0][1], 't1': ws[-1][2] + 0.15, 'words': ws})
        if phrases: els.append({'id': 'subs', 'template': 'subtitles', 't0': 0, 't1': total, 'params': {'phrases': phrases}})
    plan = {'job': job.name, 'fps': fps, 'size': [W, H], 'source': pr['source'], 'source_size': [pr['width'], pr['height']], 'style': style,
            'segments': segs, 'shots': [{'template': 'speaker', 't0': 0, 't1': total, 'params': {'zoom': 1.0 if pr['width'] / pr['height'] == W / H else 1.05}}],
            'transitions': [], 'elements': els, 'audio': {'music': 'none', 'music_db': -12.5, 'lufs': -14, 'sfx': 'auto'}}
    job.save_plan(plan); print(f'plan.json: {len(segs)} segment(s), {total:.2f}s at {fps} fps, style {style}, {len(els)} element(s)')


if __name__ == '__main__':
    ap = argparse.ArgumentParser(); ap.add_argument('job'); ap.add_argument('--style', default='violet-tutorial'); ap.add_argument('--fps', type=int)
    ap.add_argument('--size', default='1080x1920'); ap.add_argument('--keep'); ap.add_argument('--force', action='store_true'); a = ap.parse_args()
    init(Job(a.job), a.style, a.fps, a.size, a.keep, a.force)
