"""Design history of delivered edits, newest first, so the next video does not repeat the last one's look.
Reads jobs/*/output/plan.json (written by master). Jobs starting with '_' are test jobs and are skipped.
usage: python pipeline/history.py [--last 5]"""
import argparse, json
from collections import Counter
from datetime import datetime
from common import ROOT


def entries():
    out = []
    for pj in (ROOT / 'jobs').glob('*/output/plan.json'):
        job = pj.parent.parent
        if job.name.startswith('_'): continue
        final = job / 'output' / 'final.mp4'
        when = (final if final.exists() else pj).stat().st_mtime
        p = json.loads(pj.read_text())
        els = p.get('elements', []); shots = p.get('shots', [])
        caps = [e for e in els if e['template'] in ('mixCaption', 'chestCaption', 'stackedCaption')]
        ys = sorted({round((e.get('params') or {}).get('y', -1)) for e in caps if (e.get('params') or {}).get('y') is not None})
        kinds = Counter(l.get('kind') for e in caps if e['template'] == 'mixCaption' for l in e['params'].get('lines', []))
        out.append({
            'when': datetime.fromtimestamp(when).strftime('%Y-%m-%d %H:%M'), 'job': job.name, 'style': p.get('style'),
            'overrides': p.get('style_overrides') or {},
            'shots': Counter(s['template'] for s in shots), 'cuts': len(shots),
            'elements': Counter(e['template'] for e in els),
            'caption_y': ys or 'style anchor', 'caption_kinds': dict(kinds),
            'band': any((s.get('params') or {}).get('band') for s in shots),
            'transitions': [t.get('type') for t in p.get('transitions', [])],
            'audio': p.get('audio', {}),
        })
    return sorted(out, key=lambda e: e['when'], reverse=True)


def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--last', type=int, default=5); a = ap.parse_args()
    es = entries()[:a.last]
    if not es: print('no delivered jobs yet'); return
    for e in es:
        print(f"{e['when']}  {e['job']}  style={e['style']}  cuts={e['cuts']}  band={e['band']}")
        print(f"   shots: {dict(e['shots'])}")
        print(f"   elements: {dict(e['elements'])}")
        print(f"   captions: y={e['caption_y']} kinds={e['caption_kinds']}  transitions={e['transitions'] or '-'}")
        if e['overrides']: print(f"   style_overrides: {json.dumps(e['overrides'])}")
        au = e['audio']; print(f"   audio: music={au.get('music')} sfx={au.get('sfx')}")


if __name__ == '__main__':
    main()
