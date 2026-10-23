"""Compositor: headless-Chromium overlay (engine/) + footage layer, 180-degree shutter by sub-frame averaging.
Each output frame uses exactly one source frame (1:1 at the plan fps). Sub-frames never straddle a cut.
usage: python pipeline/render.py JOB [--start F] [--end F] [--out FILE] [--stills DIR] [--every N] [--frames 10,250,600] [--lossless]"""
import argparse, asyncio, base64, json, math, os, subprocess, sys, time
import numpy as np, cv2
from playwright.async_api import async_playwright
from common import Job, ROOT

_cache, _mcache = {}, {}


class Comp:
    def __init__(self, job, W, H):
        self.job, self.W, self.H = job, W, H
        self.yy, self.xx = np.mgrid[0:H, 0:W].astype(np.float32)
        p = 6.0 * W / 1080
        d = 0.5 + 0.5 * np.cos(2 * np.pi * (self.xx + 0.5) / p) * np.cos(2 * np.pi * (self.yy + 0.5) / p)
        self.dotpat = np.clip(d * 1.25, 0, 1)[..., None]

    def src(self, seg, frame):
        k = (seg, frame)
        if k not in _cache:
            if len(_cache) > 6: _cache.pop(next(iter(_cache)))
            im = cv2.imread(str(self.job.work / 'frames' / seg / f'{frame:05d}.jpg'))
            if im is None: raise FileNotFoundError(f'missing frame {seg}/{frame} — run frames.py')
            _cache[k] = im.astype(np.float32)
        return _cache[k]

    def broll(self, bid, frame):
        k = ('broll', bid, frame)
        if k not in _cache:
            if len(_cache) > 6: _cache.pop(next(iter(_cache)))
            im = cv2.imread(str(self.job.work / 'broll' / bid / f'{frame:05d}.jpg'))
            if im is None: raise FileNotFoundError(f'missing b-roll frame {bid}/{frame} — run frames.py')
            _cache[k] = im.astype(np.float32)
        return _cache[k]

    def mask(self, seg, frame):
        k = (seg, frame)
        if k not in _mcache:
            if len(_mcache) > 4: _mcache.pop(next(iter(_mcache)))
            m = cv2.imread(str(self.job.work / 'masks' / seg / f'{frame:05d}.png'), cv2.IMREAD_GRAYSCALE)
            _mcache[k] = None if m is None else m.astype(np.float32) / 255
        return _mcache[k]

    def bg(self, bg):
        if bg['type'] == 'solid': return np.full((self.H, self.W, 3), bg['color'][::-1], np.float32)
        st = bg['stops']; ys = np.linspace(0, 1, self.H)
        cols = np.stack([np.interp(ys, [s[0] for s in st], [s[1][c] for s in st]) for c in (2, 1, 0)], 1).astype(np.float32)
        return np.repeat(cols[:, None, :], self.W, 1) + (np.random.RandomState(3).rand(self.H, self.W, 1).astype(np.float32) - 0.5) * 3.0

    @staticmethod
    def cam_map(cam, x, y): return (x - cam['ox']) * cam['s'] + cam['ox'] + cam.get('tx', 0), (y - cam['oy']) * cam['s'] + cam['oy'] + cam.get('ty', 0)

    def media(self, m, cam):
        im = self.broll(m['broll'], m['frame']) if m.get('broll') else self.src(m['seg'], m['frame'])
        rx, ry, rw, rh = m['rect']; cx, cy, ch = m['crop']; kk = rh / ch; s = cam['s']; a = kk * s
        bx = ((rx - cx * kk) - cam['ox']) * s + cam['ox'] + cam.get('tx', 0); by = ((ry - cy * kk) - cam['oy']) * s + cam['oy'] + cam.get('ty', 0)
        M = np.float32([[a, 0, bx], [0, a, by]])
        out = cv2.warpAffine(im, M, (self.W, self.H), flags=cv2.INTER_LANCZOS4, borderMode=cv2.BORDER_REFLECT)
        if a > 1.3: out = out + 0.35 * (out - cv2.GaussianBlur(out, (0, 0), 1.3))
        if m.get('grade'): out = self.grade(out, m['grade'])
        if m.get('lowblur'): out = self.lowblur(out, m['lowblur'])
        if m.get('blur', 0) > 0.05: out = cv2.GaussianBlur(out, (0, 0), m['blur'] * s)
        if 'dim' in m: out = out * m['dim']
        if m.get('grain'): out = out + (np.random.RandomState(m['frame'] % 997).rand(*out.shape[:2], 1).astype(np.float32) - 0.5) * 255 * m['grain']
        if 'tint' in m:
            r, g, b, amt = m['tint']; out = out * (1 - amt) + np.array([b, g, r], np.float32) * amt * (out.mean(2, keepdims=True) / 60 + 0.4)
        xx, yy = self.xx, self.yy
        if m.get('shape') == 'circle':
            ccx, ccy, cr = m['circle']; X, Y = self.cam_map(cam, ccx, ccy); d = np.hypot(xx - X, yy - Y) - cr * s
        else:
            X, Y = self.cam_map(cam, rx, ry); w, h = rw * s, rh * s
            if m.get('radius'):
                r = m['radius'] * s; qx = np.abs(xx - (X + w / 2)) - (w / 2 - r); qy = np.abs(yy - (Y + h / 2)) - (h / 2 - r)
                d = np.hypot(np.maximum(qx, 0), np.maximum(qy, 0)) + np.minimum(np.maximum(qx, qy), 0) - r
            else: d = np.maximum(np.maximum(X - xx, xx - (X + w)), np.maximum(Y - yy, yy - (Y + h)))
        alpha = np.clip(0.5 - d, 0, 1)[..., None] * m.get('opacity', 1)
        if m.get('feather') and m.get('shape') != 'circle':   # fade top/bottom edges of the rect into the background
            ft, fb = m['feather']; sm = lambda v: v * v * (3 - 2 * v)
            ramp = np.ones_like(yy, dtype=np.float32)
            if ft > 0: ramp = ramp * sm(np.clip((yy - Y) / (ft * s), 0, 1))
            if fb > 0: ramp = ramp * sm(np.clip((Y + h - yy) / (fb * s), 0, 1))
            alpha = alpha * ramp[..., None]
        rim = np.clip(1 - np.abs(d + 2.0) / 2.5, 0, 1)[..., None] * 0.22 * m['rim'] if m.get('rim') else None
        return out, alpha, rim, M

    @staticmethod
    def _ramp(v): v = np.clip(v, 0, 1); return v * v * (3 - 2 * v)

    def lowblur(self, out, lb):
        """Progressive blur over the lower frame (screen px): sharp above y, soft by y+ramp/2, fully blurred by y+ramp;
        then a darkening toward the bottom (dark [y0, y1, amount]). azure-paper's 'captions sit on a blurred chest' look."""
        y, ramp, sig = lb.get('y', 1000), lb.get('ramp', 260), lb.get('sigma', 22)
        y0 = max(0, int(y) - 4); roi = out[y0:]; yy = self.yy[y0:, :1]
        b1 = cv2.GaussianBlur(roi, (0, 0), sig * 0.35); b2 = cv2.GaussianBlur(roi, (0, 0), sig)
        w1 = self._ramp((yy - y) / (ramp * 0.5))[..., None]; w2 = self._ramp((yy - y - ramp * 0.5) / (ramp * 0.5))[..., None]
        roi = roi * (1 - w1) + b1 * w1; roi = roi * (1 - w2) + b2 * w2
        if lb.get('dark'):
            d0, d1, amt = lb['dark']; wd = self._ramp((yy - d0) / max(1, d1 - d0))[..., None] * amt
            roi = roi * (1 - wd) + np.array(lb.get('darkColor', [14, 11, 8]), np.float32) * wd
        out = out.copy(); out[y0:] = roi; return out

    @staticmethod
    def grade(out, g):
        """Hue shift for one hue band (e.g. a green wall toward teal) + saturation, skin untouched. g: {band:[h0,h1], shift, sat, bandSat}"""
        hsv = cv2.cvtColor(np.clip(out / 255, 0, 1).astype(np.float32), cv2.COLOR_BGR2HSV)
        h0, h1 = g.get('band', [70, 170]); c, hw = (h0 + h1) / 2, (h1 - h0) / 2
        w = np.clip(1 - np.abs(hsv[..., 0] - c) / hw, 0, 1) * np.clip(hsv[..., 1] * 3, 0, 1)
        hsv[..., 0] = (hsv[..., 0] + g.get('shift', 0) * w) % 360
        hsv[..., 1] = np.clip(hsv[..., 1] * (g.get('sat', 1) * (1 - w) + g.get('bandSat', g.get('sat', 1)) * w), 0, 1)
        if g.get('bandVal'): hsv[..., 2] = hsv[..., 2] * (1 - w + g['bandVal'] * w)
        return cv2.cvtColor(hsv, cv2.COLOR_HSV2BGR) * 255

    def base(self, st):
        cam = st['cam']; base = self.bg(st['bg']); main = None
        for m in st['media']:
            out, alpha, rim, M = self.media(m, cam)
            base = out * alpha + base * (1 - alpha)
            if rim is not None: base = base + rim * 255
            if main is None and not m.get('broll'): main = (out, M, m['seg'], m['frame'])
        if st.get('dots', 0) > 0: base = base * (1 - st['dots'] * (1 - self.dotpat)) + st.get('dotsLift', 0) * self.dotpat
        return base, main

    def frost(self, base, regions):
        for f in regions:
            x, y, w, h = f['rect']; r = min(f.get('radius', 0), w / 2, h / 2); pad = int(f['blur'] * 3) + 2
            x0, y0 = max(0, int(x) - pad), max(0, int(y) - pad); x1, y1 = min(self.W, int(x + w) + pad + 1), min(self.H, int(y + h) + pad + 1)
            if x1 <= x0 or y1 <= y0: continue
            roi = base[y0:y1, x0:x1]; bl = cv2.GaussianBlur(roi, (0, 0), f['blur'])
            xx, yy = self.xx[y0:y1, x0:x1], self.yy[y0:y1, x0:x1]
            qx = np.abs(xx - (x + w / 2)) - (w / 2 - r); qy = np.abs(yy - (y + h / 2)) - (h / 2 - r)
            d = np.hypot(np.maximum(qx, 0), np.maximum(qy, 0)) + np.minimum(np.maximum(qx, qy), 0) - r
            a = np.clip(0.5 - d, 0, 1)[..., None] * f.get('opacity', 1)
            base[y0:y1, x0:x1] = bl * a + roi * (1 - a)
        return base

    def frame(self, st, ov):
        a = ov[..., 3:4] / 255; base, main = self.base(st)
        if st.get('frost'): base = self.frost(base, st['frost'])
        comp = ov[..., :3] * a + base * (1 - a)
        if st.get('occlude') and main is not None:
            out, M, seg, fr = main; mk = self.mask(seg, fr)
            if mk is not None:
                mw = cv2.warpAffine(mk, M, (self.W, self.H), flags=cv2.INTER_LINEAR)[..., None]
                x, y, w, h = st['occlude']['rect']; X0, Y0 = self.cam_map(st['cam'], x, y); X1, Y1 = self.cam_map(st['cam'], x + w, y + h)
                box = ((self.xx >= X0) & (self.xx < X1) & (self.yy >= Y0) & (self.yy < Y1)).astype(np.float32)[..., None]
                mw = mw * box; comp = out * mw + comp * (1 - mw)
        return comp

    @staticmethod
    def bloom(img, fl):
        x = np.clip(img / 255, 0, 1); x = 1 - np.power(1 - x, 1 + 5 * fl ** 1.5)
        x = np.clip(x + cv2.GaussianBlur(x, (0, 0), 30) * 0.9 * fl + 0.22 * fl ** 2, 0, 1); return x * 255


