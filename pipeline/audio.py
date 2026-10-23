"""Audio: voice from plan.segments (1:1 with picture), optional original music bed (ducked under speech),
sparse SFX, mastered to plan.audio.lufs (default -14 LUFS, <= -1.5 dBTP).
plan.audio = {"music": "pad"|"none"|"assets/music/x.wav", "music_db": -12.5, "lufs": -14,
              "sfx": "auto" | "none" | [{"kind":"whoosh"|"tick"|"pop"|"riser"|"file", "at": t, "gain_db": -22, "path": ..., ...}]}
"auto" SFX: whoosh into each shot change / swipe / bloom, pop on map rewards, soft ticks on list rows, markers and
underlined key words. Never on every caption.
usage: python pipeline/audio.py JOB   -> work/mix.wav, work/sfx_cues.json"""
import json, subprocess, sys, wave
import numpy as np
from common import Job, ROOT

SR = 48000


def read_audio(path):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(path), '-vn', '-ac', '2', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True).stdout
    return np.frombuffer(raw, np.float32).reshape(-1, 2).copy()


def save(path, x, bits=16):
    x = np.clip(x, -1, 1); d = (x * 32767).astype(np.int16)
    with wave.open(str(path), 'wb') as w: w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(d.tobytes())


rng = np.random.RandomState(11)


def whoosh(dur=0.45, f0=300, f1=2600, rise=0.55):
    L = int(dur * SR); x = rng.randn(L).astype(np.float32); tt = np.arange(L) / L
    fc = f0 * (f1 / f0) ** np.where(tt < rise, tt / rise, 1 - (tt - rise) / (1 - rise))
    y = np.zeros(L, np.float32); lp = hp = 0.0
    a = 1 - np.exp(-2 * np.pi * fc / SR); b = 1 - np.exp(-2 * np.pi * fc * 0.35 / SR)
    for i in range(L): lp += a[i] * (x[i] - lp); hp += b[i] * (lp - hp); y[i] = lp - hp
    y *= np.where(tt < rise, (tt / rise) ** 2, ((1 - tt) / (1 - rise)) ** 1.5); y /= np.abs(y).max() + 1e-9
    return np.stack([y, np.roll(y, 40)], 1) * 0.6


def tick():
    L = int(0.06 * SR); tt = np.arange(L) / SR
    y = (np.sin(2 * np.pi * 2400 * tt) * 0.6 + np.sin(2 * np.pi * 3600 * tt) * 0.3) * np.exp(-tt / 0.012) + rng.randn(L) * np.exp(-tt / 0.003) * 0.15
    y = y / np.abs(y).max() * 0.25; return np.stack([y, y], 1).astype(np.float32)


def pop():
    L = int(0.5 * SR); tt = np.arange(L) / SR; f = 520 * (1 + 0.6 * np.exp(-tt / 0.03))
    y = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt / 0.16) + 0.5 * np.sin(2 * np.pi * 1040 * tt) * np.exp(-tt / 0.22) + 0.25 * np.sin(2 * np.pi * 1560 * tt) * np.exp(-tt / 0.3)
    y = y / np.abs(y).max() * 0.4; return np.stack([y, y], 1).astype(np.float32)


def riser(dur=0.5):
    L = int(dur * SR); tt = np.arange(L) / L; y = np.convolve(rng.randn(L), np.ones(6) / 6, 'same') * tt ** 2.2
    y /= np.abs(y).max(); return np.stack([y, y], 1).astype(np.float32) * 0.35


