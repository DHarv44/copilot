const {
  open, Protocol,
  SimConnectDataType, SimConnectPeriod, SimConnectConstants
} = require('node-simconnect');

const bus = require('./bus');
const log = require('./logger');

// Use unique IDs to avoid conflicts from previous connections
const DEF_TITLE = 100, REQ_TITLE = 100;
const DEF_SAMPLE = 101, REQ_SAMPLE = 101;
const DEF_METADATA = 102, REQ_METADATA = 102;
const EVT_AIRCRAFT_LOADED = 1001;

// AP K-event group and SimVar definitions
const GROUP_K = 1001;
const DEF_AP = 10, REQ_AP = 10;
const AP_VARS = [
  'AUTOPILOT MASTER',
  'AUTOPILOT FLIGHT DIRECTOR ACTIVE',
  'AUTOPILOT HEADING LOCK',
  'AUTOPILOT NAV1 LOCK',
  'AUTOPILOT NAV SELECTED',
  'AUTOPILOT APPROACH ACTIVE',
  'AUTOPILOT ALTITUDE LOCK',
  'AUTOPILOT VERTICAL HOLD',
  'AUTOPILOT BACKCOURSE HOLD',
  'AUTOPILOT YAW DAMPER',
  'AUTOPILOT AIRSPEED HOLD',
  'AUTOPILOT MACH HOLD',
  'AUTOPILOT FLIGHT LEVEL CHANGE',
  'AUTOPILOT PITCH HOLD',
  'AUTOPILOT GLIDESLOPE HOLD',
  'AUTOPILOT THROTTLE ARM',
  'AUTOPILOT TAKEOFF POWER ACTIVE',
  'AUTOPILOT WING LEVELER',
  'GPS DRIVES NAV1',
  'GPS WP CROSS TRK'
];

let handle = null;
let reconnectTimer = null;
let titleRetryTimer = null;
let titleRetryCount = 0;
const TITLE_RETRY_MAX = 10; // 5 seconds (500ms * 10)

// State machine for debugging
let TRACE = true; // Enable trace by default temporarily
const LOG = (...args) => log.log('[simlink]', ...args);
const T = (...args) => { if (TRACE) log.log('[simlink]', ...args); };

let state = {
  connected: false,
  lastLoadedAt: null,
  titleAttempts: 0,
  titleResolved: false,
  lastTitle: null
};

// K-event mapping and AP state listeners
const KMAP = {};
let nextClientEventId = 2000;
let oncePending = false;
const listeners = { apState: [] };

function ensureK(name) {
  if (KMAP[name]) return KMAP[name];
  const id = nextClientEventId++;
  handle.mapClientEventToSimEvent(id, name);
  handle.addClientEventToNotificationGroup(GROUP_K, id, false);
  return (KMAP[name] = id);
}

function notifyApState(flags) {
  T('notifyApState called with', Object.keys(flags).length, 'flags, listeners:', listeners.apState.length);
  for (const cb of listeners.apState) cb(flags);
}

function requestApOnce() {
  if (!handle || oncePending) return;
  oncePending = true;
  handle.requestDataOnSimObject(REQ_AP, DEF_AP, SimConnectConstants.OBJECT_ID_USER, SimConnectPeriod.SIM_FRAME);
  setTimeout(() => {
    if (handle) {
      handle.requestDataOnSimObject(REQ_AP, DEF_AP, SimConnectConstants.OBJECT_ID_USER, SimConnectPeriod.SECOND);
    }
    oncePending = false;
  }, 250);
}

