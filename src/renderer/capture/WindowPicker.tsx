/**
 * Window Picker - Discord-style window selection grid
 */

import React, { useState, useEffect } from 'react';
import './WindowPicker.css';

interface WindowInfo {
  hwnd: number;
  title: string;
  pid: number;
  rect: { x: number; y: number; w: number; h: number };
}

interface WindowPickerProps {
  onSelect: (hwnd: number, title: string) => void;
  onCancel: () => void;
  filterMSFS?: boolean;
}

export const WindowPicker: React.FC<WindowPickerProps> = ({
  onSelect,
  onCancel,
  filterMSFS = false
}) => {
  const [windows, setWindows] = useState<WindowInfo[]>([]);
  const [thumbnails, setThumbnails] = useState<Map<number, string>>(new Map());
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [showOnlyMSFS, setShowOnlyMSFS] = useState(filterMSFS);

  const loadWindows = async () => {
    setLoading(true);
    try {
      const allWindows: WindowInfo[] = await (window as any).wgc.list();
      console.log('[WindowPicker] Found windows:', allWindows.length);

      // Filter out invalid windows
      const validWindows = allWindows.filter(w => w.title && w.title.trim().length > 0);

      setWindows(validWindows);

      // Load thumbnails in parallel (batched)
      loadThumbnails(validWindows);
    } catch (err) {
      console.error('[WindowPicker] Failed to list windows:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadThumbnails = async (windowList: WindowInfo[]) => {
    const thumbMap = new Map<number, string>();
    const THUMB_WIDTH = 320;
    const THUMB_HEIGHT = 180;

    // Load thumbnails in batches of 5
    for (let i = 0; i < windowList.length; i += 5) {
      const batch = windowList.slice(i, i + 5);

      const promises = batch.map(async (win) => {
        try {
          const pngBuffer = await (window as any).wgc.thumbnail(win.hwnd, THUMB_WIDTH, THUMB_HEIGHT);

          // Convert buffer to base64 data URL
          // pngBuffer comes from Electron IPC as an object with data array or ArrayBuffer
          let uint8Array: Uint8Array;
          if (pngBuffer.data) {
            // Node.js Buffer serialized as {type: 'Buffer', data: [...]}
            uint8Array = new Uint8Array(pngBuffer.data);
          } else if (pngBuffer instanceof ArrayBuffer) {
            uint8Array = new Uint8Array(pngBuffer);
          } else if (pngBuffer instanceof Uint8Array) {
            uint8Array = pngBuffer;
          } else {
            throw new Error('Unexpected buffer format');
          }

          // Convert to base64
          const base64 = btoa(
            Array.from(uint8Array).map(byte => String.fromCharCode(byte)).join('')
          );
          const dataUrl = `data:image/png;base64,${base64}`;

          thumbMap.set(win.hwnd, dataUrl);
        } catch (err) {
          console.warn(`[WindowPicker] Failed to load thumbnail for ${win.title}:`, err);
          thumbMap.set(win.hwnd, ''); // Placeholder
        }
      });

      await Promise.allSettled(promises);

      // Update state after each batch
      setThumbnails(new Map(thumbMap));
    }
  };

  useEffect(() => {
    loadWindows();
  }, []);

  // Filter windows
  const filteredWindows = windows.filter(w => {
    // MSFS filter
    if (showOnlyMSFS) {
      const msfsRegex = /Flight.*Simulator|MSFS|AS1000|WTG1000|G1000/i;
      if (!msfsRegex.test(w.title)) {
        return false;
      }
    }

    // Search filter
    if (filter) {
      try {
        const regex = new RegExp(filter, 'i');
        return regex.test(w.title);
      } catch {
        return w.title.toLowerCase().includes(filter.toLowerCase());
      }
    }

    return true;
  });

  return (
    <div className="window-picker-overlay" onClick={onCancel}>
      <div className="window-picker-modal" onClick={e => e.stopPropagation()}>
        <div className="window-picker-header">
          <h2>Select Window to Capture</h2>
          <button className="window-picker-close" onClick={onCancel}>
            ×
          </button>
        </div>

        <div className="window-picker-toolbar">
          <input
            type="text"
            className="window-picker-search"
            placeholder="Filter by title (regex supported)..."
            value={filter}
            onChange={e => setFilter(e.target.value)}
          />

          <label className="window-picker-checkbox">
            <input
              type="checkbox"
              checked={showOnlyMSFS}
              onChange={e => setShowOnlyMSFS(e.target.checked)}
            />
            Show only MSFS windows
          </label>

          <button className="window-picker-refresh" onClick={loadWindows} disabled={loading}>
            {loading ? 'Loading...' : '🔄 Refresh'}
          </button>
        </div>

        <div className="window-picker-grid">
          {filteredWindows.length === 0 ? (
            <div className="window-picker-empty">
              {loading ? 'Loading windows...' : `No windows found matching "${filter}"`}
            </div>
          ) : (
            filteredWindows.map(win => (
              <div
                key={win.hwnd}
                className="window-picker-card"
                onClick={() => onSelect(win.hwnd, win.title)}
                title={`PID: ${win.pid} | HWND: ${win.hwnd}\n${win.rect.w}×${win.rect.h}`}
              >
                <div className="window-picker-thumbnail">
                  {thumbnails.has(win.hwnd) ? (
                    thumbnails.get(win.hwnd) ? (
                      <img src={thumbnails.get(win.hwnd)} alt={win.title} />
                    ) : (
                      <div className="window-picker-thumb-error">✕</div>
                    )
                  ) : (
                    <div className="window-picker-thumb-loading">...</div>
                  )}
                </div>
                <div className="window-picker-title">{win.title}</div>
                <div className="window-picker-info">
                  {win.rect.w}×{win.rect.h} • PID {win.pid}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="window-picker-footer">
          <div className="window-picker-count">
            {filteredWindows.length} of {windows.length} windows
          </div>
          <button className="window-picker-cancel" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default WindowPicker;
