const {
  open, Protocol,
  SimConnectDataType, SimConnectPeriod, SimConnectConstants,
} = require('node-simconnect');

const bus = require('./bus');
const log = require('./logger');

// Use unique IDs to avoid conflicts from previous connections
const DEF_TITLE = 100, REQ_TITLE = 100;
const DEF_SAMPLE = 101, REQ_SAMPLE = 101;
const DEF_METADATA = 102, REQ_METADATA = 102;
const EVT_AIRCRAFT_LOADED = 1001;

// K-event IDs (stable, pre-mapped)
const EV = {
  AP_MASTER: 0x1100,
  AP_MASTER_ON: 0x1101,
  AP_MASTER_OFF: 0x1102,
  FD_ON: 0x1103,
  FD_OFF: 0x1104,
  HDG_ON: 0x1105,
  HDG_OFF: 0x1106,
  NAV_ON: 0x1107,
  NAV_OFF: 0x1108,
  APR_ON: 0x1109,
  APR_OFF: 0x110A,
  ALT_ON: 0x110B,
  ALT_OFF: 0x110C,
  VS_HOLD: 0x110D,
  FLC_ON: 0x110E,
  FLC_OFF: 0x110F,
  // Toggle variants used as fallbacks in UI
  FD_TOGGLE: 0x1110,
  HDG_TOGGLE: 0x1111,
  NAV_TOGGLE: 0x1112,
  APR_TOGGLE: 0x1113,
  BC_TOGGLE: 0x1114,
  ALT_TOGGLE: 0x1115,
  FLC_TOGGLE: 0x1116,
  YD_TOGGLE: 0x1117,
};

