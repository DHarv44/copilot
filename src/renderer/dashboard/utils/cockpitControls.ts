import type { AutopilotFlags } from '../../../types/simconnect';
import { CONTROLS, EVENTS } from './controlsConfig';

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

  // Add button overlay layer
  addApButtonLayer(svg);

  // Event delegation for button clicks
  svg.addEventListener('click', handleApButtonClick);

  // Event delegation for rotary knob wheel rotation
  svg.addEventListener('wheel', handleRotaryWheel, { passive: false });
}

function addApButtonLayer(svg: SVGElement) {
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
  pushGradient.innerHTML = `
    <stop offset="0%" style="stop-color:#5a5a5a;stop-opacity:1" />
    <stop offset="70%" style="stop-color:#4a4a4a;stop-opacity:1" />
    <stop offset="100%" style="stop-color:#2a2a2a;stop-opacity:1" />
  `;
  defs.appendChild(pushGradient);

  // Active button gradient (green)
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

  // Toggle lever gradient
  const toggleLeverGradient = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
  toggleLeverGradient.setAttribute('id', 'toggleLeverGradient');
  toggleLeverGradient.setAttribute('x1', '0%');
  toggleLeverGradient.setAttribute('y1', '0%');
  toggleLeverGradient.setAttribute('x2', '100%');
  toggleLeverGradient.setAttribute('y2', '0%');
  toggleLeverGradient.innerHTML = `
    <stop offset="0%" style="stop-color:#4a4a4a;stop-opacity:1" />
    <stop offset="50%" style="stop-color:#5a5a5a;stop-opacity:1" />
    <stop offset="100%" style="stop-color:#3a3a3a;stop-opacity:1" />
  `;
  defs.appendChild(toggleLeverGradient);

  // Green glow filter for active buttons
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

  // Create control groups
  const controlsGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  controlsGroup.setAttribute('id', 'controls-layer');

  // Add push buttons
  CONTROLS.pushButtons.forEach(btn => {
    const button = createPushButton(btn.cx, btn.cy, btn.id, btn.label);
    controlsGroup.appendChild(button);
  });

  // Add rotary knobs
  CONTROLS.rotaryKnobs.forEach(knob => {
    const rotary = createRotaryKnob(knob.cx, knob.cy, knob.id, knob.label);
    controlsGroup.appendChild(rotary);
  });

  // Add toggle switches
  CONTROLS.toggleSwitches.forEach(toggle => {
    const toggleSwitch = createToggleSwitch(toggle.cx, toggle.cy, toggle.id, toggle.label);
    controlsGroup.appendChild(toggleSwitch);
  });

  svg.appendChild(controlsGroup);
}

function createPushButton(cx: number, cy: number, id: string, label: string): SVGGElement {
  const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  group.setAttribute('class', 'control push-button');
  group.setAttribute('data-id', id);
  group.setAttribute('data-type', 'push-button');

  const width = 22;
  const height = 12.8; // 20% shorter (16 * 0.8)
  const x = cx - width / 2;
  const y = cy - height / 2;

  // Shadow
  const shadow = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  shadow.setAttribute('x', String(x - 1));
  shadow.setAttribute('y', String(y - 1));
  shadow.setAttribute('width', String(width));
  shadow.setAttribute('height', String(height));
  shadow.setAttribute('rx', '2');
  shadow.setAttribute('fill', '#1a1a1a');
  shadow.setAttribute('opacity', '0.5');

  // Main button body
  const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  rect.setAttribute('x', String(x));
  rect.setAttribute('y', String(y));
  rect.setAttribute('width', String(width));
  rect.setAttribute('height', String(height));
  rect.setAttribute('rx', '2');
  rect.setAttribute('fill', 'url(#pushButtonGradient)');
  rect.setAttribute('stroke', '#2a2a2a');
  rect.setAttribute('stroke-width', '1');

  const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  text.setAttribute('x', String(cx));
  text.setAttribute('y', String(cy));
  text.setAttribute('font-family', 'sans-serif');
  text.setAttribute('font-size', '4');
  text.setAttribute('font-weight', '200');
  text.setAttribute('fill', '#ffffff');
  text.setAttribute('text-anchor', 'middle');
  text.setAttribute('dominant-baseline', 'central');
  text.textContent = label;

  group.appendChild(shadow);
  group.appendChild(rect);
  group.appendChild(text);
  return group;
}

