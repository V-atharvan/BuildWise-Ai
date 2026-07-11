@echo off
title BuildWise AI Orchestrator
color 0D
cls

echo =======================================================================
echo          ____        _ _     _ _ _ _             _     ___ 
echo         ^| __ ) _   _^|(_) ^| __^| ^| ^| ^| ^|   ___  ___^| ^|   /   ^|
echo         ^|  _ \^| ^| ^| ^| ^| ^|/ _` ^|_^|_^|_^|  / __^|/ _ \ ^|  /_/^| ^|
echo         ^| ^|_) ^| ^|_^| ^| ^| ^| (_^| ^|_ _ _   \__ \  __/ ^|    ^| ^|
echo         ^|____/ \__,_^|_^|_^|\__,_^|_^|_^|_^|  ^|___/\___^|_^|    ^|_^|
echo.
echo              -- Production Materials Engine ^& Web Platform --
echo =======================================================================
echo.

:MENU
echo [1] Start application via Docker Compose (Recommended)
echo [2] Start application locally (No Docker, runs in background)
echo [3] Exit
echo.
set "opt=1"
set /p opt="Choose startup option [1-3] (Default: 1): "

if "%opt:~0,1%"=="1" goto START_DOCKER
if "%opt:~0,1%"=="2" goto START_LOCAL
if "%opt:~0,1%"=="3" goto END
echo [WARNING] Invalid option selected. Please choose 1, 2, or 3.
echo.
goto MENU

:START_DOCKER
echo.
echo [INFO] Checking Docker installation...
where docker >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Docker is not installed or not in your system's PATH.
    echo.
    echo Please install Docker Desktop from https://www.docker.com/products/docker-desktop
    echo and ensure it is added to your environment variables.
    echo.
    echo Press any key to fall back to local startup...
    pause >nul
    goto START_LOCAL
)

echo [INFO] Checking if Docker Daemon is running...
docker info >nul 2>nul
if %errorlevel% neq 0 (
    echo [INFO] Docker is installed but the Daemon is not running.
    echo [INFO] Attempting to launch Docker Desktop automatically...
    
    if exist "C:\Program Files\Docker\Docker\Docker Desktop.exe" (
        start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe"
        echo [INFO] Launched Docker Desktop. Waiting for daemon to start...
        goto WAIT_DOCKER
    ) else (
        echo [WARNING] Could not find Docker Desktop.exe at the default path:
        echo           C:\Program Files\Docker\Docker\Docker Desktop.exe
        echo.
        echo Please launch Docker Desktop manually, wait for it to start,
        echo and then press any key here to continue...
        pause >nul
        goto WAIT_DOCKER
    )
) else (
    goto RUN_DOCKER
)

:WAIT_DOCKER
set /a count=0
echo [INFO] Waiting for Docker daemon to become ready (this may take a minute)
:WAIT_LOOP
docker info >nul 2>nul
if %errorlevel% equ 0 (
    echo.
    echo [SUCCESS] Docker Daemon is ready!
    goto RUN_DOCKER
)
set /a count+=1
if %count% gtr 45 (
    echo.
    echo [TIMEOUT] Docker daemon did not respond within 90 seconds.
    echo.
    echo Press any key to fall back to local startup...
    pause >nul
    goto START_LOCAL
)
<nul set /p =.
timeout /t 2 >nul
goto WAIT_LOOP

:RUN_DOCKER
echo.
echo [INFO] Starting all services with Docker Compose...
echo [INFO] This will run Database, Redis, Celery, Backend API, and Next.js Frontend.
echo.
docker compose up --build
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Docker Compose failed to start services.
    echo.
    echo Press any key to fall back to local startup...
    pause >nul
    goto START_LOCAL
)
goto END

:START_LOCAL
echo.
echo =======================================================================
echo               Starting Frontend ^& Backend Locally (No Docker)
echo =======================================================================
echo.

:: Check Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH.
    echo         Frontend require Node.js to run locally.
    goto ERR_EXIT
)

:: Check Python
where python >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Python is not installed or not in PATH.
    echo         Backend require Python to run locally.
    goto ERR_EXIT
)

echo [INFO] Starting Next.js Web Frontend in a separate window...
start "BuildWise Frontend" cmd /c "cd buildwise_web && npm install && npm run dev"

echo [INFO] Setting up Python Virtual Environment for FastAPI Backend...
if not exist "buildwise_api\venv" (
    echo [INFO] Creating Python virtual environment (venv)...
    python -m venv buildwise_api\venv
)

echo [INFO] Starting FastAPI Backend in a separate window...
start "BuildWise Backend" cmd /c "cd buildwise_api && call venv\Scripts\activate && pip install -r requirements.txt && uvicorn app.main:app --reload --host 127.0.0.1 --port 8000"

echo.
echo [SUCCESS] Startup commands issued!
echo.
echo -----------------------------------------------------------------------
echo  * Next.js Frontend:   http://localhost:3000
echo  * FastAPI Backend:    http://localhost:8000
echo  * API Documentation:  http://localhost:8000/docs
echo -----------------------------------------------------------------------
echo.
echo Note: Since you are running locally without Docker, make sure you have
echo PostgreSQL and Redis servers running locally on their default ports.
echo.
echo Press any key to close this orchestrator window.
pause >nul
goto END

:ERR_EXIT
echo.
echo [ERROR] Local launch failed due to missing requirements.
echo Press any key to return to main menu...
pause >nul
goto MENU

:END
echo.
echo Thank you for using BuildWise AI!
timeout /t 3 >nul
