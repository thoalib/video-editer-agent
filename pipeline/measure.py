"""Measurement helpers shared by ref_study.py and the style-from-reference loop (use on reference AND our frames).
camera: ORB similarity per frame pair -> cumulative relative scale curve, 90% settle time.
text: bright low-saturation ink bbox in a region; x-height band via row-density.
reveal: per-word brightness ramp -> frames from first visible to 90%.
color: saturated-pixel median.  dots: high-pass FFT period."""
import sys, json, glob
import numpy as np, cv2

def load(paths, scale=0.5):
    return [cv2.imread(p) for p in paths]

def camera_curve(frames, a, b, fps):
    orb = cv2.ORB_create(1500); s_list = []
    g = [cv2.cvtColor(cv2.resize(f, (f.shape[1]//2, f.shape[0]//2)), cv2.COLOR_BGR2GRAY) for f in frames[a:b+1]]
    z = 1.0; zs = [1.0]
    for i in range(1, len(g)):
        k1, d1 = orb.detectAndCompute(g[i-1], None); k2, d2 = orb.detectAndCompute(g[i], None)
        s = 1.0
        if d1 is not None and d2 is not None:
            m = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=True).match(d1, d2)
            if len(m) > 20:
                p1 = np.float32([k1[x.queryIdx].pt for x in m]); p2 = np.float32([k2[x.trainIdx].pt for x in m])
                A, msk = cv2.estimateAffinePartial2D(p1, p2, ransacReprojThreshold=2)
                if A is not None and msk.sum() > 30: s = float(np.hypot(A[0, 0], A[1, 0]))
        z *= s; zs.append(z)
    zs = np.array(zs); zs = zs / zs[-1]
    tot = zs[0] - 1; k = next((i for i, v in enumerate(zs) if abs(v - 1) <= 0.1 * abs(tot)), len(zs))
    return float(zs[0]), k / fps, zs

def ink_bbox(img, x0, y0, x1, y1, thr=200, maxsat=70):
    im = img[y0:y1, x0:x1]; hsv = cv2.cvtColor(im, cv2.COLOR_BGR2HSV)
    m = (hsv[..., 2] > thr) & (hsv[..., 1] < maxsat)
    ys, xs = np.where(m)
    if len(xs) < 20: return None
    return [x0 + int(np.percentile(xs, 0.5)), y0 + int(np.percentile(ys, 0.5)), x0 + int(np.percentile(xs, 99.5)), y0 + int(np.percentile(ys, 99.5))]

def xheight(img, box, thr=200):
    x0, y0, x1, y1 = box; im = cv2.cvtColor(img[y0:y1+1, x0:x1+1], cv2.COLOR_BGR2GRAY)
    rows = (im > thr).sum(1); mx = rows.max(); band = np.where(rows > 0.45 * mx)[0]
    return int(band.max() - band.min()) if len(band) else None

def sat_color(img, x0, y0, x1, y1, minsat=80, minv=120):
    im = img[y0:y1, x0:x1]; hsv = cv2.cvtColor(im, cv2.COLOR_BGR2HSV)
    m = (hsv[..., 1] >= minsat) & (hsv[..., 2] >= minv)
    if m.sum() < 5: return None
    px = im[m]; v = px.max(1); px = px[v >= np.percentile(v, 75)]; b, g, r = np.median(px, 0).astype(int)
    return f"#{r:02X}{g:02X}{b:02X}"

def reveal_frames(frames, box, a, b, thr=170):
    x0, y0, x1, y1 = box
    v = np.array([float((cv2.cvtColor(f[y0:y1, x0:x1], cv2.COLOR_BGR2GRAY) > thr).mean()) for f in frames[a:b]])
    if v.max() <= 0: return None
    v = v / v.max(); first = int(np.argmax(v > 0.08)); full = int(np.argmax(v > 0.9))
    return first + a, full - first

def dot_period(img, x0=100, y0=900, n=256):
    g = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY).astype(float)[y0:y0+n, x0:x0+n]; p = g - cv2.GaussianBlur(g, (0, 0), 6)
    F = np.abs(np.fft.fftshift(np.fft.fft2(p))); c = n // 2; F[c-6:c+7, c-6:c+7] = 0
    y, x = np.unravel_index(F.argmax(), F.shape); fx, fy = (x - c) / n, (y - c) / n
    return round(1 / max(abs(fx), abs(fy), 1e-6), 2), round(float(p.std()), 2)
