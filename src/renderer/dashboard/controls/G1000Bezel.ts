import { BaseControl, ControlConfig } from './BaseControl';

interface G1000Config extends ControlConfig {
  mode: 'PFD' | 'MFD';
  debug?: boolean;
  // Note: width and height are NOT part of this config
  // Parent handles scaling from native 1412x917 to target dimensions
}

export class G1000Bezel extends BaseControl {
  // Native G1000 bezel dimensions (from Air Manager)
  private static readonly NATIVE_WIDTH = 1412;
  private static readonly NATIVE_HEIGHT = 917;

  private mode: 'PFD' | 'MFD';
  private debug: boolean;
  private backgroundImage?: SVGImageElement;
  private buttons: Map<string, SVGRectElement> = new Map();
  private knobs: Map<string, { element: SVGImageElement, rotation: number, callback: (delta: number) => void }> = new Map();

  constructor(config: G1000Config) {
    super(config);
    this.mode = config.mode || 'PFD';
    this.debug = config.debug || false;
    this.group.classList.add('g1000-bezel');
    this.group.setAttribute('data-type', 'g1000-bezel');
    this.group.setAttribute('data-mode', this.mode);
  }

  getType(): string {
    return 'g1000-bezel';
  }

  async render(): Promise<SVGGElement> {
    // Build at native 1412x917 size - parent will scale us
    const x = 0;
    const y = 0;

    // Add background image (the bezel graphic) at native size
    this.backgroundImage = this.createSVGElement('image');
    this.backgroundImage.setAttribute('x', String(x));
    this.backgroundImage.setAttribute('y', String(y));
    this.backgroundImage.setAttribute('width', String(G1000Bezel.NATIVE_WIDTH));
    this.backgroundImage.setAttribute('height', String(G1000Bezel.NATIVE_HEIGHT));
    this.backgroundImage.setAttribute('href', '../../../Instruments/Generic/Generic-Garmin_G1000_NXi/c380f8f5-316a-42c1-0c3a-324cbd906f3c/resources/bg_ap.png');
    this.group.appendChild(this.backgroundImage);

    // Add clickable button areas using native coordinates
    this.createButtons();

    // Add rotary knobs using native coordinates
    this.createKnobs();

    return this.group;
  }

  private createButtons(): void {
    // Use native Lua coordinates directly (no scaling)

    // NAV channel swap button - coordinates from Lua: (102,107,50,32)
    this.addButton('nav_swap', 102, 107, 50, 32, () => {
      window.cmd.send({ type: 'H', event: `AS1000_${this.mode}_NAV_Switch` });
    });

    // COM channel swap button - coordinates from Lua: (1259,107,50,32)
    this.addButton('com_swap', 1259, 107, 50, 32, () => {
      window.cmd.send({ type: 'H', event: `AS1000_${this.mode}_COM_Switch` });
    });

    // Autopilot Master button - coordinates from Lua: (100,420,50,32)
    this.addButton('ap_master', 100, 420, 50, 32, () => {
      window.cmd.send({ type: 'K', event: 'AP_MASTER' });
    });

    // Flight Director button - coordinates from Lua: (100,470,50,32)
    this.addButton('fd', 100, 470, 50, 32, () => {
      window.cmd.send({ type: 'K', event: 'TOGGLE_FLIGHT_DIRECTOR' });
    });

    // HDG button - coordinates from Lua: (100,320,50,32)
    this.addButton('hdg', 100, 320, 50, 32, () => {
      window.cmd.send({ type: 'K', event: 'AP_HDG_HOLD' });
    });

    // ALT button - coordinates from Lua: (100,520,50,32)
    this.addButton('alt', 100, 520, 50, 32, () => {
      window.cmd.send({ type: 'K', event: 'AP_PANEL_ALTITUDE_HOLD' });
    });

    // NAV button - coordinates from Lua: (100,370,50,32)
    this.addButton('nav', 100, 370, 50, 32, () => {
      window.cmd.send({ type: 'K', event: 'AP_NAV1_HOLD' });
    });

    // APR button - coordinates from Lua: (26,621,54,32)
    this.addButton('apr', 26, 621, 54, 32, () => {
      window.cmd.send({ type: 'K', event: 'AP_APR_HOLD' });
    });

    // VS button - coordinates from Lua: (26,671,54,32)
    this.addButton('vs', 26, 671, 54, 32, () => {
      window.cmd.send({ type: 'K', event: 'AP_VS_HOLD' });
    });

    // FLC button - coordinates from Lua: (26,721,54,32)
    this.addButton('flc', 26, 721, 54, 32, () => {
      window.cmd.send({ type: 'K', event: 'FLIGHT_LEVEL_CHANGE_ON' });
    });

    // BC (Back Course) button - coordinates from Lua: (98,621,54,32)
    this.addButton('bc', 98, 621, 54, 32, () => {
      window.cmd.send({ type: 'K', event: 'AP_BC_HOLD' });
    });

    // VNAV button - coordinates from Lua: (98,570,54,32)
    this.addButton('vnav', 98, 570, 54, 32, () => {
      window.cmd.send({ type: 'H', event: 'AS1000_VNAV_TOGGLE' });
    });

    // Nose Up button - coordinates from Lua: (100,671,50,32)
    this.addButton('nose_up', 100, 671, 50, 32, () => {
      window.cmd.send({ type: 'K', event: 'AP_VS_VAR_INC' });
    });

    // Nose Down button - coordinates from Lua: (100,721,50,32)
    this.addButton('nose_down', 100, 721, 50, 32, () => {
      window.cmd.send({ type: 'K', event: 'AP_VS_VAR_DEC' });
    });

    // Softkey buttons (12 total around the display)
    for (let i = 1; i <= 12; i++) {
      const softkeyId = `AS1000_${this.mode}_SOFTKEYS_${i}`;
      // Approximate positions based on G1000 layout
      let btnX: number, btnY: number;

      if (i <= 6) {
        // Bottom softkeys
        btnX = 250 + (i - 1) * 150;
        btnY = 875;
      } else {
        // Right side softkeys
        btnX = 1360;
        btnY = 150 + (i - 7) * 120;
      }

      this.addButton(`softkey_${i}`, btnX, btnY, 50, 32, () => {
        window.cmd.send({ type: 'H', event: softkeyId });
      });
    }

    // CLR, ENT, MENU, PROC, FPL, DIR buttons
    this.addButton('clr', 1223, 175, 50, 32, () => {
      window.cmd.send({ type: 'H', event: `AS1000_${this.mode}_CLR` });
    });

    this.addButton('ent', 1289, 175, 50, 32, () => {
      window.cmd.send({ type: 'H', event: `AS1000_${this.mode}_ENT` });
    });

    this.addButton('menu', 169, 175, 50, 32, () => {
      window.cmd.send({ type: 'H', event: `AS1000_${this.mode}_MENU_Push` });
    });

    this.addButton('proc', 99, 175, 50, 32, () => {
      window.cmd.send({ type: 'H', event: `AS1000_${this.mode}_PROC_Push` });
    });

    this.addButton('fpl', 29, 175, 50, 32, () => {
      window.cmd.send({ type: 'H', event: `AS1000_${this.mode}_FPL_Push` });
    });

    this.addButton('dir', 29, 225, 50, 32, () => {
      window.cmd.send({ type: 'H', event: `AS1000_${this.mode}_DIRECTTO_Push` });
    });
  }

