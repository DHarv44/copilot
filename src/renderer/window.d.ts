/**
 * Global window API type declarations
 * Extends the Window interface with our custom preload APIs
 */

import type { Registry, Binding, WindowSource } from './types';

declare global {
  interface Window {
    // Popout capture API
    popcap: {
      listWindows(): Promise<WindowSource[]>;
      buildConstraints(id: string): Promise<{
        audio: false;
        video: {
          mandatory: {
            chromeMediaSource: 'desktop';
            chromeMediaSourceId: string;
          };
        };
      }>;
    };

    // Popout persistence API
    popout: {
      loadRegistry(): Promise<Registry>;
      saveRegistry(registry: Registry): Promise<void>;
      upsertBinding(binding: Binding): Promise<void>;
      removeBinding(key: string): Promise<void>;
      getBinding(key: string): Promise<Binding | undefined>;
    };

    // Window positioning API
    winMove: {
      moveOffscreen(
        title: string,
        x?: number,
        y?: number,
        width?: number,
        height?: number
      ): Promise<boolean>;
      moveToVisible(title: string, x?: number, y?: number): Promise<boolean>;
      getBounds(
        title: string
      ): Promise<{ x: number; y: number; width: number; height: number } | null>;
      list(): Promise<string[]>;
    };

    // Existing APIs (for reference)
    api: {
      onBus(cb: (payload: any) => void): void;
      onHistory(cb: (payload: any[]) => void): void;
      sendCmd(payload: any): void;
    };

    cmd: {
      send(payload: any): string;
      onAck(cb: (ack: { id: string; ok: boolean; err?: string }) => void): void;
    };

    sim: {
      onUpdate(cb: (msg: any) => void): void;
    };

    navboard: {
      getSvgText(): Promise<string>;
      sendInteraction(payload: any): void;
    };
  }
}

export {};
