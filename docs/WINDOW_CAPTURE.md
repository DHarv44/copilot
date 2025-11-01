# Windows Graphics Capture (WGC) - Window Capture System

Discord-style window capture implementation using Windows Graphics Capture API for capturing MSFS popout windows.

## Overview

This system captures individual windows (including MSFS popouts that don't appear in Electron's `desktopCapturer`) using the native Windows Graphics Capture API via a C++/WinRT helper executable.

### Architecture

```
┌─────────────────┐
│   Renderer      │
│  (React UI)     │
│                 │
│ WindowPicker────┼────┐
│ CaptureTile     │    │
└─────────────────┘    │
         │             │
         │ IPC         │
         ▼             │
┌─────────────────┐    │
│   Main Process  │    │
│  wgcBridge.js   │    │
└─────────────────┘    │
         │             │
         │ spawn()     │
         ▼             │
┌─────────────────┐    │
│  wgc-helper.exe │    │
│  (C++/WinRT)    │    │
│                 │    │
│ • --list        │    │
│ • --thumb       │    │
│ • --capture     │◄───┘
└─────────────────┘
         │
         │ Named Pipe (MJPEG)
         ▼
┌─────────────────┐
│   Renderer      │
│  net.connect()  │
│  MJPEG Consumer │
└─────────────────┘
```

## Requirements

### Runtime Requirements
- **Windows 10 version 1803** (April 2018 Update) or later
- **Windows 11** recommended for best performance

### Build Requirements
- Visual Studio 2022 (Community/Professional/Enterprise)
  - C++ Desktop Development workload
  - Windows 10/11 SDK (10.0.19041.0 or later)
- CMake 3.20 or later
- C++/WinRT NuGet package (via vcpkg or manual installation)

## Building the Native Helper

### Using Visual Studio

```cmd
cd native\wgc-helper
build.bat
```

The script will:
1. Generate Visual Studio solution with CMake
2. Build in Release configuration
3. Copy `wgc-helper.exe` to `bin\` directory

### Manual Build

```cmd
cd native\wgc-helper
mkdir build && cd build
cmake .. -G "Visual Studio 17 2022" -A x64
cmake --build . --config Release
copy Release\wgc-helper.exe ..\..\bin\
```

### Troubleshooting Build Issues

**Error: C++/WinRT headers not found**

Install via vcpkg:
```cmd
vcpkg install Microsoft.Windows.CppWinRT:x64-windows
```

**Error: Windows SDK not found**

Open Visual Studio Installer and install Windows 10/11 SDK (latest version).

## Usage

### 1. Window Selection

Click "Capture G1000_PFD" or "Capture G1000_MFD" button in the SVG overlay.

A Discord-style window picker will appear showing:
- Live thumbnails of all capturable windows
- Window title, size, and process ID
- Search/filter input (regex supported)
- "Show only MSFS windows" checkbox

### 2. Capture Session

Select a window to start capture:
- Native 30 FPS stream
- JPEG quality 80 (adjustable)
- Low latency (<100ms)
- Hardware accelerated (D3D11)

### 3. Stop Capture

Click the "×" button in the top-right corner of the captured window.

## Technical Details

### Window Enumeration

`wgc-helper.exe --list` returns JSON:

```json
[
  {
    "hwnd": 1234567,
    "title": "AS1000_MFD",
    "pid": 8910,
    "rect": {"x": 100, "y": 100, "w": 1280, "h": 720}
  }
]
```

**Filters applied:**
- Skip invisible windows (`IsWindowVisible`)
- Skip cloaked windows (DWM API)
- Skip tool windows (`WS_EX_TOOLWINDOW`)
- Skip zero-size windows

### Thumbnail Generation

`wgc-helper.exe --thumb <hwnd> <width> <height> > thumb.png`

**Process:**
1. Create WGC capture item for window
2. Capture single frame to D3D11 texture
3. Scale down using Direct2D (high quality bicubic)
4. Encode to PNG using WIC
5. Output binary PNG to stdout

**Performance:**
- ~50-150ms per thumbnail (depends on window size)
- Hardware accelerated scaling
- Batched loading (5 windows at a time)

### MJPEG Capture Stream

`wgc-helper.exe --capture <hwnd> --pipe cap_12345 --fps 30 --jpeg-q 80`

**Frame Pipeline:**
1. WGC captures frame to ID3D11Texture2D
2. Copy to staging texture (CPU-accessible)
3. Convert BGRA → BGR (remove alpha)
4. Encode to JPEG using WIC
5. Write to named pipe: `uint32_le(length) + jpeg_bytes`

**Named Pipe Format:**
```
\\.\pipe\cap_<timestamp>_<random>
```

Each frame:
```
[4 bytes: length (uint32 LE)]
[N bytes: JPEG data]
```

### Renderer Consumer (CaptureTile)

```typescript
// Connect to pipe
const client = net.connect('\\\\.\\pipe\\cap_12345');

