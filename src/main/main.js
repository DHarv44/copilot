const { app } = require('electron');

try {
  require('electron-reloader')(module, {
    watchRenderer: true
  });
} catch {}

const { createDashboardWindow } = require('./windows');
const { buildMenu } = require('./menu');
const simlink = require('./simlink');

app.whenReady().then(() => {
  buildMenu();
  createDashboardWindow();
  simlink.connect();
});

app.on('window-all-closed', () => { app.quit(); });
