"""Study a reference edit and turn it into measurable material for a new style preset.
usage: python pipeline/ref_study.py REFERENCE.mp4 STYLE_NAME [--window 5]
Writes styles/<STYLE_NAME>/study/:
  reference.mp4 (copy), sharpest-version notes, probe.json
  cuts.json            hard cuts (histogram distance) with timestamps
  windows/wNN.jpg      contact sheet per window (5 fps, timestamps burned in) — read these, do not guess
  windows/wNN_REF.md   skeleton to fill: layout, text (font/size/x-height/colour), motion (camera curve, reveal), transitions
  palette.json         dominant saturated colours + neutral text colours over the whole reference
  camera.json          per-shot zoom curve (ORB similarity): start scale, settle time
  dots.json            grain / halftone period if present
Then the agent writes styles/<STYLE_NAME>/style.json (start from the closest preset) and verifies with the 5 s REF/OURS/DIFF/PLAN loop."""
import argparse, json, shutil
import numpy as np, cv2
from common import ROOT, probe, run
from measure import camera_curve, dot_period


def frames_at(path, fps):
    cap = cv2.VideoCapture(str(path)); src_fps = cap.get(cv2.CAP_PROP_FPS) or 30; step = src_fps / fps; out = []; i = 0; nxt = 0.0
    while True:
        ok, f = cap.read()
        if not ok: break
        if i >= nxt - 1e-6: out.append((i / src_fps, f)); nxt += step
        i += 1
    return out, src_fps


def study(ref, name, win=5.0):
    d = ROOT / 'styles' / name / 'study'; (d / 'windows').mkdir(parents=True, exist_ok=True)
    if ref.resolve() != (d / ('reference' + ref.suffix.lower())).resolve(): shutil.copy(ref, d / ('reference' + ref.suffix.lower()))
    info = probe(ref); (d / 'probe.json').write_text(json.dumps(info, indent=1))
    if min(info['width'], info['height']) < 1000: print('NOTE: reference is low-res; ask for / search the sharpest version before measuring fonts.')
    fr, sfps = frames_at(ref, 10)
    # cuts: HSV histogram distance spikes
    hs = []
    for t, f in fr:
        h = cv2.calcHist([cv2.cvtColor(cv2.resize(f, (180, 320)), cv2.COLOR_BGR2HSV)], [0, 1], None, [30, 16], [0, 180, 0, 256]); hs.append(cv2.normalize(h, h).flatten())
    dist = [0] + [cv2.compareHist(hs[i - 1], hs[i], cv2.HISTCMP_BHATTACHARYYA) for i in range(1, len(hs))]
    thr = max(0.35, float(np.percentile(dist, 97))); cuts = [round(fr[i][0], 2) for i in range(1, len(fr)) if dist[i] > thr and dist[i] > 2.5 * np.median(dist[max(0, i - 5):i + 5])]
    (d / 'cuts.json').write_text(json.dumps(cuts))
    # contact sheets per window (5 fps)
    dur = info['duration']; nwin = int(np.ceil(dur / win))
    for k in range(nwin):
        a, b = k * win, min(dur, (k + 1) * win); tiles = []
        for t, f in fr[::2]:
            if a <= t < b:
                th = cv2.resize(f, (216, int(216 * f.shape[0] / f.shape[1]))); cv2.putText(th, f'{t:.1f}', (6, 22), 0, 0.6, (0, 255, 255), 2); tiles.append(th)
        while len(tiles) % 5: tiles.append(np.zeros_like(tiles[0]))
        cv2.imwrite(str(d / 'windows' / f'w{k + 1:02d}.jpg'), np.vstack([np.hstack(tiles[i:i + 5]) for i in range(0, len(tiles), 5)]), [cv2.IMWRITE_JPEG_QUALITY, 85])
        wc = [c for c in cuts if a <= c < b]
        (d / 'windows' / f'w{k + 1:02d}_REF.md').write_text(
            f"# Reference window {k + 1}: {a:.1f}-{b:.1f}s\ncuts: {wc}\n\n## Layout\n- shot type / framing / crop:\n- graphics present (template guess):\n\n"
            "## Text\n- font family (match x-height + letter shapes), weight, size px, tracking, case:\n- colours (sample frames):\n- position (x,y px at 1080x1920):\n\n"
            "## Motion\n- camera: start scale, settle time, pushes:\n- text reveal: per-word? duration, offset, opacity start:\n- transitions in/out:\n- motion blur (180 deg?):\n\n## Sound\n- sfx on:\n")
    # palette: saturated pixels -> kmeans
    px = []; neutral = []
    for t, f in fr[::5]:
        s = cv2.resize(f, (90, 160)); hsv = cv2.cvtColor(s, cv2.COLOR_BGR2HSV).reshape(-1, 3); p = s.reshape(-1, 3)
        px.append(p[(hsv[:, 1] > 110) & (hsv[:, 2] > 120)]); neutral.append(p[(hsv[:, 1] < 25) & (hsv[:, 2] > 225)])
    px = np.float32(np.concatenate(px)); pal = []
    if len(px) > 50:
        k = min(8, len(px) // 20); _, lab, cen = cv2.kmeans(px, k, None, (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 30, 1), 3, cv2.KMEANS_PP_CENTERS)
        cnt = np.bincount(lab.flatten(), minlength=k)
        pal = [{'hex': '#%02X%02X%02X' % tuple(int(x) for x in c[::-1]), 'share': round(float(n / cnt.sum()), 3)} for c, n in sorted(zip(cen, cnt), key=lambda z: -z[1])]
    nu = np.concatenate(neutral); white = '#%02X%02X%02X' % tuple(int(x) for x in np.median(nu, 0)[::-1]) if len(nu) else None
    (d / 'palette.json').write_text(json.dumps({'accents': pal, 'text_white': white}, indent=1))
    # camera per shot
    bounds = [0.0] + cuts + [dur]; cam = []; fl = [f for _, f in fr]
    for a, b in zip(bounds, bounds[1:]):
        i0, i1 = int(a * 10) + 1, min(len(fl) - 1, int(b * 10) - 1)
        if i1 - i0 < 4: continue
        s0, settle, _ = camera_curve(fl, i0, i1, 10); cam.append({'t0': a, 't1': b, 'start_scale_vs_end': round(s0, 3), 'settle_s': round(settle, 2)})
    (d / 'camera.json').write_text(json.dumps(cam, indent=1))
    mid = fl[len(fl) // 2]; (d / 'dots.json').write_text(json.dumps({'period_px_at_source': dot_period(mid, 100, min(900, mid.shape[0] - 260))[0], 'note': 'period ~2-4 px + visible std => halftone/dot grain layer'}))
    print(f'study written to {d}: {nwin} windows, {len(cuts)} cuts, palette {[p["hex"] for p in pal[:5]]}')


if __name__ == '__main__':
    ap = argparse.ArgumentParser(); ap.add_argument('reference'); ap.add_argument('name'); ap.add_argument('--window', type=float, default=5)
    a = ap.parse_args(); from pathlib import Path; study(Path(a.reference).resolve(), a.name, a.window)
