@echo off
echo Launching VS 2022 Developer Command Prompt...

call "C:\Program Files\Microsoft Visual Studio\2022\Community\Common7\Tools\VsDevCmd.bat"

cd /d "%~dp0"

if not exist build mkdir build
cd build

cmake .. -G "Visual Studio 17 2022" -A x64
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo CMake configure failed!
    echo Make sure you have:
    echo   1. Desktop development with C++ workload installed
    echo   2. Windows 10/11 SDK installed
    echo.
    echo To install: Open Visual Studio Installer and add "Desktop development with C++"
    pause
    exit /b 1
)

cmake --build . --config Release
if %ERRORLEVEL% NEQ 0 (
    echo Build failed
    pause
    exit /b 1
)

if not exist ..\..\bin mkdir ..\..\bin
copy Release\wgc-helper.exe ..\..\bin\

echo.
echo ============================================
echo Build complete!
echo Binary: bin\wgc-helper.exe
echo ============================================
pause
