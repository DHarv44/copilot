cmake_minimum_required(VERSION 3.20)
project(wgc-helper CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Windows 10 SDK required for WinRT/WGC
if(NOT WIN32)
    message(FATAL_ERROR "This project requires Windows")
endif()

# Output directory
set(CMAKE_RUNTIME_OUTPUT_DIRECTORY ${CMAKE_SOURCE_DIR}/../../bin)

# Source files
add_executable(wgc-helper
    src/main.cpp
    src/window_enum.cpp
    src/thumbnail.cpp
    src/capture.cpp
    src/utils.cpp
)

# Include directories
target_include_directories(wgc-helper PRIVATE
    ${CMAKE_SOURCE_DIR}/include
)

# Link Windows libraries
target_link_libraries(wgc-helper PRIVATE
    windowsapp
    dwmapi
    d3d11
    dxgi
    windowscodecs
    mfplat
    mfreadwrite
    mfuuid
)

# Enable WinRT
set_target_properties(wgc-helper PROPERTIES
    VS_GLOBAL_RootNamespace wgc-helper
)

# C++/WinRT NuGet package (automatic via vcpkg or manual)
# Alternatively: install via vcpkg install Microsoft.Windows.CppWinRT
