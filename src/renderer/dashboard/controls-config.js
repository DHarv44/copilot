// NavBoard Controls Configuration
// Coordinates extracted from NavBoard SVG (viewBox: 0 0 508 254)

export const CONTROLS = {
  // Push Buttons - Green circles (r=11)
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

  // Rotary Knobs - Orange circles (r=7)
  rotaryKnobs: [
    { id: 'IAS_KNOB', cx: 165.07, cy: 69.17, label: 'IAS/MACH' },
    { id: 'HDG_KNOB', cx: 122.95, cy: 117.62, label: 'HDG' },
    { id: 'ALT_KNOB', cx: 385.03, cy: 117.66, label: 'ALT' }
  ],

  // Push-Button Rotary Knobs - Green squares (15x15)
  pushRotaryKnobs: [
    { id: 'MFD', x: 355.71, y: 15.62, width: 15, height: 15, label: 'MFD' },
    { id: 'PFD', x: 378.28, y: 15.85, width: 15, height: 15, label: 'PFD' }
  ],

  // Small indicator circles - Green (r=7) - possibly status LEDs
  indicators: [
    { id: 'IND1', cx: 48.68, cy: 112.22, label: '' },
    { id: 'IND2', cx: 73.02, cy: 112.22, label: '' },
    { id: 'IND3', cx: 97.45, cy: 112.22, label: '' }
  ],

  // Rollers - Rectangles with inner rectangles
  rollers: [
    // PIT and TRIM coordinates to be determined from SVG analysis
  ],

  // Gear Lever
  gearLever: {
    id: 'GEAR',
    x: 227.51,
    y: 228.37,
    width: 16,
    height: 20,
    label: 'GEAR'
  }
};