def music_pad(total):
    N = int(total * SR); t = np.arange(N) / SR; note = lambda m: 440.0 * 2 ** ((m - 69) / 12)
    chords = [[57, 60, 64, 69], [53, 57, 60, 65], [48, 52, 55, 60], [55, 59, 62, 67]]; bar = 2.4; pad = np.zeros(N, np.float32)
    for i in range(int(total / bar) + 2):
        st = i * bar; a = int(st * SR); b = min(N, int((st + bar + 0.6) * SR))
        if a >= N: break
        tt = t[a:b] - st; env = np.clip(tt / 0.5, 0, 1) * np.clip((bar + 0.6 - tt) / 0.6, 0, 1); sig = np.zeros(b - a, np.float32)
        for m in chords[i % 4]:
            f = note(m); sig += (np.sin(2 * np.pi * f * tt) + 0.35 * np.sin(2 * np.pi * 2 * f * tt + 0.3) + 0.12 * np.sin(2 * np.pi * 3 * f * tt)) * 0.22 + 0.18 * np.sin(2 * np.pi * f * 1.004 * tt)
        pad[a:b] += sig * env
    pulse = np.zeros(N, np.float32)
    for k in range(int(total / 0.6)):
        a = int(k * 0.6 * SR); L = int(0.35 * SR); tt = np.arange(L) / SR
        if a + L > N: break
        pulse[a:a + L] += np.sin(2 * np.pi * note(chords[int(k * 0.6 / bar) % 4][0] - 12) * tt) * np.exp(-tt / 0.12) * 0.5
    m = np.convolve(pad * 0.5 + pulse * 0.35, np.ones(9) / 9, mode='same').astype(np.float32)
    return np.stack([m, np.roll(m, int(0.012 * SR))], 1)


def auto_cues(plan):
    cues = []; shots = plan['shots']
    for s in shots[1:]: cues.append({'kind': 'whoosh', 'at': s['t0'] - 0.22, 'gain_db': -22, 'why': f"into {s['template']}"})
    for tr in plan.get('transitions', []):
        if tr['type'] == 'bloom': cues.append({'kind': 'riser', 'at': tr['at'] - 0.48, 'gain_db': -22, 'why': 'bloom build'})
    for s in shots:
        p = s.get('params', {})
        for a in p.get('swipes', []): cues.append({'kind': 'whoosh', 'at': a - 0.08, 'gain_db': -21, 'dur': 0.32, 'f0': 600, 'f1': 3200, 'rise': 0.45, 'why': 'swipe'})
        if p.get('exitAt'): cues.append({'kind': 'whoosh', 'at': p['exitAt'] - 0.06, 'gain_db': -23, 'f0': 2200, 'f1': 300, 'rise': 0.3, 'why': 'squeeze out'})
        if s['template'] == 'routeMap':
            for m in p.get('markers', []): cues.append({'kind': 'tick', 'at': m['at'], 'gain_db': -27, 'why': 'marker'})
            if p.get('reward'): cues.append({'kind': 'pop', 'at': p['reward']['at'], 'gain_db': -16, 'why': 'reward'})
    for e in plan.get('elements', []):
        p = e.get('params', {})
        if e['template'] == 'listCard':
            for r in p.get('rows', []): cues.append({'kind': 'tick', 'at': r[0][1], 'gain_db': -27, 'why': 'list row'})
        if e['template'] == 'pointerLines':
            for r in p.get('rows', []): cues.append({'kind': 'tick', 'at': r['words'][0][1], 'gain_db': -27, 'why': 'line'})
        if e['template'] in ('pillChips',):
            for c in p.get('chips', []): cues.append({'kind': 'tick', 'at': c['t'], 'gain_db': -27, 'why': 'chip'})
    # thin out: no two cues closer than 0.25 s (keep the louder)
    cues.sort(key=lambda c: c['at']); out = []
    for c in cues:
        if out and c['at'] - out[-1]['at'] < 0.25:
            if c['gain_db'] > out[-1]['gain_db']: out[-1] = c
            continue
        out.append(c)
    return out


