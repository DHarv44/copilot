/**
 * Loads Air Manager instrument configurations from SVG files
 * Parses buttons (rect elements) and knobs (image elements) with their coordinates
 */

import { InstrumentConfig, ButtonDefinition, DialDefinition, ImageDefinition, ButtonCallback, DialCallback } from './InstrumentConfig';

interface SVGInstrumentMetadata {
  width: number;
  height: number;
  name: string;
  basePath: string;
  mode?: 'PFD' | 'MFD';
}

export class SVGInstrumentLoader {
  /**
   * Load instrument from SVG file
   * @param svgPath Path to SVG file (e.g., '/Instruments/Generic/.../g1000_ap_bezel.svg')
   * @param metadata Instrument metadata
   */
  static async load(svgPath: string, metadata: SVGInstrumentMetadata): Promise<InstrumentConfig> {
    // Fetch and parse SVG
    const response = await fetch(svgPath);
    const svgText = await response.text();
    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(svgText, 'image/svg+xml');

    // Extract button/dial coordinates and callbacks
    const mode = metadata.mode || 'PFD';
    const buttons = this.extractButtons(svgDoc, mode);
    const dials = this.extractDials(svgDoc, mode);

    // Clone the entire SVG content (backgrounds, knobs, everything)
    const svgElement = svgDoc.documentElement.cloneNode(true) as SVGElement;

    return {
      metadata: {
        uuid: metadata.name,
        type: metadata.name,
        aircraft: 'Generic',
        author: 'Converted from SVG',
        description: `Loaded from ${svgPath}`,
        version: '1.0',
        prefWidth: metadata.width,
        prefHeight: metadata.height,
        compatibleFS2020: true
      },
      basePath: metadata.basePath,
      buttons,
      dials,
      images: [],  // No longer needed - SVG contains everything
      userProperties: [],
      svgContent: svgElement  // Full SVG with backgrounds already rendered
    };
  }

  /**
   * Extract button definitions from rect elements
   */
  private static extractButtons(svgDoc: Document, mode: 'PFD' | 'MFD'): ButtonDefinition[] {
    const buttons: ButtonDefinition[] = [];

    // Find all rect elements with specific IDs
    const rects = svgDoc.querySelectorAll('rect[id]');

    rects.forEach(rect => {
      const id = rect.getAttribute('id');
      if (!id) return;

      // Parse coordinates
      const x = parseFloat(rect.getAttribute('x') || '0');
      const y = parseFloat(rect.getAttribute('y') || '0');
      const width = parseFloat(rect.getAttribute('width') || '0');
      const height = parseFloat(rect.getAttribute('height') || '0');

      // Determine callback based on ID
      const callback = this.getButtonCallback(id, mode);
      if (!callback) return; // Skip unknown buttons

      // Map button ID to pressed image
      const pressedImage = this.getPressedImage(id);

      buttons.push({
        id,
        backgroundImage: null,  // SVG provides the background
        pressedImage,  // PNG file shown on press
        x,
        y,
        width,
        height,
        callback
      });
    });

    return buttons;
  }

  /**
   * Extract dial/knob definitions from image elements
   */
  private static extractDials(svgDoc: Document, mode: 'PFD' | 'MFD'): DialDefinition[] {
    const dials: DialDefinition[] = [];

    // Find all image elements with knob IDs
    const images = svgDoc.querySelectorAll('image[id]');

    images.forEach(img => {
      const id = img.getAttribute('id');
      if (!id) return;

      // Only process knob images (not background images)
      if (id === 'image2' || id === 'image4') return;

      const imagePath = img.getAttribute('xlink:href') || img.getAttribute('href') || '';
      if (!imagePath.includes('knob')) return; // Skip non-knob images

      // Parse coordinates
      const x = parseFloat(img.getAttribute('x') || '0');
      const y = parseFloat(img.getAttribute('y') || '0');
      const width = parseFloat(img.getAttribute('width') || '0');
      const height = parseFloat(img.getAttribute('height') || '0');

      // Determine type from image path
      const type = imagePath.includes('inner') ? 'inner' : 'outer';

      // Full path to image
      const fullImagePath = `/Instruments/Generic/Generic-Garmin_G1000_NXi/c380f8f5-316a-42c1-0c3a-324cbd906f3c/${imagePath}`;

      // Determine callback based on ID
      const callback = this.getDialCallback(id, mode);
      if (!callback) return; // Skip unknown dials

      dials.push({
        id,
        type: type as 'inner' | 'outer',
        image: fullImagePath,
        x,
        y,
        width,
        height,
        callback
      });
    });

    return dials;
  }


