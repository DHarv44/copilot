@echo off
setlocal

echo Building wgc-helper...

REM Check for CMake
where cmake >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Error: CMake not found. Please install CMake and add it to PATH.
    exit /b 1
)

REM Create build directory
if not exist build mkdir build
cd build

REM Configure with Visual Studio
cmake .. -G "Visual Studio 17 2022" -A x64

REM Build release
cmake --build . --config Release

REM Copy to bin directory
if not exist ..\..\bin mkdir ..\..\bin
copy Release\wgc-helper.exe ..\..\bin\

echo.
echo Build complete! Binary at: bin\wgc-helper.exe
