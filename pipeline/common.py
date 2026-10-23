"""Shared helpers: repo/job paths, .env loading, ffprobe, plan I/O."""
import json, os, subprocess, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def load_env():
    f = ROOT / '.env'
    if f.exists():
        for line in f.read_text().splitlines():
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                k, v = line.split('=', 1)
                os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


load_env()


class Job:
    """jobs/<name>/  source/ (raw video, reference)  work/ (derived)  output/ (deliverables)"""
    def __init__(self, path):
        p = Path(path)
        self.dir = p if p.is_absolute() else (ROOT / p)
        self.dir = self.dir.resolve()
        self.name = self.dir.name
        self.rel = os.path.relpath(self.dir, ROOT)
        self.source_dir = self.dir / 'source'; self.work = self.dir / 'work'; self.out = self.dir / 'output'
        for d in (self.source_dir, self.work, self.out): d.mkdir(parents=True, exist_ok=True)

    @property
    def source(self):
        vids = [f for f in sorted(self.source_dir.iterdir()) if f.suffix.lower() in ('.mp4', '.mov', '.mkv', '.m4v', '.webm')
                and not f.stem.lower().startswith('ref')]
        if not vids: sys.exit(f'No raw video in {self.source_dir}')
        return vids[0]

    @property
    def reference(self):
        refs = [f for f in sorted(self.source_dir.iterdir()) if f.stem.lower().startswith('ref') and f.suffix.lower() in ('.mp4', '.mov', '.mkv', '.webm')]
        return refs[0] if refs else None

    def plan(self):
        f = self.work / 'plan.json'
        return json.loads(f.read_text()) if f.exists() else None

    def save_plan(self, plan):
        (self.work / 'plan.json').write_text(json.dumps(plan, indent=1, ensure_ascii=False))


def probe(path):
    out = subprocess.run(['ffprobe', '-v', 'error', '-show_streams', '-show_format', '-of', 'json', str(path)], capture_output=True, text=True, check=True).stdout
    j = json.loads(out)
    v = next(s for s in j['streams'] if s['codec_type'] == 'video')
    a = next((s for s in j['streams'] if s['codec_type'] == 'audio'), None)
    num, den = map(int, v['r_frame_rate'].split('/'))
    rot = 0
    for sd in v.get('side_data_list', []) or []:
        if 'rotation' in sd: rot = int(sd['rotation'])
    w, h = int(v['width']), int(v['height'])
    if abs(rot) in (90, 270): w, h = h, w
    return {'width': w, 'height': h, 'fps': num / den, 'fps_str': v['r_frame_rate'], 'duration': float(j['format']['duration']),
            'vcodec': v['codec_name'], 'pix_fmt': v.get('pix_fmt'), 'color_transfer': v.get('color_transfer'), 'rotation': rot,
            'has_audio': a is not None, 'audio_rate': int(a['sample_rate']) if a else None,
            'vfr': v['r_frame_rate'] != v.get('avg_frame_rate', v['r_frame_rate'])}


def run(cmd, **kw):
    print('$', ' '.join(str(c) for c in cmd), flush=True)
    return subprocess.run([str(c) for c in cmd], check=True, **kw)