  /**
   * Map button ID to callback (based on G1000 NXi events)
   */
  private static getButtonCallback(id: string, mode: 'PFD' | 'MFD'): ButtonCallback | null {

    // Button ID to event mapping
    const buttonMap: Record<string, ButtonCallback> = {
      // Channel swap buttons
      'nav_swap': { type: 'h-event', event: `AS1000_${mode}_NAV_Switch` },
      'com_swap': { type: 'h-event', event: `AS1000_${mode}_COM_Switch` },

      // Autopilot buttons - use press() functions with Input Event → K-event fallback
      'ap_master': { type: 'press', button: 'AP' },
      'ap_fd': { type: 'press', button: 'FD' },
      'ap_hdg': { type: 'press', button: 'HDG' },
      'ap_alt': { type: 'press', button: 'ALT' },
      'ap_nav': { type: 'press', button: 'NAV' },
      'ap_vnav': { type: 'press', button: 'VNAV' },
      'ap_apr': { type: 'press', button: 'APR' },
      'ap_bc': { type: 'press', button: 'BC' },
      'ap_vs': { type: 'press', button: 'VS' },
      'ap_flc': { type: 'press', button: 'FLC' },
      'nose_up': { type: 'h-event', event: `AS1000_${mode}_NOSE_UP` },
      'nose_down': { type: 'h-event', event: `AS1000_${mode}_NOSE_DOWN` },

      // Right side control buttons
      'clr-9-1': { type: 'h-event', event: `AS1000_${mode}_CLR` },
      'clr-9': { type: 'h-event', event: `AS1000_${mode}_ENT` },
      'clr-1': { type: 'h-event', event: `AS1000_${mode}_FPL_Push` },
      'clr-2': { type: 'h-event', event: `AS1000_${mode}_PROC_Push` },
      'clr-3': { type: 'h-event', event: `AS1000_${mode}_DIRECTTO_Push` },
      'clr-4': { type: 'h-event', event: `AS1000_${mode}_MENU_Push` }
    };

    // Handle softkeys (softkey_1, softkey_1-8, etc.)
    if (id.startsWith('softkey_')) {
      // Extract softkey number
      const match = id.match(/softkey_1-?(\d*)/);
      if (match) {
        const num = match[1] ? parseInt(match[1]) : 1;
        // Map to 1-12
        const softkeyNum = num === 8 ? 2 :
                          num === 6 ? 3 :
                          num === 7 ? 4 :
                          num === 1 ? 5 :
                          num === 9 ? 6 :
                          num === 2 ? 7 :
                          num === 97 ? 8 :
                          num === 83 ? 9 :
                          num === 22 ? 10 :
                          num === 13 ? 11 :
                          num === 4 ? 12 : 1;

        return {
          type: 'h-event',
          event: `AS1000_${mode}_SOFTKEYS_${softkeyNum}`
        };
      }
    }

    return buttonMap[id] || null;
  }

