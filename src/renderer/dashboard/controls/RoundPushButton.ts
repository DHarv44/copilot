import { BaseControl, ControlConfig } from './BaseControl';

export class RoundPushButton extends BaseControl {
  private static readonly RADIUS = 6.4;

  constructor(config: ControlConfig) {
    super(config);
    this.group.classList.add('round-push-button');
    this.group.setAttribute('data-type', 'round-push-button');
  }

  getType(): string {
    return 'round-push-button';
  }

  render(): SVGGElement {
    const r = RoundPushButton.RADIUS;

    // Shadow
    const shadow = this.createSVGElement('circle');
    shadow.setAttribute('cx', String(this.cx));
    shadow.setAttribute('cy', String(this.cy + 1));
    shadow.setAttribute('r', String(r));
    shadow.setAttribute('fill', '#1a1a1a');
    shadow.setAttribute('opacity', '0.5');

    // Main button body
    const circle = this.createSVGElement('circle');
    circle.setAttribute('cx', String(this.cx));
    circle.setAttribute('cy', String(this.cy));
    circle.setAttribute('r', String(r));
    circle.setAttribute('fill', 'url(#pushButtonGradient)');
    circle.setAttribute('stroke', '#2a2a2a');
    circle.setAttribute('stroke-width', '1');

    // White center dot
    const dot = this.createSVGElement('circle');
    dot.setAttribute('cx', String(this.cx));
    dot.setAttribute('cy', String(this.cy));
    dot.setAttribute('r', '2');
    dot.setAttribute('fill', '#ffffff');

    this.group.appendChild(shadow);
    this.group.appendChild(circle);
    this.group.appendChild(dot);

    return this.group;
  }

  handleClick(): void {
    if (window.cmd) {
      const id = window.cmd.send({ type: 'K', event: 'GEAR_TOGGLE' });
      console.debug('→ Gear toggle', id);
    }
  }
}
