const {
  open, Protocol,
  SimConnectDataType, SimConnectPeriod, SimConnectConstants
} = require('node-simconnect');

const bus = require('./bus');

// Use unique IDs to avoid conflicts from previous connections
const DEF_TITLE = 100, REQ_TITLE = 100;
const DEF_SAMPLE = 101, REQ_SAMPLE = 101;
const DEF_METADATA = 102, REQ_METADATA = 102;
const EVT_AIRCRAFT_LOADED = 1001;

let handle = null;
let reconnectTimer = null;
let titleRetryTimer = null;
let titleRetryCount = 0;
const TITLE_RETRY_MAX = 10; // 5 seconds (500ms * 10)

// State machine for debugging
const LOG = (...args) => console.log('[simlink]', ...args);
let state = {
  connected: false,
  lastLoadedAt: null,
  titleAttempts: 0,
  titleResolved: false,
  lastTitle: null
};

function connect() {
  if (reconnectTimer) clearTimeout(reconnectTimer);

  LOG('attempting connection...');
  open('MSFS-Electron-Hello', Protocol.FSX_SP2)
    .then(({ recvOpen, handle: h }) => {
      handle = h;
      state.connected = true;
      LOG('✓ connected to', recvOpen.applicationName);
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
        if (ev.clientEventId === EVT_AIRCRAFT_LOADED) {
          state.lastLoadedAt = Date.now();
          state.titleResolved = false;
          LOG('>>> AircraftLoaded event at', new Date().toISOString());
          titleRetryCount = 0;
          requestAircraftData();
        }
      });

      handle.on('simObjectData', (packet) => {
        if (packet.requestID === REQ_TITLE) {
          const title = packet.data.readString(256);
          LOG('← TITLE response:', title ? `"${title}"` : '(empty)');
          handleTitleResponse(title);
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
        LOG('⚠ SimConnect exception:', ex);
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
        LOG('error:', e);
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

module.exports = { connect };
