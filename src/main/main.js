'use strict';

// Guard: ensure we're running inside Electron, not Node
if (!process.versions.electron) {
  console.error('✗ Not running inside Electron – you launched Node. Start with "electron ." or "npm start"');
  process.exit(1);
}

const electron = require('electron');

console.log('[diag] ✓ Running inside Electron v' + process.versions.electron);
console.log('[diag] electron type:', typeof electron);
console.log('[diag] electron.app type:', typeof electron.app);
console.log('[diag] electron keys sample:', Object.keys(electron).slice(0, 5));

const electronApp = electron.app;

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
});

electronApp.on('window-all-closed', () => { electronApp.quit(); });
