export interface ControlConfig {
  id: string;
  cx: number;
  cy: number;
  label?: string;
}

export abstract class BaseControl {
  protected group: SVGGElement;
  protected id: string;
  protected cx: number;
  protected cy: number;
  protected label: string;

  constructor(config: ControlConfig) {
    this.id = config.id;
    this.cx = config.cx;
    this.cy = config.cy;
    this.label = config.label || '';
    this.group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    this.group.setAttribute('class', 'control');
    this.group.setAttribute('data-id', this.id);
  }

  abstract render(): SVGGElement | Promise<SVGGElement>;
  abstract getType(): string;

  protected createSVGElement<K extends keyof SVGElementTagNameMap>(
    tag: K
  ): SVGElementTagNameMap[K] {
    return document.createElementNS('http://www.w3.org/2000/svg', tag);
  }

  getElement(): SVGGElement {
    return this.group;
  }

  getId(): string {
    return this.id;
  }
}
