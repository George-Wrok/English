@echo off
setlocal enabledelayedexpansion

echo ============================================
echo           Git Auto Push Script
echo ============================================
echo.

cd /d "%~dp0"

echo [1/3] Checking Git status...
git status -s
echo.

set /p "commit_msg=Enter commit message (Press Enter for auto timestamp): "

if "!commit_msg!"=="" (
    set "commit_msg=Auto update: %date% %time%"
)

echo.
echo [2/3] Adding files and committing...
git add .
git commit -m "!commit_msg!"

echo.
echo [3/3] Pushing to remote (git push)...
git push origin main

if !errorlevel! equ 0 (
    echo.
    echo ============================================
    echo           [SUCCESS] Git Push Completed!
    echo ============================================
) else (
    echo.
    echo ============================================
    echo           [FAILED] Error occurred during push.
    echo ============================================
)

:end
echo.
pause
