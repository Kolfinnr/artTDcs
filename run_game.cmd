@echo off
setlocal

set "INDEX=%~dp0index.html"

if not exist "%INDEX%" (
  echo Error: Could not find index.html next to this script.
  pause
  exit /b 1
)

echo Opening Bunker Crew Prototype in your default browser...
echo Controls: WASD move, E interact, Arrow keys for combos.
start "" "%INDEX%"

echo Done. You can close this window.
