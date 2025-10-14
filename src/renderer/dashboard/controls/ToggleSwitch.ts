import { BaseControl, ControlConfig } from './BaseControl';

export class ToggleSwitch extends BaseControl {
  private isOn = false;
  private leverPivot?: SVGGElement;

  constructor(config: ControlConfig) {
    super(config);
    this.group.classList.add('toggle-switch');
    this.group.setAttribute('data-type', 'toggle-switch');
    this.group.setAttribute('data-state', 'off');
  }

  getType(): string {
    return 'toggle-switch';
  }

  async render(): Promise<SVGGElement> {
    // Load SVG from assets/controls/toggle-switch.svg
    const response = await fetch('../../../controls/toggle-switch.svg');
    const svgText = await response.text();
    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(svgText, 'image/svg+xml');
    const svgElement = svgDoc.documentElement;

    // Extract viewBox to get dimensions
    const viewBox = svgElement.getAttribute('viewBox')?.split(' ').map(Number) || [0, 0, 30, 50];
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

    // Find the lever group that needs to rotate
    const children = Array.from(svgElement.children);
    for (const child of children) {
      if (child.tagName === 'defs') continue;

      const imported = child.cloneNode(true) as SVGElement;

      // Check if this is the lever/bat element (the rotatable rect)
      if (imported.tagName === 'rect' && imported.getAttribute('transform')?.includes('rotate')) {
        // Create a pivot group for the lever
        this.leverPivot = this.createSVGElement('g');
        this.leverPivot.classList.add('lever-pivot');

        // Adjust position
        const rectX = parseFloat(imported.getAttribute('x') || '0');
        const rectY = parseFloat(imported.getAttribute('y') || '0');
        imported.setAttribute('x', String(rectX + offsetX));
        imported.setAttribute('y', String(rectY + offsetY));

        // Update transform to use our cx, cy as pivot
        const transformMatch = imported.getAttribute('transform')?.match(/rotate\(([^)]+)\)/);
        if (transformMatch) {
          const angle = parseFloat(transformMatch[1].split(' ')[0]);
          imported.setAttribute('transform', `rotate(${angle} ${this.cx} ${this.cy})`);
        }

        this.leverPivot.appendChild(imported);
        this.group.appendChild(this.leverPivot);
      } else if (imported.tagName === 'ellipse' && imported.getAttribute('transform')?.includes('rotate')) {
        // Lever tip highlight that also rotates
        if (!this.leverPivot) {
          this.leverPivot = this.createSVGElement('g');
          this.leverPivot.classList.add('lever-pivot');
        }

        const ellipseCx = parseFloat(imported.getAttribute('cx') || '0');
        const ellipseCy = parseFloat(imported.getAttribute('cy') || '0');
        imported.setAttribute('cx', String(ellipseCx + offsetX));
        imported.setAttribute('cy', String(ellipseCy + offsetY));

        const transformMatch = imported.getAttribute('transform')?.match(/rotate\(([^)]+)\)/);
        if (transformMatch) {
          const angle = parseFloat(transformMatch[1].split(' ')[0]);
          imported.setAttribute('transform', `rotate(${angle} ${this.cx} ${this.cy})`);
        }

        this.leverPivot.appendChild(imported);
        if (!this.group.contains(this.leverPivot)) {
          this.group.appendChild(this.leverPivot);
        }
      } else {
        // Static elements - adjust position based on element type
        if (imported.tagName === 'rect') {
          const rectX = parseFloat(imported.getAttribute('x') || '0');
          const rectY = parseFloat(imported.getAttribute('y') || '0');
          imported.setAttribute('x', String(rectX + offsetX));
          imported.setAttribute('y', String(rectY + offsetY));
        } else if (imported.tagName === 'circle') {
          const circleCx = parseFloat(imported.getAttribute('cx') || '0');
          const circleCy = parseFloat(imported.getAttribute('cy') || '0');
          imported.setAttribute('cx', String(circleCx + offsetX));
          imported.setAttribute('cy', String(circleCy + offsetY));
        }
        this.group.appendChild(imported);
      }
    }

    this.updateLeverRotation();

    return this.group;
  }

  handleClick(): void {
    this.toggle();
  }

  toggle(): void {
    this.isOn = !this.isOn;
    this.group.setAttribute('data-state', this.isOn ? 'on' : 'off');
    this.updateLeverRotation();
    this.updateLabelColor();
  }

  private updateLeverRotation(): void {
    if (!this.leverPivot) return;

    // OFF = -15°, ON = -150°
    const angle = this.isOn ? -165 : -15;

    // Update all child elements with rotation transform
    Array.from(this.leverPivot.children).forEach(child => {
      const element = child as SVGElement;
      element.setAttribute('transform', `rotate(${angle} ${this.cx} ${this.cy})`);
    });
  }

  private updateLabelColor(): void {
    const svg = document.querySelector('#svg-container svg');
    if (!svg) return;

    const labelId = `svg-label-${this.id}`;
    const bgLabel = svg.querySelector(`#${labelId}`);
    if (!bgLabel) return;

    const tspan = bgLabel.querySelector('tspan');
    const color = this.isOn ? '#00ff00' : '#3a617a';

    bgLabel.setAttribute('fill', color);
    (bgLabel as any).style.fill = color;

    if (tspan) {
      tspan.setAttribute('fill', color);
      (tspan as any).style.fill = color;
    }
  }

  setState(on: boolean): void {
    if (this.isOn !== on) {
      this.toggle();
    }
  }

  getState(): boolean {
    return this.isOn;
  }
}
