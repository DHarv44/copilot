# Popout Capture System

Quick reference for the MSFS popout window capture system.

## Files

- **PopoutCapture.tsx** - Main React component for capturing individual windows
- **PopoutManager.tsx** - Orchestrator for managing multiple captures with auto-attach
- **autoAttach.ts** - Auto-attach watcher and utility functions
- **example.tsx** - Integration examples and usage patterns
- **PopoutCapture.css** - Component styles

## Quick Start

### 1. Individual Capture

```tsx
import { PopoutCapture } from './popouts/PopoutCapture';

<PopoutCapture
  keyId="PFD"
  titleRxDefault={/G1000.*PFD/i}
  width={600}
  height={400}
  x={50}
  y={100}
/>
```

### 2. Multiple Captures with Auto-Attach

```tsx
import { PopoutManager } from './popouts/PopoutManager';

<PopoutManager
  autoAttachEnabled={true}
  regions={[
    { key: 'PFD', titleRx: /G1000.*PFD/i, x: 50, y: 100, width: 600, height: 400 },
    { key: 'MFD', titleRx: /G1000.*MFD/i, x: 700, y: 100, width: 600, height: 400 }
  ]}
/>
```

### 3. With Window Positioning

```tsx
<PopoutCapture
  keyId="PFD"
  titleRxDefault={/G1000.*PFD/i}
  width={600}
  height={400}
  onCapture={async (binding) => {
    // Move window offscreen after capture
    await window.winMove.moveOffscreen(
      binding.preferExact || '',
      10000, 0, 600, 400
    );
  }}
/>
```

## Common Patterns

### G1000 (Cessna 172, Baron, etc.)
```typescript
titleRx: /G1000.*(PFD|MFD)/i
```

### G3000 (TBM 930, SR22, etc.)
```typescript
titleRx: /G3000.*(PFD|MFD)/i
```

### Airliner FMC
```typescript
titleRx: /FMC|CDU/i
```

### Specific Window
```typescript
preferExact: "Microsoft Flight Simulator - G1000 PFD"
```

## API

### Component Props

**PopoutCapture**
- `keyId: string` - Unique identifier
- `titleRxDefault: RegExp` - Window title pattern
- `width: number` - Region width
- `height: number` - Region height
- `x?: number` - X position
- `y?: number` - Y position
- `onCapture?: (binding: Binding) => void` - Capture callback
- `onRelease?: () => void` - Release callback

**PopoutManager**
- `regions: PopoutRegion[]` - Array of capture regions
- `autoAttachEnabled?: boolean` - Enable auto-attach (default: true)

### Window APIs

**window.popcap**
- `listWindows()` - Get all capturable windows
- `buildConstraints(id)` - Build media constraints for capture

**window.popout**
- `loadRegistry()` - Load saved bindings
- `upsertBinding(binding)` - Save/update binding
- `removeBinding(key)` - Delete binding
- `getBinding(key)` - Get specific binding

**window.winMove**
- `moveOffscreen(title, x, y, w, h)` - Move window offscreen
- `moveToVisible(title, x, y)` - Move window to visible area
- `getBounds(title)` - Get window position/size
- `list()` - List all window titles

## Storage

Bindings saved at: `%APPDATA%/<app-name>/popouts.json`

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

## Tips

1. **Pop out windows first** - Better reliability for auto-attach
2. **Match dimensions** - Set pop-out size to region size for 1:1 scaling
3. **Test regex** - Use DevTools console to test title patterns
4. **Move offscreen** - Hide native windows after capture for cleaner UX
5. **Use PopoutManager** - For multiple regions with auto-attach

## Troubleshooting

**No windows listed**
- Ensure window is actually undocked (separate process)
- Check if MSFS is running

**Auto-attach not working**
- Verify binding exists in registry
- Check title pattern matches window name
- Enable console logs to see watcher activity

**Video stretched**
- Match pop-out window size to capture region dimensions
- Check Windows DPI scaling settings

## See Also

- [Full Documentation](../../../docs/POPUPS.md)
- [Examples](./example.tsx)
- [Type Definitions](../types.ts)
