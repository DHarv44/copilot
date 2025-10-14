import { BaseControl, ControlConfig } from './BaseControl';

export class RotaryKnob extends BaseControl {
  private rotation = 0;
  private indicator?: SVGLineElement;

  constructor(config: ControlConfig) {
    super(config);
    this.group.classList.add('rotary-knob');
    this.group.setAttribute('data-type', 'rotary-knob');
  }

  getType(): string {
    return 'rotary-knob';
  }

  async render(): Promise<SVGGElement> {
    // Load SVG from assets/controls/rotary-knob.svg
    const response = await fetch('../../../controls/rotary-knob.svg');
    const svgText = await response.text();
    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(svgText, 'image/svg+xml');
    const svgElement = svgDoc.documentElement;

    // Extract viewBox to get dimensions
    const viewBox = svgElement.getAttribute('viewBox')?.split(' ').map(Number) || [0, 0, 20, 20];
    const svgWidth = viewBox[2];
    const svgHeight = viewBox[3];

    // Calculate offset to center the SVG content at (cx, cy)
    const offsetX = this.cx - svgWidth / 2;
    const offsetY = this.cy - svgHeight / 2;

    // Import defs if they exist
    const defs = svgElement.querySelector('defs');
    if (defs) {
      const svg = document.querySelector('#svg-container svg');
      if (svg) {
        let svgDefs = svg.querySelector('defs');
        if (!svgDefs) {
          svgDefs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
          svg.insertBefore(svgDefs, svg.firstChild);
        }

        // Import gradient definitions
        Array.from(defs.children).forEach(child => {
          const id = child.getAttribute('id');
          if (id && !svgDefs!.querySelector(`#${id}`)) {
            svgDefs!.appendChild(child.cloneNode(true));
          }
        });
      }
    }

    // Import all child elements from the SVG
    const children = Array.from(svgElement.children);
    for (const child of children) {
      if (child.tagName === 'defs') continue;

      const imported = child.cloneNode(true) as SVGElement;

      // Adjust position based on element type
      if (imported.tagName === 'circle') {
        const circleCx = parseFloat(imported.getAttribute('cx') || '0');
        const circleCy = parseFloat(imported.getAttribute('cy') || '0');
        imported.setAttribute('cx', String(circleCx + offsetX));
        imported.setAttribute('cy', String(circleCy + offsetY));
      } else if (imported.tagName === 'line') {
        // This is the rotation indicator - save reference and adjust position
        const lineX1 = parseFloat(imported.getAttribute('x1') || '0');
        const lineY1 = parseFloat(imported.getAttribute('y1') || '0');
        const lineX2 = parseFloat(imported.getAttribute('x2') || '0');
        const lineY2 = parseFloat(imported.getAttribute('y2') || '0');
        imported.setAttribute('x1', String(lineX1 + offsetX));
        imported.setAttribute('y1', String(lineY1 + offsetY));
        imported.setAttribute('x2', String(lineX2 + offsetX));
        imported.setAttribute('y2', String(lineY2 + offsetY));
        this.indicator = imported as SVGLineElement;
      }

      this.group.appendChild(imported);
    }

    return this.group;
  }

  handleWheel(e: WheelEvent): void {
    e.preventDefault();

    // Determine rotation direction
    const delta = e.deltaY > 0 ? 15 : -15;
    this.rotation += delta;

    this.updateRotation();
    console.debug('Rotary knob', this.id, 'rotated to', this.rotation);
  }

  private updateRotation(): void {
    if (this.indicator) {
      this.indicator.setAttribute(
        'transform',
        `rotate(${this.rotation} ${this.cx} ${this.cy})`
      );
    }
  }

  getRotation(): number {
    return this.rotation;
  }

  setRotation(angle: number): void {
    this.rotation = angle;
    this.updateRotation();
  }
}
