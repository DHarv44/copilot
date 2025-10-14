// Events config - inline for now
const EVENTS = {
  "version": "1.0.0",
  "k": {
    "AP": { "on": "AP_MASTER", "off": "AP_MASTER", "simvar": "AUTOPILOT MASTER" },
    "FD": { "on": "FLIGHT_DIRECTOR_ON", "off": "FLIGHT_DIRECTOR_OFF", "simvar": "AUTOPILOT FLIGHT DIRECTOR ACTIVE" },
    "HDG": { "on": "AP_HDG_HOLD_ON", "off": "AP_HDG_HOLD_OFF", "simvar": "AUTOPILOT HEADING LOCK" },
    "NAV": { "on": "AP_NAV1_HOLD_ON", "off": "AP_NAV1_HOLD_OFF", "simvar": "AUTOPILOT NAV1 LOCK" },
    "APR": { "on": "AP_APR_HOLD_ON", "off": "AP_APR_HOLD_OFF", "simvar": "AUTOPILOT APPROACH ACTIVE" },
    "ALT": { "on": "AP_ALT_HOLD_ON", "off": "AP_ALT_HOLD_OFF", "simvar": "AUTOPILOT ALTITUDE LOCK" },
    "VS": { "on": "AP_VS_HOLD", "off": "AP_VS_HOLD", "simvar": "AUTOPILOT VERTICAL HOLD" },
    "FLC": { "on": "FLIGHT_LEVEL_CHANGE_ON", "off": "FLIGHT_LEVEL_CHANGE_OFF", "simvar": "AUTOPILOT FLIGHT LEVEL CHANGE" }
  }
};

