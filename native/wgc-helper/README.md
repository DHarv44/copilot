# WGC Helper - Windows Graphics Capture Helper

Native C++/WinRT executable for capturing windows using Windows Graphics Capture API.

## Requirements

- Windows 10 version 1803 (April 2018 Update) or later
- Visual Studio 2022 with C++ Desktop Development workload
- Windows 10/11 SDK
- CMake 3.20 or later

## Building

```cmd
cd native\wgc-helper
build.bat
```

The compiled `wgc-helper.exe` will be placed in `bin\wgc-helper.exe`.

## Usage

### List Windows
```cmd
wgc-helper --list
```

Returns JSON array of windows:
```json
[
  {
    "hwnd": 123456,
    "title": "Window Title",
    "pid": 7890,
    "rect": {"x": 0, "y": 0, "w": 1920, "h": 1080}
  }
]
```

### Generate Thumbnail
```cmd
wgc-helper --thumb <hwnd> <width> <height> > thumb.png
```

Outputs PNG bytes to stdout.

### Start Capture
```cmd
wgc-helper --capture <hwnd> --pipe cap_12345 --fps 30 --jpeg-q 80
```

Streams MJPEG frames over named pipe `\\.\pipe\cap_12345`.

Frame format: `uint32_le(length) + jpeg_bytes`

## Technical Details

- Uses `IGraphicsCaptureItemInterop::CreateForWindow` to capture any HWND
- Encodes frames using WIC (Windows Imaging Component)
- D3D11 hardware acceleration
- Named pipe IPC with Electron main process

## License

MIT
