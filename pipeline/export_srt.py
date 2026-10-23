"""Export an English SRT from plan.json text elements (subtitles phrases, or caption words grouped per element).
Used for accessible captions and for Premiere native captions.
usage: python pipeline/export_srt.py JOB   -> output/captions.srt"""
import sys
from common import Job


def ts(t):
    ms = int(round(t * 1000)); h, ms = divmod(ms, 3600000); m, ms = divmod(ms, 60000); s, ms = divmod(ms, 1000)
    return f'{h:02d}:{m:02d}:{s:02d},{ms:03d}'


def words_of(p):
    out = []
    for k in ('line1', 'big', 'words', 'title'):
        if isinstance(p.get(k), list): out += [w for w in p[k] if isinstance(w, list)]
    for r in p.get('rows', []):
        out += r['words'] if isinstance(r, dict) else r
    for ln in p.get('lines', []):
        if isinstance(ln, dict): out += ln.get('words', [])
    return sorted(out, key=lambda w: w[1])


def export(job):
    plan = job.plan(); cues = []
    for e in plan['elements']:
        if e['template'] == 'subtitles':
            for ph in e['params']['phrases']: cues.append((ph['t0'], ph['t1'], ' '.join(w[0] for w in ph['words'])))
        elif e['template'] in ('chestCaption', 'pointerCaption', 'stackedCaption', 'pointerLines', 'checkLine', 'calloutLine'):
            ws = words_of(e['params'])
            if ws: cues.append((ws[0][1], e['t1'], ' '.join(w[0] for w in ws)))
    cues.sort(); f = job.out / 'captions.srt'
    f.write_text(''.join(f'{i + 1}\n{ts(a)} --> {ts(b)}\n{t}\n\n' for i, (a, b, t) in enumerate(cues)), encoding='utf-8')
    print(f'{len(cues)} cues -> {f}')


if __name__ == '__main__':
    export(Job(sys.argv[1]))
