const log = require('electron-log');
const path = require('path');

log.transports.file.maxSize = 1024 * 1024; // 1 MB rotate
log.transports.file.resolvePathFn = () => {
  const { app } = require('electron');
  // Only use userData path if app is ready, otherwise use temp dir
  if (app && app.isReady && app.isReady()) {
    return path.join(app.getPath('userData'), 'logs', 'main.log');
  } else {
    // Fallback to temp directory during early startup
    return path.join(require('os').tmpdir(), 'copilot-main.log');
  }
};

module.exports = log;