async def render(job, start=None, end=None, out=None, stills=None, every=1, frames=None, lossless=False, maxsub=10, port=8765):
    plan = job.plan(); W, H = plan['size']; FPS = plan['fps']; SH = 0.5 / FPS
    comp = Comp(job, W, H)
    srv = subprocess.Popen([sys.executable, '-m', 'http.server', str(port), '--bind', '127.0.0.1'], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(0.8); enc = None; log = []
    try:
        async with async_playwright() as p:
            br = await p.chromium.launch(args=['--force-color-profile=srgb', '--disable-lcd-text', '--font-render-hinting=none'])
            pg = await br.new_page(viewport={'width': W, 'height': H}, device_scale_factor=1)
            cdp = await pg.context.new_cdp_session(pg)
            await cdp.send('Emulation.setDefaultBackgroundColorOverride', {'color': {'r': 0, 'g': 0, 'b': 0, 'a': 0}})
            msgs = []; pg.on('console', lambda m: msgs.append(m.text)); pg.on('pageerror', lambda e: msgs.append('PAGEERROR ' + str(e)))
            await pg.goto(f'http://127.0.0.1:{port}/engine/overlay.html?job={job.rel}')
            try: await pg.evaluate('init()')
            except Exception as e: sys.exit(f'engine init failed: {e}\n' + '\n'.join(msgs[-10:]))
            info = await pg.evaluate('info()'); N = info['frames']; cuts = info['cuts']
            hi = [(s['t0'], s['t1']) for s in plan['shots'] if s['template'] in ('routeMap',)]
            todo = frames if frames else list(range(start or 0, end if end is not None else N))
            if not frames:
                out = out or str(job.work / 'video_nosound.mp4')
                codec = ['-c:v', 'libx264', '-qp', '0', '-preset', 'ultrafast', '-pix_fmt', 'yuv444p'] if lossless else ['-c:v', 'libx264', '-preset', 'medium', '-crf', '15', '-pix_fmt', 'yuv420p']
                enc = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'bgr24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-', *codec,
                                        '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', '-movflags', '+faststart', out], stdin=subprocess.PIPE)
            if stills: os.makedirs(stills, exist_ok=True)
            t0 = time.time()
            for fi in todo:
                t = fi / FPS; ta, tb = t - SH / 2, t + SH / 2
                for c in cuts:
                    if fi == round(c * FPS): ta = t
                    if fi == round(c * FPS) - 1: tb = min(tb, t)
                sa = await pg.evaluate(f'frame({ta},{fi})'); sb = await pg.evaluate(f'frame({tb},{fi})')
                disp = 0.0
                if len(sa['probe']) == len(sb['probe']):
                    for qa, qb in zip(sa['probe'], sb['probe']): disp = max(disp, max(abs(qa[i] - qb[i]) for i in range(4)))
                else: disp = 99
                disp = max(disp, abs(sa['cam']['s'] - sb['cam']['s']) * 1100)
                disp = max(disp, abs(sa['cam'].get('tx', 0) - sb['cam'].get('tx', 0)), abs(sa['cam'].get('ty', 0) - sb['cam'].get('ty', 0)))
                for ma, mb in zip(sa['media'], sb['media']): disp = max(disp, abs(ma['rect'][0] - mb['rect'][0]) * sa['cam']['s'])
                ms = 18 if any(a <= t < b for a, b in hi) else maxsub
                n = 1 if disp < 0.6 else min(ms, int(math.ceil(disp / 1.2)) + 1)
                times = [t] if n == 1 else list(np.linspace(ta, tb, n)); acc = None; mid = None
                for ts in times:
                    st = await pg.evaluate(f'frame({ts},{fi})')
                    if mid is None or abs(ts - t) < 1e-6: mid = st
                    shot = await cdp.send('Page.captureScreenshot', {'format': 'png', 'optimizeForSpeed': True, 'fromSurface': True})
                    ov = cv2.imdecode(np.frombuffer(base64.b64decode(shot['data']), np.uint8), cv2.IMREAD_UNCHANGED).astype(np.float32)
                    if ov.ndim == 2: ov = cv2.cvtColor(ov, cv2.COLOR_GRAY2BGR)
                    if ov.shape[2] == 3: ov = np.dstack([ov, np.full(ov.shape[:2], 255, np.float32)])
                    c = comp.frame(st, ov); acc = c if acc is None else acc + c
                img = acc / len(times)
                if mid.get('flash', 0) > 0: img = Comp.bloom(img, mid['flash'])
                img = np.clip(img + 0.5, 0, 255).astype(np.uint8)
                if enc: enc.stdin.write(img.tobytes())
                if stills and (frames or (fi - todo[0]) % every == 0): cv2.imwrite(f'{stills}/f{fi:05d}.jpg', img, [cv2.IMWRITE_JPEG_QUALITY, 92])
                log.append((fi, n, round(disp, 1)))
                if fi % 25 == 0: print(f'frame {fi}/{N} t={t:.2f} sub={n} {time.time() - t0:.0f}s', flush=True)
            if msgs: print('engine console:', *msgs[-5:], sep='\n  ')
            await br.close()
    finally:
        if enc: enc.stdin.close(); enc.wait()
        srv.terminate()
    if out: json.dump(log, open(out + '.log.json', 'w'))
    print('done', out or stills)


if __name__ == '__main__':
    ap = argparse.ArgumentParser(); ap.add_argument('job'); ap.add_argument('--start', type=int); ap.add_argument('--end', type=int); ap.add_argument('--out')
    ap.add_argument('--stills'); ap.add_argument('--every', type=int, default=1); ap.add_argument('--frames'); ap.add_argument('--lossless', action='store_true')
    ap.add_argument('--port', type=int, default=8765); a = ap.parse_args(); job = Job(a.job)
    fr = [int(x) for x in a.frames.split(',')] if a.frames else None
    asyncio.run(render(job, a.start, a.end, a.out, a.stills or (str(job.work / 'stills') if fr else None), a.every, fr, a.lossless, port=a.port))
