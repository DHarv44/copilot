/**
 * Factory for loading Air Manager instruments from file system
 * Reads info.xml, logic.lua, and resources to create instrument configs
 */

import { InstrumentConfig, InstrumentMetadata } from './InstrumentConfig';
import { LuaParser } from './LuaParser';

export class AirManagerInstrumentFactory {
  /**
   * Load an Air Manager instrument from a folder path
   * @param instrumentPath Path to instrument folder (contains info.xml, logic.lua, resources/)
   * @param userProps Optional user property overrides (e.g., {mode: 'PFD'})
   */
  static async loadInstrument(instrumentPath: string, userProps?: Record<string, any>): Promise<InstrumentConfig> {
    // Load info.xml for metadata
    const metadata = await this.parseInfoXml(instrumentPath);

    // Load logic.lua
    const luaCode = await this.loadLuaScript(instrumentPath);

    // Parse Lua to extract definitions
    const parser = new LuaParser(luaCode);
    const parsed = parser.parseAll();

    return {
      metadata,
      basePath: instrumentPath,
      buttons: parsed.buttons,
      dials: parsed.dials,
      images: parsed.images,
      userProperties: parsed.userProperties
    };
  }

  /**
   * Parse info.xml to extract instrument metadata
   */
  private static async parseInfoXml(instrumentPath: string): Promise<InstrumentMetadata> {
    const infoXmlPath = `${instrumentPath}/info.xml`;

    try {
      const response = await fetch(infoXmlPath);
      const xmlText = await response.text();

      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, 'text/xml');

      return {
        uuid: this.getXmlValue(xmlDoc, 'uuid'),
        aircraft: this.getXmlValue(xmlDoc, 'aircraft'),
        type: this.getXmlValue(xmlDoc, 'type'),
        author: this.getXmlValue(xmlDoc, 'author'),
        description: this.getXmlValue(xmlDoc, 'description'),
        version: this.getXmlValue(xmlDoc, 'version'),
        prefWidth: parseInt(this.getXmlValue(xmlDoc, 'prefWidth')),
        prefHeight: parseInt(this.getXmlValue(xmlDoc, 'prefHeight')),
        compatibleFS2020: this.getXmlValue(xmlDoc, 'compatibleFS2020') === 'true'
      };
    } catch (error) {
      console.error('Failed to parse info.xml:', error);
      throw new Error(`Could not load instrument metadata from ${infoXmlPath}`);
    }
  }

  /**
   * Helper to extract XML element value
   */
  private static getXmlValue(xmlDoc: Document, tagName: string): string {
    const element = xmlDoc.getElementsByTagName(tagName)[0];
    return element?.textContent || '';
  }

  /**
   * Load logic.lua script content
   */
  private static async loadLuaScript(instrumentPath: string): Promise<string> {
    const luaPath = `${instrumentPath}/logic.lua`;

    try {
      const response = await fetch(luaPath);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return await response.text();
    } catch (error) {
      console.error('Failed to load logic.lua:', error);
      throw new Error(`Could not load Lua script from ${luaPath}`);
    }
  }

  /**
   * Resolve resource path relative to instrument folder
   */
  static resolveResourcePath(instrumentPath: string, resourceName: string): string {
    // Remove leading slash if present
    const cleanResource = resourceName.replace(/^\//, '');
    return `${instrumentPath}/resources/${cleanResource}`;
  }
}
