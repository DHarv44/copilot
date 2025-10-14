import type { AutopilotFlags } from '../../../types/simconnect';
import { CONTROLS, EVENTS } from './controlsConfig';
import { PushButton, RotaryKnob, ToggleSwitch, LandingGearLever, RoundPushButton, RectangularToggleSwitch, BaseControl, G1000Bezel, AirManagerBezel, createG1000Instrument, SVGInstrumentLoader } from '../controls';
import { loadG1000PFD, loadG1000MFD } from '../controls/airmanager/instruments/Generic-Garmin_G1000_NXi';

// Store control instances
const controlInstances = new Map<string, BaseControl>();

export async function initializeCockpit(container: HTMLElement): Promise<void> {
  if (!window.navboard) {
    throw new Error('Navboard API not available');
  }

  const svgText = await window.navboard.getSvgText();
  container.innerHTML = svgText;

  const svg = container.querySelector('svg');
  if (!svg) {
    throw new Error('No SVG element found');
  }

  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');

  // Add gradients and controls
  addGradientsAndControls(svg);

  // Event delegation
  svg.addEventListener('click', handleControlClick);
  svg.addEventListener('wheel', handleControlWheel, { passive: false });
}

async function addGradientsAndControls(svg: SVGElement) {
  // Add gradient definitions
  let defs = svg.querySelector('defs');
  if (!defs) {
    defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    svg.insertBefore(defs, svg.firstChild);
  }

  // Push button gradient
  const pushGradient = document.createElementNS('http://www.w3.org/2000/svg', 'radialGradient');
  pushGradient.setAttribute('id', 'pushButtonGradient');
  pushGradient.setAttribute('cx', '65%');
  pushGradient.setAttribute('cy', '35%');
  pushGradient.innerHTML = `
    <stop offset="0%" style="stop-color:#5a5a5a;stop-opacity:1" />
    <stop offset="70%" style="stop-color:#4a4a4a;stop-opacity:1" />
    <stop offset="100%" style="stop-color:#2a2a2a;stop-opacity:1" />
  `;
  defs.appendChild(pushGradient);

  // Active button gradient
  const activeGradient = document.createElementNS('http://www.w3.org/2000/svg', 'radialGradient');
  activeGradient.setAttribute('id', 'activeButtonGradient');
  activeGradient.setAttribute('cx', '65%');
  activeGradient.setAttribute('cy', '35%');
  activeGradient.innerHTML = `
    <stop offset="0%" style="stop-color:#00ff00;stop-opacity:1" />
    <stop offset="70%" style="stop-color:#00cc00;stop-opacity:1" />
    <stop offset="100%" style="stop-color:#00aa00;stop-opacity:1" />
  `;
  defs.appendChild(activeGradient);

  // Toggle steel sweep gradient
  const toggleSteelSweep = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
  toggleSteelSweep.setAttribute('id', 'toggleSteelSweep');
  toggleSteelSweep.setAttribute('x1', '0');
  toggleSteelSweep.setAttribute('y1', '0');
  toggleSteelSweep.setAttribute('x2', '1');
  toggleSteelSweep.setAttribute('y2', '1');
  toggleSteelSweep.innerHTML = `
    <stop offset="0%" style="stop-color:#8d9296;stop-opacity:1" />
    <stop offset="18%" style="stop-color:#dfe3e6;stop-opacity:1" />
    <stop offset="32%" style="stop-color:#4e5256;stop-opacity:1" />
    <stop offset="55%" style="stop-color:#dfe3e6;stop-opacity:1" />
    <stop offset="78%" style="stop-color:#8d9296;stop-opacity:1" />
    <stop offset="100%" style="stop-color:#4e5256;stop-opacity:1" />
  `;
  defs.appendChild(toggleSteelSweep);

  // Toggle well depth gradient
  const toggleWellGradient = document.createElementNS('http://www.w3.org/2000/svg', 'radialGradient');
  toggleWellGradient.setAttribute('id', 'toggleWellGradient');
  toggleWellGradient.setAttribute('cx', '50%');
  toggleWellGradient.setAttribute('cy', '48%');
  toggleWellGradient.setAttribute('r', '70%');
  toggleWellGradient.innerHTML = `
    <stop offset="0%" style="stop-color:#0d1012;stop-opacity:1" />
    <stop offset="65%" style="stop-color:#0a0c0e;stop-opacity:1" />
    <stop offset="100%" style="stop-color:#060708;stop-opacity:1" />
  `;
  defs.appendChild(toggleWellGradient);

  // Toggle stem gradient
  const toggleStemGradient = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
  toggleStemGradient.setAttribute('id', 'toggleStemGradient');
  toggleStemGradient.setAttribute('x1', '0');
  toggleStemGradient.setAttribute('y1', '0');
  toggleStemGradient.setAttribute('x2', '0');
  toggleStemGradient.setAttribute('y2', '1');
  toggleStemGradient.innerHTML = `
    <stop offset="0%" style="stop-color:#2c2f32;stop-opacity:1" />
    <stop offset="52%" style="stop-color:#17191b;stop-opacity:1" />
    <stop offset="100%" style="stop-color:#0d0f10;stop-opacity:1" />
  `;
  defs.appendChild(toggleStemGradient);

  // Toggle stem gloss
  const toggleStemGloss = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
  toggleStemGloss.setAttribute('id', 'toggleStemGloss');
  toggleStemGloss.setAttribute('x1', '0');
  toggleStemGloss.setAttribute('y1', '0');
  toggleStemGloss.setAttribute('x2', '1');
  toggleStemGloss.setAttribute('y2', '0');
  toggleStemGloss.innerHTML = `
    <stop offset="0%" style="stop-color:rgba(255,255,255,0.55);stop-opacity:1" />
    <stop offset="40%" style="stop-color:rgba(255,255,255,0.18);stop-opacity:1" />
    <stop offset="100%" style="stop-color:rgba(255,255,255,0);stop-opacity:1" />
  `;
  defs.appendChild(toggleStemGloss);

  // Toggle inner shadow filter
  const toggleInnerShadow = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
  toggleInnerShadow.setAttribute('id', 'toggleInnerShadow');
  toggleInnerShadow.setAttribute('x', '-30%');
  toggleInnerShadow.setAttribute('y', '-40%');
  toggleInnerShadow.setAttribute('width', '160%');
  toggleInnerShadow.setAttribute('height', '180%');
  toggleInnerShadow.innerHTML = `
    <feOffset dx="0" dy="0.13" result="o"/>
    <feGaussianBlur in="o" stdDeviation="0.28" result="b"/>
    <feComposite in="b" in2="SourceAlpha" operator="arithmetic" k2="-1" k3="1"/>
    <feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.65 0"/>
    <feComposite in2="SourceGraphic" operator="atop"/>
  `;
  defs.appendChild(toggleInnerShadow);

  // Toggle lever shadow filter
  const toggleLeverShadow = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
  toggleLeverShadow.setAttribute('id', 'toggleLeverShadow');
  toggleLeverShadow.setAttribute('x', '-60%');
  toggleLeverShadow.setAttribute('y', '-80%');
  toggleLeverShadow.setAttribute('width', '220%');
  toggleLeverShadow.setAttribute('height', '240%');
  toggleLeverShadow.innerHTML = `
    <feDropShadow dx="0" dy="0.28" stdDeviation="0.28" flood-color="#000" flood-opacity="0.6"/>
  `;
  defs.appendChild(toggleLeverShadow);

  // Green glow filter
  const glowFilter = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
  glowFilter.setAttribute('id', 'greenGlow');
  glowFilter.setAttribute('x', '-50%');
  glowFilter.setAttribute('y', '-50%');
  glowFilter.setAttribute('width', '200%');
  glowFilter.setAttribute('height', '200%');
  glowFilter.innerHTML = `
    <feGaussianBlur in="SourceGraphic" stdDeviation="0.8" result="blur" />
    <feFlood flood-color="#00ff00" flood-opacity="0.4" result="color" />
    <feComposite in="color" in2="blur" operator="in" result="glow" />
    <feMerge>
      <feMergeNode in="glow" />
      <feMergeNode in="SourceGraphic" />
    </feMerge>
  `;
  defs.appendChild(glowFilter);

  // Red glow filter
  const redGlowFilter = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
  redGlowFilter.setAttribute('id', 'redGlow');
  redGlowFilter.setAttribute('x', '-50%');
  redGlowFilter.setAttribute('y', '-50%');
  redGlowFilter.setAttribute('width', '200%');
  redGlowFilter.setAttribute('height', '200%');
  redGlowFilter.innerHTML = `
    <feGaussianBlur in="SourceGraphic" stdDeviation="0.8" result="blur" />
    <feFlood flood-color="#ff0000" flood-opacity="0.6" result="color" />
    <feComposite in="color" in2="blur" operator="in" result="glow" />
    <feMerge>
      <feMergeNode in="glow" />
      <feMergeNode in="SourceGraphic" />
    </feMerge>
  `;
  defs.appendChild(redGlowFilter);

  // Create controls layer
  const controlsGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  controlsGroup.setAttribute('id', 'controls-layer');

  // Create push buttons
  const buttonPromises = CONTROLS.pushButtons.map(async btnConfig => {
    const button = new PushButton({
      id: btnConfig.id,
      cx: btnConfig.cx,
      cy: btnConfig.cy,
      label: btnConfig.label
    });
    controlInstances.set(btnConfig.id, button);
    const element = await button.render();
    controlsGroup.appendChild(element);
  });

  // Create rotary knobs
  const knobPromises = CONTROLS.rotaryKnobs.map(async knobConfig => {
    const knob = new RotaryKnob({
      id: knobConfig.id,
      cx: knobConfig.cx,
      cy: knobConfig.cy,
      label: knobConfig.label
    });
    controlInstances.set(knobConfig.id, knob);
    const element = await knob.render();
    controlsGroup.appendChild(element);
  });

  // Create toggle switches
  const togglePromises = CONTROLS.toggleSwitches.map(async toggleConfig => {
    const toggle = new ToggleSwitch({
      id: toggleConfig.id,
      cx: toggleConfig.cx,
      cy: toggleConfig.cy,
      label: toggleConfig.label
    });
    controlInstances.set(toggleConfig.id, toggle);
    const element = await toggle.render();
    controlsGroup.appendChild(element);
  });

  // Create landing gear controls
  const gearPromises = CONTROLS.landingGear ? CONTROLS.landingGear.map(async gearConfig => {
    const gear = new RectangularToggleSwitch({
      id: gearConfig.id,
      cx: gearConfig.cx,
      cy: gearConfig.cy,
      label: gearConfig.label
    });
    controlInstances.set(gearConfig.id, gear);
    const element = await gear.render();
    controlsGroup.appendChild(element);
  }) : [];

  // Create G1000 bezels using SVG-based instrument loading
  const g1000Promises = CONTROLS.g1000Bezels ? CONTROLS.g1000Bezels.map(async g1000Config => {
    // Load appropriate instrument based on mode
    const instrument = g1000Config.mode === 'PFD' ? await loadG1000PFD() : await loadG1000MFD();

    const bezel = new AirManagerBezel({
      id: g1000Config.id,
      cx: g1000Config.cx,
      cy: g1000Config.cy,
      label: '',
      instrument,
      debug: g1000Config.debug
    });
    controlInstances.set(g1000Config.id, bezel);
    const element = await bezel.render();

    // Get native dimensions and scale to target size
    const { width: nativeWidth, height: nativeHeight } = bezel.getNativeDimensions();
    const scaleX = g1000Config.width / nativeWidth;
    const scaleY = g1000Config.height / nativeHeight;
    element.setAttribute('transform', `translate(${g1000Config.cx}, ${g1000Config.cy}) scale(${scaleX}, ${scaleY})`);

    controlsGroup.appendChild(element);
  }) : [];

  // Wait for all controls to render
  await Promise.all([...buttonPromises, ...knobPromises, ...togglePromises, ...gearPromises, ...g1000Promises]);

  svg.appendChild(controlsGroup);
}