// Controls configuration
const CONTROLS = {
  pushButtons: [
    { id: 'AP', cx: 236.39, cy: 69.17, label: 'AP' },
    { id: 'FD', cx: 271.74, cy: 69.17, label: 'FD' },
    { id: 'YD', cx: 307.26, cy: 69.17, label: 'YD' },
    { id: 'HDG', cx: 236.39, cy: 99.83, label: 'HDG' },
    { id: 'ALT', cx: 271.74, cy: 99.83, label: 'ALT' },
    { id: 'NAV', cx: 236.39, cy: 130.50, label: 'NAV' },
    { id: 'VNAV', cx: 271.74, cy: 130.50, label: 'VNAV' },
    { id: 'APR', cx: 236.39, cy: 161.16, label: 'APR' },
    { id: 'BC', cx: 271.74, cy: 161.16, label: 'BC' },
    { id: 'VS', cx: 236.39, cy: 191.82, label: 'VS' },
    { id: 'FLC', cx: 271.74, cy: 191.82, label: 'FLC' },
    { id: 'BANK', cx: 200.71, cy: 69.17, label: 'BANK' }
  ],
  rotaryKnobs: [
    { id: 'IAS_KNOB', cx: 165.07, cy: 69.17, label: '' },
    { id: 'HDG_KNOB', cx: 122.95, cy: 117.62, label: '' },
    { id: 'ALT_KNOB', cx: 385.03, cy: 117.66, label: '' }
  ],
  pushRotaryKnobs: [
    { id: 'MFD', x: 355.71, y: 15.62, width: 15, height: 15, label: '' },
    { id: 'PFD', x: 378.28, y: 15.85, width: 15, height: 15, label: '' },
    { id: 'PANEL1', x: 116.39, y: 15.13, width: 15, height: 15, label: '' },
    { id: 'PANEL2', x: 138.96, y: 15.37, width: 15, height: 15, label: '' }
  ],
  smallCircles: [
    // Top row small circles (r=7) - likely indicator lights or small buttons
    { id: 'IND_TOP_1', cx: 172.98, cy: 23.35, r: 7 },
    { id: 'IND_TOP_2', cx: 192.98, cy: 23.35, r: 7 },
    { id: 'IND_TOP_3', cx: 212.99, cy: 23.35, r: 7 },
    { id: 'IND_TOP_4', cx: 232.99, cy: 23.35, r: 7 },
    { id: 'IND_TOP_5', cx: 253.00, cy: 23.35, r: 7 },
    { id: 'IND_TOP_6', cx: 273.00, cy: 23.35, r: 7 },
    { id: 'IND_TOP_7', cx: 293.00, cy: 23.35, r: 7 },
    { id: 'IND_TOP_8', cx: 313.01, cy: 23.35, r: 7 },
    // Left side small circles
    { id: 'IND_LEFT_1', cx: 48.68, cy: 112.22, r: 7 },
    { id: 'IND_LEFT_2', cx: 73.02, cy: 112.22, r: 7 },
    { id: 'IND_LEFT_3', cx: 97.45, cy: 112.22, r: 7 },
    // Right side
    { id: 'IND_RIGHT_1', cx: 461.72, cy: 110.84, r: 7 }
  ],
  indicators: [
    // Bottom indicator lights (colored circles r=4)
    { id: 'IND_GREEN_1', cx: 265.18, cy: 228.53, r: 4, color: '#05988a' },
    { id: 'IND_GREEN_2', cx: 254.55, cy: 243.88, r: 4, color: '#05988a' },
    { id: 'IND_GREEN_3', cx: 275.82, cy: 244.37, r: 4, color: '#05988a' },
    { id: 'IND_RED_1', cx: 283.80, cy: 219.94, r: 4, color: '#da1400' }
  ],
  toggleSwitches: [
    // Top row lighting controls - matching circles at cy=23.351034
    { id: 'LAND', cx: 172.98, cy: 23.35, label: 'LAND' },
    { id: 'TAXI', cx: 192.98, cy: 23.35, label: 'TAXI' },
    { id: 'WINGS', cx: 212.99, cy: 23.35, label: 'WINGS' },
    { id: 'NAV', cx: 232.99, cy: 23.35, label: 'NAV' },
    { id: 'RECOG', cx: 253.00, cy: 23.35, label: 'RECOG' },
    { id: 'STROBE', cx: 273.00, cy: 23.35, label: 'STROBE' },
    { id: 'TAIL', cx: 293.00, cy: 23.35, label: 'TAIL' },
    { id: 'BEACON', cx: 313.01, cy: 23.35, label: 'BEACON' }
  ]
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

function sendKey(key) {
  // Use new Input Event / H-event / K-event fallback system
  const id = window.cmd.send({ type: 'press', button: key });
  console.debug('→ Press', key, id);
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

  // Update SVG control states (if cockpit view is active)
  const svg = svgContainer?.querySelector('svg');
  if (svg) {
    for (const [key, def] of Object.entries(EVENTS.k)) {
      const control = svg.querySelector(`.control[data-id="${key}"]`);
      if (!control || !def.simvar) continue;

      const isActive = !!msg.flags[def.simvar];

      // Update visual state
      if (isActive) {
        control.classList.add('active');
        const shape = control.querySelector('rect, circle');
        if (shape) {
          shape.setAttribute('fill', 'url(#activeButtonGradient)');
          shape.setAttribute('stroke', '#00aa00');
        }
        const text = control.querySelector('text');
        if (text) text.setAttribute('fill', '#00ff00');
      } else {
        control.classList.remove('active');
        const shape = control.querySelector('rect, circle');
        if (shape) {
          shape.setAttribute('fill', 'url(#pushButtonGradient)');
          shape.setAttribute('stroke', '#2a2a2a');
        }
        const text = control.querySelector('text');
        if (text) text.setAttribute('fill', '#d0d0d0');
      }

      // Update background SVG text labels
      const labelId = `svg-label-${key}`;
      const bgLabel = svg.querySelector(`#${labelId}`);
      if (bgLabel) {
        const tspan = bgLabel.querySelector('tspan');
        const color = isActive ? '#00ff00' : '#3a617a';

        // Update both fill attribute and style to override inline styles
        bgLabel.setAttribute('fill', color);
        bgLabel.style.fill = color;

        if (tspan) {
          tspan.setAttribute('fill', color);
          tspan.style.fill = color;
        }
      }
    }
  }

  // Update autopilot monitor table
  updateApVarsTable(msg.flags);
});

