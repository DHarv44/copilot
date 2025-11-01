/**
 * G1000Button - Handles clicks on G1000 bezel buttons and sends H-events
 */

import { sendG1000Event } from '../utils/g1000Events';

export class G1000Button {
  private element: SVGElement;
  private eventName: string;
  private id: string;

  constructor(id: string, element: SVGElement, eventName: string) {
    this.id = id;
    this.element = element;
    this.eventName = eventName;

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    // Make the element clickable
    this.element.style.cursor = 'pointer';

    // Click handler
    this.element.addEventListener('click', () => {
      this.handleClick();
    });

    // Visual feedback on hover
    this.element.addEventListener('mouseenter', () => {
      this.element.style.opacity = '0.7';
    });

    this.element.addEventListener('mouseleave', () => {
      this.element.style.opacity = '1';
    });
  }

  private async handleClick(): Promise<void> {
    try {
      console.debug(`[G1000] Clicked ${this.id} -> ${this.eventName}`);
      await sendG1000Event(this.eventName);

      // Visual feedback
      this.element.style.opacity = '0.5';
      setTimeout(() => {
        this.element.style.opacity = '1';
      }, 100);
    } catch (err) {
      console.error(`[G1000] Failed to send event ${this.eventName}:`, err);
    }
  }

  destroy(): void {
    // Clean up event listeners if needed
  }
}
