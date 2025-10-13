const { contextBridge, ipcRenderer } = require('electron');

const genId = () => Math.random().toString(36).slice(2);

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

contextBridge.exposeInMainWorld('cmd', {
  send: (payload) => {
    const id = genId();
    ipcRenderer.send('sim:cmd', { id, ...payload });
    return id;
  },
  onAck: (cb) => ipcRenderer.on('sim:ack', (_e, ack) => cb(ack))
});

contextBridge.exposeInMainWorld('sim', {
  onUpdate: (cb) => ipcRenderer.on('sim:update', (_e, m) => cb(m))
});

console.log('Preload loaded successfully');
