/**
 * WGC Preload Bridge
 * Exposes Windows Graphics Capture API to renderer
 */

const { contextBridge, ipcRenderer } = require('electron');
const net = require('net');

contextBridge.exposeInMainWorld('wgc', {
  /**
   * List all capturable windows
   * @returns {Promise<Array<{hwnd: number, title: string, pid: number, rect: {x: number, y: number, w: number, h: number}}>>}
   */
  list: () => ipcRenderer.invoke('wgc:list'),

  /**
   * Get window thumbnail
   * @param {number} hwnd Window handle
   * @param {number} width Max width
   * @param {number} height Max height
   * @returns {Promise<Buffer>} PNG image data
   */
  thumbnail: (hwnd, width, height) => ipcRenderer.invoke('wgc:thumb', { hwnd, width, height }),

  /**
   * Start capture session
   * @param {number} hwnd Window handle
   * @param {object} options Capture options {fps?: number, jpegQuality?: number}
   * @returns {Promise<string>} Pipe name for consuming stream
   */
  start: (hwnd, options) => ipcRenderer.invoke('wgc:start', { hwnd, options }),

  /**
   * Stop capture session
   * @param {string} id Session ID (pipe name)
   */
  stop: (id) => ipcRenderer.invoke('wgc:stop', { id }),

  /**
   * Position and resize a window
   * @param {number} hwnd Window handle
   * @param {number} x X position
   * @param {number} y Y position
   * @param {number} width Window width
   * @param {number} height Window height
   * @param {boolean} topmost Make window always on top
   * @param {boolean} borderless Remove window borders
   * @returns {Promise<void>}
   */
  position: (hwnd, x, y, width, height, topmost = false, borderless = false) =>
    ipcRenderer.invoke('wgc:position', { hwnd, x, y, width, height, topmost, borderless }),

  /**
   * Connect to named pipe (exposes net.connect for renderer)
   * @param {string} pipePath Path to named pipe
   * @returns {object} Pipe client interface
   */
  connectPipe: (pipePath) => {
    const client = net.connect(pipePath);
    const handlers = {
      connect: null,
      data: null,
      error: null,
      close: null
    };

    client.on('connect', () => handlers.connect?.());
    client.on('data', (data) => handlers.data?.(new Uint8Array(data)));
    client.on('error', (err) => handlers.error?.(err.message));
    client.on('close', () => handlers.close?.());

    return {
      on: (event, callback) => {
        handlers[event] = callback;
      },
      destroy: () => client.destroy()
    };
  }
});

console.log('[preload] WGC bridge ready');
