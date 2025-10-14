import { BaseControl, ControlConfig } from './BaseControl';

export type GearPosition = 'UP' | 'DOWN';

export class LandingGearLever extends BaseControl {
  private position: GearPosition = 'DOWN';

  constructor(config: ControlConfig) {
    super(config);
    this.group.classList.add('landing-gear-lever');
    this.group.setAttribute('data-type', 'landing-gear-lever');
    this.group.setAttribute('data-position', this.position);
  }

  getType(): string {
    return 'landing-gear-lever';
  }

  render(): SVGGElement {
    // Base/mounting plate
    const baseWidth = 18;
    const baseHeight = 30;
    const base = this.createSVGElement('rect');
    base.setAttribute('x', String(this.cx - baseWidth / 2));
    base.setAttribute('y', String(this.cy - baseHeight / 2));
    base.setAttribute('width', String(baseWidth));
    base.setAttribute('height', String(baseHeight));
    base.setAttribute('rx', '2');
    base.setAttribute('fill', '#2a2a2a');
    base.setAttribute('stroke', '#1a1a1a');
    base.setAttribute('stroke-width', '1');

    // Panel with labels
    const panel = this.createSVGElement('rect');
    panel.setAttribute('x', String(this.cx - 14));
    panel.setAttribute('y', String(this.cy - 12));
    panel.setAttribute('width', '10');
    panel.setAttribute('height', '24');
    panel.setAttribute('fill', '#3a3a3a');
    panel.setAttribute('stroke', '#2a2a2a');
    panel.setAttribute('stroke-width', '0.5');

    // Position labels
    const positions = [
      { label: 'UP', y: this.cy - 6 },
      { label: 'DN', y: this.cy + 6 }
    ];

    positions.forEach(pos => {
      const text = this.createSVGElement('text');
      text.setAttribute('x', String(this.cx - 9));
      text.setAttribute('y', String(pos.y));
      text.setAttribute('font-family', 'sans-serif');
      text.setAttribute('font-size', '3.5');
      text.setAttribute('font-weight', '400');
      text.setAttribute('fill', '#999');
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('dominant-baseline', 'central');
      text.textContent = pos.label;
      this.group.appendChild(text);
    });

    // Wheel-shaped knob (cylindrical tire profile view)
    const knobGroup = this.createSVGElement('g');

    // Outer tire ring (dark rubber)
    const outerRing = this.createSVGElement('ellipse');
    outerRing.setAttribute('cx', String(this.cx + 3));
    outerRing.setAttribute('cy', String(this.cy));
    outerRing.setAttribute('rx', '7');
    outerRing.setAttribute('ry', '9');
    outerRing.setAttribute('fill', '#1a1a1a');
    outerRing.setAttribute('stroke', '#0a0a0a');
    outerRing.setAttribute('stroke-width', '1');

    // Inner rim (lighter metal)
    const innerRim = this.createSVGElement('ellipse');
    innerRim.setAttribute('cx', String(this.cx + 3));
    innerRim.setAttribute('cy', String(this.cy));
    innerRim.setAttribute('rx', '4.5');
    innerRim.setAttribute('ry', '6');
    innerRim.setAttribute('fill', 'url(#pushButtonGradient)');
    innerRim.setAttribute('stroke', '#2a2a2a');
    innerRim.setAttribute('stroke-width', '0.5');

    // Center hub
    const hub = this.createSVGElement('ellipse');
    hub.setAttribute('cx', String(this.cx + 3));
    hub.setAttribute('cy', String(this.cy));
    hub.setAttribute('rx', '2');
    hub.setAttribute('ry', '2.5');
    hub.setAttribute('fill', '#3a3a3a');
    hub.setAttribute('stroke', '#2a2a2a');
    hub.setAttribute('stroke-width', '0.3');

    // Tire tread grooves (horizontal lines)
    for (let i = -6; i <= 6; i += 3) {
      const groove = this.createSVGElement('line');
      groove.setAttribute('x1', String(this.cx - 1));
      groove.setAttribute('y1', String(this.cy + i));
      groove.setAttribute('x2', String(this.cx + 7));
      groove.setAttribute('y2', String(this.cy + i));
      groove.setAttribute('stroke', '#0a0a0a');
      groove.setAttribute('stroke-width', '0.5');
      groove.setAttribute('opacity', '0.7');
      knobGroup.appendChild(groove);
    }

    knobGroup.appendChild(outerRing);
    knobGroup.appendChild(innerRim);
    knobGroup.appendChild(hub);

    // Position indicator (arrow)
    const indicator = this.createSVGElement('polygon');
    indicator.setAttribute('points', `${this.cx - 2},${this.cy} ${this.cx - 5},${this.cy - 2} ${this.cx - 5},${this.cy + 2}`);
    indicator.setAttribute('fill', '#00ff00');
    indicator.classList.add('position-indicator');

    this.group.appendChild(base);
    this.group.appendChild(panel);
    this.group.appendChild(knobGroup);
    this.group.appendChild(indicator);

    this.updateLeverPosition();

    return this.group;
  }

  handleClick(): void {
    // Toggle between UP and DOWN
    const newPosition = this.position === 'UP' ? 'DOWN' : 'UP';
    this.setPosition(newPosition);

    // Send SimConnect command
    if (window.cmd) {
      const command = newPosition === 'UP' ? 'GEAR_UP' : 'GEAR_DOWN';
      const id = window.cmd.send({ type: 'K', event: command });
      console.debug('→ Landing gear', command, id);
    }
  }

  setPosition(position: GearPosition): void {
    this.position = position;
    this.group.setAttribute('data-position', position);
    this.updateLeverPosition();
  }

  private updateLeverPosition(): void {
    const indicator = this.group.querySelector('.position-indicator');
    if (!indicator) return;

    let yPos = this.cy;
    let color = '#00ff00';

    if (this.position === 'UP') {
      yPos = this.cy - 6;
    } else {
      yPos = this.cy + 6;
    }

    indicator.setAttribute('points', `${this.cx - 2},${yPos} ${this.cx - 5},${yPos - 2} ${this.cx - 5},${yPos + 2}`);
    indicator.setAttribute('fill', color);
  }

  getPosition(): GearPosition {
    return this.position;
  }
}
