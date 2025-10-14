import { BaseControl, ControlConfig } from './BaseControl';

export class PushButton extends BaseControl {

  constructor(config: ControlConfig) {
    super(config);
    this.group.classList.add('push-button');
    this.group.setAttribute('data-type', 'push-button');
  }

  getType(): string {
    return 'push-button';
  }

  async render(): Promise<SVGGElement> {
    // Load SVG from assets/controls/push-button.svg
    const response = await fetch('../../../controls/push-button.svg');
    const svgText = await response.text();
    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(svgText, 'image/svg+xml');
    const svgElement = svgDoc.documentElement;

    // Extract viewBox to get dimensions
    const viewBox = svgElement.getAttribute('viewBox')?.split(' ').map(Number) || [0, 0, 30, 20];
    const svgWidth = viewBox[2];
    const svgHeight = viewBox[3];

    // Calculate offset to center the SVG content at (cx, cy)
    const offsetX = this.cx - svgWidth / 2;
    const offsetY = this.cy - svgHeight / 2;

    // Import all child elements from the SVG
    const children = Array.from(svgElement.children);
    for (const child of children) {
      const imported = child.cloneNode(true) as SVGElement;

      // Update text content if it's a text element
      if (imported.tagName === 'text') {
        imported.textContent = this.label;
        // Adjust text position to center
        const textX = parseFloat(imported.getAttribute('x') || '0');
        const textY = parseFloat(imported.getAttribute('y') || '0');
        imported.setAttribute('x', String(textX + offsetX));
        imported.setAttribute('y', String(textY + offsetY));
      } else if (imported.tagName === 'rect') {
        // Adjust rect position
        const rectX = parseFloat(imported.getAttribute('x') || '0');
        const rectY = parseFloat(imported.getAttribute('y') || '0');
        imported.setAttribute('x', String(rectX + offsetX));
        imported.setAttribute('y', String(rectY + offsetY));
      }

      this.group.appendChild(imported);
    }

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

    return this.group;
  }

  setActive(active: boolean): void {
    const text = this.group.querySelector('text');

    if (active) {
      this.group.classList.add('active');
      this.group.setAttribute('filter', 'url(#greenGlow)');
      text?.setAttribute('fill', '#00ff00');
    } else {
      this.group.classList.remove('active');
      this.group.removeAttribute('filter');
      text?.setAttribute('fill', '#ffffff');
    }
  }

  handleClick(): void {
    if (window.cmd) {
      const id = window.cmd.send({ type: 'press', button: this.id });
      console.debug('→ Press', this.id, id);
    }
  }
}
