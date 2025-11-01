@echo off
echo Building wgc-helper...

cd /d "%~dp0"

if not exist build mkdir build
cd build

"C:\Program Files\CMake\bin\cmake.exe" .. -G "Visual Studio 17 2022" -A x64
if %ERRORLEVEL% NEQ 0 (
    echo CMake configure failed
    pause
    exit /b 1
)

"C:\Program Files\CMake\bin\cmake.exe" --build . --config Release
if %ERRORLEVEL% NEQ 0 (
    echo Build failed
    pause
    exit /b 1
)

if not exist ..\..\bin mkdir ..\..\bin
copy Release\wgc-helper.exe ..\..\bin\

echo.
echo Build complete! Binary at: bin\wgc-helper.exe
pause
