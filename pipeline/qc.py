"""QC on the rendered picture (work/video_nosound.mp4 or output/final.mp4):
  1. stills of every shot (start+0.4 s, middle, end-0.2 s) -> work/qc/shot_stills.jpg + work/qc/stills/
  2. per-region motion (Farneback flow, 4x3 regions): flags sudden velocity changes / jitter outside cuts and planned fast moves
     that are not explained by the speaker's own movement in the raw footage
  3. size pulsing: sign flips of global scale velocity inside each shot
  4. frame count / fps / size proof, and loudness of the final mix when present
usage: python pipeline/qc.py JOB [--video FILE]   -> work/qc/qc_report.json, work/qc/motion_plot.png. Exit code 1 if flags."""
import argparse, json, subprocess, sys
import numpy as np, cv2
from common import Job


def planned_spans(plan):
    sp = []
    for tr in plan.get('transitions', []): sp.append((tr['at'] - 0.3, tr['at'] + 0.3))
    for s in plan['shots']:
        p = s.get('params', {})
        for a in p.get('swipes', []): sp.append((a - 0.05, a + p.get('swipeDur', 0.22) + 0.55))
        if p.get('exitAt'): sp.append((p['exitAt'] - 0.05, s['t1']))
        if s['template'] in ('routeMap',): sp.append((s['t0'], s['t1']))
        if s['template'] in ('phone', 'splitScreen', 'circleSpeaker'): sp.append((s['t0'], s['t0'] + 0.8))
        for pu in p.get('pushes', []): sp.append((pu['at'], pu['at'] + 0.5))
    for e in plan.get('elements', []):
        if e['template'] in ('listCard', 'neonChart'): sp.append((e['t0'], e['t0'] + 0.6))
        if e['params'].get('tiltFrom') is not None or e['params'].get('defocusAt'): sp.append((e['t0'], e['t1']))
    return sp


def read_small(video):
    cap = cv2.VideoCapture(str(video)); out = []
    while True:
        ok, f = cap.read()
        if not ok: break
        out.append(cv2.cvtColor(cv2.resize(f, (270, 480), interpolation=cv2.INTER_AREA), cv2.COLOR_BGR2GRAY))
    return out


def source_accel(job, plan, N):
    """Max per-region acceleration of the raw speaker footage itself (centre crop to 9:16), so natural head/hand motion is not flagged."""
    fps = plan['fps']; seq = []
    for sg in plan['segments']:
        a = round(sg['in'] * fps); seq += [(sg['id'], a + k) for k in range(round((sg['out'] - sg['in']) * fps))]
    prev = None; prevv = None; out = np.zeros(N)
    for i, (sid, n) in enumerate(seq[:N]):
        im = cv2.imread(str(job.work / 'frames' / sid / f'{n:05d}.jpg'), cv2.IMREAD_GRAYSCALE)
        if im is None: return None
        h, w = im.shape; cw = min(w, int(h * 9 / 16)); x0 = (w - cw) // 2; g = cv2.resize(im[:, x0:x0 + cw], (270, 480), interpolation=cv2.INTER_AREA)
        if prev is not None:
            fl = cv2.calcOpticalFlowFarneback(prev, g, None, 0.5, 3, 21, 3, 5, 1.1, 0)
            v = np.array([np.median(fl[ry * 120:(ry + 1) * 120, rx * 90:(rx + 1) * 90].reshape(-1, 2), 0) * 4 for ry in range(4) for rx in range(3)])
            if prevv is not None: out[i] = np.linalg.norm(v - prevv, axis=1).max()
            prevv = v
        prev = g
    return out


def grab(video, fi):
    cap = cv2.VideoCapture(str(video)); cap.set(cv2.CAP_PROP_POS_FRAMES, fi); ok, f = cap.read(); return f if ok else None


