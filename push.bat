@echo off
echo ========================================
echo Git Auto Push Script
echo ========================================

:: Add all changes
git add .

:: Get current date and time reliably
for /f "tokens=2 delims==" %%a in ('wmic OS Get localdatetime /value') do set "dt=%%a"
set "timestamp=%dt:~0,4%-%dt:~4,2%-%dt:~6,2% %dt:~8,2%:%dt:~10,2%:%dt:~12,2%"

:: Ask for commit message, default to "Auto update" if empty
set /p commitMessage="Enter commit message (Press Enter for 'Auto update'): "
if "%commitMessage%"=="" set commitMessage=Auto update

:: Commit changes with date and time
git commit -m "%commitMessage% - %timestamp%"

:: Push to remote
echo Pushing to remote repository...
git push

echo ========================================
echo Done!
pause
