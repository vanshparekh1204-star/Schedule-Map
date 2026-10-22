@echo off
rem Rebuilds Day Dial and serves it once, so the installed app picks up code changes.
rem Also used for the very first setup, before installing the app from the browser.
cd /d "%~dp0"

if not exist node_modules (
  echo Installing packages, this happens once...
  call npm install || goto :failed
)

echo Building Day Dial...
call npm run build || goto :failed

start "" http://localhost:4517
echo.
echo Day Dial is being served at http://localhost:4517
echo  - First time: in the browser, install it as an app, then pin it to the taskbar.
echo  - After an update: open the installed app once so it loads the new version.
echo Close this window when you're done.
echo.
call npm run serve
goto :eof

:failed
echo.
echo Something went wrong above. Nothing was changed in the installed app.
pause
exit /b 1