def mix(job: Job):
    plan = job.plan(); A = plan.get('audio', {}); src = read_audio(job.dir / plan['source'])
    fps = plan['fps']; total = sum(round((s['out'] - s['in']) * fps) for s in plan['segments']) / fps; N = int(round(total * SR))
    voice = np.zeros((N, 2), np.float32); fade = int(0.008 * SR); ramp = np.linspace(0, 1, fade, dtype=np.float32)[:, None]; o = 0
    for s in plan['segments']:
        n = int(round(round((s['out'] - s['in']) * fps) / fps * SR)); a = int(round(round(s['in'] * fps) / fps * SR)); seg = src[a:a + n].copy()
        if len(plan['segments']) > 1: seg[:fade] *= ramp; seg[-fade:] *= ramp[::-1]
        voice[o:o + len(seg)] += seg; o += n
    music = np.zeros_like(voice)
    mu = A.get('music', 'pad')
    if mu == 'pad': music = music_pad(total)[:N]; music = np.pad(music, ((0, N - len(music)), (0, 0)))   # float rounding can leave it a sample short
    elif mu and mu != 'none': m = read_audio(ROOT / mu if not str(mu).startswith('/') else mu); m = np.tile(m, (N // len(m) + 1, 1))[:N]; music = m
    if mu and mu != 'none':
        env = np.convolve(np.abs(voice).mean(1), np.ones(int(0.05 * SR)) / int(0.05 * SR), mode='same')
        sp = np.clip(env / (np.percentile(env, 80) + 1e-9), 0, 1); duck = 1 - 0.55 * np.convolve(sp, np.ones(int(0.25 * SR)) / int(0.25 * SR), mode='same')
        music *= duck[:, None].astype(np.float32); fi = int(0.6 * SR); fo = int(1.2 * SR)
        music[:fi] *= np.linspace(0, 1, fi)[:, None]; music[-fo:] *= np.linspace(1, 0, fo)[:, None]
    cues = A.get('sfx', 'auto'); cues = auto_cues(plan) if cues == 'auto' else ([] if cues in (None, 'none') else cues)
    sfx = np.zeros_like(voice)
    for c in cues:
        k = c['kind']
        sig = whoosh(c.get('dur', 0.45), c.get('f0', 300), c.get('f1', 2600), c.get('rise', 0.55)) if k == 'whoosh' else tick() if k == 'tick' else pop() if k == 'pop' else riser(c.get('dur', 0.48)) if k == 'riser' \
            else read_audio(ROOT / c['path'])
        a = int(round(c['at'] * SR)); g = 10 ** (c.get('gain_db', -22) / 20)
        if a < 0: sig = sig[-a:]; a = 0
        e = min(N, a + len(sig)); sfx[a:e] += sig[:e - a] * g
    (job.work / 'sfx_cues.json').write_text(json.dumps(cues, indent=1))
    w = job.work; save(w / 'voice.wav', voice); save(w / 'music.wav', music * 0.5); save(w / 'sfx.wav', sfx)
    mdb = A.get('music_db', -12.5); lufs = A.get('lufs', -14)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', w / 'voice.wav', '-i', w / 'music.wav', '-i', w / 'sfx.wav', '-filter_complex',
                    f"[0]highpass=f=70,equalizer=f=6500:t=q:w=1.2:g=-1.5[v];[1]volume={mdb}dB[m];[v][m][2]amix=inputs=3:normalize=0[x]", '-map', '[x]', '-c:a', 'pcm_f32le', w / 'premix.wav'], check=True)
    meas = subprocess.run(['ffmpeg', '-hide_banner', '-i', w / 'premix.wav', '-af', f'loudnorm=I={lufs}:TP=-1.5:LRA=11:print_format=json', '-f', 'null', '-'], capture_output=True, text=True).stderr
    j = json.loads(meas[meas.rindex('{'):meas.rindex('}') + 1])
    flt = (f"loudnorm=I={lufs}:TP=-1.5:LRA=11:measured_I={j['input_i']}:measured_TP={j['input_tp']}:measured_LRA={j['input_lra']}:"
           f"measured_thresh={j['input_thresh']}:offset={j['target_offset']}:linear=true,alimiter=limit=0.84:attack=2:release=60:level=false")
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', w / 'premix.wav', '-af', flt, '-ar', str(SR), '-c:a', 'pcm_s16le', w / 'mix.wav'], check=True)
    print(f'mix.wav written ({len(cues)} sfx cues, music={mu})')


if __name__ == '__main__':
    mix(Job(sys.argv[1]))
