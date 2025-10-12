const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('sim', {
  onUpdate(cb) {
    ipcRenderer.on('sim:update', (_e, payload) => cb(payload));
  }
});
