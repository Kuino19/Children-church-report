@echo off
title District Church Weekly Reporting Platform
echo ========================================================
echo  District Church Weekly Reporting & Collation Platform
echo ========================================================
echo.
cd /d "%~dp0"

echo Starting Church Reporting Server on http://localhost:5000...
start "" "http://localhost:5000"
node server/server.js
pause