function createRotaryKnob(cx: number, cy: number, id: string, label: string): SVGGElement {
  const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  group.setAttribute('class', 'control rotary-knob');
  group.setAttribute('data-id', id);
  group.setAttribute('data-type', 'rotary-knob');

  const r = 6; // 40% smaller (10 * 0.6)

  // Shadow
  const shadow = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  shadow.setAttribute('cx', String(cx - 0.5));
  shadow.setAttribute('cy', String(cy - 0.5));
  shadow.setAttribute('r', String(r));
  shadow.setAttribute('fill', '#1a1a1a');
  shadow.setAttribute('opacity', '0.5');

  // Main knob body
  const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  circle.setAttribute('cx', String(cx));
  circle.setAttribute('cy', String(cy));
  circle.setAttribute('r', String(r));
  circle.setAttribute('fill', 'url(#pushButtonGradient)');
  circle.setAttribute('stroke', '#2a2a2a');
  circle.setAttribute('stroke-width', '1');

  // Rotation indicator line
  const indicator = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  indicator.setAttribute('x1', String(cx));
  indicator.setAttribute('y1', String(cy - r + 3));
  indicator.setAttribute('x2', String(cx));
  indicator.setAttribute('y2', String(cy - r / 2));
  indicator.setAttribute('stroke', '#ffffff');
  indicator.setAttribute('stroke-width', '2');
  indicator.setAttribute('stroke-linecap', 'round');

  group.appendChild(shadow);
  group.appendChild(circle);
  group.appendChild(indicator);
  return group;
}

function createToggleSwitch(cx: number, cy: number, id: string, label: string): SVGGElement {
  const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  group.setAttribute('class', 'control toggle-switch');
  group.setAttribute('data-id', id);
  group.setAttribute('data-type', 'toggle-switch');
  group.setAttribute('data-state', 'off');

  const plateWidth = 12;
  const plateHeight = 12;
  const plateX = cx - plateWidth / 2;
  const plateY = cy - plateHeight / 2;

  // Base mounting plate
  const plate = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  plate.setAttribute('x', String(plateX));
  plate.setAttribute('y', String(plateY));
  plate.setAttribute('width', String(plateWidth));
  plate.setAttribute('height', String(plateHeight));
  plate.setAttribute('rx', '2');
  plate.setAttribute('fill', '#3a3a3a');
  plate.setAttribute('stroke', '#1a1a1a');
  plate.setAttribute('stroke-width', '1');

  // Mounting screws (4 corners)
  const screwPositions = [
    { x: plateX + 2.5, y: plateY + 2.5 },
    { x: plateX + plateWidth - 2.5, y: plateY + 2.5 },
    { x: plateX + 2.5, y: plateY + plateHeight - 2.5 },
    { x: plateX + plateWidth - 2.5, y: plateY + plateHeight - 2.5 }
  ];

  const screws = screwPositions.map(pos => {
    const screw = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    screw.setAttribute('cx', String(pos.x));
    screw.setAttribute('cy', String(pos.y));
    screw.setAttribute('r', '0.9');
    screw.setAttribute('fill', '#2a2a2a');
    screw.setAttribute('stroke', '#1a1a1a');
    screw.setAttribute('stroke-width', '0.3');
    return screw;
  });

  // Pivot point
  const pivot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  pivot.setAttribute('cx', String(cx));
  pivot.setAttribute('cy', String(cy));
  pivot.setAttribute('r', '1.2');
  pivot.setAttribute('fill', '#1a1a1a');
  pivot.setAttribute('stroke', '#0a0a0a');
  pivot.setAttribute('stroke-width', '0.3');

  // Toggle lever shadow
  const leverShadow = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  leverShadow.setAttribute('x', String(cx - 1.2));
  leverShadow.setAttribute('y', String(cy));
  leverShadow.setAttribute('width', '2.4');
  leverShadow.setAttribute('height', '12');
  leverShadow.setAttribute('rx', '1.2');
  leverShadow.setAttribute('fill', '#0a0a0a');
  leverShadow.setAttribute('opacity', '0.4');
  leverShadow.setAttribute('transform', `rotate(-15 ${cx} ${cy})`);
  leverShadow.classList.add('toggle-lever-shadow');

  // Toggle lever
  const lever = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  lever.setAttribute('x', String(cx - 1.8));
  lever.setAttribute('y', String(cy));
  lever.setAttribute('width', '3.6');
  lever.setAttribute('height', '12');
  lever.setAttribute('rx', '1.2');
  lever.setAttribute('fill', 'url(#toggleLeverGradient)');
  lever.setAttribute('stroke', '#1a1a1a');
  lever.setAttribute('stroke-width', '0.6');
  lever.setAttribute('transform', `rotate(-15 ${cx} ${cy})`);
  lever.classList.add('toggle-lever');

  // Lever tip highlight
  const highlight = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
  highlight.setAttribute('cx', String(cx));
  highlight.setAttribute('cy', String(cy + 12));
  highlight.setAttribute('rx', '2');
  highlight.setAttribute('ry', '1.5');
  highlight.setAttribute('fill', '#6a6a6a');
  highlight.setAttribute('opacity', '0.5');
  highlight.setAttribute('transform', `rotate(-15 ${cx} ${cy})`);

  group.appendChild(plate);
  screws.forEach(screw => group.appendChild(screw));
  group.appendChild(pivot);
  group.appendChild(leverShadow);
  group.appendChild(lever);
  group.appendChild(highlight);

  return group;
}

