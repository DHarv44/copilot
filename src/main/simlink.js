const {
  open, Protocol,
  SimConnectDataType, SimConnectPeriod, SimConnectConstants
} = require('node-simconnect');

const bus = require('./bus');

const DEF_TITLE = 1, REQ_TITLE = 1;
const DEF_SAMPLE = 2, REQ_SAMPLE = 2;
const EVT_AIRCRAFT_LOADED = 1001;

let handle = null;
let reconnectTimer = null;

function connect() {
  if (reconnectTimer) clearTimeout(reconnectTimer);

  open('MSFS-Electron-Hello', Protocol.FSX_SP2)
    .then(({ recvOpen, handle: h }) => {
      handle = h;
      console.log('[simlink] connected to', recvOpen.applicationName);
      bus.publish({ type: 'status', connected: true });

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
          if (title) bus.publish({ type: 'aircraft', title });
        } else if (packet.requestID === REQ_SAMPLE) {
          const ias = packet.data.readFloat64();
          const alt = packet.data.readFloat64();
          bus.publish({ type: 'sample', ias, alt });
        }
      });

      handle.on('exception', (ex) => console.warn('[simlink] exception', ex));
      handle.on('quit', () => { console.log('[simlink] sim quit'); disconnect(); });
      handle.on('close', () => { console.log('[simlink] link closed'); disconnect(); });
      handle.on('error', (e) => { console.log('[simlink] error', e); disconnect(); });
    })
    .catch((err) => {
      console.error('[simlink] connection failed', err);
      disconnect();
    });
}

function disconnect() {
  handle = null;
  bus.publish({ type: 'status', connected: false });
  reconnectTimer = setTimeout(connect, 2000);
}

module.exports = { connect };
