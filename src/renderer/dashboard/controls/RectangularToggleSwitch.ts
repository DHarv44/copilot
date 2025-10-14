import { BaseControl, ControlConfig } from './BaseControl';

export type GearPosition = 'UP' | 'DOWN';

export class RectangularToggleSwitch extends BaseControl {
  private position: GearPosition = 'DOWN';
  private slider?: SVGGElement;
  private topLight?: SVGEllipseElement;
  private bottomLight?: SVGEllipseElement;

  constructor(config: ControlConfig) {
    super(config);
    this.group.classList.add('rectangular-toggle-switch');
    this.group.setAttribute('data-type', 'rectangular-toggle-switch');
    this.group.setAttribute('data-position', this.position);
  }

  getType(): string {
    return 'rectangular-toggle-switch';
  }

  async render(): Promise<SVGGElement> {
    // Load SVG from assets/controls/rectangular-toggle-switch.svg
    const response = await fetch('../../../controls/rectangular-toggle-switch.svg');
    const svgText = await response.text();
    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(svgText, 'image/svg+xml');
    const svgElement = svgDoc.documentElement;

    // Extract viewBox to get dimensions
    const viewBox = svgElement.getAttribute('viewBox')?.split(' ').map(Number) || [0, 0, 20, 24];
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

      // Adjust position and save references based on element type
      if (imported.tagName === 'rect') {
        const rectX = parseFloat(imported.getAttribute('x') || '0');
        const rectY = parseFloat(imported.getAttribute('y') || '0');
        imported.setAttribute('x', String(rectX + offsetX));
        imported.setAttribute('y', String(rectY + offsetY));
        this.group.appendChild(imported);
      } else if (imported.tagName === 'ellipse') {
        const ellipseCx = parseFloat(imported.getAttribute('cx') || '0');
        const ellipseCy = parseFloat(imported.getAttribute('cy') || '0');
        imported.setAttribute('cx', String(ellipseCx + offsetX));
        imported.setAttribute('cy', String(ellipseCy + offsetY));

        // Check if this is top or bottom light
        if (imported.classList.contains('top-light')) {
          this.topLight = imported as SVGEllipseElement;
        } else if (imported.classList.contains('bottom-light')) {
          this.bottomLight = imported as SVGEllipseElement;
        }

        this.group.appendChild(imported);
      } else if (imported.tagName === 'g' && imported.classList.contains('slider')) {
        // This is the slider group - save reference and add ridges
        this.slider = imported as SVGGElement;

        const sliderRx = 6;
        const sliderRy = 10;
        const sliderCx = this.cx;
        const sliderCy = this.cy;

        // Update the ellipse position inside the slider group
        const sliderEllipse = this.slider.querySelector('ellipse');
        if (sliderEllipse) {
          sliderEllipse.setAttribute('cx', String(sliderCx));
          sliderEllipse.setAttribute('cy', String(sliderCy));
        }

        // Add vertical ridges (grooves running up and down the length)
        const ridgeCount = 12;
        const angleStep = Math.PI / (ridgeCount - 1);

        for (let i = 0; i < ridgeCount; i++) {
          const angle = -Math.PI / 2 + i * angleStep;
          const x = sliderCx + sliderRx * Math.cos(angle);

          // Create vertical line from top to bottom of ellipse at this x position
          const ridge = this.createSVGElement('line');
          ridge.setAttribute('x1', String(x));
          ridge.setAttribute('y1', String(sliderCy - sliderRy));
          ridge.setAttribute('x2', String(x));
          ridge.setAttribute('y2', String(sliderCy + sliderRy));
          ridge.setAttribute('stroke', '#2a2a2a');
          ridge.setAttribute('stroke-width', '0.4');
          ridge.setAttribute('opacity', '0.5');
          this.slider.appendChild(ridge);
        }

        this.group.appendChild(this.slider);
      }
    }

    this.updatePosition();

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
    this.updatePosition();
  }

  private updatePosition(): void {
    if (!this.slider || !this.topLight || !this.bottomLight) return;

    // Height from SVG viewBox is 24, so the control spans 12 units above/below cy
    const height = 20;
    const y = this.cy - height / 2;

    // Move slider up or down
    let sliderY: number;
    let topLightActive = false;
    let bottomLightActive = false;

    if (this.position === 'UP') {
      sliderY = y + 3; // Near top
      topLightActive = true;
    } else {
      sliderY = y + height - 15; // Near bottom
      bottomLightActive = true;
    }

    // Update slider position
    this.slider.setAttribute('transform', `translate(0, ${sliderY - (this.cy - 6)})`);

    // Update lights
    if (topLightActive) {
      this.topLight.setAttribute('fill', '#ff0000');
      this.topLight.setAttribute('stroke', '#cc0000');
      this.topLight.setAttribute('filter', 'url(#redGlow)');
    } else {
      this.topLight.setAttribute('fill', '#3a0000');
      this.topLight.setAttribute('stroke', '#2a0000');
      this.topLight.removeAttribute('filter');
    }

    if (bottomLightActive) {
      this.bottomLight.setAttribute('fill', '#ff0000');
      this.bottomLight.setAttribute('stroke', '#cc0000');
      this.bottomLight.setAttribute('filter', 'url(#redGlow)');
    } else {
      this.bottomLight.setAttribute('fill', '#3a0000');
      this.bottomLight.setAttribute('stroke', '#2a0000');
      this.bottomLight.removeAttribute('filter');
    }
  }

  getPosition(): GearPosition {
    return this.position;
  }
}
