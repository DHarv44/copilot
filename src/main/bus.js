const { BrowserWindow } = require('electron');

const BUFFER_SIZE = 5000;
const buffer = [];
let sequence = 0;

/**
 * Publish a message to all windows and store in ring buffer
 */
function publish(msg) {
  const envelope = { seq: sequence++, ts: Date.now(), ...msg };
  buffer.push(envelope);
  if (buffer.length > BUFFER_SIZE) buffer.shift();

  // Fan out to all windows
  BrowserWindow.getAllWindows().forEach((win) => {
    if (!win.isDestroyed()) {
      win.webContents.send('bus:msg', envelope);
    }
  });
}

/**
 * Return recent messages (for new windows)
 */
function history(limit = 500) {
  return buffer.slice(-limit);
}

module.exports = { publish, history };