window.cmd?.onAck(({ id, ok, err }) => {
  if (!ok) console.warn('K-ack failed', id, err);
});

// Cockpit SVG interaction - declare variables first
const svgContainer = document.getElementById('svg-container');

// Autopilot monitor
const apVarsBody = document.getElementById('ap-vars-body');
const apVarRows = {};

// View switching
const navBtns = document.querySelectorAll('.nav-btn');
const views = {
  sim: document.getElementById('view-sim'),
  cockpit: document.getElementById('view-cockpit'),
  autopilot: document.getElementById('view-autopilot')
};

let currentView = localStorage.getItem('lastView') || 'cockpit';

function switchView(viewName) {
  if (!views[viewName]) return;

  currentView = viewName;
  localStorage.setItem('lastView', viewName);

  // Update nav buttons
  navBtns.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === viewName);
  });

  // Update views
  Object.entries(views).forEach(([name, el]) => {
    el.classList.toggle('active', name === viewName);
  });

  // Initialize cockpit if first time
  if (viewName === 'cockpit' && !window.cockpitInitialized) {
    initCockpit();
  }
}

navBtns.forEach(btn => {
  btn.addEventListener('click', () => switchView(btn.dataset.view));
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.key === '1') {
    e.preventDefault();
    switchView('sim');
  } else if (e.ctrlKey && e.key === '2') {
    e.preventDefault();
    switchView('cockpit');
  }
});

async function initCockpit() {
  window.cockpitInitialized = true;

  if (!window.navboard) {
    svgContainer.innerHTML = `<div style="color:#f85149;padding:20px;">Navboard API not available (preload bridge error)</div>`;
    console.error('window.navboard is undefined');
    return;
  }

  try {
    const svgText = await window.navboard.getSvgText();
    svgContainer.innerHTML = svgText;

    const svg = svgContainer.querySelector('svg');
    if (!svg) throw new Error('No SVG element found');

    // Keep viewBox for proper scaling, but ensure it preserves aspect ratio
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');

    // Add button overlay layer
    addApButtonLayer(svg);

    // Event delegation for button clicks
    svg.addEventListener('click', handleApButtonClick);
  } catch (err) {
    svgContainer.innerHTML = `<div style="color:#f85149;padding:20px;">Failed to load SVG: ${err.message}</div>`;
    console.error('SVG load error:', err);
  }
}

