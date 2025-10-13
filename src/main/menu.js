const { Menu, BrowserWindow } = require('electron');
const { toggleConsole } = require('./windows');

function buildMenu() {
  const template = [
    {
      label: 'View',
      submenu: [
        {
          label: 'Toggle Console',
          accelerator: 'CmdOrCtrl+Shift+O',
          click: toggleConsole
        },
        { type: 'separator' },
        {
          label: 'Reload Window',
          accelerator: 'CmdOrCtrl+R',
          click: (item, focusedWindow) => {
            if (focusedWindow) focusedWindow.reload();
          }
        },
        {
          label: 'Toggle DevTools',
          accelerator: 'CmdOrCtrl+Shift+I',
          click: (item, focusedWindow) => {
            if (focusedWindow) focusedWindow.webContents.toggleDevTools();
          }
        }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        { type: 'separator' },
        { role: 'close' }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

module.exports = { buildMenu };