def qc(job, video=None):
    plan = job.plan(); FPS = plan['fps']; video = video or (job.out / 'final.mp4' if (job.out / 'final.mp4').exists() else job.work / 'video_nosound.mp4')
    q = job.work / 'qc'; (q / 'stills').mkdir(parents=True, exist_ok=True)
    small = read_small(video); N = len(small); expected = sum(round((s['out'] - s['in']) * FPS) for s in plan['segments'])
    tiles = []
    for k, s in enumerate(plan['shots']):
        for tt in (s['t0'] + 0.4, (s['t0'] + s['t1']) / 2, s['t1'] - 0.2):
            fi = min(N - 1, int(round(tt * FPS))); im = grab(video, fi)
            if im is None: continue
            cv2.imwrite(str(q / 'stills' / f'shot{k + 1:02d}_{s["template"]}_{fi:05d}.jpg'), im, [cv2.IMWRITE_JPEG_QUALITY, 88])
            th = cv2.resize(im, (216, 384)); cv2.putText(th, f'{k + 1} {s["template"][:10]} {tt:.1f}s', (6, 22), 0, 0.5, (0, 255, 255), 2); tiles.append(th)
    while len(tiles) % 9: tiles.append(np.zeros_like(tiles[0]))
    cv2.imwrite(str(q / 'shot_stills.jpg'), np.vstack([np.hstack(tiles[i:i + 9]) for i in range(0, len(tiles), 9)]))
    cuts = sorted({s['t0'] for s in plan['shots']} | {sum(round((x['out'] - x['in']) * FPS) for x in plan['segments'][:i]) / FPS for i in range(len(plan['segments']))})
    spans = planned_spans(plan)
    R = 12; motion = np.zeros((N, R, 2)); scale = np.zeros(N); ys, xs = np.mgrid[0:480, 0:270]
    for i in range(1, N):
        fl = cv2.calcOpticalFlowFarneback(small[i - 1], small[i], None, 0.5, 3, 21, 3, 5, 1.1, 0)
        for r in range(R):
            ry, rx = divmod(r, 3); motion[i, r] = np.median(fl[ry * 120:(ry + 1) * 120, rx * 90:(rx + 1) * 90].reshape(-1, 2), 0) * 4
        scale[i] = np.median((fl[..., 0] * (xs - 135) + fl[..., 1] * (ys - 240)) / ((xs - 135) ** 2 + (ys - 240) ** 2 + 1))
    near = lambda t: any(a - 0.08 <= t <= b + 0.08 for a, b in spans) or any(abs(t - c) <= 0.09 for c in cuts)
    src_acc = source_accel(job, plan, N); flags = []
    for i in range(2, N - 1):
        t = i / FPS
        if near(t): continue
        v0, v = motion[i - 1], motion[i]; acc = np.linalg.norm(v - v0, axis=1)
        jit = int(np.sum((np.sign(v[:, 0]) != np.sign(v0[:, 0])) & (np.abs(v[:, 0]) > 1.5) & (np.abs(v0[:, 0]) > 1.5)))
        allow = 9 if src_acc is None else max(9, 2.2 * max(src_acc[max(0, i - 1):i + 2].max(), 0) + 4)   # zoomed crops amplify speaker motion ~2x
        if acc.max() > allow or jit >= 4: flags.append({'frame': i, 't': round(t, 2), 'max_region_accel_px': round(float(acc.max()), 1), 'jitter_regions': jit})
    sv = np.convolve(scale, np.ones(3) / 3, 'same'); pulses = []
    for s in plan['shots']:
        a, b = int(s['t0'] * FPS) + 3, int(s['t1'] * FPS) - 3; x = sv[a:b]; x = x[np.abs(x) > 4e-4]
        f = int(np.sum(np.diff(np.sign(x)) != 0)) if len(x) > 2 else 0
        pulses.append({'shot': f"{s['template']} {s['t0']}-{s['t1']}", 'scale_sign_flips': f, 'warn': f > 6})
    pr = json.loads(subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=r_frame_rate,width,height', '-of', 'json', str(video)],
                                   capture_output=True, text=True).stdout)['streams'][0]
    rep = {'video': str(video), 'frames': N, 'expected_frames': expected, 'frame_count_ok': N == expected, 'stream': pr,
           'motion_flags': flags, 'size_pulse': pulses, 'region_speed_p99': round(float(np.percentile(np.linalg.norm(motion, axis=2), 99)), 1)}
    if (job.out / 'final.mp4').exists():
        e = subprocess.run(['ffmpeg', '-hide_banner', '-i', str(job.out / 'final.mp4'), '-af', 'ebur128=peak=true', '-f', 'null', '-'], capture_output=True, text=True).stderr
        for line in e.splitlines():
            if line.strip().startswith('I:'): rep['lufs'] = float(line.split()[1])
            if line.strip().startswith('Peak:'): rep['true_peak_dbfs'] = float(line.split()[1])
    (q / 'qc_report.json').write_text(json.dumps(rep, indent=1))
    Hh = 300; img = np.full((Hh, N, 3), 20, np.uint8); sp = np.clip(np.linalg.norm(motion, axis=2).max(1) / 60 * (Hh - 20), 0, Hh - 20)
    for a, b in spans: cv2.rectangle(img, (int(a * FPS), 0), (int(b * FPS), Hh), (40, 70, 40), -1)
    for c in cuts: cv2.line(img, (int(c * FPS), 0), (int(c * FPS), Hh), (60, 60, 160), 1)
    for i in range(1, N): cv2.line(img, (i - 1, Hh - 10 - int(sp[i - 1])), (i, Hh - 10 - int(sp[i])), (80, 230, 255), 1)
    for f in flags: cv2.circle(img, (f['frame'], 20), 4, (0, 0, 255), -1)
    cv2.imwrite(str(q / 'motion_plot.png'), cv2.resize(img, (min(1600, max(N, 400)), Hh)))
    bad = len(flags) + sum(p['warn'] for p in pulses) + (0 if rep['frame_count_ok'] else 1)
    print(json.dumps({k: v for k, v in rep.items() if k != 'motion_flags'}, indent=1)); print(f'motion flags: {len(flags)}', flags[:20])
    print('QC PASS' if not bad else 'QC: review flags (stills in work/qc/stills, plot work/qc/motion_plot.png)')
    return bad


if __name__ == '__main__':
    ap = argparse.ArgumentParser(); ap.add_argument('job'); ap.add_argument('--video'); a = ap.parse_args()
    sys.exit(1 if qc(Job(a.job), a.video) else 0)
