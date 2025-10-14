/**
 * G1000 NXi Bezel Logic
 * Converted from logic.lua to TypeScript
 * All coordinates match original Air Manager instrument at native 1412x917 resolution
 */

import { ButtonDefinition, DialDefinition, ImageDefinition } from '../../InstrumentConfig';
import { G1000UserProps, RESOURCES_PATH } from './config';

/**
 * Get background images based on autopilot visibility setting
 */
export function getImages(props: G1000UserProps): ImageDefinition[] {
  const images: ImageDefinition[] = [];

  // Background image depends on AP visibility
  if (props.showAP === 'All') {
    images.push({
      id: 'bg_ap',
      image: `${RESOURCES_PATH}/bg_ap.png`,
      x: 0,
      y: 0,
      width: 1412,
      height: 917
    });
  } else if (props.showAP === 'Hide buttons') {
    images.push({
      id: 'bg_noap',
      image: `${RESOURCES_PATH}/bg_noap.png`,
      x: 0,
      y: 0,
      width: 1412,
      height: 917
    });
  } else {
    images.push({
      id: 'bg_noap_noalt',
      image: `${RESOURCES_PATH}/bg_noap_noalt.png`,
      x: 0,
      y: 0,
      width: 1412,
      height: 917
    });
  }

  // Backlight (knob illumination) - conditional on AP visibility
  if (props.showAP !== 'Hide buttons and ALT knob') {
    images.push({
      id: 'backlight_all',
      image: `${RESOURCES_PATH}/backlight_all.png`,
      x: 1,
      y: 1,
      width: 1412,
      height: 917
    });
  } else {
    images.push({
      id: 'backlight_no_alt',
      image: `${RESOURCES_PATH}/backlight_no_alt.png`,
      x: 1,
      y: 1,
      width: 1412,
      height: 917
    });
  }

  return images;
}

/**
 * Get button definitions with proper SimConnect event calls
 */
