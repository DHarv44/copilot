// Events config - inline for now
const EVENTS = {
  "version": "1.0.0",
  "k": {
    "AP":   { "on": "AP_MASTER",               "off": "AP_MASTER",               "simvar": "AUTOPILOT MASTER" },
    "FD":   { "on": "FLIGHT_DIRECTOR_ON",      "off": "FLIGHT_DIRECTOR_OFF",     "simvar": "AUTOPILOT FLIGHT DIRECTOR ACTIVE" },
    "HDG":  { "on": "AP_HDG_HOLD_ON",          "off": "AP_HDG_HOLD_OFF",         "simvar": "AUTOPILOT HEADING LOCK" },
    "NAV":  { "on": "AP_NAV1_HOLD_ON",         "off": "AP_NAV1_HOLD_OFF",        "simvar": "AUTOPILOT NAV SELECTED" },
    "APR":  { "on": "AP_APR_HOLD_ON",          "off": "AP_APR_HOLD_OFF",         "simvar": "AUTOPILOT APPROACH ACTIVE" },
    "ALT":  { "on": "AP_ALT_HOLD_ON",          "off": "AP_ALT_HOLD_OFF",         "simvar": "AUTOPILOT ALTITUDE LOCK" },
    "VS":   { "on": "AP_VS_HOLD",              "off": "AP_VS_HOLD",              "simvar": "AUTOPILOT VERTICAL HOLD" },
    "FLC":  { "on": "FLIGHT_LEVEL_CHANGE_ON",  "off": "FLIGHT_LEVEL_CHANGE_OFF", "simvar": "AUTOPILOT FLIGHT LEVEL CHANGE" }
  }
};

const statusEl = document.getElementById('status');
const iasVal = document.getElementById('ias');
const altVal = document.getElementById('alt');

const aircraftCard = document.getElementById('aircraft-card');
const aircraftTitle = document.getElementById('aircraft-title');
const manufacturer = document.getElementById('manufacturer');
const icao = document.getElementById('icao');
const avionicsBadges = document.getElementById('avionics-badges');
const autopilotSection = document.getElementById('autopilot-section');
const apBadges = document.getElementById('ap-badges');
const profileStatus = document.getElementById('profile-status');
const apBar = document.getElementById('ap-bar');

statusEl.textContent = 'Waiting for sim…';

function sendKey(key, turnOn) {
  const def = EVENTS.k[key];
  if (!def) return;
  const event = turnOn ? def.on : (def.off || def.on);
  const id = window.cmd.send({ type: 'k', event });
  console.debug('→ K', key, turnOn ? 'ON' : 'OFF', event, id);
}

apBar?.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-key]');
  if (!btn) return;
  const active = btn.classList.contains('active');
  sendKey(btn.dataset.key, !active);
});

if (window.api) {
  // Handle history (on load)
  window.api.onHistory((history) => {
    history.forEach(processMsg);
  });

  // Handle live messages
  window.api.onBus(processMsg);

  function processMsg(msg) {
    if (!msg || typeof msg !== 'object') return;

    if (msg.type === 'status') {
      statusEl.textContent = msg.connected ? 'Connected' : 'Disconnected';
      statusEl.style.color = msg.connected ? '#2ecc71' : '#e67e22';
    }

    if (msg.type === 'aircraft') {
      aircraftCard.style.display = 'block';
      aircraftTitle.textContent = msg.title || '—';
      profileStatus.innerHTML = '<div class="spinner">Detecting avionics...</div>';
      profileStatus.style.display = 'block';
      autopilotSection.style.display = 'none';
    }

    if (msg.type === 'aircraftProfile') {
      updateAircraftProfile(msg);
    }

    if (msg.type === 'aircraftError') {
      aircraftCard.style.display = 'block';
      profileStatus.style.display = 'block';
      if (msg.reason === 'TITLE_EMPTY_TIMEOUT') {
        profileStatus.innerHTML = '<div class="error">⚠ Aircraft data unavailable (TITLE timeout after ' + (msg.attempts || 10) + ' attempts)</div>';
      } else if (msg.reason === 'METADATA_EMPTY_TITLE') {
        profileStatus.innerHTML = '<div class="error">⚠ Aircraft metadata incomplete (empty TITLE)</div>';
      } else {
        profileStatus.innerHTML = '<div class="error">⚠ Aircraft data error: ' + msg.reason + '</div>';
      }
    }

    if (msg.type === 'sample') {
      if (typeof msg.ias === 'number') iasVal.textContent = msg.ias.toFixed(1) + ' kt';
      if (typeof msg.alt === 'number') altVal.textContent = Math.round(msg.alt).toLocaleString() + ' ft';
    }
  }

  function updateAircraftProfile(profile) {
    aircraftCard.style.display = 'block';
    aircraftTitle.textContent = profile.title || 'Unresolved';
    manufacturer.textContent = profile.manufacturer === 'unknown' ? 'Unresolved' : (profile.manufacturer || 'Unresolved');
    icao.textContent = profile.icao === 'unknown' ? 'Unresolved' : (profile.icao || 'Unresolved');

    // Panel Inventory - show gauge packages
    avionicsBadges.innerHTML = '';

    if (profile.panel?.gauges && profile.panel.gauges.length > 0) {
      // Group gauges by first two path segments to show packages
      const packages = {};
      for (const gauge of profile.panel.gauges) {
        const parts = gauge.path.split('/');
        const pkg = parts.slice(0, 2).join('/');
        packages[pkg] = (packages[pkg] || 0) + 1;
      }

      // Display unique packages
      const pkgList = Object.entries(packages)
        .sort((a, b) => b[1] - a[1]) // Sort by count descending
        .map(([pkg, count]) => `${pkg} (${count})`)
        .join(', ');

      avionicsBadges.innerHTML = `<span class="inventory">${pkgList}</span>`;
    } else {
      avionicsBadges.innerHTML = '<span class="unresolved">No gauges found</span>';
    }

    // Autopilot - tri-state
    if (profile.autopilot?.available === 'true') {
      autopilotSection.style.display = 'block';

      // Badges for FD and AP
      apBadges.innerHTML = '';
      if (profile.autopilot.fd === 'true') addBadge('FD', 'true', apBadges);
      addBadge('AP', 'true', apBadges);
    } else if (profile.autopilot?.available === 'unknown') {
      autopilotSection.style.display = 'block';
      apBadges.innerHTML = '<span class="unresolved">Unresolved</span>';
    } else {
      autopilotSection.style.display = 'none';
    }

    // Hide spinner
    profileStatus.style.display = 'none';

    console.log('[dashboard] profile updated:', profile);
  }

  function addBadge(label, state, container) {
    const badge = document.createElement('span');
    if (state === 'true') {
      badge.className = 'badge';
    } else if (state === 'unknown') {
      badge.className = 'badge unresolved';
    } else {
      badge.className = 'badge inactive';
    }
    badge.textContent = label;
    (container || avionicsBadges).appendChild(badge);
  }
} else {
  statusEl.textContent = 'Preload not available';
  statusEl.style.color = '#e74c3c';
}

window.sim?.onUpdate(msg => {
  if (msg.type !== 'apState') return;
  for (const [key, def] of Object.entries(EVENTS.k)) {
    const el = apBar?.querySelector(`[data-key="${key}"]`);
    if (!el || !def.simvar) continue;

    const isActive = !!msg.flags[def.simvar];
    el.classList.toggle('active', isActive);
  }
});

window.cmd?.onAck(({ id, ok, err }) => {
  if (!ok) console.warn('K-ack failed', id, err);
});
