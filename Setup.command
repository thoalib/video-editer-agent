#!/bin/bash
# Double-click in Finder to set up (or update) this workspace on macOS.
cd "$(dirname "$0")"
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
{
  echo "== $(date) =="; sw_vers 2>/dev/null; uname -m
  echo "brew: $(command -v brew || echo missing)"; echo "ffmpeg: $(command -v ffmpeg || echo missing)"; echo "python3.11: $(command -v python3.11 || echo missing)"
  if command -v brew >/dev/null; then
    command -v ffmpeg >/dev/null || brew install ffmpeg
    command -v python3.11 >/dev/null || brew install python@3.11
  fi
  ./setup.sh
  echo "EXIT $?"
} 2>&1 | tee setup.log
echo; echo "Setup finished. You can close this window."
