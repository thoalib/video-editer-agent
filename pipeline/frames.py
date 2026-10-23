"""Extract the source frames each plan segment needs (exact frame numbers, 1:1), then face landmarks for every frame
(MediaPipe face mesh, gaussian-smoothed so crops never jitter), optional person masks (selfie segmentation +
guided filter) for text-behind-head, and an avatar for name tags.
usage: python pipeline/frames.py JOB [--masks all|S1,S2]"""
import argparse, json, os, shutil, glob
import numpy as np, cv2
from pathlib import Path
from common import Job, probe, run


def extract(job, plan):
    fps = plan['fps']; src = job.dir / plan.get('source', str(job.source.relative_to(job.dir)))
    ranges = [(s['id'], round(s['in'] * fps), round(s['out'] * fps)) for s in plan['segments']]
    todo = [r for r in ranges if len(glob.glob(str(job.work / 'frames' / r[0] / '*.jpg'))) != r[2] - r[1]]
    if not todo: print('frames up to date'); return
    tmp = job.work / 'frames_tmp'; shutil.rmtree(tmp, ignore_errors=True); tmp.mkdir(parents=True)
    expr = '+'.join(f'between(n\\,{a}\\,{b - 1})' for _, a, b in todo)
    run(['ffmpeg', '-v', 'error', '-y', '-i', src, '-vf', f"select='{expr}'", '-vsync', '0', '-q:v', '1', '-start_number', '0', tmp / '%07d.jpg'])
    files = sorted(tmp.iterdir()); i = 0
    for sid, a, b in todo:
        d = job.work / 'frames' / sid; shutil.rmtree(d, ignore_errors=True); d.mkdir(parents=True)
        for n in range(a, b): os.replace(files[i], d / f'{n:05d}.jpg'); i += 1
    shutil.rmtree(tmp, ignore_errors=True)
    print(f'extracted {i} frames for {len(todo)} segments')


def broll(job, plan):
    """plan.broll [{id, src (job-relative or absolute), in, out}] -> work/broll/<id>/00000.jpg.. at plan fps + broll.json sizes."""
    items = plan.get('broll') or []
    if not items: return
    d0 = job.work / 'broll'; d0.mkdir(exist_ok=True); meta = {}
    for b in items:
        src = Path(b['src']) if Path(b['src']).is_absolute() else job.dir / b['src']; d = d0 / b['id']
        n = len(glob.glob(str(d / '*.jpg'))); want = round((b.get('out', 0) - b.get('in', 0)) * plan['fps']) if b.get('out') else None
        if not n or (want and n != want):
            shutil.rmtree(d, ignore_errors=True); d.mkdir()
            cmd = ['ffmpeg', '-v', 'error', '-y']
            if b.get('in'): cmd += ['-ss', str(b['in'])]
            cmd += ['-i', src]
            if want: cmd += ['-frames:v', str(want)]
            cmd += ['-vf', f"fps={plan['fps']},scale='min(1440,iw)':-2", '-q:v', '2', '-start_number', '0', d / '%05d.jpg']
            run(cmd)
        files = sorted(glob.glob(str(d / '*.jpg'))); h, w = cv2.imread(files[0]).shape[:2]
        meta[b['id']] = {'w': w, 'h': h, 'n': len(files)}
    (d0 / 'broll.json').write_text(json.dumps(meta)); print(f'b-roll: {len(meta)} clip(s)')


def gsmooth(a, sigma):
    r = int(3 * sigma); k = np.exp(-0.5 * (np.arange(-r, r + 1) / sigma) ** 2); k /= k.sum()
    pad = np.pad(a, ((r, r), (0, 0)), mode='edge')
    return np.stack([np.convolve(pad[:, j], k, mode='valid') for j in range(a.shape[1])], 1)