function addApButtonLayer(svg) {
  // Add gradient definitions for 3D effect
  let defs = svg.querySelector('defs');
  if (!defs) {
    defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    svg.insertBefore(defs, svg.firstChild);
  }

  // Push button gradient (light from right)
  const pushGradient = document.createElementNS('http://www.w3.org/2000/svg', 'radialGradient');
  pushGradient.setAttribute('id', 'pushButtonGradient');
  pushGradient.setAttribute('cx', '65%');
  pushGradient.setAttribute('cy', '35%');

  const stop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
  stop1.setAttribute('offset', '0%');
  stop1.setAttribute('stop-color', '#5a5a5a');

  const stop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
  stop2.setAttribute('offset', '100%');
  stop2.setAttribute('stop-color', '#3a3a3a');

  pushGradient.appendChild(stop1);
  pushGradient.appendChild(stop2);
  defs.appendChild(pushGradient);

  // Active button gradient (green)
  const activeGradient = document.createElementNS('http://www.w3.org/2000/svg', 'radialGradient');
  activeGradient.setAttribute('id', 'activeButtonGradient');
  activeGradient.setAttribute('cx', '65%');
  activeGradient.setAttribute('cy', '35%');

  const stop5 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
  stop5.setAttribute('offset', '0%');
  stop5.setAttribute('stop-color', '#00ff00');

  const stop6 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
  stop6.setAttribute('offset', '100%');
  stop6.setAttribute('stop-color', '#00aa00');

  activeGradient.appendChild(stop5);
  activeGradient.appendChild(stop6);
  defs.appendChild(activeGradient);

  // Rotary knob gradient
  const rotaryGradient = document.createElementNS('http://www.w3.org/2000/svg', 'radialGradient');
  rotaryGradient.setAttribute('id', 'rotaryKnobGradient');
  rotaryGradient.setAttribute('cx', '30%');
  rotaryGradient.setAttribute('cy', '30%');

  const stop3 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
  stop3.setAttribute('offset', '0%');
  stop3.setAttribute('stop-color', '#4a4a4a');

  const stop4 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
  stop4.setAttribute('offset', '100%');
  stop4.setAttribute('stop-color', '#2a2a2a');

  rotaryGradient.appendChild(stop3);
  rotaryGradient.appendChild(stop4);
  defs.appendChild(rotaryGradient);

  // Toggle lever gradient (for old-school toggle switches)
  const toggleLeverGradient = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
  toggleLeverGradient.setAttribute('id', 'toggleLeverGradient');
  toggleLeverGradient.setAttribute('x1', '0%');
  toggleLeverGradient.setAttribute('y1', '0%');
  toggleLeverGradient.setAttribute('x2', '100%');
  toggleLeverGradient.setAttribute('y2', '0%');

  const stop7 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
  stop7.setAttribute('offset', '0%');
  stop7.setAttribute('stop-color', '#4a4a4a');

  const stop8 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
  stop8.setAttribute('offset', '50%');
  stop8.setAttribute('stop-color', '#5a5a5a');

  const stop9 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
  stop9.setAttribute('offset', '100%');
  stop9.setAttribute('stop-color', '#3a3a3a');

  toggleLeverGradient.appendChild(stop7);
  toggleLeverGradient.appendChild(stop8);
  toggleLeverGradient.appendChild(stop9);
  defs.appendChild(toggleLeverGradient);

  // Create a new group for controls overlay
  const controlsGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  controlsGroup.setAttribute('id', 'controls-layer');

  // Add push buttons
  CONTROLS.pushButtons.forEach(btn => {
    const btnGroup = createPushButton(btn.cx, btn.cy, btn.id, btn.label);
    controlsGroup.appendChild(btnGroup);
  });

  // Add rotary knobs
  CONTROLS.rotaryKnobs.forEach(knob => {
    const knobGroup = createRotaryKnob(knob.cx, knob.cy, knob.id, knob.label);
    controlsGroup.appendChild(knobGroup);
  });

  // Add push-rotary knobs
  CONTROLS.pushRotaryKnobs.forEach(knob => {
    const knobGroup = createPushRotaryKnob(knob.x, knob.y, knob.width, knob.height, knob.id, knob.label);
    controlsGroup.appendChild(knobGroup);
  });

  // Add small circles (small buttons/indicators)
  CONTROLS.smallCircles.forEach(circle => {
    const circleGroup = createSmallCircle(circle.cx, circle.cy, circle.r, circle.id);
    controlsGroup.appendChild(circleGroup);
  });

  // Add colored indicator lights
  CONTROLS.indicators.forEach(ind => {
    const indGroup = createIndicator(ind.cx, ind.cy, ind.r, ind.id, ind.color);
    controlsGroup.appendChild(indGroup);
  });

  // Add toggle switches
  CONTROLS.toggleSwitches.forEach(toggle => {
    const toggleGroup = createToggleSwitch(toggle.cx, toggle.cy, toggle.id, toggle.label);
    controlsGroup.appendChild(toggleGroup);
  });

  svg.appendChild(controlsGroup);
}

