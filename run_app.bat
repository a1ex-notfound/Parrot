@echo off
setlocal enabledelayedexpansion
title Parrot AI - Master Auto-Installer and Launcher

echo ====================================================================
echo           PARROT - 100%% Local Meeting Intelligence Suite
echo ====================================================================
echo.

cd /d "%~dp0"

REM 1. Check Python
where python >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python is not installed or not in your PATH.
    echo Please install Python 3.10+ and re-run this script.
    pause
    exit /b 1
)

REM 2. Check Node and NPM
where npm >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js / NPM is not installed or not in your PATH.
    echo Please install Node.js from https://nodejs.org/ and re-run this script.
    pause
    exit /b 1
)

REM 3. Check Ollama
where ollama >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Ollama is not installed or not in your PATH.
    echo Please install Ollama from https://ollama.com/ and re-run this script.
    pause
    exit /b 1
)

REM 4. Setup Python Virtual Environment
if not exist "venv\Scripts\python.exe" (
    echo [*] Creating Python virtual environment [venv]...
    python -m venv venv
)

echo [*] Checking and Installing Python dependencies...
call .\venv\Scripts\python.exe -m pip install --upgrade pip >nul 2>&1
call .\venv\Scripts\pip.exe install -r requirements.txt

REM 5. Setup Frontend Dependencies
if not exist "frontend\node_modules\" (
    echo [*] Installing frontend npm dependencies...
    cd frontend
    call npm install
    cd ..
)

REM 6. Verify Ollama Service and Qwen Model
echo [*] Verifying Ollama service...
curl -s http://127.0.0.1:11434/api/tags >nul 2>&1
if %errorlevel% neq 0 (
    echo [*] Starting Ollama server in background...
    start "Ollama Server" /min ollama serve
    timeout /t 3 /nobreak >nul
)

echo [*] Checking local Qwen 2.5 7B model...
ollama list | findstr /i "qwen2.5:7b" >nul 2>&1
if %errorlevel% neq 0 (
    echo ====================================================================
    echo [*] Model 'qwen2.5:7b' not found locally.
    echo [*] Downloading Qwen 2.5 7B. This only runs once...
    echo ====================================================================
    ollama pull qwen2.5:7b
)

REM 7. Launch Backend and Frontend
echo.
echo ====================================================================
echo [*] Launching Parrot Backend on http://127.0.0.1:8000
start "Parrot - FastAPI Backend" cmd /k "title Backend && cd /d "%~dp0" && .\venv\Scripts\python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000"

echo [*] Launching Parrot Frontend on http://localhost:5173
start "Parrot - React Frontend" cmd /k "title Frontend && cd /d "%~dp0frontend" && npm run dev"

echo [*] Opening browser in 4 seconds...
timeout /t 4 /nobreak >nul
start http://localhost:5173

echo.
echo [DONE] Parrot is running! Enjoy 100%% private meeting intelligence.
exit