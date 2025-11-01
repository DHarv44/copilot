const { spawn } = require('child_process');
const path = require('path');

class WasimBridge {
  constructor() {
    this.process = null;
    this.ready = false;
    this.callbacks = new Map();
    this.messageId = 0;
  }

  start() {
    return new Promise((resolve, reject) => {
      const exePath = path.join(__dirname, '../../native/wasim-bridge/bin/Release/net8.0/wasim-bridge.exe');

      this.process = spawn(exePath, [], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let buffer = '';

      this.process.stdout.on('data', (data) => {
        buffer += data.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.trim()) {
            try {
              const msg = JSON.parse(line);
              this.handleMessage(msg);

              if (msg.ready && !this.ready) {
                this.ready = true;
                console.log('[WASim] Bridge ready');
                resolve();
              }
            } catch (err) {
              console.error('[WASim] Failed to parse message:', line, err);
            }
          }
        }
      });

      this.process.stderr.on('data', (data) => {
        const text = data.toString().trim();
        // Filter out WASimClient logging noise (starts with date/time pattern)
        if (!text.match(/^\d{2}-\d{2} \d{2}:\d{2}/)) {
          console.error('[WASim] Error:', text);
        }
      });

      this.process.on('exit', (code) => {
        console.log(`[WASim] Bridge exited with code ${code}`);
        this.ready = false;
        this.process = null;
      });

      this.process.on('error', (err) => {
        console.error('[WASim] Failed to start bridge:', err);
        reject(err);
      });

      // Timeout after 10 seconds
      setTimeout(() => {
        if (!this.ready) {
          reject(new Error('WASim bridge failed to start within 10 seconds'));
        }
      }, 10000);
    });
  }

  handleMessage(msg) {
    if (msg.id !== undefined && this.callbacks.has(msg.id)) {
      const callback = this.callbacks.get(msg.id);
      this.callbacks.delete(msg.id);
      callback(msg);
    }
  }

  sendEvent(eventName) {
    return new Promise((resolve, reject) => {
      if (!this.ready || !this.process) {
        return reject(new Error('WASim bridge not ready'));
      }

      const id = this.messageId++;
      const command = {
        type: 'event',
        event: eventName,
        id
      };

      this.callbacks.set(id, (response) => {
        if (response.error) {
          reject(new Error(response.message || 'Unknown error'));
        } else {
          resolve(response);
        }
      });

      this.process.stdin.write(JSON.stringify(command) + '\n');

      // Timeout after 5 seconds
      setTimeout(() => {
        if (this.callbacks.has(id)) {
          this.callbacks.delete(id);
          reject(new Error(`WASim event timeout: ${eventName}`));
        }
      }, 5000);
    });
  }

  stop() {
    if (this.process) {
      try {
        this.process.stdin.write(JSON.stringify({ type: 'exit' }) + '\n');
      } catch (err) {
        console.error('[WASim] Error sending exit command:', err);
      }

      setTimeout(() => {
        if (this.process) {
          this.process.kill();
        }
      }, 1000);
    }
  }
}

// Singleton instance
let instance = null;

module.exports = {
  async start() {
    if (!instance) {
      instance = new WasimBridge();
      await instance.start();
    }
    return instance;
  },

  async sendEvent(eventName) {
    if (!instance || !instance.ready) {
      throw new Error('WASim bridge not started');
    }
    return instance.sendEvent(eventName);
  },

  stop() {
    if (instance) {
      instance.stop();
      instance = null;
    }
  }
};
