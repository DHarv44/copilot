const log = require('electron-log');
const path = require('path');

log.transports.file.maxSize = 1024 * 1024; // 1 MB rotate
log.transports.file.resolvePathFn = () => {
  const { app } = require('electron');
  return path.join(app.getPath('userData'), 'logs', 'main.log');
};

module.exports = log;
