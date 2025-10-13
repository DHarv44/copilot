const statusEl = document.getElementById('status');
const iasVal = document.getElementById('ias');
const altVal = document.getElementById('alt');

const aircraftCard = document.getElementById('aircraft-card');
const aircraftTitle = document.getElementById('aircraft-title');
const manufacturer = document.getElementById('manufacturer');
const icao = document.getElementById('icao');
const avionicsBadges = document.getElementById('avionics-badges');
const autopilotSection = document.getElementById('autopilot-section');
const apModes = document.getElementById('ap-modes');
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
    aircraftTitle.textContent = profile.title || '—';
    manufacturer.textContent = profile.manufacturer || '—';
    icao.textContent = profile.icao || '—';

    // Avionics badges - only show what we actually detect
    avionicsBadges.innerHTML = '';
    if (profile.avionics?.g1000) addBadge('G1000', true);
    if (profile.avionics?.g3000) addBadge('G3000', true);
    if (profile.avionics?.g3x) addBadge('G3X', true);
    if (profile.avionics?.gtnxi) addBadge('GTNxi', true);

    // If nothing detected, say so
    if (!profile.avionics || (!profile.avionics.g1000 && !profile.avionics.g3000 && !profile.avionics.g3x && !profile.avionics.gtnxi)) {
      avionicsBadges.innerHTML = '<span class="unknown">Unknown</span>';
    }

    // Autopilot
    if (profile.autopilot?.available) {
      autopilotSection.style.display = 'block';
      const modes = profile.autopilot.modes || [];
      apModes.textContent = modes.length > 0 ? modes.join(' · ') : 'Basic AP';

      if (profile.autopilot.fd) {
        addBadge('FD', true);
      }
    } else {
      autopilotSection.style.display = 'none';
    }

    // Hide spinner
    profileStatus.style.display = 'none';

    console.log('[dashboard] profile updated:', profile);
  }

  function addBadge(label, active) {
    const badge = document.createElement('span');
    badge.className = 'badge' + (active ? '' : ' inactive');
    badge.textContent = label;
    avionicsBadges.appendChild(badge);
  }
} else {
  statusEl.textContent = 'Preload not available';
  statusEl.style.color = '#e74c3c';
}
