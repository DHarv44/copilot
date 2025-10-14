/**
 * Popout Manager - Orchestrates multiple popout captures with auto-attach
 * Example integration component
 */

import React, { useEffect, useRef, useState } from 'react';
import { PopoutCapture } from './PopoutCapture';
import { startAutoAttach } from './autoAttach';
import type { Registry, Binding } from '../types';

interface PopoutRegion {
  key: string;
  titleRx: RegExp;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface PopoutManagerProps {
  regions: PopoutRegion[];
  autoAttachEnabled?: boolean;
}

/**
 * Manages multiple popout capture regions with auto-attach
 */
export const PopoutManager: React.FC<PopoutManagerProps> = ({
  regions,
  autoAttachEnabled = true
}) => {
  const [registry, setRegistry] = useState<Registry>([]);
  const videoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
  const stopWatcherRef = useRef<(() => void) | null>(null);

  // Load registry on mount
  useEffect(() => {
    loadRegistry();
  }, []);

  // Start auto-attach watcher
  useEffect(() => {
    if (!autoAttachEnabled || registry.length === 0) return;

    console.log('[PopoutManager] Starting auto-attach watcher with', registry.length, 'bindings');

    const stop = startAutoAttach(
      registry,
      async (key, sourceName, sourceId) => {
        const video = videoRefs.current.get(key);
        if (!video) {
          console.warn('[PopoutManager] No video element for key:', key);
          return false;
        }

        // Call the video's custom attach method (set by PopoutCapture)
        if (typeof (video as any).attachPopout === 'function') {
          const success = await (video as any).attachPopout(sourceName, sourceId);
          if (success) {
            console.log('[PopoutManager] Auto-attached:', key, '→', sourceName);
          }
          return success;
        }

        return false;
      },
      (key) => {
        console.log('[PopoutManager] Auto-detached:', key);
      }
    );

    stopWatcherRef.current = stop;

    return () => {
      if (stopWatcherRef.current) {
        stopWatcherRef.current();
        stopWatcherRef.current = null;
      }
    };
  }, [autoAttachEnabled, registry]);

  /**
   * Load registry from storage
   */
  const loadRegistry = async () => {
    try {
      const loaded = await window.popout.loadRegistry();
      setRegistry(loaded);
      console.log('[PopoutManager] Loaded registry:', loaded);
    } catch (err) {
      console.error('[PopoutManager] Failed to load registry:', err);
    }
  };

  /**
   * Handle capture event
   */
  const handleCapture = async (binding: Binding) => {
    console.log('[PopoutManager] Captured:', binding.key);
    await loadRegistry(); // Reload to get updated bindings
  };

  /**
   * Handle release event
   */
  const handleRelease = async () => {
    console.log('[PopoutManager] Released binding');
    await loadRegistry(); // Reload to get updated bindings
  };

  /**
   * Register video ref for auto-attach
   */
  const registerVideoRef = (key: string, video: HTMLVideoElement | null) => {
    if (video) {
      videoRefs.current.set(key, video);
    } else {
      videoRefs.current.delete(key);
    }
  };

  return (
    <div className="popout-manager">
      {regions.map(region => (
        <div key={region.key} style={{ position: 'relative' }}>
          <PopoutCapture
            keyId={region.key}
            titleRxDefault={region.titleRx}
            width={region.width}
            height={region.height}
            x={region.x}
            y={region.y}
            onCapture={handleCapture}
            onRelease={handleRelease}
          />
        </div>
      ))}

      {/* Debug info */}
      {process.env.NODE_ENV === 'development' && (
        <div
          style={{
            position: 'fixed',
            bottom: 10,
            right: 10,
            background: 'rgba(0,0,0,0.8)',
            color: '#0f0',
            padding: 10,
            fontSize: 11,
            fontFamily: 'monospace',
            borderRadius: 4,
            maxWidth: 300
          }}
        >
          <div>Auto-attach: {autoAttachEnabled ? 'ON' : 'OFF'}</div>
          <div>Bindings: {registry.length}</div>
          <div>Regions: {regions.length}</div>
          <div style={{ marginTop: 5 }}>
            {registry.map(b => (
              <div key={b.key}>
                {b.key}: {b.preferExact || b.titleRx}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PopoutManager;
