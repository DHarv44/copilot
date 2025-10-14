/**
 * Popout Capture React Component
 * Allows capturing MSFS pop-out windows and overlaying them in SVG regions
 */

import React, { useState, useRef, useEffect } from 'react';
import type { PopoutKey, Binding, WindowSource } from '../types';
import { attachBySourceId, findMatchingSource } from './autoAttach';
import './PopoutCapture.css';

interface PopoutCaptureProps {
  keyId: PopoutKey;
  titleRxDefault: RegExp;
  width: number;
  height: number;
  x?: number;
  y?: number;
  onCapture?: (binding: Binding) => void;
  onRelease?: () => void;
}

interface CaptureState {
  isCapturing: boolean;
  sourceId?: string;
  sourceName?: string;
  stream?: MediaStream;
}

export const PopoutCapture: React.FC<PopoutCaptureProps> = ({
  keyId,
  titleRxDefault,
  width,
  height,
  x = 0,
  y = 0,
  onCapture,
  onRelease
}) => {
  const [state, setState] = useState<CaptureState>({ isCapturing: false });
  const [showModal, setShowModal] = useState(false);
  const [windows, setWindows] = useState<WindowSource[]>([]);
  const [filter, setFilter] = useState(titleRxDefault.source);
  const [scale, setScale] = useState(1);

  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load existing binding on mount
  useEffect(() => {
    loadExistingBinding();
  }, [keyId]);

  // Auto-attach handler (exposed via ref for parent watcher)
  useEffect(() => {
    if (videoRef.current) {
      (videoRef.current as any).attachPopout = async (
        sourceName: string,
        sourceId: string
      ) => {
        return await attachCapture(sourceId, sourceName);
      };
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCapture();
    };
  }, []);

  /**
   * Load existing binding from storage
   */
  const loadExistingBinding = async () => {
    try {
      const binding = await (window as any).popout.getBinding(keyId);
      if (binding && binding.lastSourceName) {
        // Try to find and auto-attach
        const source = await findMatchingSource(binding);
        if (source) {
          await attachCapture(source.id, source.name);
        }
      }
    } catch (err) {
      console.error('[PopoutCapture] Failed to load binding:', err);
    }
  };

  /**
   * Open capture modal and list windows
   */
  const openCaptureModal = async () => {
    try {
      const allWindows: WindowSource[] = await (window as any).popcap.listWindows();
      setWindows(allWindows);
      setShowModal(true);
    } catch (err) {
      console.error('[PopoutCapture] Failed to list windows:', err);
    }
  };

  /**
   * Attach capture to a specific source
   */
  const attachCapture = async (
    sourceId: string,
    sourceName: string
  ): Promise<boolean> => {
    if (!videoRef.current) return false;

    try {
      const success = await attachBySourceId(sourceId, videoRef.current);

      if (success) {
        const stream = videoRef.current.srcObject as MediaStream;

        // Calculate DPI scale for pixel-perfect alignment
        const videoTrack = stream.getVideoTracks()[0];
        const settings = videoTrack.getSettings();
        const videoWidth = settings.width || width;
        const videoHeight = settings.height || height;

        const scaleX = width / videoWidth;
        const scaleY = height / videoHeight;
        const computedScale = Math.min(scaleX, scaleY);

        setScale(computedScale);

        setState({
          isCapturing: true,
          sourceId,
          sourceName,
          stream
        });

        // Save binding
        const binding: Binding = {
          key: keyId,
          preferExact: sourceName,
          titleRx: titleRxDefault.source,
          lastSourceName: sourceName
        };

        await (window as any).popout.upsertBinding(binding);

        if (onCapture) {
          onCapture(binding);
        }

        setShowModal(false);
        return true;
      }

      return false;
    } catch (err) {
      console.error('[PopoutCapture] Failed to attach capture:', err);
      return false;
    }
  };

  /**
   * Stop capture and release binding
   */
  const stopCapture = () => {
    if (state.stream) {
      state.stream.getTracks().forEach(track => track.stop());
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setState({ isCapturing: false });
  };

  /**
   * Release binding (stop + remove from storage)
   */
  const releaseBinding = async () => {
    if (!confirm(`Release ${keyId} popout binding?`)) return;

    stopCapture();

    try {
      await (window as any).popout.removeBinding(keyId);
      if (onRelease) {
        onRelease();
      }
    } catch (err) {
      console.error('[PopoutCapture] Failed to remove binding:', err);
    }
  };

  /**
   * Filter windows by search term
   */
  const filteredWindows = windows.filter(w => {
    try {
      const rx = new RegExp(filter, 'i');
      return rx.test(w.name);
    } catch {
      return w.name.toLowerCase().includes(filter.toLowerCase());
    }
  });

  return (
    <div
      ref={containerRef}
      className="popout-capture-container"
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width,
        height,
        overflow: 'hidden',
        pointerEvents: state.isCapturing ? 'none' : 'auto'
      }}
    >
      {/* Video overlay (when capturing) */}
      {state.isCapturing && (
        <>
          <video
            ref={videoRef}
            className="popout-video"
            autoPlay
            muted
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'fill',
              display: 'block',
              transform: `scale(${scale})`,
              transformOrigin: 'top left'
            }}
          />
          <button
            className="popout-release-btn"
            onClick={releaseBinding}
            title="Release binding"
            style={{ pointerEvents: 'auto' }}
          >
            ✕
          </button>
        </>
      )}

      {/* Capture button (when not capturing) */}
      {!state.isCapturing && (
        <button className="popout-capture-btn" onClick={openCaptureModal}>
          Capture {keyId}
        </button>
      )}

      {/* Window selection modal */}
      {showModal && (
        <div className="popout-modal-overlay" onClick={() => setShowModal(false)}>
          <div
            className="popout-modal"
            onClick={e => e.stopPropagation()}
            style={{ maxWidth: 600 }}
          >
            <h3>Select Window to Capture</h3>

            <div className="popout-filter">
              <label>
                Filter (regex):
                <input
                  type="text"
                  value={filter}
                  onChange={e => setFilter(e.target.value)}
                  placeholder="Enter regex pattern..."
                />
              </label>
            </div>

            <div className="popout-window-list">
              {filteredWindows.length === 0 ? (
                <p className="popout-no-results">
                  No windows found matching "{filter}"
                </p>
              ) : (
                filteredWindows.map(win => (
                  <button
                    key={win.id}
                    className="popout-window-item"
                    onClick={() => attachCapture(win.id, win.name)}
                  >
                    {win.name}
                  </button>
                ))
              )}
            </div>

            <div className="popout-modal-actions">
              <button onClick={() => setShowModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PopoutCapture;
