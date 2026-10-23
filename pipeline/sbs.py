"""Side-by-side review video: reference (left) vs our edit (right), with labels.
plan.reference_pairs = [{"name": "chest caption", "ref": [0.0, 1.6], "ours": [0.0, 5.2]}, ...]  (optional; default = whole videos)
usage: python pipeline/sbs.py JOB [--reference FILE]   -> output/side_by_side.mp4"""
import argparse, subprocess
from common import Job, ROOT, probe

FONT = ROOT / 'engine' / 'fonts' / 'texgyreheros-bold.otf'


def sbs(job, ref=None):
    plan = job.plan(); ref = ref or job.reference or next((ROOT / 'styles' / plan['style'] / 'study').glob('reference.*'), None)
    if not ref: raise SystemExit('no reference: put ref*.mp4 in source/ or pass --reference')
    ours = job.out / 'final.mp4'; fps = plan['fps']
    pairs = plan.get('reference_pairs') or [{'name': 'full', 'ref': [0, probe(ref)['duration']], 'ours': [0, probe(ours)['duration']]}]
    tmp = job.work / 'sbs'; tmp.mkdir(exist_ok=True); parts = []
    lab = lambda txt, y='20', x='20', fs=26: f"drawtext=fontfile={FONT}:text='{txt}':x={x}:y={y}:fontsize={fs}:fontcolor=white:box=1:boxcolor=black@0.55:boxborderw=8"
    for i, p in enumerate(pairs):
        (ra, rb), (oa, ob) = p['ref'], p['ours']; d = max(rb - ra, ob - oa); out = tmp / f'p{i}.mp4'; parts.append(out)
        fc = (f"[0:v]trim={ra}:{rb},setpts=PTS-STARTPTS,fps={fps},scale=540:960:force_original_aspect_ratio=decrease,pad=540:960:(ow-iw)/2:(oh-ih)/2,setsar=1,"
              f"tpad=stop_mode=clone:stop_duration={d},trim=0:{d},{lab('REFERENCE')}[l];"
              f"[1:v]trim={oa}:{ob},setpts=PTS-STARTPTS,scale=540:960,setsar=1,tpad=stop_mode=clone:stop_duration={d},trim=0:{d},{lab('OURS')}[r];"
              f"[l][r]hstack,{lab(p['name'].replace(chr(39), ''), 'h-60', '(w-tw)/2', 30)}[v];[1:a]atrim={oa}:{ob},asetpts=PTS-STARTPTS,apad=whole_dur={d}[a]")
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(ref), '-i', str(ours), '-filter_complex', fc, '-map', '[v]', '-map', '[a]', '-c:v', 'libx264', '-crf', '20',
                        '-preset', 'veryfast', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '160k', '-ar', '48000', str(out)], check=True)
    (tmp / 'list.txt').write_text(''.join(f"file '{p}'\n" for p in parts))
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', str(tmp / 'list.txt'), '-c', 'copy', str(job.out / 'side_by_side.mp4')], check=True)
    print('wrote', job.out / 'side_by_side.mp4')


if __name__ == '__main__':
    ap = argparse.ArgumentParser(); ap.add_argument('job'); ap.add_argument('--reference'); a = ap.parse_args(); sbs(Job(a.job), a.reference)
