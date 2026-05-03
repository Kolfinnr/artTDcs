#!/usr/bin/env bash
set -euo pipefail

if ! command -v npm >/dev/null 2>&1; then
  echo "Error: npm was not found. Install Node.js LTS first: https://nodejs.org/" >&2
  exit 1
fi

echo "Installing dependencies if needed..."
npm install

echo "Launching Bunker Crew in its own window..."
npm start
