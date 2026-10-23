#!/bin/bash
# First-run setup: Python 3.11 venv + packages + headless Chromium. Re-run safely any time.
#   ./setup.sh            core
#   ./setup.sh --whisper  + local Whisper fallback (downloads the model on first use)
set -euo pipefail
cd "$(dirname "$0")"
command -v ffmpeg >/dev/null || { echo "ffmpeg missing: brew install ffmpeg"; exit 1; }
PY=$(command -v python3.11 || true)
[ -n "$PY" ] || { echo "Python 3.11 missing: brew install python@3.11"; exit 1; }
[ -d .venv ] || "$PY" -m venv .venv
.venv/bin/python -m pip install -q --upgrade pip
.venv/bin/python -m pip install -q -r requirements.txt
.venv/bin/python -m playwright install chromium
if [ "${1:-}" = "--whisper" ]; then .venv/bin/python -m pip install -q -r requirements-whisper.txt; fi
[ -f .env ] || cp .env.example .env
.venv/bin/python - <<'PY'
import cv2, mediapipe, numpy, playwright
print('ok: numpy', numpy.__version__, '| opencv', cv2.__version__, '(ximgproc:', hasattr(cv2, 'ximgproc'), ') | mediapipe', mediapipe.__version__)
PY
grep -q '^ELEVENLABS_API_KEY=.\+' .env && echo "Scribe: key set" || echo "Scribe: add ELEVENLABS_API_KEY to .env (Whisper fallback otherwise)"
echo "Ready. Try: .venv/bin/python run.py styles"
