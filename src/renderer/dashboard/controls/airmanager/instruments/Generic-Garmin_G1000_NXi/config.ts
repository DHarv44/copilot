/**
 * G1000 NXi Bezel Configuration
 * Converted from Air Manager Lua instrument
 * Source: Generic-Garmin_G1000_NXi/c380f8f5-316a-42c1-0c3a-324cbd906f3c
 */

export const metadata = {
  uuid: 'c380f8f5-316a-42c1-0c3a-324cbd906f3c',
  type: 'Garmin G1000 NXi',
  aircraft: 'Generic',
  author: 'Simstrumentation',
  description: 'G1000 bezel specifically designed for MSFS 2020 and Working Title G1000 NXi',
  version: '210',
  prefWidth: 1412,
  prefHeight: 917,
  compatibleFS2020: true
};

/**
 * User-configurable properties
 */
export interface G1000UserProps {
  /** PFD or MFD unit mode */
  mode: 'PFD' | 'MFD';

  /** Autopilot controls visibility */
  showAP: 'All' | 'Hide buttons' | 'Hide buttons and ALT knob';

  /** Play button/knob sounds */
  playSounds: boolean;

  /** Logo to display */
  logo: 'Simstrumentation' | 'Garmin';
}

export const defaultUserProps: G1000UserProps = {
  mode: 'PFD',
  showAP: 'All',
  playSounds: true,
  logo: 'Simstrumentation'
};

/** Base path to instrument resources */
export const RESOURCES_PATH = '/Instruments/Generic/Generic-Garmin_G1000_NXi/c380f8f5-316a-42c1-0c3a-324cbd906f3c/resources';
