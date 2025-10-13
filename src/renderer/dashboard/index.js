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

statusEl.textContent = 'Waiting for sim…';

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
