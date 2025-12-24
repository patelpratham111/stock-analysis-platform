@echo off
echo Checking if MongoDB is running...
netstat -an | findstr "27017" > nul
if %errorlevel% equ 0 (
    echo ✓ MongoDB is running on port 27017
) else (
    echo ✗ MongoDB is NOT running!
    echo.
    echo Please start MongoDB:
    echo 1. Install MongoDB from https://www.mongodb.com/try/download/community
    echo 2. Or use MongoDB Atlas (cloud): https://www.mongodb.com/cloud/atlas
    echo 3. Or run: docker run -d -p 27017:27017 mongo
    echo.
    echo See START_MONGODB.md for detailed instructions
)
pause
