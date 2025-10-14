/**
 * G1000 NXi MFD Bezel
 * Loads from g1000_mfd_bezel.svg
 */

import { SVGInstrumentLoader } from '../../SVGInstrumentLoader';
import { InstrumentConfig } from '../../InstrumentConfig';

const SVG_PATH = '/Instruments/Generic/Generic-Garmin_G1000_NXi/c380f8f5-316a-42c1-0c3a-324cbd906f3c/g1000_mfd_bezel.svg';
const BASE_PATH = '/Instruments/Generic/Generic-Garmin_G1000_NXi/c380f8f5-316a-42c1-0c3a-324cbd906f3c';

export async function loadG1000MFD(): Promise<InstrumentConfig> {
  return SVGInstrumentLoader.load(SVG_PATH, {
    width: 1412,
    height: 917,
    name: 'G1000 NXi MFD',
    basePath: BASE_PATH,
    mode: 'MFD'
  });
}