function createPushButton(cx, cy, id, label) {
  const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  group.setAttribute('class', 'control push-button');
  group.setAttribute('data-id', id);
  group.setAttribute('data-type', 'push-button');

  const width = 22;
  const height = 16;
  const x = cx - width / 2;
  const y = cy - height / 2;

  // Shadow (top-left for perspective from left, light from right)
  const shadow = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  shadow.setAttribute('x', x - 1);
  shadow.setAttribute('y', y - 1);
  shadow.setAttribute('width', width);
  shadow.setAttribute('height', height);
  shadow.setAttribute('rx', 2);
  shadow.setAttribute('fill', '#1a1a1a');
  shadow.setAttribute('opacity', 0.5);

  // Main button body
  const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  rect.setAttribute('x', x);
  rect.setAttribute('y', y);
  rect.setAttribute('width', width);
  rect.setAttribute('height', height);
  rect.setAttribute('rx', 2);
  rect.setAttribute('fill', 'url(#pushButtonGradient)');
  rect.setAttribute('stroke', '#2a2a2a');
  rect.setAttribute('stroke-width', 1);

  const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  text.setAttribute('x', cx);
  text.setAttribute('y', cy);
  text.setAttribute('font-family', 'sans-serif');
  text.setAttribute('font-size', 7);
  text.setAttribute('font-weight', 'bold');
  text.setAttribute('fill', '#ffffff');
  text.setAttribute('text-anchor', 'middle');
  text.setAttribute('dominant-baseline', 'central');
  text.textContent = label;

  group.appendChild(shadow);
  group.appendChild(rect);
  group.appendChild(text);
  return group;
}

function createRotaryKnob(cx, cy, id, label) {
  const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  group.setAttribute('class', 'control rotary-knob');
  group.setAttribute('data-id', id);
  group.setAttribute('data-type', 'rotary-knob');

  // Shadow
  const shadow = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  shadow.setAttribute('cx', cx + 0.8);
  shadow.setAttribute('cy', cy + 0.8);
  shadow.setAttribute('r', 7);
  shadow.setAttribute('fill', '#0a0a0a');
  shadow.setAttribute('opacity', 0.6);

  // Main knob body
  const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  circle.setAttribute('cx', cx);
  circle.setAttribute('cy', cy);
  circle.setAttribute('r', 7);
  circle.setAttribute('fill', 'url(#rotaryKnobGradient)');
  circle.setAttribute('stroke', '#1a1a1a');
  circle.setAttribute('stroke-width', 1);

  // Highlight
  const highlight = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  highlight.setAttribute('cx', cx - 1.5);
  highlight.setAttribute('cy', cy - 1.5);
  highlight.setAttribute('r', 2.5);
  highlight.setAttribute('fill', '#5a5a5a');
  highlight.setAttribute('opacity', 0.7);

  // Rotation indicator line
  const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  line.setAttribute('x1', cx);
  line.setAttribute('y1', cy);
  line.setAttribute('x2', cx);
  line.setAttribute('y2', cy - 6);
  line.setAttribute('stroke', '#c0c0c0');
  line.setAttribute('stroke-width', 1.5);
  line.setAttribute('stroke-linecap', 'round');

  group.appendChild(shadow);
  group.appendChild(circle);
  group.appendChild(highlight);
  group.appendChild(line);
  return group;
}

