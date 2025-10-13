console.log('[preload] 1 - script loaded');

const { contextBridge, ipcRenderer } = require('electron');
console.log('[preload] 2 - electron loaded');

const log = require('electron-log');
console.log('[preload] 3 - electron-log loaded');

const path = require('path');
console.log('[preload] 4 - path loaded');

// Setup renderer logging
try {
  const logsPath = ipcRenderer.sendSync('logs:path');
  console.log('[preload] 5 - logs path:', logsPath);
  log.transports.file.resolvePathFn = () => logsPath;
  log.transports.file.maxSize = 1024 * 1024;
} catch (e) {
  console.error('[preload] Failed to setup logging:', e);
}

['log', 'warn', 'error'].forEach(k => {
  const orig = console[k].bind(console);
  console[k] = (...args) => {
    orig(...args);
    log[k](...args);
  };
});

const genId = () => Math.random().toString(36).slice(2);

console.log('[preload] exposing window.api...');

contextBridge.exposeInMainWorld('api', {
  onBus(cb) {
    console.log('[preload] onBus registered');
    ipcRenderer.on('bus:msg', (_e, payload) => {
      console.log('[preload] bus:msg received:', payload.type);
      cb(payload);
    });
  },
  onHistory(cb) {
    console.log('[preload] onHistory registered');
    ipcRenderer.once('bus:history', (_e, payload) => {
      console.log('[preload] bus:history received:', payload?.length, 'messages');
      cb(payload);
    });
  },
  sendCmd(payload) {
    ipcRenderer.send('cmd:send', payload);
  }
});

console.log('[preload] window.api exposed');

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
