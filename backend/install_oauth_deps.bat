@echo off
echo Installing Google OAuth dependencies...
echo.

REM Activate virtual environment if it exists
if exist venv\Scripts\activate.bat (
    echo Activating virtual environment...
    call venv\Scripts\activate.bat
)

echo Installing httpx...
pip install httpx==0.26.0

echo.
echo ✓ Google OAuth dependencies installed successfully!
echo.
echo Next steps:
echo 1. Set up Google Cloud Console (see GOOGLE_OAUTH_SETUP.md)
echo 2. Update backend/.env with your Google credentials
echo 3. Restart the backend server
echo.
pause
