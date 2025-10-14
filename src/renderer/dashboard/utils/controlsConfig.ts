export interface ControlButton {
  id: string;
  cx: number;
  cy: number;
  label: string;
}

export interface ControlKnob {
  id: string;
  cx: number;
  cy: number;
  label: string;
}

export interface PushRotaryKnob {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
}

export interface SmallCircle {
  id: string;
  cx: number;
  cy: number;
  r: number;
}

export interface Indicator {
  id: string;
  cx: number;
  cy: number;
  r: number;
  color: string;
}

export interface ToggleSwitch {
  id: string;
  cx: number;
  cy: number;
  label: string;
}

export interface EventDefinition {
  on: string;
  off: string;
  simvar?: string;
}

export interface EventsConfig {
  version: string;
  k: Record<string, EventDefinition>;
}

export interface ControlsConfig {
  pushButtons: ControlButton[];
  rotaryKnobs: ControlKnob[];
  pushRotaryKnobs: PushRotaryKnob[];
  smallCircles: SmallCircle[];
  indicators: Indicator[];
  toggleSwitches: ToggleSwitch[];
}

export const EVENTS: EventsConfig = {
  version: '1.0.0',
  k: {
    AP: { on: 'AP_MASTER', off: 'AP_MASTER', simvar: 'AUTOPILOT MASTER' },
    FD: { on: 'FLIGHT_DIRECTOR_ON', off: 'FLIGHT_DIRECTOR_OFF', simvar: 'AUTOPILOT FLIGHT DIRECTOR ACTIVE' },
    HDG: { on: 'AP_HDG_HOLD_ON', off: 'AP_HDG_HOLD_OFF', simvar: 'AUTOPILOT HEADING LOCK' },
    NAV: { on: 'AP_NAV1_HOLD_ON', off: 'AP_NAV1_HOLD_OFF', simvar: 'AUTOPILOT NAV1 LOCK' },
    APR: { on: 'AP_APR_HOLD_ON', off: 'AP_APR_HOLD_OFF', simvar: 'AUTOPILOT APPROACH ACTIVE' },
    ALT: { on: 'AP_ALT_HOLD_ON', off: 'AP_ALT_HOLD_OFF', simvar: 'AUTOPILOT ALTITUDE LOCK' },
    VS: { on: 'AP_VS_HOLD', off: 'AP_VS_HOLD', simvar: 'AUTOPILOT VERTICAL HOLD' },
    FLC: { on: 'FLIGHT_LEVEL_CHANGE_ON', off: 'FLIGHT_LEVEL_CHANGE_OFF', simvar: 'AUTOPILOT FLIGHT LEVEL CHANGE' }
  }
};

export const CONTROLS: ControlsConfig = {
  pushButtons: [
    { id: 'AP', cx: 236.39, cy: 69.17, label: 'AP' },
    { id: 'FD', cx: 271.74, cy: 69.17, label: 'FD' },
    { id: 'YD', cx: 307.26, cy: 69.17, label: 'YD' },
    { id: 'HDG', cx: 236.39, cy: 99.83, label: 'HDG' },
    { id: 'ALT', cx: 271.74, cy: 99.83, label: 'ALT' },
    { id: 'NAV', cx: 236.39, cy: 130.50, label: 'NAV' },
    { id: 'VNAV', cx: 271.74, cy: 130.50, label: 'VNAV' },
    { id: 'APR', cx: 236.39, cy: 161.16, label: 'APR' },
    { id: 'BC', cx: 271.74, cy: 161.16, label: 'BC' },
    { id: 'VS', cx: 236.39, cy: 191.82, label: 'VS' },
    { id: 'FLC', cx: 271.74, cy: 191.82, label: 'FLC' },
    { id: 'BANK', cx: 200.71, cy: 69.17, label: 'BANK' }
  ],
  rotaryKnobs: [
    { id: 'IAS_KNOB', cx: 165.07, cy: 69.17, label: '' },
    { id: 'HDG_KNOB', cx: 122.95, cy: 117.62, label: '' },
    { id: 'ALT_KNOB', cx: 385.03, cy: 117.66, label: '' }
  ],
  pushRotaryKnobs: [
    { id: 'MFD', x: 355.71, y: 15.62, width: 15, height: 15, label: '' },
    { id: 'PFD', x: 378.28, y: 15.85, width: 15, height: 15, label: '' },
    { id: 'PANEL1', x: 116.39, y: 15.13, width: 15, height: 15, label: '' },
    { id: 'PANEL2', x: 138.96, y: 15.37, width: 15, height: 15, label: '' }
  ],
  smallCircles: [
    // Top row small circles (r=7) - likely indicator lights or small buttons
    { id: 'IND_TOP_1', cx: 172.98, cy: 23.35, r: 7 },
    { id: 'IND_TOP_2', cx: 192.98, cy: 23.35, r: 7 },
    { id: 'IND_TOP_3', cx: 212.99, cy: 23.35, r: 7 },
    { id: 'IND_TOP_4', cx: 232.99, cy: 23.35, r: 7 },
    { id: 'IND_TOP_5', cx: 253.00, cy: 23.35, r: 7 },
    { id: 'IND_TOP_6', cx: 273.00, cy: 23.35, r: 7 },
    { id: 'IND_TOP_7', cx: 293.00, cy: 23.35, r: 7 },
    { id: 'IND_TOP_8', cx: 313.01, cy: 23.35, r: 7 },
    // Left side small circles
    { id: 'IND_LEFT_1', cx: 48.68, cy: 112.22, r: 7 },
    { id: 'IND_LEFT_2', cx: 73.02, cy: 112.22, r: 7 },
    { id: 'IND_LEFT_3', cx: 97.45, cy: 112.22, r: 7 },
    // Right side
    { id: 'IND_RIGHT_1', cx: 461.72, cy: 110.84, r: 7 }
  ],
  indicators: [
    // Bottom indicator lights (colored circles r=4)
    { id: 'IND_GREEN_1', cx: 265.18, cy: 228.53, r: 4, color: '#05988a' },
    { id: 'IND_GREEN_2', cx: 254.55, cy: 243.88, r: 4, color: '#05988a' },
    { id: 'IND_GREEN_3', cx: 275.82, cy: 244.37, r: 4, color: '#05988a' },
    { id: 'IND_RED_1', cx: 283.80, cy: 219.94, r: 4, color: '#da1400' }
  ],
  toggleSwitches: [
    // Top row lighting controls - matching circles at cy=23.351034
    { id: 'LAND', cx: 172.98, cy: 23.35, label: 'LAND' },
    { id: 'TAXI', cx: 192.98, cy: 23.35, label: 'TAXI' },
    { id: 'WINGS', cx: 212.99, cy: 23.35, label: 'WINGS' },
    { id: 'NAV', cx: 232.99, cy: 23.35, label: 'NAV' },
    { id: 'RECOG', cx: 253.00, cy: 23.35, label: 'RECOG' },
    { id: 'STROBE', cx: 273.00, cy: 23.35, label: 'STROBE' },
    { id: 'TAIL', cx: 293.00, cy: 23.35, label: 'TAIL' },
    { id: 'BEACON', cx: 313.01, cy: 23.35, label: 'BEACON' }
  ]
};
