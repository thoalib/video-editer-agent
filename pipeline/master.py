"""Mux picture + mix into output/final.mp4 (H.264 High, yuv420p, bt709, AAC 320k 48 kHz, faststart).
usage: python pipeline/master.py JOB"""
import shutil, sys
from common import Job, run


def master(job: Job):
    v = job.work / 'video_nosound.mp4'; a = job.work / 'mix.wav'
    if not v.exists(): sys.exit('render first: python run.py render JOB')
    if not a.exists(): sys.exit('mix first: python run.py audio JOB')
    out = job.out / 'final.mp4'
    run(['ffmpeg', '-v', 'error', '-y', '-i', v, '-i', a, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '320k', '-ar', '48000',
         '-shortest', '-movflags', '+faststart', out])
    for f in ('plan.json', 'transcript.txt'):
        if (job.work / f).exists(): shutil.copy(job.work / f, job.out / f)
    print('delivered', out)


if __name__ == '__main__':
    master(Job(sys.argv[1]))