  /**
   * Map dial ID to callback (based on G1000 NXi events)
   */
  private static getDialCallback(id: string, mode: 'PFD' | 'MFD'): DialCallback | null {

    const dialMap: Record<string, DialCallback> = {
      // Volume knobs
      'nav_vol': {
        type: 'h-event',
        eventIncrement: `AS1000_${mode}_VOL_1_INC`,
        eventDecrement: `AS1000_${mode}_VOL_1_DEC`
      },
      'com_vol': {
        type: 'h-event',
        eventIncrement: `AS1000_${mode}_VOL_2_INC`,
        eventDecrement: `AS1000_${mode}_VOL_2_DEC`
      },

      // NAV tuning
      'nav_tune_outer': {
        type: 'h-event',
        eventIncrement: `AS1000_${mode}_NAV_Large_INC`,
        eventDecrement: `AS1000_${mode}_NAV_Large_DEC`
      },
      'nav_tune_inner': {
        type: 'h-event',
        eventIncrement: `AS1000_${mode}_NAV_Small_INC`,
        eventDecrement: `AS1000_${mode}_NAV_Small_DEC`
      },

      // COM tuning
      'com_tune_outer': {
        type: 'h-event',
        eventIncrement: `AS1000_${mode}_COM_Large_INC`,
        eventDecrement: `AS1000_${mode}_COM_Large_DEC`
      },
      'com_tune_inner': {
        type: 'h-event',
        eventIncrement: `AS1000_${mode}_COM_Small_INC`,
        eventDecrement: `AS1000_${mode}_COM_Small_DEC`
      },

      // HDG/CRS
      'hdg': {
        type: 'k-event',
        eventIncrement: 'HEADING_BUG_INC',
        eventDecrement: 'HEADING_BUG_DEC'
      },
      'crs': {
        type: 'k-event',
        eventIncrement: 'VOR1_OBI_INC',
        eventDecrement: 'VOR1_OBI_DEC'
      },

      // ALT knobs
      'alt_outer': {
        type: 'k-event',
        eventIncrement: 'AP_ALT_VAR_INC',
        eventDecrement: 'AP_ALT_VAR_DEC'
      },
      'alt_inner': {
        type: 'k-event',
        eventIncrement: 'AP_ALT_VAR_INC',
        eventDecrement: 'AP_ALT_VAR_DEC'
      },

      // Range
      'range': {
        type: 'h-event',
        eventIncrement: `AS1000_${mode}_RANGE_INC`,
        eventDecrement: `AS1000_${mode}_RANGE_DEC`
      },

      // FMS
      'fms_outer': {
        type: 'h-event',
        eventIncrement: `AS1000_${mode}_FMS_Upper_INC`,
        eventDecrement: `AS1000_${mode}_FMS_Upper_DEC`
      },
      'fms_inner': {
        type: 'h-event',
        eventIncrement: `AS1000_${mode}_FMS_Lower_INC`,
        eventDecrement: `AS1000_${mode}_FMS_Lower_DEC`
      }
    };

    return dialMap[id] || null;
  }

  /**
   * Map button ID to pressed image file
   */
  private static getPressedImage(id: string): string | null {
    const basePath = '/Instruments/Generic/Generic-Garmin_G1000_NXi/c380f8f5-316a-42c1-0c3a-324cbd906f3c/resources';

    // Button ID to pressed image mapping
    const pressedMap: Record<string, string> = {
      // Autopilot buttons
      'ap_master': `${basePath}/ap_pressed.png`,
      'ap_fd': `${basePath}/fd_pressed.png`,
      'ap_hdg': `${basePath}/hdg_pressed.png`,
      'ap_alt': `${basePath}/alt_pressed.png`,
      'ap_nav': `${basePath}/nav_pressed.png`,
      'ap_vnav': `${basePath}/vnv_pressed.png`,
      'ap_apr': `${basePath}/apr_pressed.png`,
      'ap_bc': `${basePath}/bc_pressed.png`,
      'ap_vs': `${basePath}/vs_pressed.png`,
      'ap_flc': `${basePath}/flc_pressed.png`,
      'nose_up': `${basePath}/nsup_pressed.png`,
      'nose_down': `${basePath}/nsdn_pressed.png`,

      // Channel swap buttons
      'nav_swap': `${basePath}/channel_swap_pressed.png`,
      'com_swap': `${basePath}/channel_swap_pressed.png`,

      // Right side control buttons
      'clr-9-1': `${basePath}/clr_pressed.png`,
      'clr-9': `${basePath}/ent_pressed.png`,
      'clr-1': `${basePath}/fpl_pressed.png`,
      'clr-2': `${basePath}/proc_pressed.png`,
      'clr-3': `${basePath}/dir_pressed.png`,
      'clr-4': `${basePath}/menu_pressed.png`,

      // Softkeys - all use same pressed image
      'softkey_1': `${basePath}/softkey_pressed.png`,
      'softkey_1-8': `${basePath}/softkey_pressed.png`,
      'softkey_1-6': `${basePath}/softkey_pressed.png`,
      'softkey_1-7': `${basePath}/softkey_pressed.png`,
      'softkey_1-1': `${basePath}/softkey_pressed.png`,
      'softkey_1-9': `${basePath}/softkey_pressed.png`,
      'softkey_1-2': `${basePath}/softkey_pressed.png`,
      'softkey_1-3': `${basePath}/softkey_pressed.png`,
      'softkey_1-4': `${basePath}/softkey_pressed.png`,
      'softkey_1-5': `${basePath}/softkey_pressed.png`,
      'softkey_2': `${basePath}/softkey_pressed.png`,
      'softkey_2-0': `${basePath}/softkey_pressed.png`
    };

    return pressedMap[id] || null;
  }
}
