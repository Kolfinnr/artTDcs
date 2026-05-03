@echo off
setlocal

where npm >nul 2>nul
if errorlevel 1 (
  echo Error: npm was not found. Install Node.js LTS first: https://nodejs.org/
  pause
  exit /b 1
)

echo Installing dependencies if needed...
call npm install
if errorlevel 1 (
  echo Error: npm install failed.
  pause
  exit /b 1
)

echo Launching Bunker Crew in its own window...
call npm start
