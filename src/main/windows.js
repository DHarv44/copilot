const { BrowserWindow } = require('electron');
const path = require('path');
const settings = require('./settings');
const bus = require('./bus');

let dashboardWin = null;
let consoleWin = null;

function createDashboardWindow() {
  if (dashboardWin && !dashboardWin.isDestroyed()) {
    dashboardWin.focus();
    return dashboardWin;
  }

  const bounds = settings.get('window.dashboard', { width: 900, height: 600, x: undefined, y: undefined });

  dashboardWin = new BrowserWindow({
    width: bounds.width,
    height: bounds.height,
    x: bounds.x,
    y: bounds.y,
    autoHideMenuBar: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      preload: path.join(__dirname, '../preload/preload.js')
    }
  });

  // Load from Vite dev server in development, or built files in production
  if (process.env.VITE_DEV_SERVER_URL) {
    dashboardWin.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    dashboardWin.loadFile(path.join(__dirname, '../../dist/renderer/src/renderer/dashboard/index.html'));
  }

  // Log ALL renderer console messages (including errors)
  const log = require('./logger');
  dashboardWin.webContents.on('console-message', (event, level, message, line, sourceId) => {
    const levelMap = { 0: 'log', 1: 'warn', 2: 'error' };
    const logLevel = levelMap[level] || 'log';
    log[logLevel](`[renderer] ${sourceId}:${line} ${message}`);
  });

  // Capture preload errors
  dashboardWin.webContents.on('preload-error', (event, preloadPath, error) => {
    log.error(`[renderer] Preload error (${preloadPath}):`, error);
  });

  // Capture crashed renderer
  dashboardWin.webContents.on('render-process-gone', (event, details) => {
    log.error(`[renderer] Process gone:`, details);
  });

  dashboardWin.on('close', () => {
    const b = dashboardWin.getBounds();
    settings.set('window.dashboard', b);
  });

  dashboardWin.on('closed', () => { dashboardWin = null; });

  // Send history on load
  dashboardWin.webContents.on('did-finish-load', () => {
    const h = bus.history();
    console.log('[windows] dashboard loaded, sending history with', h.length, 'messages');
    dashboardWin.webContents.send('bus:history', h);
  });

  return dashboardWin;
}

function createConsoleWindow() {
  if (consoleWin && !consoleWin.isDestroyed()) {
    consoleWin.focus();
    return consoleWin;
  }

  const bounds = settings.get('window.console', { width: 800, height: 500, x: undefined, y: undefined });

  consoleWin = new BrowserWindow({
    width: bounds.width,
    height: bounds.height,
    x: bounds.x,
    y: bounds.y,
    autoHideMenuBar: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, '../preload/preload.js')
    }
  });

  consoleWin.loadFile(path.join(__dirname, '../renderer/console/index.html'));

  consoleWin.on('close', () => {
    const b = consoleWin.getBounds();
    settings.set('window.console', b);
  });

  consoleWin.on('closed', () => { consoleWin = null; });

  // Send history on load
  consoleWin.webContents.on('did-finish-load', () => {
    consoleWin.webContents.send('bus:history', bus.history());
  });

  return consoleWin;
}

function toggleConsole() {
  if (consoleWin && !consoleWin.isDestroyed()) {
    consoleWin.close();
  } else {
    createConsoleWindow();
  }
}

module.exports = { createDashboardWindow, createConsoleWindow, toggleConsole };
