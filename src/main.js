const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

try {
  require('electron-reloader')(module, {
    watchRenderer: true
  });
} catch {}

let win;

function startSimLink(sendToUI) {
  const {
    open, Protocol,
    SimConnectDataType, SimConnectPeriod, SimConnectConstants
  } = require('node-simconnect');

  const DEF_TITLE = 1, REQ_TITLE = 1;
  const DEF_SAMPLE = 2, REQ_SAMPLE = 2; // IAS/ALT

  const down = (err) => {
    if (err) console.error('[sim]', err);
    sendToUI({ type: 'status', connected: false });
  };

  open('MSFS-Electron-Hello', Protocol.FSX_SP2)
    .then(({ recvOpen, handle }) => {
      console.log('[sim] connected to', recvOpen.applicationName);
      sendToUI({ type: 'status', connected: true });

      // TITLE (string)
      handle.addToDataDefinition(DEF_TITLE, 'TITLE', 'string', SimConnectDataType.STRING256);
      handle.requestDataOnSimObject(
        REQ_TITLE, DEF_TITLE, SimConnectConstants.OBJECT_ID_USER, SimConnectPeriod.ONCE
      );

      // IAS (knots) + ALT (feet), 1 Hz
      handle.addToDataDefinition(DEF_SAMPLE, 'AIRSPEED INDICATED', 'knots', SimConnectDataType.FLOAT64);
      handle.addToDataDefinition(DEF_SAMPLE, 'INDICATED ALTITUDE', 'feet', SimConnectDataType.FLOAT64);
      handle.requestDataOnSimObject(
        REQ_SAMPLE, DEF_SAMPLE, SimConnectConstants.OBJECT_ID_USER, SimConnectPeriod.SECOND
      );

      // Aircraft switches → refresh TITLE
      const EVT_AIRCRAFT_LOADED = 1001;
      handle.subscribeToSystemEvent(EVT_AIRCRAFT_LOADED, 'AircraftLoaded');

      handle.on('event', (ev) => {
        if (ev.clientEventId === EVT_AIRCRAFT_LOADED) {
          handle.requestDataOnSimObject(
            REQ_TITLE, DEF_TITLE, SimConnectConstants.OBJECT_ID_USER, SimConnectPeriod.ONCE
          );
        }
      });

      handle.on('simObjectData', (packet) => {
        if (packet.requestID === REQ_TITLE) {
          const title = packet.data.readString(256);
          if (title) sendToUI({ type: 'aircraft', title });
        } else if (packet.requestID === REQ_SAMPLE) {
          const ias = packet.data.readFloat64();   // order matches addToDataDefinition
          const alt = packet.data.readFloat64();
          sendToUI({ type: 'sample', ias, alt });
        }
      });

      handle.on('exception', (ex) => console.warn('[sim] exception', ex));
      handle.on('quit', () => { console.log('[sim] sim quit'); down(); });
      handle.on('close', () => { console.log('[sim] link closed'); down(); });
      handle.on('error', (e) => { console.log('[sim] error', e); down(); });
    })
    .catch((err) => {
      console.error('[sim] connection failed', err);
      down(err);
      setTimeout(() => startSimLink(sendToUI), 2000);
    });
}

function createWindow() {
  win = new BrowserWindow({
    width: 900,
    height: 600,
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  win.on('closed', () => { win = null; });

  // Boot the sim link (currently a stub).
  startSimLink((msg) => {
    if (win && !win.isDestroyed()) {
      win.webContents.send('sim:update', msg);
    }
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => { app.quit(); });
