"""ONLY when the user explicitly asks for cuts (silence / fillers / retakes / a target length).
Suggests keep-segments from the transcript + audio energy. The agent reviews them (listen + read) and writes
plan.segments. Default edits never cut: plan.segments = one segment covering the whole video.
usage: python pipeline/cutlist.py JOB [--min-gap 0.6] [--keep-gap 0.25] [--fillers "um,uh,aa,mm"]
Writes work/cut_suggestions.json + prints a readable list (silences, fillers, repeated phrases)."""
import argparse, json, wave
import numpy as np
from common import Job


def energy_quiet(job, thr_pct=18):
    w = wave.open(str(job.work / 'audio16k.wav')); a = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(float) / 32768
    h = 160; n = len(a) // h; db = 20 * np.log10(np.sqrt((a[:n * h].reshape(n, h) ** 2).mean(1)) + 1e-9)
    db = np.convolve(db, np.ones(5) / 5, mode='same'); return db, np.percentile(db, thr_pct)


def suggest(job, min_gap=0.6, keep_gap=0.25, fillers=('um', 'uh', 'aa', 'mm', 'hmm', 'ah')):
    tr = json.loads((job.work / 'transcript.json').read_text()); words = [w for w in tr['words'] if w['type'] == 'word']
    db, thr = energy_quiet(job)
    def quiet(t): i = int(t * 100); return i < len(db) and db[i] < thr
    cuts = []
    for a, b in zip(words, words[1:]):           # long pauses -> shorten to keep_gap
        if b['s'] - a['e'] >= min_gap: cuts.append({'kind': 'pause', 's': round(a['e'] + keep_gap / 2, 2), 'e': round(b['s'] - keep_gap / 2, 2)})
    for w in words:                               # fillers
        if w['w'].lower().strip('.,!?') in fillers: cuts.append({'kind': 'filler', 's': w['s'], 'e': w['e'], 'text': w['w']})
    ph = tr.get('phrases', [])                     # repeated phrases (retakes): same first 3 words within 12 s -> keep the later take
    for i, p in enumerate(ph):
        k = ' '.join(p['text'].split()[:3]).lower()
        for q in ph[i + 1:]:
            if q['s'] - p['e'] > 12: break
            if ' '.join(q['text'].split()[:3]).lower() == k: cuts.append({'kind': 'retake', 's': p['s'], 'e': q['s'] - keep_gap / 2, 'text': p['text']}); break
    cuts.sort(key=lambda c: c['s'])
    dur = json.loads((job.work / 'probe.json').read_text())['duration']
    keep, t = [], 0.0
    for c in cuts:
        if c['s'] > t + 0.08: keep.append([round(t, 2), round(c['s'], 2)])
        t = max(t, c['e'])
    if dur - t > 0.08: keep.append([round(t, 2), round(dur, 2)])
    out = {'cuts': cuts, 'keep': keep, 'note': 'Suggestions only. Snap to frames, confirm each cut lands in silence, re-read the meaning, then write plan.segments.'}
    (job.work / 'cut_suggestions.json').write_text(json.dumps(out, indent=1, ensure_ascii=False))
    for c in cuts: print(f"{c['kind']:7s} {c['s']:7.2f}-{c['e']:7.2f} {c.get('text', '')}")
    print(f"keep {len(keep)} segments, {sum(b - a for a, b in keep):.1f}s of {dur:.1f}s")


if __name__ == '__main__':
    ap = argparse.ArgumentParser(); ap.add_argument('job'); ap.add_argument('--min-gap', type=float, default=0.6); ap.add_argument('--keep-gap', type=float, default=0.25)
    ap.add_argument('--fillers', default='um,uh,aa,mm,hmm,ah'); a = ap.parse_args()
    suggest(Job(a.job), a.min_gap, a.keep_gap, tuple(a.fillers.split(',')))
