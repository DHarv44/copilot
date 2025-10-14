# MSFS Pop-out Window Capture

## Overview

The Popout Capture system allows you to capture MSFS pop-out instrument windows (e.g., G1000 PFD/MFD) and overlay them directly inside your Electron cockpit application. This provides a seamless integration where the instruments appear as part of your virtual NavBoard panel.

## Features

- **Native Window Capture**: Uses Electron's `desktopCapturer` API to capture any window on your system
- **Persistent Bindings**: Remembers which window goes where, so they auto-attach on next startup
- **Auto-Attach**: Automatically detects and attaches pop-out windows when they appear
- **No Admin Required**: Works with standard user permissions on Windows
- **Multiple Regions**: Support for multiple simultaneous captures (PFD, MFD, etc.)
- **Pixel-Perfect Scaling**: DPI-aware scaling for crisp instrument display
- **Optional Offscreen**: Can move native pop-out windows offscreen to hide them

## How It Works

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  MSFS Pop-out Window (Native)                               │
│  ┌─────────────────────────────────────────┐                │
│  │ G1000 PFD                                │                │
│  │                                          │                │
│  │  [Instrument Display]                    │                │
│  │                                          │                │
│  └─────────────────────────────────────────┘                │
└─────────────────────────────────────────────────────────────┘
                     │
                     │ desktopCapturer
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  Electron Cockpit App                                        │
│  ┌─────────────────────────────────────────┐                │
│  │ NavBoard SVG                             │                │
│  │  ┌─────────────────────────────┐         │                │
│  │  │ [Video Overlay - PFD]       │         │                │
│  │  │                             │         │                │
│  │  │  (Captured Stream)          │         │                │
│  │  │                             │         │                │
│  │  └─────────────────────────────┘         │                │
│  └─────────────────────────────────────────┘                │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Initial Capture**: User clicks "Capture" button → Selects window from list → Stream starts
2. **Binding Saved**: Window title stored in `popouts.json` with regex pattern
3. **Next Launch**: Auto-attach watcher polls `desktopCapturer` every 250ms
4. **Auto-Attach**: When matching window appears, automatically starts capture
5. **Window Closed**: Detects when source disappears, stops stream, shows Capture button again

## Usage

### Basic Usage

1. **Start MSFS and pop out instruments** (e.g., right-click G1000 PFD → "Undock as panel")

2. **Navigate to Cockpit view** in your Electron app

3. **Click "Capture PFD"** button in the PFD region

4. **Select the window** from the list (e.g., "Microsoft Flight Simulator - G1000 PFD")

5. **Instrument appears** in the region, native window can be moved offscreen

### Auto-Attach (Next Session)

On subsequent launches:

1. Start Electron app first
2. Launch MSFS and pop out instruments
3. Instruments automatically attach to saved regions
4. No manual intervention required

### Release Binding

To unbind an instrument:

1. Click the **✕** button in the top-right corner of the captured region
2. Confirm the release
3. Binding removed from storage, region returns to Capture state

## Configuration

### Adding Popout Regions

To add a new popout capture region in your React component:

```tsx
import { PopoutCapture } from './popouts/PopoutCapture';

function CockpitView() {
  return (
    <div>
      <PopoutCapture
        keyId="PFD"
        titleRxDefault={/G1000.*PFD/i}
        width={600}
        height={400}
        x={100}
        y={50}
      />

      <PopoutCapture
        keyId="MFD"
        titleRxDefault={/G1000.*MFD/i}
        width={600}
        height={400}
        x={750}
        y={50}
      />
    </div>
  );
}
```

### Component Props

- `keyId` (string): Logical identifier (e.g., "PFD", "MFD", "COM1")
- `titleRxDefault` (RegExp): Default regex pattern to filter windows
- `width` (number): Region width in pixels
- `height` (number): Region height in pixels
- `x` (number): X position (optional)
- `y` (number): Y position (optional)
- `onCapture` (function): Callback when capture starts (optional)
- `onRelease` (function): Callback when binding released (optional)

### Storage Location

Bindings are persisted at:
```
%APPDATA%\<your-app-name>\popouts.json
```

Example content:
```json
{
  "bindings": [
    {
      "key": "PFD",
      "preferExact": "Microsoft Flight Simulator - G1000 PFD",
      "titleRx": "G1000.*PFD",
      "lastSourceName": "Microsoft Flight Simulator - G1000 PFD"
    }
  ]
}
```

## Advanced Features

### Moving Windows Offscreen

To hide the native pop-out window after capture:

