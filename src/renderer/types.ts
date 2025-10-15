/**
 * Shared types for popout capture system
 */

export type PopoutKey = string; // Logical ID (e.g., "PFD", "MFD", "COM1")

export interface Binding {
  key: PopoutKey;
  // Title matching rules
  preferExact?: string;       // Exact title last used (e.g., "G1000 PFD")
  titleRx: string;            // Serialized regex for fuzzy matching
  // Last session info
  lastSourceName?: string;    // Electron desktopCapturer source name
  lastBounds?: [number, number, number, number]; // [x, y, width, height]
}

export type Registry = Binding[];

/**
 * Window source from desktopCapturer
 */
export interface WindowSource {
  id: string;
  name: string;
  bounds?: { x: number; y: number; width: number; height: number };
}

/**
 * Popout capture state
 */
export interface PopoutState {
  isCapturing: boolean;
  sourceId?: string;
  sourceName?: string;
  stream?: MediaStream;
}
