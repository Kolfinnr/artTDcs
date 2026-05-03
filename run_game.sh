#!/usr/bin/env bash
set -euo pipefail

PORT="${1:-8000}"

if ! command -v python3 >/dev/null 2>&1; then
  echo "Error: python3 is required to run the local server." >&2
  exit 1
fi

cat <<MSG
Starting Bunker Crew Prototype on:
  http://localhost:${PORT}

Controls:
  WASD = Move
  E = Interact near station
  Arrow keys = Combo inputs

Press Ctrl+C to stop the server.
MSG

python3 -m http.server "${PORT}"
