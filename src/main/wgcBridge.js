/**
 * Windows Graphics Capture Bridge
 * Spawns wgc-helper.exe and manages capture sessions
 */

const { spawn } = require('child_process');
const path = require('path');
const { app } = require('electron');

// Path to wgc-helper.exe (relative to project root, or use app.getAppPath() in production)
const WGC_HELPER_PATH = path.join(__dirname, '..', '..', 'bin', 'Release', 'wgc-helper.exe');

// Active capture processes
const captureSessions = new Map();

/**
 * List all capturable windows
 * @returns {Promise<Array>} Array of window info objects
 */
async function listWindows() {
  return new Promise((resolve, reject) => {
    const proc = spawn(WGC_HELPER_PATH, ['--list']);

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`wgc-helper --list failed: ${stderr}`));
        return;
      }

      try {
        const windows = JSON.parse(stdout);
        resolve(windows);
      } catch (err) {
        reject(new Error(`Failed to parse window list: ${err.message}`));
      }
    });

    proc.on('error', (err) => {
      reject(new Error(`Failed to spawn wgc-helper: ${err.message}`));
    });
  });
}

/**
 * Generate window thumbnail
 * @param {number} hwnd Window handle
 * @param {number} width Max thumbnail width
 * @param {number} height Max thumbnail height
 * @returns {Promise<Buffer>} PNG image data
 */
async function getThumbnail(hwnd, width, height) {
  return new Promise((resolve, reject) => {
    const proc = spawn(WGC_HELPER_PATH, [
      '--thumb',
      hwnd.toString(),
      width.toString(),
      height.toString()
    ]);

    const chunks = [];
    let stderr = '';

    proc.stdout.on('data', (data) => {
      chunks.push(data);
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`wgc-helper --thumb failed: ${stderr}`));
        return;
      }

      const pngData = Buffer.concat(chunks);
      resolve(pngData);
    });

    proc.on('error', (err) => {
      reject(new Error(`Failed to spawn wgc-helper: ${err.message}`));
    });
  });
}

/**
 * Start capture session
 * @param {number} hwnd Window handle
 * @param {object} options Capture options
 * @returns {Promise<string>} Capture session ID (pipe name)
 */
async function startCapture(hwnd, options = {}) {
  const {
    fps = 30,
    jpegQuality = 80
  } = options;

  const sessionId = `cap_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const pipeName = sessionId;

  return new Promise((resolve, reject) => {
    const args = [
      '--capture',
      hwnd.toString(),
      '--pipe',
      pipeName,
      '--fps',
      fps.toString(),
      '--jpeg-q',
      jpegQuality.toString()
    ];

    console.log('[wgc] Starting capture:', WGC_HELPER_PATH, args.join(' '));

    const proc = spawn(WGC_HELPER_PATH, args, {
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let stderr = '';

    proc.stderr.on('data', (data) => {
      const msg = data.toString();
      stderr += msg;
      console.log('[wgc-helper]', msg.trim());

      // Check if pipe connected
      if (msg.includes('Pipe connected') || msg.includes('Capture session started')) {
        // Session started successfully
        if (!captureSessions.has(sessionId)) {
          captureSessions.set(sessionId, {
            proc,
            hwnd,
            pipeName,
            startTime: Date.now()
          });
          resolve(pipeName);
        }
      }
    });

    proc.on('close', (code) => {
      console.log('[wgc] Capture session ended:', sessionId, 'code:', code);
      captureSessions.delete(sessionId);
    });

    proc.on('error', (err) => {
      console.error('[wgc] Capture process error:', err);
      captureSessions.delete(sessionId);
      reject(new Error(`Failed to start capture: ${err.message}`));
    });

    // Timeout if capture doesn't start in 5 seconds
    setTimeout(() => {
      if (!captureSessions.has(sessionId)) {
        proc.kill();
        reject(new Error(`Capture session timeout: ${stderr}`));
      }
    }, 5000);
  });
}

/**
 * Stop capture session
 * @param {string} sessionId Session ID (pipe name)
 */
function stopCapture(sessionId) {
  const session = captureSessions.get(sessionId);
  if (!session) {
    console.warn('[wgc] Session not found:', sessionId);
    return;
  }

  console.log('[wgc] Stopping capture session:', sessionId);
  session.proc.kill();
  captureSessions.delete(sessionId);
}

/**
 * Stop all capture sessions
 */
function stopAllCaptures() {
  console.log('[wgc] Stopping all capture sessions');
  for (const [sessionId, session] of captureSessions.entries()) {
    session.proc.kill();
  }
  captureSessions.clear();
}

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
async function positionWindow(hwnd, x, y, width, height, topmost = false, borderless = false) {
  return new Promise((resolve, reject) => {
    const args = [
      '--position',
      hwnd.toString(),
      x.toString(),
      y.toString(),
      width.toString(),
      height.toString()
    ];

    if (topmost) args.push('--topmost');
    if (borderless) args.push('--borderless');

    const proc = spawn(WGC_HELPER_PATH, args);

    let stderr = '';

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Failed to position window: ${stderr}`));
        return;
      }
      resolve();
    });

    proc.on('error', (err) => {
      reject(new Error(`Failed to spawn wgc-helper: ${err.message}`));
    });
  });
}

// Clean up on app quit
app.on('before-quit', () => {
  stopAllCaptures();
});

module.exports = {
  listWindows,
  getThumbnail,
  startCapture,
  stopCapture,
  stopAllCaptures,
  positionWindow
};