export function getButtons(props: G1000UserProps): ButtonDefinition[] {
  const buttons: ButtonDefinition[] = [];
  const mode = props.mode;

  // NAV channel swap button (line 187 in logic.lua)
  buttons.push({
    id: 'nav_swap',
    backgroundImage: null,
    pressedImage: `${RESOURCES_PATH}/channel_swap_pressed.png`,
    x: 102,
    y: 107,
    width: 50,
    height: 32,
    callback: {
      type: 'h-event',
      event: `AS1000_${mode}_NAV_Switch`  // H-event for G1000 NXi
    }
  });

  // COM channel swap button (line 196)
  buttons.push({
    id: 'com_swap',
    backgroundImage: null,
    pressedImage: `${RESOURCES_PATH}/channel_swap_pressed.png`,
    x: 1259,
    y: 107,
    width: 50,
    height: 32,
    callback: {
      type: 'h-event',
      event: `AS1000_${mode}_COM_Switch`
    }
  });

  // NAV tune push button (line 265)
  buttons.push({
    id: 'nav_tune_push',
    backgroundImage: null,
    pressedImage: null,
    x: 75,
    y: 204,
    width: 13,
    height: 13,
    callback: {
      type: 'h-event',
      event: `AS1000_${mode}_NAV_Switch`
    }
  });

  // COM tune push button (line 299)
  buttons.push({
    id: 'com_tune_push',
    backgroundImage: null,
    pressedImage: null,
    x: 1313,
    y: 204,
    width: 13,
    height: 13,
    callback: {
      type: 'h-event',
      event: `AS1000_${mode}_COM_Switch`
    }
  });

  // HDG push button (line 325)
  buttons.push({
    id: 'hdg_push',
    backgroundImage: null,
    pressedImage: null,
    x: 77,
    y: 370,
    width: 20,
    height: 20,
    callback: {
      type: 'k-event',
      event: 'AP_HDG_HOLD'  // K-event for basic autopilot
    }
  });

  // Autopilot buttons - only if showAP === 'All'
  if (props.showAP === 'All') {
    // AP Master (line 334)
    buttons.push({
      id: 'ap_master',
      backgroundImage: null,
      pressedImage: `${RESOURCES_PATH}/ap_pressed.png`,
      x: 28,
      y: 470,
      width: 50,
      height: 34,
      callback: {
        type: 'h-event',
        event: `AS1000_${mode}_AP_Switch`
      }
    });

    // HDG button (line 344)
    buttons.push({
      id: 'ap_hdg',
      backgroundImage: null,
      pressedImage: `${RESOURCES_PATH}/hdg_pressed.png`,
      x: 28,
      y: 520,
      width: 50,
      height: 34,
      callback: {
        type: 'h-event',
        event: `AS1000_${mode}_HDG_Switch`
      }
    });

    // NAV button (line 354)
    buttons.push({
      id: 'ap_nav',
      backgroundImage: null,
      pressedImage: `${RESOURCES_PATH}/nav_pressed.png`,
      x: 28,
      y: 570,
      width: 50,
      height: 32,
      callback: {
        type: 'h-event',
        event: `AS1000_${mode}_NAV_Switch`
      }
    });

    // APR button (line 365)
    buttons.push({
      id: 'ap_apr',
      backgroundImage: null,
      pressedImage: `${RESOURCES_PATH}/apr_pressed.png`,
      x: 28,
      y: 621,
      width: 52,
      height: 33,
      callback: {
        type: 'h-event',
        event: `AS1000_${mode}_APR_Switch`
      }
    });

    // VS button (line 375)
    buttons.push({
      id: 'ap_vs',
      backgroundImage: null,
      pressedImage: `${RESOURCES_PATH}/vs_pressed.png`,
      x: 28,
      y: 671,
      width: 50,
      height: 32,
      callback: {
        type: 'h-event',
        event: `AS1000_${mode}_VS_Switch`
      }
    });

    // FLC button (line 406)
    buttons.push({
      id: 'ap_flc',
      backgroundImage: null,
      pressedImage: `${RESOURCES_PATH}/flc_pressed.png`,
      x: 26,
      y: 721,
      width: 54,
      height: 32,
      callback: {
        type: 'h-event',
        event: `AS1000_${mode}_FLC_Switch`
      }
    });

    // FD button (line 422)
    buttons.push({
      id: 'ap_fd',
      backgroundImage: null,
      pressedImage: `${RESOURCES_PATH}/fd_pressed.png`,
      x: 100,
      y: 470,
      width: 50,
      height: 32,
      callback: {
        type: 'h-event',
        event: `AS1000_${mode}_FD_Switch`
      }
    });

    // ALT button (line 432)
    buttons.push({
      id: 'ap_alt',
      backgroundImage: null,
      pressedImage: `${RESOURCES_PATH}/alt_pressed.png`,
      x: 100,
      y: 520,
      width: 50,
      height: 32,
      callback: {
        type: 'h-event',
        event: `AS1000_${mode}_ALT_Switch`
      }
    });

    // VNAV button (line 442)
    buttons.push({
      id: 'ap_vnav',
      backgroundImage: null,
      pressedImage: `${RESOURCES_PATH}/vnav_pressed.png`,
      x: 100,
      y: 570,
      width: 50,
      height: 32,
      callback: {
        type: 'h-event',
        event: `AS1000_${mode}_VNAV_Switch`
      }
    });

    // BC button (line 452)
    buttons.push({
      id: 'ap_bc',
      backgroundImage: null,
      pressedImage: `${RESOURCES_PATH}/bc_pressed.png`,
      x: 100,
      y: 621,
      width: 50,
      height: 32,
      callback: {
        type: 'h-event',
        event: `AS1000_${mode}_BC_Switch`
      }
    });

    // NOSE UP button (line 462)
    buttons.push({
      id: 'nose_up',
      backgroundImage: null,
      pressedImage: `${RESOURCES_PATH}/nose_up_pressed.png`,
      x: 100,
      y: 670,
      width: 50,
      height: 32,
      callback: {
        type: 'h-event',
        event: `AS1000_${mode}_NOSE_UP`
      }
    });

    // NOSE DOWN button (line 472)
    buttons.push({
      id: 'nose_down',
      backgroundImage: null,
      pressedImage: `${RESOURCES_PATH}/nose_dn_pressed.png`,
      x: 100,
      y: 720,
      width: 50,
      height: 32,
      callback: {
        type: 'h-event',
        event: `AS1000_${mode}_NOSE_DOWN`
      }
    });
  }

  // Softkeys (12 buttons along bottom) - lines 490-554
  for (let i = 0; i < 12; i++) {
    buttons.push({
      id: `softkey_${i + 1}`,
      backgroundImage: null,
      pressedImage: null,
      x: 190 + (i * 95),
      y: 880,
      width: 80,
      height: 36,
      callback: {
        type: 'h-event',
        event: `AS1000_${mode}_SOFTKEYS_${i + 1}`
      }
    });
  }

  // Control buttons (CLR, ENT, MENU, PROC, FPL, DIRECTTO) - lines 558-586
  buttons.push({
    id: 'clr',
    backgroundImage: null,
    pressedImage: null,
    x: 1308,
    y: 652,
    width: 48,
    height: 48,
    callback: {
      type: 'h-event',
      event: `AS1000_${mode}_CLR`
    }
  });

  buttons.push({
    id: 'ent',
    backgroundImage: null,
    pressedImage: null,
    x: 1308,
    y: 568,
    width: 48,
    height: 48,
    callback: {
      type: 'h-event',
      event: `AS1000_${mode}_ENT`
    }
  });

  buttons.push({
    id: 'menu',
    backgroundImage: null,
    pressedImage: null,
    x: 1241,
    y: 481,
    width: 45,
    height: 27,
    callback: {
      type: 'h-event',
      event: `AS1000_${mode}_MENU_Push`
    }
  });

  buttons.push({
    id: 'proc',
    backgroundImage: null,
    pressedImage: null,
    x: 1241,
    y: 519,
    width: 45,
    height: 27,
    callback: {
      type: 'h-event',
      event: `AS1000_${mode}_PROC_Push`
    }
  });

  buttons.push({
    id: 'fpl',
    backgroundImage: null,
    pressedImage: null,
    x: 1322,
    y: 481,
    width: 45,
    height: 27,
    callback: {
      type: 'h-event',
      event: `AS1000_${mode}_FPL_Push`
    }
  });

  buttons.push({
    id: 'directto',
    backgroundImage: null,
    pressedImage: null,
    x: 1322,
    y: 519,
    width: 45,
    height: 27,
    callback: {
      type: 'h-event',
      event: `AS1000_${mode}_DIRECTTO_Push`
    }
  });

  return buttons;
}