  private addButton(id: string, x: number, y: number, width: number, height: number, callback: () => void): void {
    const button = this.createSVGElement('rect');
    button.setAttribute('x', String(x));
    button.setAttribute('y', String(y));
    button.setAttribute('width', String(width));
    button.setAttribute('height', String(height));
    button.setAttribute('fill', this.debug ? 'rgba(255, 0, 0, 0.3)' : 'transparent');
    button.setAttribute('stroke', this.debug ? 'red' : 'none');
    button.setAttribute('stroke-width', this.debug ? '1' : '0');
    button.setAttribute('cursor', 'pointer');
    button.setAttribute('data-button-id', id);

    button.addEventListener('click', (e) => {
      e.stopPropagation();
      callback();
    });

    this.buttons.set(id, button);
    this.group.appendChild(button);
  }

  private createKnobs(): void {
    // Use native Lua coordinates directly (no scaling)

    // HDG knob - outer knob at (264, 793, 79, 79)
    this.addKnob('hdg', 'outer', 264, 793, 79, 79, (delta) => {
      window.cmd.send({ type: 'K', event: delta > 0 ? 'HEADING_BUG_INC' : 'HEADING_BUG_DEC' });
    });

    // CRS knob - outer knob at (336, 793, 79, 79)
    this.addKnob('crs', 'outer', 336, 793, 79, 79, (delta) => {
      window.cmd.send({ type: 'K', event: delta > 0 ? 'VOR1_OBI_INC' : 'VOR1_OBI_DEC' });
    });

    // ALT outer knob at (47, 793, 79, 79)
    this.addKnob('alt_outer', 'outer', 47, 793, 79, 79, (delta) => {
      window.cmd.send({ type: 'K', event: delta > 0 ? 'AP_ALT_VAR_INC' : 'AP_ALT_VAR_DEC' });
    });

    // ALT inner knob at (63, 809, 47, 47)
    this.addKnob('alt_inner', 'inner', 63, 809, 47, 47, (delta) => {
      for (let i = 0; i < 10; i++) {
        window.cmd.send({ type: 'K', event: delta > 0 ? 'AP_ALT_VAR_INC' : 'AP_ALT_VAR_DEC' });
      }
    });

    // NAV volume knob - inner at (63, 47, 42, 42)
    this.addKnob('nav_vol', 'inner', 63, 47, 42, 42, (delta) => {
      window.cmd.send({ type: 'K', event: delta > 0 ? 'NAV1_VOLUME_INC' : 'NAV1_VOLUME_DEC' });
      window.cmd.send({ type: 'K', event: delta > 0 ? 'NAV2_VOLUME_INC' : 'NAV2_VOLUME_DEC' });
    });

    // COM volume knob - inner at (1300, 47, 42, 42)
    this.addKnob('com_vol', 'inner', 1300, 47, 42, 42, (delta) => {
      window.cmd.send({ type: 'K', event: delta > 0 ? 'COM1_VOLUME_INC' : 'COM1_VOLUME_DEC' });
      window.cmd.send({ type: 'K', event: delta > 0 ? 'COM2_VOLUME_INC' : 'COM2_VOLUME_DEC' });
    });

    // NAV tuning outer knob at (47, 173, 79, 79)
    this.addKnob('nav_tune_outer', 'outer', 47, 173, 79, 79, (delta) => {
      window.cmd.send({ type: 'H', event: `AS1000_${this.mode}_NAV_Large_${delta > 0 ? 'INC' : 'DEC'}` });
    });

    // NAV tuning inner knob at (61, 187, 52, 52)
    this.addKnob('nav_tune_inner', 'inner', 61, 187, 52, 52, (delta) => {
      window.cmd.send({ type: 'H', event: `AS1000_${this.mode}_NAV_Small_${delta > 0 ? 'INC' : 'DEC'}` });
    });

    // COM tuning outer knob at (1286, 173, 79, 79)
    this.addKnob('com_tune_outer', 'outer', 1286, 173, 79, 79, (delta) => {
      window.cmd.send({ type: 'H', event: `AS1000_${this.mode}_COM_Large_${delta > 0 ? 'INC' : 'DEC'}` });
    });

    // COM tuning inner knob at (1300, 187, 52, 52)
    this.addKnob('com_tune_inner', 'inner', 1300, 187, 52, 52, (delta) => {
      window.cmd.send({ type: 'H', event: `AS1000_${this.mode}_COM_Small_${delta > 0 ? 'INC' : 'DEC'}` });
    });

    // FMS outer knob at (622, 793, 79, 79)
    this.addKnob('fms_outer', 'outer', 622, 793, 79, 79, (delta) => {
      window.cmd.send({ type: 'H', event: `AS1000_${this.mode}_FMS_Upper_${delta > 0 ? 'INC' : 'DEC'}` });
    });

    // FMS inner knob at (638, 809, 47, 47)
    this.addKnob('fms_inner', 'inner', 638, 809, 47, 47, (delta) => {
      window.cmd.send({ type: 'H', event: `AS1000_${this.mode}_FMS_Lower_${delta > 0 ? 'INC' : 'DEC'}` });
    });

    // Range/Zoom outer knob at (710, 793, 79, 79)
    this.addKnob('range', 'outer', 710, 793, 79, 79, (delta) => {
      window.cmd.send({ type: 'H', event: `AS1000_${this.mode}_RANGE_${delta > 0 ? 'INC' : 'DEC'}` });
    });
  }

