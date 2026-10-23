"""Speech-to-text with word timestamps.
Engine order (--engine auto): ElevenLabs Scribe (ELEVENLABS_API_KEY in .env) -> local Whisper (pip install openai-whisper).
Output work/transcript.json:
  {engine, model, language, text, words:[{w, s, e, type}], phrases:[{s, e, text, words:[i0, i1]}]}
Malayalam comes back in Malayalam script (Scribe) — the agent writes the English on-screen text from it.
usage: python pipeline/transcribe.py JOB [--engine auto|scribe|whisper] [--lang mal] [--keyterms "ChatGPT,Claude,QubesAI"]"""
import argparse, json, os, sys
from common import Job


def scribe(job, lang, keyterms):
    import requests
    key = os.environ.get('ELEVENLABS_API_KEY')
    if not key: raise RuntimeError('ELEVENLABS_API_KEY not set (.env)')
    model = os.environ.get('ELEVENLABS_STT_MODEL', 'scribe_v2')
    data = [('model_id', model), ('timestamps_granularity', 'word'), ('tag_audio_events', 'true'), ('diarize', 'false')]
    if lang: data.append(('language_code', lang))
    for k in keyterms: data.append(('keyterms', k))
    f = job.work / 'audio_stt.mp3'
    with open(f, 'rb') as fh:
        r = requests.post('https://api.elevenlabs.io/v1/speech-to-text', headers={'xi-api-key': key}, data=data,
                          files={'file': (f.name, fh, 'audio/mpeg')}, timeout=900)
    if r.status_code != 200: raise RuntimeError(f'Scribe HTTP {r.status_code}: {r.text[:400]}')
    j = r.json(); (job.work / 'scribe_raw.json').write_text(json.dumps(j, ensure_ascii=False, indent=1))
    words = [{'w': x['text'], 's': round(x['start'], 3), 'e': round(x['end'], 3), 'type': x.get('type', 'word')}
             for x in j.get('words', []) if x.get('type') in ('word', 'audio_event')]
    return {'engine': 'scribe', 'model': model, 'language': j.get('language_code'), 'text': j.get('text', ''), 'words': words}


def whisper_local(job, lang, keyterms):
    import whisper
    name = os.environ.get('WHISPER_MODEL', 'medium')
    m = whisper.load_model(name)
    wl = {'mal': 'ml', 'eng': 'en', 'hin': 'hi', 'tam': 'ta', 'ara': 'ar'}.get(lang, lang)
    kw = dict(language=wl, word_timestamps=True, fp16=False, condition_on_previous_text=False, initial_prompt=', '.join(keyterms) if keyterms else None,
              temperature=(0.0, 0.2, 0.4, 0.6))
    r = m.transcribe(str(job.work / 'audio16k.wav'), **kw)
    if not any(s.get('words') for s in r['segments']):           # nothing usable -> relax thresholds once
        r = m.transcribe(str(job.work / 'audio16k.wav'), **kw, no_speech_threshold=0.9, logprob_threshold=-2.0, compression_ratio_threshold=3.0)
    words = [{'w': w['word'].strip(), 's': round(w['start'], 3), 'e': round(w['end'], 3), 'type': 'word'} for s in r['segments'] for w in s.get('words', [])]
    return {'engine': 'whisper', 'model': name, 'language': r.get('language'), 'text': r.get('text', ''), 'words': words}


def phrases(words, gap=0.35, maxlen=7.0):
    out, cur = [], []
    for i, w in enumerate(words):
        if w['type'] != 'word': continue
        if cur and (w['s'] - words[cur[-1]]['e'] > gap or w['e'] - words[cur[0]]['s'] > maxlen or words[cur[-1]]['w'].rstrip()[-1:] in '.?!।'):
            out.append(cur); cur = []
        cur.append(i)
    if cur: out.append(cur)
    return [{'s': words[c[0]]['s'], 'e': words[c[-1]]['e'], 'text': ' '.join(words[i]['w'] for i in c), 'words': [c[0], c[-1]]} for c in out]


def transcribe(job, engine='auto', lang=None, keyterms=()):
    order = ['scribe', 'whisper'] if engine == 'auto' else [engine]
    last = None
    for e in order:
        try:
            res = scribe(job, lang, keyterms) if e == 'scribe' else whisper_local(job, lang, keyterms); break
        except Exception as ex:
            last = ex; print(f'[{e}] unavailable: {ex}', file=sys.stderr)
    else:
        sys.exit(f'No STT engine worked: {last}')
    res['phrases'] = phrases(res['words'])
    (job.work / 'transcript.json').write_text(json.dumps(res, ensure_ascii=False, indent=1))
    with open(job.work / 'transcript.txt', 'w') as f:
        for p in res['phrases']: f.write(f"[{p['s']:7.2f}-{p['e']:7.2f}] {p['text']}\n")
    print(f"{res['engine']} ({res['model']}), language {res['language']}, {len(res['words'])} words, {len(res['phrases'])} phrases -> work/transcript.txt")
    return res


if __name__ == '__main__':
    ap = argparse.ArgumentParser(); ap.add_argument('job'); ap.add_argument('--engine', default='auto'); ap.add_argument('--lang'); ap.add_argument('--keyterms', default='')
    a = ap.parse_args()
    transcribe(Job(a.job), a.engine, a.lang, [k.strip() for k in a.keyterms.split(',') if k.strip()])
