'use strict';

// Guard: ensure we're running inside Electron, not Node
if (!process.versions.electron) {
  console.error('✗ Not running inside Electron – you launched Node. Start with "electron ." or "npm start"');
  process.exit(1);
}

const log = require('./logger');
console.log = log.log;
console.warn = log.warn;
console.error = log.error;

process.on('uncaughtException', (err) => {
  log.error('[uncaught]', err);
});

process.on('unhandledRejection', (reason) => {
  log.error('[unhandled]', reason);
});

const electron = require('electron');
const { ipcMain, BrowserWindow, app } = electron;
const path = require('path');

log.log('[diag] ✓ Running inside Electron v' + process.versions.electron);
log.log('[diag] electron type:', typeof electron);
log.log('[diag] electron.app type:', typeof electron.app);

const electronApp = app;

// Enable hot reload in development
if (process.env.NODE_ENV !== 'production') {
  try {
    require('electron-reloader')(module, {
      debug: true,
      watchRenderer: true
    });
    log.log('[main] Hot reload enabled');
  } catch (e) {
    log.warn('[main] Failed to enable hot reload:', e.message);
  }
}

electronApp.whenReady().then(() => {
  // IMPORTANT: require modules that touch Electron API AFTER whenReady
  const { createDashboardWindow } = require('./windows');
  const { buildMenu } = require('./menu');
  const settings = require('./settings');
  const simlink = require('./simlink');

  settings.load();
  buildMenu();
  createDashboardWindow();
  simlink.connect();

  // Handle sim commands with acks
  ipcMain.on('sim:cmd', async (_e, msg) => {
    if (!msg) return;

    // Debug commands
    if (msg.type === 'debug:set') {
      if (msg.simTrace !== undefined) simlink.setTrace(!!msg.simTrace);
      return;
    }

    // Press commands (Input Event → K-event fallback)
    if (msg.type === 'press' && msg.button) {
      try {
        const fnName = `press${msg.button}`;
        if (typeof simlink[fnName] === 'function') {
          simlink[fnName]();
          _e.sender.send('sim:ack', { id: msg.id, ok: true });
        } else {
          throw new Error(`Unknown button: ${msg.button}`);
        }
      } catch (err) {
        _e.sender.send('sim:ack', { id: msg.id, ok: false, err: String(err?.message || err) });
      }
      return;
    }

    // K-events (direct K-event calls)
    if ((msg.type === 'k' || msg.type === 'K') && msg.event) {
      try {
        await simlink.sendK(msg.event);
        _e.sender.send('sim:ack', { id: msg.id, ok: true });
      } catch (err) {
        _e.sender.send('sim:ack', { id: msg.id, ok: false, err: String(err?.exceptionName || err?.message || err) });
      }
      return;
    }
  });

  // Forward AP state to renderer
  simlink.onApState((flags) => {
    const win = BrowserWindow.getAllWindows()[0];
    if (win) {
      win.webContents.send('sim:update', { type: 'apState', flags });
    }
  });

  // Navboard SVG loader
  ipcMain.handle('navboard:get-svg', async () => {
    const fs = require('fs').promises;

    // Default to project assets folder
    const projectRoot = path.join(__dirname, '../..');
    const DEFAULT_SVG = path.join(projectRoot, 'assets', 'NavBoard - Smaller - cut.svg');
    const SVG_PATH = process.env.NAVBOARD_SVG_PATH || DEFAULT_SVG;

    try {
      return await fs.readFile(SVG_PATH, 'utf8');
    } catch (err) {
      throw new Error(`Failed to read SVG from ${SVG_PATH}: ${err.message}`);
    }
  });

  // Navboard interaction logging
  ipcMain.on('navboard:interaction', (_e, payload) => {
    log.log('[navboard]', JSON.stringify(payload));
  });

  // Logs path for renderer
  ipcMain.on('logs:path', (e) => {
    e.returnValue = path.join(app.getPath('userData'), 'logs', 'renderer.log');
  });

  // Diagnostic commands
  ipcMain.handle('app:info', () => ({
    userData: app.getPath('userData'),
    logsDir: path.join(app.getPath('userData'), 'logs'),
    versions: process.versions,
    appVersion: app.getVersion()
  }));

  ipcMain.handle('sim:probe', async (_e, { var: varName }) => {
    return simlink.readOnce(varName);
  });

  // Popout capture handlers
  const popcap = require('./popcap');

  ipcMain.handle('popcap:list-windows', async () => {
    return await popcap.listWindows();
  });

  // Popout capture registry handlers
  let popoutStore;
  try {
    popoutStore = require('./popoutStore');
  } catch (err) {
    console.error('[main] Failed to load popoutStore:', err);
  }

  if (popoutStore) {
    ipcMain.handle('popout:load-registry', () => {
      return popoutStore.loadRegistry();
    });

    ipcMain.handle('popout:save-registry', (_e, registry) => {
      popoutStore.saveRegistry(registry);
    });

    ipcMain.handle('popout:upsert-binding', (_e, binding) => {
      popoutStore.upsertBinding(binding);
    });

    ipcMain.handle('popout:remove-binding', (_e, key) => {
      popoutStore.removeBinding(key);
    });

    ipcMain.handle('popout:get-binding', (_e, key) => {
      return popoutStore.getBinding(key);
    });
  }

  // Window positioning handlers (optional)
  const winMove = require('./winMove');

  ipcMain.handle('win:move-offscreen', (_e, { title, x, y, width, height }) => {
    return winMove.moveOffscreen(title, x, y, width, height);
  });

  ipcMain.handle('win:move-to-visible', (_e, { title, x, y }) => {
    return winMove.moveToVisible(title, x, y);
  });

  ipcMain.handle('win:get-bounds', (_e, { title }) => {
    return winMove.getWindowBounds(title);
  });

  ipcMain.handle('win:list', () => {
    return winMove.listWindows();
  });
});

electronApp.on('window-all-closed', () => { electronApp.quit(); });