  private addKnob(id: string, type: 'inner' | 'outer', x: number, y: number, width: number, height: number, callback: (delta: number) => void): void {
    // Load the appropriate knob image
    const imagePath = type === 'inner'
      ? '../../../Instruments/Generic/Generic-Garmin_G1000_NXi/c380f8f5-316a-42c1-0c3a-324cbd906f3c/resources/plain_knob_inner.png'
      : '../../../Instruments/Generic/Generic-Garmin_G1000_NXi/c380f8f5-316a-42c1-0c3a-324cbd906f3c/resources/plain_knob_outer.png';

    const knob = this.createSVGElement('image');
    knob.setAttribute('x', String(x));
    knob.setAttribute('y', String(y));
    knob.setAttribute('width', String(width));
    knob.setAttribute('height', String(height));
    knob.setAttribute('href', imagePath);
    knob.setAttribute('cursor', 'pointer');
    knob.setAttribute('data-knob-id', id);
    knob.style.transformOrigin = `${x + width/2}px ${y + height/2}px`;

    knob.addEventListener('wheel', (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const delta = e.deltaY > 0 ? -1 : 1;

      // Rotate the knob visually
      const knobData = this.knobs.get(id);
      if (knobData) {
        knobData.rotation += delta * 15; // 15 degrees per scroll step
        knob.style.transform = `rotate(${knobData.rotation}deg)`;
      }

      callback(delta);
    });

    this.knobs.set(id, { element: knob, rotation: 0, callback });
    this.group.appendChild(knob);
  }

  handleClick(): void {
    // Handled by individual button click handlers
  }

  handleWheel(e: WheelEvent): void {
    // Handled by individual knob wheel handlers
  }
}
