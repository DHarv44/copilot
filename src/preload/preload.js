const { contextBridge, ipcRenderer } = require('electron');

const genId = () => Math.random().toString(36).slice(2);

// Load popout capture bridge
require('./popcap');

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
  onUpdate: (cb) => ipcRenderer.on('bus:msg', (_e, m) => cb(m))
});

contextBridge.exposeInMainWorld('navboard', {
  getSvgText: () => {
    return ipcRenderer.invoke('navboard:get-svg');
  },
  sendInteraction: (payload) => {
    ipcRenderer.send('navboard:interaction', payload);
  }
});

contextBridge.exposeInMainWorld('popout', {
  loadRegistry: () => ipcRenderer.invoke('popout:load-registry'),
  saveRegistry: (registry) => ipcRenderer.invoke('popout:save-registry', registry),
  upsertBinding: (binding) => ipcRenderer.invoke('popout:upsert-binding', binding),
  removeBinding: (key) => ipcRenderer.invoke('popout:remove-binding', key),
  getBinding: (key) => ipcRenderer.invoke('popout:get-binding', key)
});

contextBridge.exposeInMainWorld('winMove', {
  moveOffscreen: (title, x, y, width, height) =>
    ipcRenderer.invoke('win:move-offscreen', { title, x, y, width, height }),
  moveToVisible: (title, x, y) =>
    ipcRenderer.invoke('win:move-to-visible', { title, x, y }),
  getBounds: (title) =>
    ipcRenderer.invoke('win:get-bounds', { title }),
  list: () =>
    ipcRenderer.invoke('win:list')
});

console.log('Preload loaded successfully');
