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

    // K-events
    if (msg.type === 'k' && msg.event) {
      try {
        await simlink.sendK(msg.event);
        _e.sender.send('sim:ack', { id: msg.id, ok: true });
      } catch (err) {
        _e.sender.send('sim:ack', { id: msg.id, ok: false, err: String(err?.exceptionName || err?.message || err) });
      }
    }
  });

  // Forward AP state to renderer
  simlink.onApState((flags) => {
    log.log('[main] AP flags from SimConnect:', JSON.stringify(flags));
    const win = BrowserWindow.getAllWindows()[0];
    if (win) {
      win.webContents.send('sim:update', { type: 'apState', flags });
    }
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
});

electronApp.on('window-all-closed', () => { electronApp.quit(); });