def faces(job, plan, masks):
    import mediapipe as mp
    fm = mp.solutions.face_mesh.FaceMesh(static_image_mode=False, max_num_faces=1, min_detection_confidence=0.5, min_tracking_confidence=0.5)
    seg = mp.solutions.selfie_segmentation.SelfieSegmentation(model_selection=0) if masks else None
    out_f = job.work / 'faces.json'; out = json.loads(out_f.read_text()) if out_f.exists() else {}
    for s in plan['segments']:
        sid = s['id']; files = sorted(glob.glob(str(job.work / 'frames' / sid / '*.jpg')))
        want_mask = masks and (masks == ['all'] or sid in masks)
        if sid in out and out[sid]['first'] == int(os.path.basename(files[0])[:-4]) and len(out[sid]['pts']) == len(files) and not want_mask: continue
        rows = []; mdir = job.work / 'masks' / sid
        if want_mask: mdir.mkdir(parents=True, exist_ok=True)
        for f in files:
            im = cv2.imread(f); h, w = im.shape[:2]; rgb = cv2.cvtColor(im, cv2.COLOR_BGR2RGB)
            r = fm.process(rgb)
            if r.multi_face_landmarks:
                p = np.array([(q.x * w, q.y * h) for q in r.multi_face_landmarks[0].landmark])
                e = (p[33] + p[263]) / 2; m = (p[13] + p[14]) / 2
                rows.append([e[0], e[1], m[0], m[1], p[10][1], p[152][1], p[234][0], p[454][0]])
            else: rows.append([np.nan] * 8)
            if want_mask:
                cx = int(rows[-1][0]) if not np.isnan(rows[-1][0]) else w // 2; half = int(min(w, h) * 0.75)
                x0, x1 = max(0, cx - half), min(w, cx + half)
                mk = seg.process(np.ascontiguousarray(rgb[:, x0:x1])).segmentation_mask
                full = np.zeros((h, w), np.float32); full[:, x0:x1] = mk
                g = cv2.ximgproc.guidedFilter(im, (full * 255).astype(np.uint8), 6, 0.01 * 255 * 255 / 16)
                cv2.imwrite(str(mdir / (os.path.basename(f)[:-4] + '.png')), g)
        a = np.array(rows, float)
        if np.isnan(a[:, 0]).all(): a[:] = [w / 2, h * 0.42, w / 2, h * 0.52, h * 0.3, h * 0.6, w * 0.44, w * 0.56]
        for j in range(8):
            col = a[:, j]; ok = ~np.isnan(col); a[:, j] = np.interp(np.arange(len(col)), np.where(ok)[0], col[ok])
        a = gsmooth(a, 5.0)
        out[sid] = {'first': int(os.path.basename(files[0])[:-4]), 'pts': np.round(a, 1).tolist()}
        print(f"{sid}: {len(files)} frames, eye ~({a[:, 0].mean():.0f},{a[:, 1].mean():.0f}), face h {(a[:, 5] - a[:, 4]).mean():.0f}px{' + masks' if want_mask else ''}")
    out_f.write_text(json.dumps(out))
    # avatar for name tags: first segment, mid frame
    s0 = plan['segments'][0]['id']; P = out[s0]['pts']; k = len(P) // 2; f = sorted(glob.glob(str(job.work / 'frames' / s0 / '*.jpg')))[k]
    im = cv2.imread(f); ex, ey = int(P[k][0]), int(P[k][1]); fh = P[k][5] - P[k][4]; r = int(fh * 0.62)
    c = im[max(0, ey - r + int(fh * 0.12)):ey + r + int(fh * 0.12), max(0, ex - r):ex + r]
    cv2.imwrite(str(job.work / 'avatar.jpg'), cv2.resize(c, (200, 200), interpolation=cv2.INTER_AREA), [cv2.IMWRITE_JPEG_QUALITY, 92])


if __name__ == '__main__':
    ap = argparse.ArgumentParser(); ap.add_argument('job'); ap.add_argument('--masks', default='')
    a = ap.parse_args(); job = Job(a.job); plan = job.plan()
    extract(job, plan); broll(job, plan); faces(job, plan, [m for m in a.masks.split(',') if m])