function createPushRotaryKnob(x, y, width, height, id, label) {
  const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  group.setAttribute('class', 'control push-rotary-knob');
  group.setAttribute('data-id', id);
  group.setAttribute('data-type', 'push-rotary-knob');

  // Shadow for rect
  const rectShadow = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  rectShadow.setAttribute('x', x + 0.8);
  rectShadow.setAttribute('y', y + 0.8);
  rectShadow.setAttribute('width', width);
  rectShadow.setAttribute('height', height);
  rectShadow.setAttribute('fill', '#0a0a0a');
  rectShadow.setAttribute('opacity', 0.5);

  // Main rect body
  const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  rect.setAttribute('x', x);
  rect.setAttribute('y', y);
  rect.setAttribute('width', width);
  rect.setAttribute('height', height);
  rect.setAttribute('fill', 'url(#pushButtonGradient)');
  rect.setAttribute('stroke', '#2a2a2a');
  rect.setAttribute('stroke-width', 1);

  // Highlight on rect
  const rectHighlight = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  rectHighlight.setAttribute('x', x + 1);
  rectHighlight.setAttribute('y', y + 1);
  rectHighlight.setAttribute('width', width / 2);
  rectHighlight.setAttribute('height', height / 3);
  rectHighlight.setAttribute('fill', '#6a6a6a');
  rectHighlight.setAttribute('opacity', 0.4);

  const cx = x + width / 2;
  const cy = y + height / 2;

  const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  circle.setAttribute('cx', cx);
  circle.setAttribute('cy', cy);
  circle.setAttribute('r', 5);
  circle.setAttribute('fill', '#2a2a2a');
  circle.setAttribute('stroke', '#1a1a1a');
  circle.setAttribute('stroke-width', 0.5);

  // Rotation indicator line
  const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  line.setAttribute('x1', cx);
  line.setAttribute('y1', cy);
  line.setAttribute('x2', cx);
  line.setAttribute('y2', cy - 4);
  line.setAttribute('stroke', '#c0c0c0');
  line.setAttribute('stroke-width', 1.2);
  line.setAttribute('stroke-linecap', 'round');

  group.appendChild(rectShadow);
  group.appendChild(rect);
  group.appendChild(rectHighlight);
  group.appendChild(circle);
  group.appendChild(line);
  return group;
}

function createSmallCircle(cx, cy, r, id) {
  const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  group.setAttribute('class', 'control small-circle');
  group.setAttribute('data-id', id);
  group.setAttribute('data-type', 'small-circle');

  // Shadow
  const shadow = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  shadow.setAttribute('cx', cx - 0.5);
  shadow.setAttribute('cy', cy - 0.5);
  shadow.setAttribute('r', r);
  shadow.setAttribute('fill', '#0a0a0a');
  shadow.setAttribute('opacity', 0.5);

  // Main circle
  const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  circle.setAttribute('cx', cx);
  circle.setAttribute('cy', cy);
  circle.setAttribute('r', r);
  circle.setAttribute('fill', 'url(#rotaryKnobGradient)');
  circle.setAttribute('stroke', '#1a1a1a');
  circle.setAttribute('stroke-width', 0.8);

  // Small highlight
  const highlight = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  highlight.setAttribute('cx', cx + 1.5);
  highlight.setAttribute('cy', cy - 1.5);
  highlight.setAttribute('r', r / 3);
  highlight.setAttribute('fill', '#5a5a5a');
  highlight.setAttribute('opacity', 0.6);

  group.appendChild(shadow);
  group.appendChild(circle);
  group.appendChild(highlight);
  return group;
}

function createIndicator(cx, cy, r, id, color) {
  const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  group.setAttribute('class', 'control indicator');
  group.setAttribute('data-id', id);
  group.setAttribute('data-type', 'indicator');

  // Glow effect
  const glow = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  glow.setAttribute('cx', cx);
  glow.setAttribute('cy', cy);
  glow.setAttribute('r', r + 1);
  glow.setAttribute('fill', color);
  glow.setAttribute('opacity', 0.3);

  // Main indicator circle
  const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  circle.setAttribute('cx', cx);
  circle.setAttribute('cy', cy);
  circle.setAttribute('r', r);
  circle.setAttribute('fill', color);
  circle.setAttribute('stroke', '#1a1a1a');
  circle.setAttribute('stroke-width', 0.5);

  group.appendChild(glow);
  group.appendChild(circle);
  return group;
}