function connect() {
  if (reconnectTimer) clearTimeout(reconnectTimer);

  LOG('attempting connection...');
  open('MSFS-Electron-Hello', Protocol.FSX_SP2)
    .then(({ recvOpen, handle: h }) => {
      handle = h;
      state.connected = true;
      LOG('✓ connected to', recvOpen.applicationName);
      LOG('→ publishing status: connected=true');
      bus.publish({ type: 'status', connected: true });

      // TITLE - no unit specification for string SimVars
      handle.addToDataDefinition(DEF_TITLE, 'TITLE', null, SimConnectDataType.STRING256);
      LOG('✓ TITLE definition added');

      // Metadata - using proper SimVar names without units
      handle.addToDataDefinition(DEF_METADATA, 'ATC MODEL', null, SimConnectDataType.STRING256);
      handle.addToDataDefinition(DEF_METADATA, 'ATC TYPE', null, SimConnectDataType.STRING256);
      handle.addToDataDefinition(DEF_METADATA, 'ATC ID', null, SimConnectDataType.STRING256);
      LOG('✓ METADATA definition added');

      requestAircraftData();

      // IAS (knots) + ALT (feet), 1 Hz
      handle.addToDataDefinition(DEF_SAMPLE, 'AIRSPEED INDICATED', 'knots', SimConnectDataType.FLOAT64);
      handle.addToDataDefinition(DEF_SAMPLE, 'INDICATED ALTITUDE', 'feet', SimConnectDataType.FLOAT64);
      handle.requestDataOnSimObject(
        REQ_SAMPLE, DEF_SAMPLE, SimConnectConstants.OBJECT_ID_USER, SimConnectPeriod.SECOND
      );

      // Aircraft switches → refresh TITLE
      handle.subscribeToSystemEvent(EVT_AIRCRAFT_LOADED, 'AircraftLoaded');
      LOG('✓ subscribed to AircraftLoaded event');

      handle.on('event', (ev) => {
        LOG('>>> EVENT:', JSON.stringify(ev));
        if (ev.clientEventId === EVT_AIRCRAFT_LOADED) {
          state.lastLoadedAt = Date.now();
          state.titleResolved = false;
          LOG('>>> AircraftLoaded event at', new Date().toISOString());
          titleRetryCount = 0;
          requestAircraftData();
        }
      });

      // Define AP SimVars
      try {
        for (const v of AP_VARS) {
          handle.addToDataDefinition(DEF_AP, v, 'Bool', SimConnectDataType.INT32);
        }
        handle.requestDataOnSimObject(REQ_AP, DEF_AP, SimConnectConstants.OBJECT_ID_USER, SimConnectPeriod.SECOND);
        LOG('✓ AP SimVars defined');

        // Set notification group priority
        handle.setNotificationGroupPriority(GROUP_K, 1);
      } catch (e) {
        LOG('⚠ AP setup failed:', e.message);
      }

      handle.on('simObjectData', (packet) => {
        if (packet.requestID === REQ_TITLE) {
          const title = packet.data.readString(256);
          LOG('← TITLE response:', title ? `"${title}"` : '(empty)');
          handleTitleResponse(title);
        } else if (packet.requestID === REQ_AP) {
          try {
            const flags = {};
            const buffer = packet.data;
            buffer.offset = 0; // Reset to start

            // Read all values and log everything
            for (let i = 0; i < AP_VARS.length; i++) {
              const val = buffer.readInt32();
              flags[AP_VARS[i]] = val !== 0;
              T(`  ${AP_VARS[i]}: ${val} (${flags[AP_VARS[i]] ? 'TRUE' : 'FALSE'})`);
            }

            notifyApState(flags);
          } catch (e) {
            log.error('[simlink] AP data read error:', e.message);
          }
        } else if (packet.requestID === REQ_METADATA) {
          const atcModel = packet.data.readString(256);
          const atcType = packet.data.readString(256);
          const atcId = packet.data.readString(256);

          LOG('← METADATA response:', { atcModel, atcType, atcId });

          // Use the title we already got from REQ_TITLE
          const title = state.lastTitle;

          if (title) {
            LOG('→ publishing aircraft to UI with title:', title);
            bus.publish({ type: 'aircraft', title, atcModel, atcType, atcId });

            // Trigger profile detection
            LOG('→ triggering profile detection');
            const profileBuilder = require('./profile-builder');
            profileBuilder.detectProfile(title, { atcModel, atcType, atcId });
          } else {
            LOG('⚠ METADATA has no title from previous request');
            bus.publish({ type: 'aircraftError', reason: 'METADATA_NO_TITLE' });
          }
        } else if (packet.requestID === REQ_SAMPLE) {
          const ias = packet.data.readFloat64();
          const alt = packet.data.readFloat64();
          bus.publish({ type: 'sample', ias, alt });
        }
      });

      handle.on('exception', (ex) => {
        log.error('[simlink] SimConnect exception:', ex);
      });
      handle.on('quit', () => {
        LOG('sim quit');
        disconnect();
      });
      handle.on('close', () => {
        LOG('link closed');
        disconnect();
      });
      handle.on('error', (e) => {
        log.error('[simlink] error:', e);
        disconnect();
      });
    })
    .catch((err) => {
      LOG('✗ connection failed:', err.message || err);
      disconnect();
    });
}

