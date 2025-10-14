/**
 * Generic Air Manager bezel control that renders from parsed instrument config
 * Works with any Air Manager instrument loaded via AirManagerInstrumentFactory
 */

import { BaseControl, ControlConfig } from '../BaseControl';
import { InstrumentConfig, ButtonDefinition, DialDefinition, ImageDefinition } from './InstrumentConfig';
import { AirManagerInstrumentFactory } from './AirManagerInstrumentFactory';

interface AirManagerBezelConfig extends ControlConfig {
  instrument: InstrumentConfig;  // Pre-created instrument config
  debug?: boolean;
}

export class AirManagerBezel extends BaseControl {
  private config: InstrumentConfig;
  private debugMode: boolean;
  private knobs = new Map<string, { rotation: number; element: SVGImageElement }>();
  private pressedImages = new Map<string, SVGImageElement>();  // Pressed state images

  constructor(config: AirManagerBezelConfig) {
    super(config);
    this.config = config.instrument;
    this.debugMode = config.debug || false;
  }

  getType(): string {
    return 'airmanager-bezel';
  }

  /**
   * Render the instrument
   */
  async render(): Promise<SVGGElement> {
    try {
      // Create main group at origin (parent will handle scaling/positioning)
      this.group.setAttribute('transform', 'translate(0, 0)');

      // If SVG content exists, use it directly; otherwise fall back to legacy rendering
      if (this.config.svgContent) {
        await this.renderFromSVG();
      } else {
        // Legacy: Render layers in order: images (background), buttons, knobs
        await this.renderImages();
        this.renderButtons();
        await this.renderKnobs();
      }

      return this.group;
    } catch (error) {
      console.error('[AirManagerBezel] Failed to render:', error);
      throw error;
    }
  }

  /**
   * Render from SVG content (new approach)
   * Clones the SVG content and makes existing buttons/knobs interactive
   */
  private async renderFromSVG(): Promise<void> {
    if (!this.config.svgContent) return;

    // Clone all child elements from the SVG (backgrounds, buttons, knobs, everything)
    const children = Array.from(this.config.svgContent.children);
    for (const child of children) {
      const clonedChild = child.cloneNode(true);
      this.group.appendChild(clonedChild);
    }

    // Fix relative image paths in the cloned SVG
    this.fixImagePaths();

    // Make existing SVG buttons interactive and create pressed images
    this.renderButtonsFromSVG();

    // Make existing SVG knobs interactive
    await this.renderKnobOverlays();
  }

  /**
   * Fix relative image paths in cloned SVG content
   * Converts "resources/bg_ap.png" to "/Instruments/.../resources/bg_ap.png"
   */
  private fixImagePaths(): void {
    const images = this.group.querySelectorAll('image');

    images.forEach(img => {
      const href = img.getAttribute('href') || img.getAttributeNS('http://www.w3.org/1999/xlink', 'href');

      if (href && !href.startsWith('http') && !href.startsWith('/') && !href.startsWith('data:')) {
        // Relative path - convert to absolute
        const absolutePath = `${this.config.basePath}/${href}`;
        img.setAttribute('href', absolutePath);
        img.setAttributeNS('http://www.w3.org/1999/xlink', 'href', absolutePath);
      }
    });
  }

  /**
   * Make existing SVG button rects interactive and create pressed state images
   */
  private renderButtonsFromSVG(): void {
    for (const btn of this.config.buttons) {
      // Find the existing button rect in the cloned SVG
      const existingButton = this.group.querySelector(`#${btn.id}`) as SVGRectElement;

      if (existingButton) {
        // Make the existing button interactive
        existingButton.style.cursor = 'pointer';
        existingButton.setAttribute('data-button-id', btn.id);

        // In debug mode, ensure button is visible
        if (this.debugMode && existingButton.getAttribute('fill') === 'transparent') {
          existingButton.setAttribute('fill', 'rgba(255, 0, 0, 0.3)');
          existingButton.setAttribute('stroke', 'red');
          existingButton.setAttribute('stroke-width', '2');
        }

        // Create pressed state image (hidden by default)
        if (btn.pressedImage) {
          const pressedImg = this.createSVGElement('image');
          pressedImg.setAttribute('id', `${btn.id}_pressed`);
          pressedImg.setAttribute('href', btn.pressedImage);
          pressedImg.setAttribute('x', String(btn.x));
          pressedImg.setAttribute('y', String(btn.y));
          pressedImg.setAttribute('width', String(btn.width));
          pressedImg.setAttribute('height', String(btn.height));
          pressedImg.setAttribute('visibility', 'hidden');
          pressedImg.style.pointerEvents = 'none';

          this.group.appendChild(pressedImg);
          this.pressedImages.set(btn.id, pressedImg);
        }

        // Add press/click handlers
        existingButton.addEventListener('mousedown', () => this.showPressedState(btn.id));
        existingButton.addEventListener('mouseup', () => this.hidePressedState(btn.id));
        existingButton.addEventListener('mouseleave', () => this.hidePressedState(btn.id));
        existingButton.addEventListener('click', () => this.handleButtonClick(btn));
      }
    }
  }

  /**
   * Show pressed state image for a button
   */
  private showPressedState(buttonId: string): void {
    const pressedImg = this.pressedImages.get(buttonId);
    if (pressedImg) {
      pressedImg.setAttribute('visibility', 'visible');
    }
  }

  /**
   * Hide pressed state image for a button
   */
  private hidePressedState(buttonId: string): void {
    const pressedImg = this.pressedImages.get(buttonId);
    if (pressedImg) {
      pressedImg.setAttribute('visibility', 'hidden');
    }
  }