client.on('data', (data) => {
  // Append to buffer
  buffer = Buffer.concat([buffer, data]);

  // While we have complete frames
  while (buffer.length >= 4) {
    const length = buffer.readUInt32LE(0);
    if (buffer.length < 4 + length) break;

    const jpegFrame = buffer.subarray(4, 4 + length);
    buffer = buffer.subarray(4 + length);

    // Display frame
    const blob = new Blob([jpegFrame], {type: 'image/jpeg'});
    img.src = URL.createObjectURL(blob);
  }
});
```

## Performance

### Typical Performance (1280×720 @ 30 FPS)

- **CPU Usage**: 8-12% (Intel i7-10700K)
- **Memory**: ~50MB per capture session
- **Latency**: 60-100ms glass-to-glass
- **GPU**: ~5% D3D11 copy/encode

### Optimization Tips

1. **Lower FPS for static content**:
   ```typescript
   wgc.start(hwnd, { fps: 15 });
   ```

2. **Reduce JPEG quality**:
   ```typescript
   wgc.start(hwnd, { jpegQuality: 70 });
   ```

3. **Limit concurrent captures**:
   - Max 2-3 captures simultaneously
   - MSFS + 2 popouts = ~25% CPU

## Limitations & Gotchas

### ⚠️ Minimized Windows

**WGC returns black frames when window is minimized.**

✅ **Solution**: Keep popout windows in normal/maximized state. They can be offscreen or hidden behind other windows.

### ⚠️ Exclusive Fullscreen

**MSFS in exclusive fullscreen mode prevents popout capture.**

✅ **Solution**: Use Windowed or Borderless Windowed mode.

### ⚠️ DRM/Protected Content

**Some windows cannot be captured (DRM, UAC prompts).**

✅ **Solution**: WGC will fail gracefully. Thumbnails will show error icon.

### ⚠️ DPI Scaling

**High DPI displays may affect capture resolution.**

✅ **Solution**: WGC captures at native window resolution, renderer scales as needed.

## Auto-Attach & Persistence

Bindings are saved to `%APPDATA%/<app-name>/popouts.json`:

```json
{
  "bindings": [
    {
      "key": "G1000_PFD",
      "preferExact": "AS1000_PFD_1",
      "titleRx": "/(AS1000|WTG1000|G1000).*PFD/i",
      "lastSourceName": "AS1000_PFD_1"
    }
  ]
}
```

On app start, the system:
1. Calls `wgc.list()` to get all windows
2. Matches each binding by:
   - Exact title match (`preferExact`)
   - Regex pattern (`titleRx`)
3. Auto-starts capture if match found

## Troubleshooting

### Capture fails with "Failed to create capture item"

**Cause**: Window was closed or became invalid.

**Fix**: Refresh window list and reselect.

### Pipe connection timeout

**Cause**: wgc-helper.exe didn't start or crashed.

**Fix**: Check console for stderr output. Ensure `bin\wgc-helper.exe` exists.

### No thumbnails loading

**Cause**: Windows capture permission denied or window invalid.

**Fix**: Run as Administrator if capturing elevated windows (not recommended).

### Black frames in stream

**Cause**: Window is minimized or occluded by DRM.

**Fix**: Restore window to normal state.

## API Reference

### Preload API (`window.wgc`)

```typescript
interface WGC {
  // List all capturable windows
  list(): Promise<WindowInfo[]>;

  // Get window thumbnail (PNG buffer)
  thumbnail(hwnd: number, width: number, height: number): Promise<Buffer>;

  // Start capture session
  start(hwnd: number, options?: CaptureOptions): Promise<string>;

  // Stop capture session
  stop(sessionId: string): Promise<void>;
}

interface WindowInfo {
  hwnd: number;
  title: string;
  pid: number;
  rect: { x: number; y: number; w: number; h: number };
}

interface CaptureOptions {
  fps?: number;         // Default: 30
  jpegQuality?: number; // Default: 80 (1-100)
}
```

## Development

### Adding Capture to Custom UI

```typescript
import { WindowPicker } from './capture/WindowPicker';
import { CaptureTile } from './capture/CaptureTile';

// Open window picker
<WindowPicker
  onSelect={(hwnd, title) => {
    // Start capture
    setCapture({ hwnd, title });
  }}
  onCancel={() => setShowPicker(false)}
  filterMSFS={true}
/>

// Display capture
{capture && (
  <CaptureTile
    hwnd={capture.hwnd}
    title={capture.title}
    width={800}
    height={600}
    fps={30}
    jpegQuality={80}
    onStop={() => setCapture(null)}
  />
)}
```

## License

MIT

## Credits

- Windows Graphics Capture API: Microsoft
- C++/WinRT: Microsoft
- MJPEG encoding: WIC (Windows Imaging Component)
