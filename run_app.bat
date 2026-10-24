@echo off
title BlackBox AI - On-Device Intelligence
color 06
echo ========================================================
echo       BLACKBOX AI: 100%% ON-DEVICE MEETING ENGINE
echo ========================================================
echo [1/3] Checking Python Backend environment...
cd backend
if not exist "venv" (
    echo [*] Creating virtual environment...
    python -m venv venv
)
call venv\Scripts\activate
echo [*] Installing backend dependencies...
pip install -r requirements.txt --quiet
start cmd /k "title BlackBox AI Backend && call venv\Scripts\activate && uvicorn main:app --host 127.0.0.1 --port 8000 --reload"

echo [2/3] Setting up React + Vite Frontend...
cd ..\frontend
if not exist "node_modules" (
    echo [*] Installing Node packages...
    call npm install
)
start cmd /k "title BlackBox AI Frontend && npm run dev"

echo [3/3] Opening BlackBox AI in your browser...
timeout /t 4 >nul
start http://localhost:5173
echo.
echo ========================================================
echo   BlackBox AI is up and running!
echo   - Backend:  http://127.0.0.1:8000
echo   - Frontend: http://localhost:5173
echo ========================================================
pause
