@echo off
title BlackBox AI Launcher
echo ===================================================
echo           Starting BlackBox AI Suite
echo ===================================================
echo.

cd /d "%~dp0"

echo [1/3] Launching FastAPI Backend on http://127.0.0.1:8000...
start "BlackBox AI - Backend (Uvicorn)" cmd /k "title Backend && cd /d "%~dp0" && .\venv\Scripts\python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000"

echo [2/3] Launching Vite Frontend on http://localhost:5173...
start "BlackBox AI - Frontend (Vite)" cmd /k "title Frontend && cd /d "%~dp0frontend" && npm run dev"

echo [3/3] Opening browser in 3 seconds...
timeout /t 3 /nobreak >nul
start http://localhost:5173

echo.
echo All services launched successfully!
exit
