"""Render preview strips for style presets (shown to the user when no reference is given).
Re-renders 4 frames of a finished job with each style swapped in -> styles/<name>/preview.jpg (1080x480).
usage: python pipeline/style_preview.py [--job jobs/intelligent-ui-reel] [--frames 92,380,650,1100] [--styles a,b]"""
import argparse, asyncio, json, os, shutil
import numpy as np, cv2
from common import Job, ROOT
from render import render


def preview(job_path, frames, styles):
    base = Job(job_path); plan = base.plan(); styles = styles or [d.name for d in sorted((ROOT / 'styles').iterdir()) if (d / 'style.json').exists()]
    for i, st in enumerate(styles):
        pj = ROOT / 'jobs' / f'_preview_{st}'; shutil.rmtree(pj, ignore_errors=True); (pj / 'work').mkdir(parents=True); (pj / 'source').mkdir()
        for f in ('frames', 'masks', 'faces.json', 'avatar.jpg'):
            if (base.work / f).exists(): os.symlink((base.work / f).resolve(), pj / 'work' / f)
        os.symlink(base.source.resolve(), pj / 'source' / base.source.name)
        p = dict(plan, style=st); p.pop('watermark', None); p.pop('style_overrides', None)
        job = Job(pj); job.save_plan(p)
        asyncio.run(render(job, frames=frames, stills=str(pj / 'stills'), port=8790 + i))
        tiles = []
        for f in frames:
            im = cv2.imread(str(pj / 'stills' / f'f{f:05d}.jpg')); tiles.append(cv2.resize(im, (270, 480), interpolation=cv2.INTER_AREA))
        sname = json.loads((ROOT / 'styles' / st / 'style.json').read_text()).get('name', st)
        strip = np.hstack(tiles); cv2.rectangle(strip, (0, 0), (1080, 40), (20, 20, 20), -1); cv2.putText(strip, sname, (14, 28), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 2, cv2.LINE_AA)
        cv2.imwrite(str(ROOT / 'styles' / st / 'preview.jpg'), strip, [cv2.IMWRITE_JPEG_QUALITY, 88]); shutil.rmtree(pj)
        print('preview', st)


if __name__ == '__main__':
    ap = argparse.ArgumentParser(); ap.add_argument('--job', default='jobs/intelligent-ui-reel'); ap.add_argument('--frames', default='92,380,650,1100'); ap.add_argument('--styles', default='')
    a = ap.parse_args(); preview(a.job, [int(x) for x in a.frames.split(',')], [s for s in a.styles.split(',') if s])
