@echo off
REM Backend Start Script for Windows
REM এই স্ক্রিপ্ট Backend সার্ভার শুরু করবে

echo.
echo ========================================
echo   CSHO SHOP Backend Server Starting
echo ========================================
echo.

REM Check if node_modules exists
if not exist "node_modules" (
    echo Installing dependencies...
    call npm install
    echo Dependencies installed!
    echo.
)

REM Check if .env exists
if not exist ".env" (
    echo ERROR: .env file not found!
    echo Please create .env file with Supabase credentials
    pause
    exit /b 1
)

echo Starting Backend Server...
echo PORT: 5000
echo API: http://localhost:5000/api
echo.
echo Health Check: http://localhost:5000/health
echo.
echo Press Ctrl+C to stop the server
echo.

REM Start the server
npm start

pause