function handleApButtonClick(e: Event) {
  const target = e.target as SVGElement;
  const control = target.closest('.control') as SVGGElement;
  if (!control) return;

  const id = control.getAttribute('data-id');
  const type = control.getAttribute('data-type');

  if (!id) return;

  if (type === 'push-button') {
    sendKey(id);
  } else if (type === 'toggle-switch') {
    handleToggleSwitch(control, id);
  }
}

function sendKey(key: string) {
  if (!window.cmd) return;
  const id = window.cmd.send({ type: 'press', button: key });
  console.debug('→ Press', key, id);
}

function handleToggleSwitch(control: SVGGElement, id: string) {
  const currentState = control.getAttribute('data-state');
  const newState = currentState === 'on' ? 'off' : 'on';
  control.setAttribute('data-state', newState);

  const leverShadow = control.querySelector('.toggle-lever-shadow');
  const lever = control.querySelector('.toggle-lever');
  const highlight = control.querySelector('ellipse');
  const cx = parseFloat(control.querySelector('circle')!.getAttribute('cx')!);
  const cy = parseFloat(control.querySelector('circle')!.getAttribute('cy')!);

  const angle = newState === 'on' ? 105 : -15;
  const transform = `rotate(${angle} ${cx} ${cy})`;

  leverShadow?.setAttribute('transform', transform);
  lever?.setAttribute('transform', transform);
  highlight?.setAttribute('transform', transform);

  // Update background SVG label color
  updateLabelColor(id, newState === 'on');
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

function handleRotaryWheel(e: WheelEvent) {
  e.preventDefault();

  const target = e.target as SVGElement;
  const control = target.closest('.control') as SVGGElement;
  if (!control) return;

  const type = control.getAttribute('data-type');
  if (type !== 'rotary-knob') return;

  const id = control.getAttribute('data-id');
  if (!id) return;

  // Get current rotation from the indicator line
  const indicator = control.querySelector('line');
  if (!indicator) return;

  // Determine rotation direction (positive = right/clockwise, negative = left/counterclockwise)
  const rotationDelta = e.deltaY > 0 ? 15 : -15;

  // Get center point of the knob
  const circle = control.querySelector('circle:not([opacity])');
  if (!circle) return;

  const cx = parseFloat(circle.getAttribute('cx')!);
  const cy = parseFloat(circle.getAttribute('cy')!);

  // Get current transform or start at 0
  const currentTransform = indicator.getAttribute('transform') || `rotate(0 ${cx} ${cy})`;
  const rotateMatch = currentTransform.match(/rotate\(([^)]+)\)/);
  const currentRotation = rotateMatch ? parseFloat(rotateMatch[1].split(' ')[0]) : 0;

  // Apply new rotation
  const newRotation = currentRotation + rotationDelta;
  indicator.setAttribute('transform', `rotate(${newRotation} ${cx} ${cy})`);

  console.debug('Rotary knob', id, 'rotated to', newRotation);
}

export function updateControlStates(container: HTMLElement, apFlags: AutopilotFlags) {
  const svg = container.querySelector('svg');
  if (!svg) return;

  for (const [key, def] of Object.entries(EVENTS.k)) {
    const control = svg.querySelector(`.control[data-id="${key}"]`);
    if (!control || !def.simvar) continue;

    const isActive = !!apFlags[def.simvar];

    // Update push button visual state
    if (control.getAttribute('data-type') === 'push-button') {
      const shape = control.querySelector('rect:not([opacity])');
      const text = control.querySelector('text');

      if (isActive) {
        control.classList.add('active');
        control.setAttribute('filter', 'url(#greenGlow)');
        text?.setAttribute('fill', '#00ff00');
      } else {
        control.classList.remove('active');
        control.removeAttribute('filter');
        text?.setAttribute('fill', '#ffffff');
      }
    }

    // Update background label
    updateLabelColor(key, isActive);
  }
}
