#!/usr/bin/env bash
set -u

PORT="${1:-8000}"
URL="http://localhost:${PORT}"

pause_if_interactive() {
  if [ -t 0 ]; then
    read -r -p "Press Enter to close..." _
  fi
}

fail_and_pause() {
  echo "Error: $1" >&2
  pause_if_interactive
  exit 1
}

# Find a Python executable that can run a simple HTTP server.
PYTHON_CMD=""
if command -v python3 >/dev/null 2>&1; then
  PYTHON_CMD="python3"
elif command -v python >/dev/null 2>&1; then
  PYTHON_CMD="python"
else
  fail_and_pause "Python is required (python3 or python)."
fi

cat <<MSG
Starting Bunker Crew Prototype on:
  ${URL}

Controls:
  WASD = Move
  E = Interact near station
  Arrow keys = Combo inputs

Leave this window open while playing.
Press Ctrl+C to stop the server.
MSG

# Try opening the default browser, but continue even if this fails.
if command -v xdg-open >/dev/null 2>&1; then
  xdg-open "${URL}" >/dev/null 2>&1 || true
elif command -v open >/dev/null 2>&1; then
  open "${URL}" >/dev/null 2>&1 || true
fi

# Run the local web server.
"${PYTHON_CMD}" -m http.server "${PORT}" || {
  fail_and_pause "Failed to start HTTP server on port ${PORT}."
}