function createToggleSwitch(cx, cy, id, label) {
  const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  group.setAttribute('class', 'control toggle-switch');
  group.setAttribute('data-id', id);
  group.setAttribute('data-type', 'toggle-switch');
  group.setAttribute('data-state', 'off'); // Initial state

  const plateWidth = 12;
  const plateHeight = 12;
  const plateX = cx - plateWidth / 2;
  const plateY = cy - plateHeight / 2;

  // Base mounting plate
  const plate = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  plate.setAttribute('x', plateX);
  plate.setAttribute('y', plateY);
  plate.setAttribute('width', plateWidth);
  plate.setAttribute('height', plateHeight);
  plate.setAttribute('rx', 2);
  plate.setAttribute('fill', '#3a3a3a');
  plate.setAttribute('stroke', '#1a1a1a');
  plate.setAttribute('stroke-width', 1);

  // Mounting screws (4 corners)
  const screwPositions = [
    { x: plateX + 2.5, y: plateY + 2.5 },
    { x: plateX + plateWidth - 2.5, y: plateY + 2.5 },
    { x: plateX + 2.5, y: plateY + plateHeight - 2.5 },
    { x: plateX + plateWidth - 2.5, y: plateY + plateHeight - 2.5 }
  ];

  const screws = screwPositions.map(pos => {
    const screw = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    screw.setAttribute('cx', pos.x);
    screw.setAttribute('cy', pos.y);
    screw.setAttribute('r', 0.9);
    screw.setAttribute('fill', '#2a2a2a');
    screw.setAttribute('stroke', '#1a1a1a');
    screw.setAttribute('stroke-width', 0.3);
    return screw;
  });

  // Pivot point/bolt at center
  const pivot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  pivot.setAttribute('cx', cx);
  pivot.setAttribute('cy', cy);
  pivot.setAttribute('r', 1.2);
  pivot.setAttribute('fill', '#1a1a1a');
  pivot.setAttribute('stroke', '#0a0a0a');
  pivot.setAttribute('stroke-width', 0.3);

  // Toggle lever shadow (OFF - tilted down -15 degrees)
  const leverShadow = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  leverShadow.setAttribute('x', cx - 1.2);
  leverShadow.setAttribute('y', cy);
  leverShadow.setAttribute('width', 2.4);
  leverShadow.setAttribute('height', 12);
  leverShadow.setAttribute('rx', 1.2);
  leverShadow.setAttribute('fill', '#0a0a0a');
  leverShadow.setAttribute('opacity', 0.4);
  leverShadow.setAttribute('transform', `rotate(-15 ${cx} ${cy})`);
  leverShadow.classList.add('toggle-lever-shadow');

  // Toggle lever/bat (OFF - tilted down -15 degrees)
  const lever = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  lever.setAttribute('x', cx - 1.8);
  lever.setAttribute('y', cy);
  lever.setAttribute('width', 3.6);
  lever.setAttribute('height', 12);
  lever.setAttribute('rx', 1.2);
  lever.setAttribute('fill', 'url(#toggleLeverGradient)');
  lever.setAttribute('stroke', '#1a1a1a');
  lever.setAttribute('stroke-width', 0.6);
  lever.setAttribute('transform', `rotate(-15 ${cx} ${cy})`);
  lever.classList.add('toggle-lever');

  // Lever tip highlight
  const highlight = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
  highlight.setAttribute('cx', cx);
  highlight.setAttribute('cy', cy + 12);
  highlight.setAttribute('rx', 2);
  highlight.setAttribute('ry', 1.5);
  highlight.setAttribute('fill', '#6a6a6a');
  highlight.setAttribute('opacity', 0.5);
  highlight.setAttribute('transform', `rotate(-15 ${cx} ${cy})`);

  group.appendChild(plate);
  screws.forEach(screw => group.appendChild(screw));
  group.appendChild(pivot);
  group.appendChild(leverShadow);
  group.appendChild(lever);
  group.appendChild(highlight);

  return group;
}

