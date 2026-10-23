"""Ingest: probe the raw video, extract analysis audio, proxy, contact sheet. Writes work/probe.json."""
import json, sys
from common import Job, probe, run


def ingest(job: Job):
    src = job.source; info = probe(src); info['source'] = str(src.relative_to(job.dir))
    w = job.work
    run(['ffmpeg', '-v', 'error', '-y', '-i', src, '-vn', '-ac', '1', '-ar', '16000', w / 'audio16k.wav'])
    run(['ffmpeg', '-v', 'error', '-y', '-i', src, '-vn', '-ac', '1', '-ar', '16000', '-c:a', 'libmp3lame', '-b:a', '64k', w / 'audio_stt.mp3'])
    run(['ffmpeg', '-v', 'error', '-y', '-i', src, '-an', '-vf', 'scale=-2:540', '-c:v', 'libx264', '-crf', '26', '-preset', 'veryfast', w / 'proxy.mp4'])
    step = max(1.0, info['duration'] / 30)
    run(['ffmpeg', '-v', 'error', '-y', '-i', src, '-vf', f'fps=1/{step:.3f},scale=360:-2,tile=6x5', '-frames:v', '1', w / 'contact.jpg'])
    loud = __import__('subprocess').run(['ffmpeg', '-hide_banner', '-i', str(src), '-af', 'ebur128=peak=true', '-f', 'null', '-'], capture_output=True, text=True).stderr
    for line in loud.splitlines():
        if line.strip().startswith('I:'): info['lufs'] = float(line.split()[1])
        if line.strip().startswith('Peak:'): info['true_peak'] = float(line.split()[1])
    (w / 'probe.json').write_text(json.dumps(info, indent=1))
    print(json.dumps(info, indent=1))
    notes = []
    if info['vfr']: notes.append('Variable frame rate: renders conform to the nominal rate; check sync.')
    if info.get('color_transfer') in ('smpte2084', 'arib-std-b67'): notes.append('HDR source: tone-map before editing.')
    if info['rotation']: notes.append(f"Rotation metadata {info['rotation']} deg.")
    for n in notes: print('NOTE:', n)
    return info


if __name__ == '__main__':
    ingest(Job(sys.argv[1]))