```typescript
// After successful capture
await (window as any).winMove.moveOffscreen(
  'Microsoft Flight Simulator - G1000 PFD',
  10000,  // x (far right)
  0,      // y
  600,    // width
  400     // height
);
```

### Custom Auto-Attach Logic

You can implement custom auto-attach behavior:

```typescript
import { startAutoAttach } from './popouts/autoAttach';

const bindings = await (window as any).popout.loadRegistry();

const stopWatcher = startAutoAttach(
  bindings,
  async (key, sourceName, sourceId) => {
    // Custom attach logic
    console.log('Attaching:', key, sourceName);
    return true; // Return true if attached successfully
  },
  (key) => {
    // Custom detach logic
    console.log('Detaching:', key);
  }
);

// Later: stop watching
stopWatcher();
```

### Manual Window Management

```typescript
// List all windows
const windows = await (window as any).winMove.list();

// Get window bounds
const bounds = await (window as any).winMove.getBounds('G1000 PFD');

// Move to visible area
await (window as any).winMove.moveToVisible('G1000 PFD', 100, 100);
```

## Limitations

### Technical Constraints

1. **Window Title Matching**: Relies on window titles which may vary by aircraft or MSFS version
2. **Performance**: Capturing multiple high-resolution windows may impact FPS
3. **Windows Only**: `node-window-manager` only works on Windows
4. **No Transparency**: Cannot capture transparent overlays (captures opaque window content)
5. **Polling Interval**: 250ms polling may have slight delay detecting new windows

### Best Practices

- **Pop out before starting app**: Better auto-attach reliability
- **Consistent titles**: Use same aircraft/instruments for reliable matching
- **Resolution matching**: Set pop-out window size to match capture region for 1:1 scaling
- **One pop-out per region**: Don't try to capture the same window in multiple regions
- **Close properly**: Use the ✕ button to release bindings cleanly

### Troubleshooting

#### Capture button doesn't show windows
- Ensure MSFS pop-out is actually undocked (separate window)
- Check DevTools console for errors
- Try restarting Electron app

#### Auto-attach not working
- Verify binding exists: check `%APPDATA%\<app>\popouts.json`
- Ensure window title matches the regex pattern
- Check console for `[autoAttach]` logs

#### Video is stretched/distorted
- Set pop-out window size to match capture region dimensions
- Check DPI scaling settings in Windows

#### Window movement fails
- Verify `node-window-manager` is installed
- Check that window title is exact match
- Try using partial title match

## API Reference

### Window API (Preload Bridge)

#### `window.popcap`

```typescript
interface PopcapAPI {
  listWindows(): Promise<WindowSource[]>;
  buildConstraints(id: string): Promise<MediaConstraints>;
}
```

#### `window.popout`

```typescript
interface PopoutAPI {
  loadRegistry(): Promise<Registry>;
  saveRegistry(registry: Registry): Promise<void>;
  upsertBinding(binding: Binding): Promise<void>;
  removeBinding(key: string): Promise<void>;
  getBinding(key: string): Promise<Binding | undefined>;
}
```

#### `window.winMove`

```typescript
interface WinMoveAPI {
  moveOffscreen(title: string, x?: number, y?: number, width?: number, height?: number): Promise<boolean>;
  moveToVisible(title: string, x?: number, y?: number): Promise<boolean>;
  getBounds(title: string): Promise<{x: number, y: number, width: number, height: number} | null>;
  list(): Promise<string[]>;
}
```

## Security Considerations

- **Screen Capture Permission**: Electron will prompt for screen recording permission on first use
- **User Consent**: Always show what windows are being captured
- **No Automation**: Does not interact with MSFS directly, only captures display
- **Local Storage**: All bindings stored locally, no network transmission

## Future Enhancements

Possible improvements:

- **Touch pass-through**: Forward clicks to native window for interaction
- **OCR integration**: Parse instrument values for data extraction
- **Multi-monitor**: Better handling of windows on different displays
- **Hotkeys**: Keyboard shortcuts for quick capture/release
- **Templates**: Pre-configured bindings for common aircraft

## Contributing

To extend the popout system:

1. Add new capture regions in your React components
2. Customize title matching patterns in `titleRxDefault`
3. Implement custom attach/detach callbacks
4. Extend the storage schema for additional metadata

See source code in:
- `src/renderer/popouts/PopoutCapture.tsx` - Main component
- `src/renderer/popouts/autoAttach.ts` - Auto-attach logic
- `src/preload/popcap.ts` - Preload bridge
- `src/main/popoutStore.ts` - Persistence layer
- `src/main/winMove.ts` - Window positioning

---

**Built with Electron desktopCapturer + React + TypeScript**
