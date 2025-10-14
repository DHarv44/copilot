/**
 * Parses Air Manager Lua scripts to extract instrument definitions
 * Supports: button_add, dial_add, img_add, user_prop_add, fs2020_event
 */

import { ButtonDefinition, DialDefinition, ImageDefinition, UserProperty, ButtonCallback, DialCallback } from './InstrumentConfig';

export class LuaParser {
  private luaCode: string;
  private buttonCounter = 0;
  private dialCounter = 0;
  private imageCounter = 0;

  constructor(luaCode: string) {
    this.luaCode = luaCode;
  }

  /**
   * Parse all button_add() calls
   * Format: button_add(nil | "image.png", "pressed.png", x, y, w, h, function() ... end)
   */
  parseButtons(): ButtonDefinition[] {
    const buttons: ButtonDefinition[] = [];

    // Match button_add with various formats
    const buttonPattern = /button_add\s*\(\s*(nil|"[^"]*")\s*,\s*("([^"]*)"|nil)\s*,\s*(\d+\.?\d*)\s*,\s*(\d+\.?\d*)\s*,\s*(\d+\.?\d*)\s*,\s*(\d+\.?\d*)\s*,\s*function\s*\([^)]*\)(.*?)end\s*\)/gs;

    let match;
    while ((match = buttonPattern.exec(this.luaCode)) !== null) {
      const [, bgImage, , pressedImage, x, y, w, h, callbackBody] = match;

      buttons.push({
        id: `button_${this.buttonCounter++}`,
        backgroundImage: bgImage === 'nil' ? null : bgImage.replace(/"/g, ''),
        pressedImage: pressedImage === 'nil' ? null : pressedImage,
        x: parseFloat(x),
        y: parseFloat(y),
        width: parseFloat(w),
        height: parseFloat(h),
        callback: this.parseButtonCallback(callbackBody)
      });
    }

    return buttons;
  }

  /**
   * Parse button callback to extract event
   */
  private parseButtonCallback(callbackBody: string): ButtonCallback {
    // Look for fs2020_event("H:EVENT_NAME")
    const hEventMatch = callbackBody.match(/fs2020_event\s*\(\s*"H:([^"]+)"\s*\)/);
    if (hEventMatch) {
      return {
        type: 'h-event',
        event: hEventMatch[1]
      };
    }

    // Look for fs2020_event("K:EVENT_NAME")
    const kEventMatch = callbackBody.match(/fs2020_event\s*\(\s*"K:([^"]+)"\s*\)/);
    if (kEventMatch) {
      return {
        type: 'k-event',
        event: kEventMatch[1]
      };
    }

    // Fallback: store raw code
    return {
      type: 'custom',
      code: callbackBody.trim()
    };
  }

  /**
   * Parse all dial_add() calls
   * Format: dial_add("knob.png", x, y, w, h, function(direction) ... end)
   */
  parseDials(): DialDefinition[] {
    const dials: DialDefinition[] = [];

    const dialPattern = /dial_add\s*\(\s*"([^"]*)"\s*,\s*(\d+\.?\d*)\s*,\s*(\d+\.?\d*)\s*,\s*(\d+\.?\d*)\s*,\s*(\d+\.?\d*)\s*,\s*function\s*\(([^)]*)\)(.*?)end\s*\)/gs;

    let match;
    while ((match = dialPattern.exec(this.luaCode)) !== null) {
      const [, image, x, y, w, h, param, callbackBody] = match;

      // Determine if inner or outer based on image name
      const type = image.includes('inner') ? 'inner' : 'outer';

      dials.push({
        id: `dial_${this.dialCounter++}`,
        type,
        image,
        x: parseFloat(x),
        y: parseFloat(y),
        width: parseFloat(w),
        height: parseFloat(h),
        callback: this.parseDialCallback(callbackBody, param)
      });
    }

    return dials;
  }

  /**
   * Parse dial callback to extract increment/decrement events
   */
  private parseDialCallback(callbackBody: string, paramName: string): DialCallback {
    // Look for conditional based on direction parameter
    // if direction > 0 then fs2020_event("H:EVENT_INC") else fs2020_event("H:EVENT_DEC") end

    const conditionalPattern = new RegExp(
      `if\\s+${paramName}\\s*[=><!]=?\\s*[-\\d]+\\s+then\\s+fs2020_event\\s*\\(\\s*"([HK]):([^"]+)"\\s*\\)\\s+else\\s+fs2020_event\\s*\\(\\s*"([HK]):([^"]+)"\\s*\\)`,
      'i'
    );

    const match = conditionalPattern.exec(callbackBody);
    if (match) {
      const [, type1, event1, type2, event2] = match;
      return {
        type: type1 === 'H' ? 'h-event' : 'k-event',
        eventIncrement: event1,
        eventDecrement: event2
      };
    }

    // Fallback: raw code
    return {
      type: 'custom',
      code: callbackBody.trim()
    };
  }

  /**
   * Parse all img_add() and img_add_fullscreen() calls
   * Format: img_add("image.png", x, y, w, h) or img_add_fullscreen("image.png")
   */
  parseImages(): ImageDefinition[] {
    const images: ImageDefinition[] = [];

    // Parse img_add_fullscreen() - these don't have explicit coordinates
    const fullscreenPattern = /img_add_fullscreen\s*\(\s*"([^"]*)"\s*\)/g;
    let match;
    while ((match = fullscreenPattern.exec(this.luaCode)) !== null) {
      const [, image] = match;
      // Fullscreen images are marked with x=0, y=0, and will be sized by metadata
      images.push({
        id: `image_fullscreen_${this.imageCounter++}`,
        image,
        x: 0,
        y: 0,
        width: 0, // Will be set to prefWidth
        height: 0 // Will be set to prefHeight
      });
    }

    // Parse regular img_add()
    const imagePattern = /img_add\s*\(\s*"([^"]*)"\s*,\s*(\d+\.?\d*)\s*,\s*(\d+\.?\d*)\s*,\s*(\d+\.?\d*)\s*,\s*(\d+\.?\d*)\s*\)/g;
    while ((match = imagePattern.exec(this.luaCode)) !== null) {
      const [, image, x, y, w, h] = match;

      images.push({
        id: `image_${this.imageCounter++}`,
        image,
        x: parseFloat(x),
        y: parseFloat(y),
        width: parseFloat(w),
        height: parseFloat(h)
      });
    }

    return images;
  }

  /**
   * Parse user_prop_add() calls for configurable properties
   * Format: user_prop_add(label, type, default, options)
   */
  parseUserProperties(): UserProperty[] {
    const properties: UserProperty[] = [];

    // This is a simplified parser - real Air Manager has more complex syntax
    const propPattern = /user_prop_add\s*\(\s*"([^"]*)"\s*,\s*"([^"]*)"\s*,\s*"([^"]*)"\s*/g;

    let match;
    while ((match = propPattern.exec(this.luaCode)) !== null) {
      const [, label, type, defaultVal] = match;

      properties.push({
        name: label.toLowerCase().replace(/\s+/g, '_'),
        type: type as any,
        label,
        defaultValue: defaultVal
      });
    }

    return properties;
  }

  /**
   * Parse all elements from Lua code
   */
  parseAll() {
    return {
      buttons: this.parseButtons(),
      dials: this.parseDials(),
      images: this.parseImages(),
      userProperties: this.parseUserProperties()
    };
  }
}
