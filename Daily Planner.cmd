@echo off
rem Fallback launcher: starts the local server minimised and opens Day Dial in its own Edge window.
rem The installed app (see README) doesn't need this; use it if the app was never installed.
cd /d "%~dp0"

if not exist dist\index.html (
  echo First run: building Day Dial...
  if not exist node_modules call npm install
  call npm run build
)

rem If the server is already running, starting another just exits; the window still opens.
start "Day Dial server" /min cmd /c "npm run serve"
timeout /t 2 /nobreak >nul
start "" msedge --app=http://localhost:4517