// AP K-event group and SimVar definitions
const GROUP_K = 1001;
const DEF_AP = 10, REQ_AP = 10;
const AP_VARS = [
  { name: 'AUTOPILOT MASTER', unit: 'Bool', type: 'INT32' },
  { name: 'AUTOPILOT FLIGHT DIRECTOR ACTIVE', unit: 'Bool', type: 'INT32' },
  { name: 'AUTOPILOT HEADING LOCK', unit: 'Bool', type: 'INT32' },
  { name: 'AUTOPILOT NAV1 LOCK', unit: 'Bool', type: 'INT32' },
  { name: 'AUTOPILOT NAV SELECTED', unit: 'Bool', type: 'INT32' },
  { name: 'AUTOPILOT APPROACH ACTIVE', unit: 'Bool', type: 'INT32' },
  { name: 'AUTOPILOT ALTITUDE LOCK', unit: 'Bool', type: 'INT32' },
  { name: 'AUTOPILOT ALTITUDE LOCK VAR', unit: 'feet', type: 'FLOAT64' },
  { name: 'AUTOPILOT VERTICAL HOLD', unit: 'Bool', type: 'INT32' },
  { name: 'AUTOPILOT BACKCOURSE HOLD', unit: 'Bool', type: 'INT32' },
  { name: 'AUTOPILOT YAW DAMPER', unit: 'Bool', type: 'INT32' },
  { name: 'AUTOPILOT AIRSPEED HOLD', unit: 'Bool', type: 'INT32' },
  { name: 'AUTOPILOT MACH HOLD', unit: 'Bool', type: 'INT32' },
  { name: 'AUTOPILOT FLIGHT LEVEL CHANGE', unit: 'Bool', type: 'INT32' },
  { name: 'AUTOPILOT PITCH HOLD', unit: 'Bool', type: 'INT32' },
  { name: 'AUTOPILOT GLIDESLOPE HOLD', unit: 'Bool', type: 'INT32' },
  { name: 'AUTOPILOT THROTTLE ARM', unit: 'Bool', type: 'INT32' },
  { name: 'AUTOPILOT TAKEOFF POWER ACTIVE', unit: 'Bool', type: 'INT32' },
  { name: 'AUTOPILOT WING LEVELER', unit: 'Bool', type: 'INT32' },
  { name: 'GPS DRIVES NAV1', unit: 'Bool', type: 'INT32' },
  { name: 'GPS WP CROSS TRK', unit: 'nautical miles', type: 'FLOAT64' }
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

// Cache of last known AP flags for smarter fallbacks
// no-op

// Input Event hashes for G1000 NXi (enumerated at startup)
const INPUT = {
  AP: null, FD: null, HDG: null, NAV: null, APR: null, BC: null,
  ALT: null, VS: null, FLC: null, VNAV: null, YD: null
};

// H-event candidates for G1000 NXi (primary control path)
const H = {
  AP:   ['AS1000_PFD_AP', 'AS1000_PFD_AP_Push', 'WTG1000_PFD_AP'],
  FD:   ['AS1000_PFD_FD', 'AS1000_PFD_FD_Push', 'WTG1000_PFD_FD'],
  HDG:  ['AS1000_PFD_HDG', 'WTG1000_PFD_HDG'],
  NAV:  ['AS1000_PFD_NAV', 'WTG1000_PFD_NAV'],
  APR:  ['AS1000_PFD_APR', 'WTG1000_PFD_APR'],
  BC:   ['AS1000_PFD_BC', 'WTG1000_PFD_BC'],
  ALT:  ['AS1000_PFD_ALT', 'WTG1000_PFD_ALT'],
  VS:   ['AS1000_PFD_VS', 'WTG1000_PFD_VS'],
  FLC:  ['AS1000_PFD_FLC', 'WTG1000_PFD_FLC'],
  VNAV: ['AS1000_PFD_VNAV', 'WTG1000_PFD_VNAV'],
  YD:   ['AS1000_PFD_YD', 'WTG1000_PFD_YD']
};

// K-event mapping and AP state listeners
let kReady = false;
const kQueue = []; // [{name, data, resolve, reject}]
let oncePending = false;
const listeners = { apState: [] };
const EVT_K_READY = 0x3001;

function notifyApState(flags) {
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
  open('MSFS-Electron-Hello', Protocol.KittyHawk)
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

      // Subscribe to 1sec tick to guarantee K-events are processed
      handle.subscribeToSystemEvent(EVT_K_READY, '1sec');

      handle.on('event', (ev) => {
        // K-events ready check
        if (!kReady && ev.clientEventId === EVT_K_READY) {
          kReady = true;
          LOG('✓ K-events ready, flushing queue:', kQueue.length);
          while (kQueue.length) {
            const job = kQueue.shift();
            _txK(job.name, job.data, job.resolve, job.reject);
          }
          return;
        }

        LOG('>>> EVENT:', JSON.stringify(ev));
        if (ev.clientEventId === EVT_AIRCRAFT_LOADED) {
          state.lastLoadedAt = Date.now();
          state.titleResolved = false;
          LOG('>>> AircraftLoaded event at', new Date().toISOString());
          titleRetryCount = 0;
          requestAircraftData();
          // Re-enumerate Input Events shortly after aircraft loads (ensures NXi events are discoverable)
          setTimeout(() => {
            try { handle.enumerateInputEvents(0); } catch (_) {}
          }, 1500);
        }
      });

      // Define AP SimVars
      try {
        for (const v of AP_VARS) {
          handle.addToDataDefinition(DEF_AP, v.name, v.unit, SimConnectDataType[v.type]);
        }
        handle.requestDataOnSimObject(REQ_AP, DEF_AP, SimConnectConstants.OBJECT_ID_USER, SimConnectPeriod.SIM_FRAME);
        LOG('✓ AP SimVars defined');
      } catch (e) {
        LOG('⚠ AP setup failed:', e.message);
      }

      // Enumerate Input Events for G1000 NXi
      try {
        handle.enumerateInputEvents(0);
        handle.on('inputEventsList', (list) => {
          if (!list || !Array.isArray(list.inputEventDescriptors)) return;
          list.inputEventDescriptors.forEach((desc) => {
            const n = desc.name;
            const m = /^(AS1000|WTG1000)_(PFD|MFD)_(AP|FD|HDG|NAV|APR|BC|ALT|VS|FLC|VNAV|YD)/i.exec(n);
            if (m) {
              const key = m[3].toUpperCase();
              if (!INPUT[key]) {
                INPUT[key] = desc.inputEventIdHash;
                T('Input Event found:', key, '→', n, '(hash:', String(desc.inputEventIdHash) + ')');
              }
            }
          });
        });
        LOG('✓ Input Event enumeration started');
      } catch (e) {
        LOG('⚠ Input Event enumeration failed:', e.message);
      }

      // Map K-events once per connection (fallback for non-NXi aircraft)
      try {
        handle.mapClientEventToSimEvent(EV.AP_MASTER, 'AP_MASTER');
        handle.mapClientEventToSimEvent(EV.AP_MASTER_ON, 'AP_MASTER_ON');
        handle.mapClientEventToSimEvent(EV.AP_MASTER_OFF, 'AP_MASTER_OFF');
        handle.mapClientEventToSimEvent(EV.FD_ON, 'FLIGHT_DIRECTOR_ON');
        handle.mapClientEventToSimEvent(EV.FD_OFF, 'FLIGHT_DIRECTOR_OFF');
        handle.mapClientEventToSimEvent(EV.HDG_ON, 'AP_HDG_HOLD_ON');
        handle.mapClientEventToSimEvent(EV.HDG_OFF, 'AP_HDG_HOLD_OFF');
        handle.mapClientEventToSimEvent(EV.NAV_ON, 'AP_NAV1_HOLD_ON');
        handle.mapClientEventToSimEvent(EV.NAV_OFF, 'AP_NAV1_HOLD_OFF');
        handle.mapClientEventToSimEvent(EV.APR_ON, 'AP_APR_HOLD_ON');
        handle.mapClientEventToSimEvent(EV.APR_OFF, 'AP_APR_HOLD_OFF');
        handle.mapClientEventToSimEvent(EV.ALT_ON, 'AP_ALT_HOLD_ON');
        handle.mapClientEventToSimEvent(EV.ALT_OFF, 'AP_ALT_HOLD_OFF');
        handle.mapClientEventToSimEvent(EV.VS_HOLD, 'AP_VS_HOLD');
        handle.mapClientEventToSimEvent(EV.FLC_ON, 'FLIGHT_LEVEL_CHANGE_ON');
        handle.mapClientEventToSimEvent(EV.FLC_OFF, 'FLIGHT_LEVEL_CHANGE_OFF');
        // Toggle mappings used by legacy fallbacks
        handle.mapClientEventToSimEvent(EV.FD_TOGGLE, 'TOGGLE_FLIGHT_DIRECTOR');
        handle.mapClientEventToSimEvent(EV.HDG_TOGGLE, 'AP_HDG_HOLD');
        handle.mapClientEventToSimEvent(EV.NAV_TOGGLE, 'AP_NAV1_HOLD');
        handle.mapClientEventToSimEvent(EV.APR_TOGGLE, 'AP_APR_HOLD');
        handle.mapClientEventToSimEvent(EV.BC_TOGGLE, 'AP_BC_HOLD');
        handle.mapClientEventToSimEvent(EV.ALT_TOGGLE, 'AP_ALT_HOLD');
        handle.mapClientEventToSimEvent(EV.FLC_TOGGLE, 'FLIGHT_LEVEL_CHANGE');
        handle.mapClientEventToSimEvent(EV.YD_TOGGLE, 'YAW_DAMPER_TOGGLE');

        // Add to notification group
        Object.values(EV).forEach(id => {
          handle.addClientEventToNotificationGroup(GROUP_K, id, false);
        });

        // Set group priority
        handle.setNotificationGroupPriority(GROUP_K, 0x00000001);

        LOG('✓ K-events mapped, waiting for 1sec tick');
      } catch (e) {
        LOG('⚠ K-event setup failed:', e.message);
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

            // Read all values
            for (let i = 0; i < AP_VARS.length; i++) {
              const v = AP_VARS[i];
              if (v.type === 'INT32') {
                const val = buffer.readInt32();
                flags[v.name] = val !== 0;
              } else if (v.type === 'FLOAT64') {
                const val = buffer.readDouble();
                flags[v.name] = val;
              }
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
  kReady = false;
  state.connected = false;
  state.titleResolved = false;
  LOG('disconnected, will reconnect in 2s');
  bus.publish({ type: 'status', connected: false });
  reconnectTimer = setTimeout(connect, 2000);
}

function kIdByName(name) {
  const nameToId = {
    'AP_MASTER': EV.AP_MASTER,
    'AP_MASTER_ON': EV.AP_MASTER_ON,
    'AP_MASTER_OFF': EV.AP_MASTER_OFF,
    'FLIGHT_DIRECTOR_ON': EV.FD_ON,
    'FLIGHT_DIRECTOR_OFF': EV.FD_OFF,
    'TOGGLE_FLIGHT_DIRECTOR': EV.FD_TOGGLE,
    'AP_HDG_HOLD_ON': EV.HDG_ON,
    'AP_HDG_HOLD_OFF': EV.HDG_OFF,
    'AP_HDG_HOLD': EV.HDG_TOGGLE,
    'AP_NAV1_HOLD_ON': EV.NAV_ON,
    'AP_NAV1_HOLD_OFF': EV.NAV_OFF,
    'AP_NAV1_HOLD': EV.NAV_TOGGLE,
    'AP_APR_HOLD_ON': EV.APR_ON,
    'AP_APR_HOLD_OFF': EV.APR_OFF,
    'AP_APR_HOLD': EV.APR_TOGGLE,
    'AP_BC_HOLD': EV.BC_TOGGLE,
    'AP_ALT_HOLD_ON': EV.ALT_ON,
    'AP_ALT_HOLD_OFF': EV.ALT_OFF,
    'AP_ALT_HOLD': EV.ALT_TOGGLE,
    'AP_VS_HOLD': EV.VS_HOLD,
    'FLIGHT_LEVEL_CHANGE_ON': EV.FLC_ON,
    'FLIGHT_LEVEL_CHANGE_OFF': EV.FLC_OFF,
    'FLIGHT_LEVEL_CHANGE': EV.FLC_TOGGLE,
    'YAW_DAMPER_TOGGLE': EV.YD_TOGGLE,
  };
  return nameToId[name] || null;
}

exports.sendK = (name, data = 0) => new Promise((resolve, reject) => {
  if (!state.connected || !handle) return reject(new Error('SimConnect not ready'));
  const id = kIdByName(name);
  if (id == null) return reject(new Error(`Unknown K-event: ${name}`));
  if (!kReady) {
    T('queue K-event (not ready):', name, data);
    kQueue.push({ name, data, resolve, reject });
    return;
  }
  _txK(name, data, resolve, reject);
});

function _txK(name, data, resolve, reject) {
  try {
    const id = kIdByName(name);
    T('TX K-event', JSON.stringify(name), `(id: 0x${id.toString(16)}) data: ${data|0}`);
    handle.transmitClientEvent(
      0,                    // SIMCONNECT_OBJECT_ID_USER
      id,                   // mapped client event id
      data|0,               // ensure integer
      GROUP_K,              // our notification group id
      0                     // EventFlag.EVENT_FLAG_DEFAULT
    );
    requestApOnce();
    resolve();
  } catch (e) {
    log.error('[simlink] sendK error:', e);
    reject(e);
  }
}

// (H-events via calculator code are not supported in node-simconnect)

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

// Press helper functions for G1000 NXi autopilot control
// Try Input Events first, then H-events via calculator code, then legacy K-events
function press(key, hEventCandidates, legacyEvent) {
  if (!handle) {
    log.warn('[simlink] press() called but not connected');
    return;
  }

  // 1. Try Input Event (preferred for NXi)
  if (INPUT[key]) {
    try {
      T(`Press ${key} via Input Event (hash: ${INPUT[key]})`);
      handle.setInputEvent(INPUT[key], 1);
      requestApOnce();
      return;
    } catch (e) {
      log.error(`[simlink] Input Event failed for ${key}:`, e);
    }
  }

  // 2. Skip H-events (requires calculator code not available here)

  // 3. Fallback to legacy K-event
  if (legacyEvent) {
    // Kick another enumeration attempt in case Input Events were not ready yet
    if (!INPUT[key]) {
      try { handle.enumerateInputEvents(0); } catch (_) {}
    }
    log.warn(`[simlink] Falling back to legacy K-event for ${key}: ${legacyEvent}`);
    exports.sendK(legacyEvent, 0).catch(e => {
      log.error(`[simlink] Legacy K-event ${legacyEvent} failed:`, e);
    });
  } else {
    log.error(`[simlink] All methods failed for ${key}`);
  }
}

exports.pressAP = () => {
  if (!handle) return;
  log.warn('[simlink] AP: toggling via K-event AP_MASTER');
  exports.sendK('AP_MASTER', 0).catch(e => {
    log.error('[simlink] K-event AP_MASTER failed:', e);
  });
  requestApOnce();
};
exports.pressFD = () => press('FD', H.FD, 'TOGGLE_FLIGHT_DIRECTOR');
exports.pressHDG = () => press('HDG', H.HDG, 'AP_HDG_HOLD');
exports.pressNAV = () => press('NAV', H.NAV, 'AP_NAV1_HOLD');
exports.pressAPR = () => press('APR', H.APR, 'AP_APR_HOLD');
exports.pressBC = () => press('BC', H.BC, 'AP_BC_HOLD');
exports.pressALT = () => press('ALT', H.ALT, 'AP_ALT_HOLD');
exports.pressVS = () => press('VS', H.VS, 'AP_VS_HOLD');
exports.pressFLC = () => press('FLC', H.FLC, 'FLIGHT_LEVEL_CHANGE');
exports.pressVNAV = () => press('VNAV', H.VNAV, 'AP_NAV1_HOLD');
exports.pressYD = () => press('YD', H.YD, 'YAW_DAMPER_TOGGLE');
