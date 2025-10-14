/**
 * Popout capture preload bridge
 * Exposes safe desktopCapturer APIs to renderer via contextBridge
 */

import { contextBridge, desktopCapturer } from 'electron';

export interface WindowSource {
  id: string;
  name: string;
}

export interface MediaConstraints {
  audio: false;
  video: {
    mandatory: {
      chromeMediaSource: 'desktop';
      chromeMediaSourceId: string;
    };
  };
}

contextBridge.exposeInMainWorld('popcap', {
  /**
   * List all available window sources
   * @returns Array of window sources with id and name
   */
  async listWindows(): Promise<WindowSource[]> {
    try {
      const sources = await desktopCapturer.getSources({
        types: ['window'],
        fetchWindowIcons: false
      });

      return sources.map(s => ({
        id: s.id,
        name: s.name
      }));
    } catch (err) {
      console.error('[popcap] Failed to list windows:', err);
      return [];
    }
  },

  /**
   * Build getUserMedia constraints for a specific window source
   * @param id - The desktopCapturer source ID
   * @returns MediaStreamConstraints for getUserMedia
   */
  async buildConstraints(id: string): Promise<MediaConstraints> {
    return {
      audio: false,
      video: {
        mandatory: {
          chromeMediaSource: 'desktop',
          chromeMediaSourceId: id
        }
      }
    } as MediaConstraints;
  }
});
