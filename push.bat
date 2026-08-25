@echo off
setlocal enabledelayedexpansion

echo ============================================
echo           Git Auto Push Script
echo ============================================
echo.

cd /d "%~dp0"

if not exist ".git" (
    echo [NOTICE] .git repository not found in this folder.
    echo.
    set /p "init_choice=Do you want to initialize Git repository now? (Y/N): "
    if /i not "!init_choice!"=="Y" goto end
    
    echo.
    echo Initializing Git...
    git init
    git branch -M main
    
    echo.
    set /p "remote_url=Please paste your GitHub Repository URL: "
    if not "!remote_url!"=="" (
        git remote add origin !remote_url!
        echo Remote origin added: !remote_url!
    ) else (
        echo [WARNING] No remote URL provided.
    )
    echo.
    echo ============================================
    echo        Git Initialization Complete!
    echo ============================================
    echo.
)

echo [1/5] Checking Git status...
git status -s
echo.

set /p "commit_msg=Enter commit message (Press Enter for auto timestamp): "

if "!commit_msg!"=="" (
    set "commit_msg=Auto update: %date% %time%"
)

echo.
echo [2/5] Adding all files (git add .)...
git add .

echo.
echo [3/5] Committing changes (git commit)...
git commit -m "!commit_msg!"

echo.
echo [4/5] Pulling and merging remote changes (git pull --rebase)...
git pull origin main --rebase --allow-unrelated-histories

echo.
echo [5/5] Pushing to remote (git push)...
git push -u origin main

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