function handleControlClick(e: Event) {
  const target = e.target as SVGElement;
  const controlElement = target.closest('.control') as SVGGElement;
  if (!controlElement) return;

  const id = controlElement.getAttribute('data-id');
  if (!id) return;

  const control = controlInstances.get(id);
  if (!control) return;

  if (control instanceof PushButton) {
    control.handleClick();
  } else if (control instanceof ToggleSwitch) {
    control.handleClick();
  } else if (control instanceof RoundPushButton) {
    control.handleClick();
  } else if (control instanceof RectangularToggleSwitch) {
    control.handleClick();
  } else if (control instanceof LandingGearLever) {
    control.handleClick();
  }
}

function handleControlWheel(e: WheelEvent) {
  const target = e.target as SVGElement;
  const controlElement = target.closest('.control') as SVGGElement;
  if (!controlElement) return;

  const id = controlElement.getAttribute('data-id');
  if (!id) return;

  const control = controlInstances.get(id);
  if (control instanceof RotaryKnob) {
    control.handleWheel(e);

    // Send SimConnect events for altitude knob
    if (id === 'ALT_KNOB') {
      const command = e.deltaY > 0 ? 'AP_ALT_VAR_DEC' : 'AP_ALT_VAR_INC'; // Scroll down = decrease, scroll up = increase
      window.cmd.send({ type: 'K', event: command });
    }
  }
}

export function updateControlStates(container: HTMLElement, apFlags: AutopilotFlags) {
  for (const [key, def] of Object.entries(EVENTS.k)) {
    if (!def.simvar) continue;

    const control = controlInstances.get(key);
    if (control instanceof PushButton) {
      const isActive = !!apFlags[def.simvar];
      control.setActive(isActive);
      updateLabelColor(key, isActive);
    }
  }
}

function updateLabelColor(id: string, isActive: boolean) {
  const svg = document.querySelector('#svg-container svg');
  if (!svg) return;

  const labelId = `svg-label-${id}`;
  const bgLabel = svg.querySelector(`#${labelId}`);
  if (!bgLabel) return;

  const tspan = bgLabel.querySelector('tspan');
  const color = isActive ? '#00ff00' : '#3a617a';

  bgLabel.setAttribute('fill', color);
  (bgLabel as any).style.fill = color;

  if (tspan) {
    tspan.setAttribute('fill', color);
    (tspan as any).style.fill = color;
  }
}