function handleApButtonClick(e) {
  const control = e.target.closest('.control');
  if (!control) return;

  const id = control.getAttribute('data-id');
  const type = control.getAttribute('data-type');

  if (!id) return;

  if (type === 'push-button') {
    // Send press command for push buttons
    sendKey(id);
  } else if (type === 'toggle-switch') {
    // Toggle the switch state
    const currentState = control.getAttribute('data-state');
    const newState = currentState === 'on' ? 'off' : 'on';
    control.setAttribute('data-state', newState);

    // Get the lever elements and rotate them
    const leverShadow = control.querySelector('.toggle-lever-shadow');
    const lever = control.querySelector('.toggle-lever');
    const highlight = control.querySelector('ellipse');
    const cx = parseFloat(control.querySelector('circle').getAttribute('cx'));
    const cy = parseFloat(control.querySelector('circle').getAttribute('cy'));

    if (newState === 'on') {
      // Rotate to 105 degrees (ON position)
      leverShadow.setAttribute('transform', `rotate(-185)`);
      lever.setAttribute('transform', `rotate(-185)`);
      highlight.setAttribute('transform', `rotate(-185)`);
    } else {
      // Rotate to -15 degrees (OFF position)
      leverShadow.setAttribute('transform', `rotate(-15 ${cx} ${cy})`);;
      lever.setAttribute('transform', `rotate(-15 ${cx} ${cy})`);;
      highlight.setAttribute('transform', `rotate(-15 ${cx} ${cy})`);;
    }

    // Update background SVG label color
    const svg = svgContainer?.querySelector('svg');
    if (svg) {
      const labelId = `svg-label-${id}`;
      const bgLabel = svg.querySelector(`#${labelId}`);
      if (bgLabel) {
        const tspan = bgLabel.querySelector('tspan');
        const color = newState === 'on' ? '#00ff00' : '#3a617a';
        bgLabel.setAttribute('fill', color);
        bgLabel.style.fill = color;
        if (tspan) {
          tspan.setAttribute('fill', color);
          tspan.style.fill = color;
        }
      }
    }
  } else if (type === 'rotary-knob' || type === 'push-rotary-knob' || type === 'small-circle') {
    // TODO: Handle rotary knob interactions
    console.log('Control clicked:', type, id);
  }
}

function handleSvgClick(e) {
  const target = findElementWithId(e.target);
  if (!target || !target.id) return;

  sendInteraction('click', target, e);
}

function handleSvgHover(e) {
  const target = findElementWithId(e.target);
  if (!target || !target.id) return;

  sendInteraction('mouseenter', target, e);
}

function handleSvgLeave(e) {
  const target = findElementWithId(e.target);
  if (!target || !target.id) return;

  sendInteraction('mouseleave', target, e);
}

function findElementWithId(el) {
  while (el && el !== svgContainer) {
    if (el.id) return el;
    el = el.parentElement;
  }
  return null;
}

function sendInteraction(type, target, e) {
  window.navboard.sendInteraction({
    type,
    id: target.id,
    tag: target.tagName.toLowerCase(),
    classes: Array.from(target.classList || []),
    clientX: e.clientX,
    clientY: e.clientY,
    timestamp: Date.now()
  });
}

function updateApVarsTable(flags) {
  for (const [varName, value] of Object.entries(flags)) {
    // Create row if doesn't exist
    if (!apVarRows[varName]) {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${varName}</td>
        <td class="value-cell"></td>
      `;
      apVarsBody.appendChild(tr);
      apVarRows[varName] = {
        row: tr,
        cell: tr.querySelector('.value-cell'),
        lastValue: null
      };
    }

    const { row, cell, lastValue } = apVarRows[varName];

    // Format value based on type
    let displayValue, className;
    if (typeof value === 'boolean') {
      displayValue = value ? 'TRUE' : 'FALSE';
      className = `value-cell ${value ? 'value-true' : 'value-false'}`;
    } else if (typeof value === 'number') {
      displayValue = value.toFixed(3) + ' NM';
      className = 'value-cell value-number';
    } else {
      displayValue = String(value);
      className = 'value-cell';
    }

    // Update value
    cell.textContent = displayValue;
    cell.className = className;

    // Highlight if changed
    if (lastValue !== null && lastValue !== value) {
      row.classList.add('changed');
      setTimeout(() => {
        row.classList.remove('changed');
      }, 50);
    }

    apVarRows[varName].lastValue = value;
  }
}

// Initialize view on load
switchView(currentView);