/**
 * Get dial/knob definitions with proper SimConnect event calls
 */
export function getDials(props: G1000UserProps): DialDefinition[] {
  const dials: DialDefinition[] = [];
  const mode = props.mode;

  // NAV volume knob (inner) - line 213
  dials.push({
    id: 'nav_vol',
    type: 'inner',
    image: `${RESOURCES_PATH}/plain_knob_inner.png`,
    x: 63,
    y: 47,
    width: 42,
    height: 42,
    callback: {
      type: 'h-event',
      eventIncrement: `AS1000_${mode}_VOL_1_INC`,
      eventDecrement: `AS1000_${mode}_VOL_1_DEC`
    }
  });

  // COM volume knob (inner) - line 231
  dials.push({
    id: 'com_vol',
    type: 'inner',
    image: `${RESOURCES_PATH}/plain_knob_inner.png`,
    x: 1300,
    y: 47,
    width: 42,
    height: 42,
    callback: {
      type: 'h-event',
      eventIncrement: `AS1000_${mode}_VOL_2_INC`,
      eventDecrement: `AS1000_${mode}_VOL_2_DEC`
    }
  });

  // NAV tune outer - line 244
  dials.push({
    id: 'nav_tune_outer',
    type: 'outer',
    image: `${RESOURCES_PATH}/plain_knob_outer.png`,
    x: 47,
    y: 173,
    width: 79,
    height: 79,
    callback: {
      type: 'h-event',
      eventIncrement: `AS1000_${mode}_NAV_Large_INC`,
      eventDecrement: `AS1000_${mode}_NAV_Large_DEC`
    }
  });

  // NAV tune inner - line 256
  dials.push({
    id: 'nav_tune_inner',
    type: 'inner',
    image: `${RESOURCES_PATH}/plain_knob_inner.png`,
    x: 61,
    y: 187,
    width: 52,
    height: 52,
    callback: {
      type: 'h-event',
      eventIncrement: `AS1000_${mode}_NAV_Small_INC`,
      eventDecrement: `AS1000_${mode}_NAV_Small_DEC`
    }
  });

  // COM tune outer - line 278
  dials.push({
    id: 'com_tune_outer',
    type: 'outer',
    image: `${RESOURCES_PATH}/plain_knob_outer.png`,
    x: 1282,
    y: 173,
    width: 79,
    height: 79,
    callback: {
      type: 'h-event',
      eventIncrement: `AS1000_${mode}_COM_Large_INC`,
      eventDecrement: `AS1000_${mode}_COM_Large_DEC`
    }
  });

  // COM tune inner - line 290
  dials.push({
    id: 'com_tune_inner',
    type: 'inner',
    image: `${RESOURCES_PATH}/plain_knob_inner.png`,
    x: 1295,
    y: 187,
    width: 52,
    height: 52,
    callback: {
      type: 'h-event',
      eventIncrement: `AS1000_${mode}_COM_Small_INC`,
      eventDecrement: `AS1000_${mode}_COM_Small_DEC`
    }
  });

  // HDG knob - line 317
  dials.push({
    id: 'hdg',
    type: 'outer',
    image: `${RESOURCES_PATH}/hdg_knob.png`,
    x: 45,
    y: 340,
    width: 80,
    height: 80,
    callback: {
      type: 'k-event',
      eventIncrement: 'HEADING_BUG_INC',
      eventDecrement: 'HEADING_BUG_DEC'
    }
  });

  // CRS knob
  dials.push({
    id: 'crs',
    type: 'outer',
    image: `${RESOURCES_PATH}/hdg_knob.png`,
    x: 1290,
    y: 340,
    width: 80,
    height: 80,
    callback: {
      type: 'k-event',
      eventIncrement: 'VOR1_OBI_INC',
      eventDecrement: 'VOR1_OBI_DEC'
    }
  });

  // ALT knobs - only if not hidden
  if (props.showAP !== 'Hide buttons and ALT knob') {
    // ALT outer - line 483
    dials.push({
      id: 'alt_outer',
      type: 'outer',
      image: `${RESOURCES_PATH}/plain_knob_outer.png`,
      x: 47,
      y: 793,
      width: 79,
      height: 79,
      callback: {
        type: 'k-event',
        eventIncrement: 'AP_ALT_VAR_INC',
        eventDecrement: 'AP_ALT_VAR_DEC'
      }
    });

    // ALT inner
    dials.push({
      id: 'alt_inner',
      type: 'inner',
      image: `${RESOURCES_PATH}/plain_knob_inner.png`,
      x: 63,
      y: 809,
      width: 47,
      height: 47,
      callback: {
        type: 'k-event',
        eventIncrement: 'AP_ALT_VAR_INC',
        eventDecrement: 'AP_ALT_VAR_DEC'
      }
    });
  }

  // FMS outer knob - line 626
  dials.push({
    id: 'fms_outer',
    type: 'outer',
    image: `${RESOURCES_PATH}/plain_knob_outer.png`,
    x: 1282,
    y: 793,
    width: 79,
    height: 79,
    callback: {
      type: 'h-event',
      eventIncrement: `AS1000_${mode}_FMS_Upper_INC`,
      eventDecrement: `AS1000_${mode}_FMS_Upper_DEC`
    }
  });

  // FMS inner knob - line 638
  dials.push({
    id: 'fms_inner',
    type: 'inner',
    image: `${RESOURCES_PATH}/plain_knob_inner.png`,
    x: 1296,
    y: 807,
    width: 52,
    height: 52,
    callback: {
      type: 'h-event',
      eventIncrement: `AS1000_${mode}_FMS_Lower_INC`,
      eventDecrement: `AS1000_${mode}_FMS_Lower_DEC`
    }
  });

  // Range knob - line 650
  dials.push({
    id: 'range',
    type: 'inner',
    image: `${RESOURCES_PATH}/plain_knob_inner.png`,
    x: 1296,
    y: 501,
    width: 54,
    height: 54,
    callback: {
      type: 'h-event',
      eventIncrement: `AS1000_${mode}_RANGE_INC`,
      eventDecrement: `AS1000_${mode}_RANGE_DEC`
    }
  });

  return dials;
}
