/**
 * Capture Tile - Displays MJPEG stream from WGC helper over named pipe
 */

import React, { useState, useEffect, useRef } from 'react';
import './CaptureTile.css';

interface CaptureTileProps {
  hwnd: number;
  title: string;
  width: number;
  height: number;
  x?: number;
  y?: number;
  fps?: number;
  jpegQuality?: number;
  onStop?: () => void;
}

export const CaptureTile: React.FC<CaptureTileProps> = ({
  hwnd,
  title,
  width,
  height,
  x = 0,
  y = 0,
  fps = 30,
  jpegQuality = 80,
  onStop
}) => {
  const [isCapturing, setIsCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pipeName, setPipeName] = useState<string | null>(null);

  const imgRef = useRef<HTMLImageElement>(null);
  const pipeRef = useRef<any>(null);
  const bufferRef = useRef<Uint8Array>(new Uint8Array(0));

  useEffect(() => {
    startCapture();
    return () => {
      stopCapture();
    };
  }, [hwnd]);

  const startCapture = async () => {
    try {
      console.log('[CaptureTile] Starting capture for HWND', hwnd);

      const pipe = await (window as any).wgc.start(hwnd, { fps, jpegQuality });
      setPipeName(pipe);

      // Connect to named pipe
      connectToPipe(pipe);

      setIsCapturing(true);
    } catch (err: any) {
      console.error('[CaptureTile] Failed to start capture:', err);
      setError(err.message || 'Failed to start capture');
    }
  };

  const connectToPipe = (pipe: string) => {
    const pipePath = `\\\\.\\pipe\\${pipe}`;
    console.log('[CaptureTile] Connecting to pipe:', pipePath);

    // Wait a bit for pipe to be created
    setTimeout(() => {
      const client = (window as any).wgc.connectPipe(pipePath);

      client.on('connect', () => {
        console.log('[CaptureTile] Connected to pipe');
      });

      client.on('data', (data: Uint8Array) => {
        handlePipeData(data);
      });

      client.on('error', (errMsg: string) => {
        console.error('[CaptureTile] Pipe error:', errMsg);
        setError(`Pipe error: ${errMsg}`);
        setIsCapturing(false);
      });

      client.on('close', () => {
        console.log('[CaptureTile] Pipe closed');
        setIsCapturing(false);
      });

      pipeRef.current = client;
    }, 500);
  };

  const handlePipeData = (data: any) => {
    // Convert Node Buffer to Uint8Array if needed
    const uint8Data = data instanceof Uint8Array ? data : new Uint8Array(data);

    // Append to buffer
    const newBuffer = new Uint8Array(bufferRef.current.length + uint8Data.length);
    newBuffer.set(bufferRef.current, 0);
    newBuffer.set(uint8Data, bufferRef.current.length);
    bufferRef.current = newBuffer;

    // Process frames
    while (bufferRef.current.length >= 4) {
      // Read frame length (uint32 LE)
      const view = new DataView(bufferRef.current.buffer, bufferRef.current.byteOffset, bufferRef.current.byteLength);
      const frameLength = view.getUint32(0, true); // true = little endian

      // Check if we have the full frame
      if (bufferRef.current.length < 4 + frameLength) {
        break; // Wait for more data
      }

      // Extract frame
      const frameData = bufferRef.current.slice(4, 4 + frameLength);
      bufferRef.current = bufferRef.current.slice(4 + frameLength);

      // Display frame
      displayFrame(frameData);
    }
  };

  const displayFrame = (jpegData: Uint8Array) => {
    if (!imgRef.current) return;

    try {
      // Convert to blob and object URL
      const blob = new Blob([jpegData], { type: 'image/jpeg' });
      const url = URL.createObjectURL(blob);

      // Revoke old URL
      if (imgRef.current.src && imgRef.current.src.startsWith('blob:')) {
        URL.revokeObjectURL(imgRef.current.src);
      }

      imgRef.current.src = url;
    } catch (err) {
      console.error('[CaptureTile] Failed to display frame:', err);
    }
  };

  const stopCapture = async () => {
    if (pipeRef.current) {
      pipeRef.current.destroy();
      pipeRef.current = null;
    }

    if (pipeName) {
      try {
        await (window as any).wgc.stop(pipeName);
      } catch (err) {
        console.error('[CaptureTile] Failed to stop capture:', err);
      }
    }

    setIsCapturing(false);

    if (onStop) {
      onStop();
    }
  };

  return (
    <div
      className="capture-tile"
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width,
        height,
        overflow: 'hidden'
      }}
    >
      {error ? (
        <div className="capture-tile-error">
          <div className="capture-tile-error-icon">⚠</div>
          <div className="capture-tile-error-message">{error}</div>
          <button className="capture-tile-retry" onClick={startCapture}>
            Retry
          </button>
        </div>
      ) : isCapturing ? (
        <>
          <img
            ref={imgRef}
            className="capture-tile-img"
            alt={title}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'fill',
              display: 'block'
            }}
          />
          <button
            className="capture-tile-detach"
            onClick={stopCapture}
            title="Stop capture"
          >
            ×
          </button>
        </>
      ) : (
        <div className="capture-tile-loading">
          <div className="capture-tile-spinner"></div>
          <div>Starting capture...</div>
        </div>
      )}
    </div>
  );
};

export default CaptureTile;