function requestAircraftData() {
  if (!handle) {
    LOG('⚠ requestAircraftData called but handle is null');
    return;
  }

  state.titleAttempts++;
  state.titleResolved = false;
  LOG(`→ requesting TITLE (attempt ${state.titleAttempts})`);

  // Request TITLE first
  handle.requestDataOnSimObject(
    REQ_TITLE, DEF_TITLE, SimConnectConstants.OBJECT_ID_USER, SimConnectPeriod.ONCE
  );
}

function handleTitleResponse(title) {
  if (titleRetryTimer) {
    clearTimeout(titleRetryTimer);
    titleRetryTimer = null;
  }

  if (title && title.trim()) {
    state.titleResolved = true;
    state.lastTitle = title;
    LOG('✓ TITLE resolved:', title);
    titleRetryCount = 0;

    // Now request full metadata
    LOG('→ requesting METADATA');
    handle.requestDataOnSimObject(
      REQ_METADATA, DEF_METADATA, SimConnectConstants.OBJECT_ID_USER, SimConnectPeriod.ONCE
    );
  } else {
    // Retry if empty
    if (titleRetryCount < TITLE_RETRY_MAX) {
      titleRetryCount++;
      LOG(`⚠ TITLE empty, retry ${titleRetryCount}/${TITLE_RETRY_MAX} in 500ms`);
      titleRetryTimer = setTimeout(() => {
        if (handle) {
          state.titleAttempts++;
          LOG(`→ requesting TITLE (retry ${titleRetryCount})`);
          handle.requestDataOnSimObject(
            REQ_TITLE, DEF_TITLE, SimConnectConstants.OBJECT_ID_USER, SimConnectPeriod.ONCE
          );
        }
      }, 500);
    } else {
      LOG('✗ TITLE still empty after max retries - TIMEOUT');
      bus.publish({ type: 'aircraftError', reason: 'TITLE_EMPTY_TIMEOUT', attempts: titleRetryCount });
    }
  }
}

function disconnect() {
  if (titleRetryTimer) {
    clearTimeout(titleRetryTimer);
    titleRetryTimer = null;
  }
  handle = null;
  titleRetryCount = 0;
  state.connected = false;
  state.titleResolved = false;
  LOG('disconnected, will reconnect in 2s');
  bus.publish({ type: 'status', connected: false });
  reconnectTimer = setTimeout(connect, 2000);
}

exports.sendK = (name, data = 0) => new Promise((resolve, reject) => {
  if (!state.connected || !handle) return reject(new Error('SimConnect not ready'));
  try {
    const id = ensureK(name);
    T('TX K-event', name, 'id:', id, 'data:', data);
    handle.transmitClientEvent(SimConnectConstants.OBJECT_ID_USER, id, data, GROUP_K, 0);
    requestApOnce(); // fast refresh
    resolve();
  } catch (e) {
    log.error('[simlink] sendK error:', e);
    reject(e);
  }
});

exports.setTrace = (on) => {
  TRACE = !!on;
  LOG('Trace mode:', TRACE ? 'ON' : 'OFF');
};

exports.onApState = (cb) => listeners.apState.push(cb);
exports.connect = connect;
exports.readOnce = async (varName) => {
  // TODO: Implement single SimVar probe
  return { error: 'Not implemented yet' };
};
