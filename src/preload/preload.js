const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  onBus(cb) {
    ipcRenderer.on('bus:msg', (_e, payload) => cb(payload));
  },
  onHistory(cb) {
    ipcRenderer.once('bus:history', (_e, payload) => cb(payload));
  },
  sendCmd(payload) {
    ipcRenderer.send('cmd:send', payload);
  }
});
