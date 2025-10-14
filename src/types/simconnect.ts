// SimConnect data types

export interface AircraftMetadata {
  title: string;
  manufacturer: string;
  icao: string;
}

export interface PanelGauge {
  path: string;
}

export interface AircraftPanel {
  gauges: PanelGauge[];
}

export interface AircraftProfile {
  title: string;
  manufacturer: string;
  icao: string;
  panel?: AircraftPanel;
  avionics: string[];
  autopilot: string[];
}

export interface SimSample {
  ias?: number;
  alt?: number;
}

export interface AutopilotFlags {
  [key: string]: boolean | number;
}

export interface SimMessage {
  type: 'status' | 'aircraft' | 'aircraftProfile' | 'aircraftError' | 'sample' | 'apState';
  connected?: boolean;
  title?: string;
  reason?: string;
  attempts?: number;
  ias?: number;
  alt?: number;
  flags?: AutopilotFlags;
}

export interface PressEvent {
  type: 'press';
  button: string;
}

export interface AckEvent {
  id: string;
  ok: boolean;
  err?: string;
}

// Control types
export interface ControlPosition {
  id: string;
  cx: number;
  cy: number;
  label: string;
}

export interface PushButtonControl extends ControlPosition {}

export interface RotaryKnobControl extends ControlPosition {}

export interface PushRotaryKnobControl {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
}

export interface SmallCircleControl extends ControlPosition {
  r: number;
}

export interface IndicatorControl extends ControlPosition {
  r: number;
  color: string;
}

export interface ToggleSwitchControl extends ControlPosition {}

export interface ControlsConfig {
  pushButtons: PushButtonControl[];
  rotaryKnobs: RotaryKnobControl[];
  pushRotaryKnobs: PushRotaryKnobControl[];
  smallCircles: SmallCircleControl[];
  indicators: IndicatorControl[];
  toggleSwitches: ToggleSwitchControl[];
}

// Window API types for Electron preload
export interface SimAPI {
  onUpdate: (callback: (msg: SimMessage) => void) => void;
}

export interface CmdAPI {
  send: (event: PressEvent) => string;
  onAck: (callback: (event: AckEvent) => void) => void;
}

export interface NavboardAPI {
  getSvgText: () => Promise<string>;
}

declare global {
  interface Window {
    sim?: SimAPI;
    cmd?: CmdAPI;
    navboard?: NavboardAPI;
  }
}