  /**
   * Render transparent knob overlays for wheel interaction
   * (Knobs are already visible in the SVG, we just need interaction)
   */
  private async renderKnobOverlays(): Promise<void> {
    for (const dial of this.config.dials) {
      // Find the existing knob image in the cloned SVG
      const existingKnob = this.group.querySelector(`#${dial.id}`) as SVGImageElement;

      if (existingKnob) {
        // Make the existing knob interactive
        existingKnob.style.cursor = 'ns-resize';
        existingKnob.style.transformOrigin = `${dial.x + dial.width / 2}px ${dial.y + dial.height / 2}px`;
        existingKnob.setAttribute('data-dial-id', dial.id);

        // Store knob state
        this.knobs.set(dial.id, { rotation: 0, element: existingKnob });

        // Add wheel handler
        existingKnob.addEventListener('wheel', (e: WheelEvent) => this.handleKnobWheel(e, dial));
      }
    }
  }

  /**
   * Render all img_add() images (typically backgrounds) - LEGACY
   */
  private async renderImages(): Promise<void> {
    for (const img of this.config.images) {
      // img.image already contains full path from TypeScript instrument
      const imageElement = this.createSVGElement('image');
      imageElement.setAttribute('id', img.id);
      imageElement.setAttribute('href', img.image);
      imageElement.setAttribute('x', String(img.x));
      imageElement.setAttribute('y', String(img.y));

      // Handle fullscreen images (width/height = 0)
      const width = img.width === 0 ? this.config.metadata.prefWidth : img.width;
      const height = img.height === 0 ? this.config.metadata.prefHeight : img.height;

      imageElement.setAttribute('width', String(width));
      imageElement.setAttribute('height', String(height));
      imageElement.style.pointerEvents = 'none';

      this.group.appendChild(imageElement);
    }
  }

  /**
   * Render all button_add() buttons
   */
  private renderButtons(): void {
    for (const btn of this.config.buttons) {
      const button = this.createSVGElement('rect');
      button.setAttribute('id', btn.id);
      button.setAttribute('x', String(btn.x));
      button.setAttribute('y', String(btn.y));
      button.setAttribute('width', String(btn.width));
      button.setAttribute('height', String(btn.height));

      // Transparent overlay for click detection
      button.setAttribute('fill', this.debugMode ? 'rgba(255, 0, 0, 0.3)' : 'transparent');
      button.setAttribute('stroke', this.debugMode ? 'red' : 'none');
      button.setAttribute('stroke-width', this.debugMode ? '1' : '0');
      button.style.cursor = 'pointer';
      button.setAttribute('data-button-id', btn.id);

      // Add click handler
      button.addEventListener('click', () => this.handleButtonClick(btn));

      this.group.appendChild(button);
    }
  }

  /**
   * Render all dial_add() knobs
   */
  private async renderKnobs(): Promise<void> {
    for (const dial of this.config.dials) {
      // dial.image already contains full path from TypeScript instrument
      const knob = this.createSVGElement('image');
      knob.setAttribute('id', dial.id);
      knob.setAttribute('href', dial.image);
      knob.setAttribute('x', String(dial.x));
      knob.setAttribute('y', String(dial.y));
      knob.setAttribute('width', String(dial.width));
      knob.setAttribute('height', String(dial.height));
      knob.style.cursor = 'ns-resize';
      knob.style.transformOrigin = `${dial.x + dial.width / 2}px ${dial.y + dial.height / 2}px`;
      knob.setAttribute('data-dial-id', dial.id);

      // Store knob state
      this.knobs.set(dial.id, { rotation: 0, element: knob });

      // Add wheel handler
      knob.addEventListener('wheel', (e: WheelEvent) => this.handleKnobWheel(e, dial));

      this.group.appendChild(knob);
    }
  }

  /**
   * Handle button click - send appropriate SimConnect event
   */
  private handleButtonClick(btn: ButtonDefinition): void {
    const callback = btn.callback;

    if (callback.type === 'h-event') {
      window.cmd.send({ type: 'H', event: callback.event });
    } else if (callback.type === 'k-event') {
      window.cmd.send({ type: 'K', event: callback.event });
    } else {
      console.warn(`Custom button callback not implemented for ${btn.id}:`, callback.code);
    }
  }

  /**
   * Handle knob wheel - rotate and send events
   */
  private handleKnobWheel(e: WheelEvent, dial: DialDefinition): void {
    e.preventDefault();

    const knobData = this.knobs.get(dial.id);
    if (!knobData) return;

    // Determine direction: positive deltaY = scroll down = decrease
    const delta = e.deltaY > 0 ? -1 : 1;

    // Rotate knob visually
    knobData.rotation += delta * 15;
    knobData.element.style.transform = `rotate(${knobData.rotation}deg)`;

    // Send SimConnect event
    const callback = dial.callback;

    if (callback.type === 'h-event' || callback.type === 'k-event') {
      const event = delta > 0 ? callback.eventIncrement : callback.eventDecrement;
      const eventType = callback.type === 'h-event' ? 'H' : 'K';
      window.cmd.send({ type: eventType, event });
    } else {
      console.warn(`Custom dial callback not implemented for ${dial.id}:`, callback.code);
    }
  }

  /**
   * Get native dimensions from instrument metadata
   */
  getNativeDimensions(): { width: number; height: number } {
    return {
      width: this.config.metadata.prefWidth,
      height: this.config.metadata.prefHeight
    };
  }
}
