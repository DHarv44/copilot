/**
 * TypeScript interfaces representing parsed Air Manager instrument data
 */

export interface InstrumentMetadata {
  uuid: string;
  aircraft: string;
  type: string;
  author: string;
  description: string;
  version: string;
  prefWidth: number;
  prefHeight: number;
  compatibleFS2020: boolean;
}

export interface ButtonDefinition {
  id: string;
  backgroundImage: string | null; // Path to image, or null for transparent
  pressedImage: string | null;    // Path to pressed state image
  x: number;
  y: number;
  width: number;
  height: number;
  callback: ButtonCallback;
}

export interface DialDefinition {
  id: string;
  type: 'inner' | 'outer';
  image: string;  // Path to knob image (plain_knob_inner.png, etc.)
  x: number;
  y: number;
  width: number;
  height: number;
  callback: DialCallback;
}

export interface ImageDefinition {
  id: string;
  image: string;  // Path to image
  x: number;
  y: number;
  width: number;
  height: number;
  visible?: boolean;  // For conditional visibility
}

export interface UserProperty {
  name: string;
  type: 'select' | 'checkbox' | 'text';
  label: string;
  defaultValue: string | boolean;
  options?: string[];  // For select type
}

// Event callback types
export type ButtonCallback = {
  type: 'h-event' | 'k-event';
  event: string;
  value?: number | string;
} | {
  type: 'custom';
  code: string;  // Raw Lua code if we can't parse it
};

export type DialCallback = {
  type: 'h-event' | 'k-event';
  eventIncrement: string;
  eventDecrement: string;
  value?: number | string;
} | {
  type: 'custom';
  code: string;
};

export interface InstrumentConfig {
  metadata: InstrumentMetadata;
  basePath: string;  // Path to instrument folder
  buttons: ButtonDefinition[];
  dials: DialDefinition[];
  images: ImageDefinition[];  // Legacy - kept for TypeScript-based instruments
  userProperties: UserProperty[];
  svgContent?: SVGElement;  // For SVG-based instruments - contains full visual content
}
