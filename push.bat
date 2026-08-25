@echo off
echo ========================================
echo Git Auto Push Script
echo ========================================

:: Add all changes
git add .

:: Ask for commit message, default to "Auto update" if empty
set /p commitMessage="Enter commit message (Press Enter for 'Auto update'): "
if "%commitMessage%"=="" set commitMessage=Auto update

:: Commit changes
git commit -m "%commitMessage%"

:: Push to remote
echo Pushing to remote repository...
git push

echo ========================================
echo Done!
pause
