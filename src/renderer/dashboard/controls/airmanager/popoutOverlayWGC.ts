/**
 * Popout Overlay for G1000 Bezels (WGC version)
 * Singleton manager for positioning MSFS popout windows
 */

import { WindowPicker } from '../../../capture/WindowPicker';
import { createRoot } from 'react-dom/client';
import React from 'react';

interface PopoutBinding {
  keyId: string;
  hwnd: number;
  title: string;
  popoutRect: SVGRectElement;
  overlay: HTMLDivElement;
}

/**
 * Singleton that manages all MSFS popout window positioning
 */
class MSFSPopoutManager {
  private static instance: MSFSPopoutManager | null = null;
  private bindings = new Map<string, PopoutBinding>();
  private resizeObserver: ResizeObserver | null = null;
  private pollInterval: number | null = null;
  private lastScreenX = 0;
  private lastScreenY = 0;

  private constructor() {
    this.setupTracking();
  }

  static getInstance(): MSFSPopoutManager {
    if (!MSFSPopoutManager.instance) {
      MSFSPopoutManager.instance = new MSFSPopoutManager();
    }
    return MSFSPopoutManager.instance;
  }

  private setupTracking() {
    // Single ResizeObserver for all windows
    this.resizeObserver = new ResizeObserver(() => {
      this.updateAllPositions();
    });
    this.resizeObserver.observe(document.body);

    // Window events
    window.addEventListener('resize', () => this.updateAllPositions());
    window.addEventListener('scroll', () => this.updateAllPositions());

    // Single polling loop for window movement
    this.lastScreenX = window.screenX;
    this.lastScreenY = window.screenY;
    this.pollInterval = window.setInterval(() => {
      if (window.screenX !== this.lastScreenX || window.screenY !== this.lastScreenY) {
        this.lastScreenX = window.screenX;
        this.lastScreenY = window.screenY;
        this.updateAllPositions();
      }
    }, 8); // ~120fps
  }

  async registerPopout(keyId: string, hwnd: number, title: string, popoutRect: SVGRectElement, overlay: HTMLDivElement) {
    const binding: PopoutBinding = { keyId, hwnd, title, popoutRect, overlay };
    this.bindings.set(keyId, binding);

    // Apply borderless style once on registration
    await this.positionWindow(binding, true);

    // Hide overlay
    overlay.style.display = 'none';

    console.log(`[MSFSPopoutManager] Registered ${keyId} -> ${title} (hwnd: ${hwnd})`);
  }

  unregisterPopout(keyId: string) {
    this.bindings.delete(keyId);
    console.log(`[MSFSPopoutManager] Unregistered ${keyId}`);
  }

  private async updateAllPositions() {
    console.log(`[MSFSPopoutManager] updateAllPositions called, ${this.bindings.size} bindings`);
    const promises: Promise<void>[] = [];
    for (const binding of this.bindings.values()) {
      console.log(`[MSFSPopoutManager] Updating ${binding.keyId}`);
      promises.push(this.positionWindow(binding, false));
    }
    await Promise.all(promises);
  }

  private async positionWindow(binding: PopoutBinding, applyBorderless: boolean) {
    const { hwnd, title, popoutRect } = binding;

    // Get overlay position relative to viewport
    const rect = popoutRect.getBoundingClientRect();

    // Convert to screen coordinates
    const chromeOffsetY = window.outerHeight - window.innerHeight;
    const screenX = Math.round(rect.left + window.screenX);
    const screenY = Math.round(rect.top + window.screenY + chromeOffsetY);

    try {
      await (window as any).wgc.position(
        hwnd,
        screenX,
        screenY,
        Math.round(rect.width),
        Math.round(rect.height),
        true,  // always topmost
        applyBorderless  // borderless only on first call
      );

      if (applyBorderless) {
        console.log(`[MSFSPopoutManager] Positioned ${title} at (${screenX}, ${screenY}) ${rect.width}x${rect.height} (topmost, borderless)`);
      }
    } catch (err) {
      console.error(`[MSFSPopoutManager] Failed to position ${title}:`, err);
    }
  }

  cleanup() {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    if (this.pollInterval !== null) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    this.bindings.clear();
  }
}

/**
 * Creates a popout overlay with window picker button
 */
export function createPopoutOverlayWGC(
  svgElement: SVGElement,
  keyId: string,
  titlePattern: RegExp
) {
  const popoutRect = svgElement.querySelector('#popout') as SVGRectElement;
  if (!popoutRect) {
    console.warn(`[popoutOverlayWGC] No #popout rect found in bezel SVG for ${keyId}`);
    return;
  }

  const mainSvg = popoutRect.ownerSVGElement;
  if (!mainSvg) {
    console.error(`[popoutOverlayWGC] Could not find ownerSVGElement for ${keyId}`, popoutRect);
    return;
  }

  // Intercept clicks on softkey_1 to open window picker
  const softkey1 = svgElement.querySelector('#softkey_1') as SVGElement;
  if (softkey1) {
    softkey1.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      console.log(`[popoutOverlayWGC] softkey_1 clicked on ${keyId}, opening window picker`);
      openWindowPicker();
    }, true); // Use capture phase to intercept before other handlers
  }

  // Create overlay div
  const overlay = document.createElement('div');
  overlay.className = 'wgc-popout-overlay';
  overlay.style.cssText = `
    position: fixed;
    pointer-events: auto;
    z-index: 100;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
  `;

  document.body.appendChild(overlay);

  // Position overlay
  function updateOverlayPosition() {
    const rect = popoutRect.getBoundingClientRect();
    overlay.style.left = `${rect.left}px`;
    overlay.style.top = `${rect.top}px`;
    overlay.style.width = `${rect.width}px`;
    overlay.style.height = `${rect.height}px`;
  }

  requestAnimationFrame(updateOverlayPosition);

  // Load saved binding
  loadSavedBinding();

  async function loadSavedBinding() {
    try {
      const binding = await (window as any).popout.getBinding(keyId);
      if (!binding) return;

      const windows = await (window as any).wgc.list();
      const match = windows.find((w: any) => {
        if (binding.preferExact && w.title === binding.preferExact) {
          return true;
        }
        if (binding.titleRx) {
          try {
            const rx = new RegExp(binding.titleRx, 'i');
            return rx.test(w.title);
          } catch {
            return false;
          }
        }
        return false;
      });

      if (match) {
        console.log(`[popoutOverlayWGC] Auto-attaching ${keyId} to ${match.title}`);
        await attachWindow(match.hwnd, match.title);
      }
    } catch (err) {
      console.error(`[popoutOverlayWGC] Failed to load binding for ${keyId}:`, err);
    }
  }

  function renderCaptureButton() {
    overlay.innerHTML = '';

    const button = document.createElement('button');
    button.className = 'wgc-capture-btn';
    button.textContent = `Capture ${keyId}`;
    button.onclick = openWindowPicker;

    button.style.cssText = `
      padding: 12px 24px;
      background: rgba(88, 101, 242, 0.9);
      color: white;
      border: 2px solid rgba(255, 255, 255, 0.2);
      border-radius: 8px;
      font-weight: 600;
      font-size: 14px;
      cursor: pointer;
      transition: all 0.2s;
    `;

    overlay.appendChild(button);
  }

  function openWindowPicker() {
    const pickerRoot = document.createElement('div');
    document.body.appendChild(pickerRoot);

    const root = createRoot(pickerRoot);

    root.render(
      React.createElement(WindowPicker, {
        onSelect: async (hwnd: number, title: string) => {
          root.unmount();
          pickerRoot.remove();

          // Save binding
          await (window as any).popout.upsertBinding({
            key: keyId,
            preferExact: title,
            titleRx: titlePattern.source,
            lastSourceName: title
          });

          await attachWindow(hwnd, title);
        },
        onCancel: () => {
          root.unmount();
          pickerRoot.remove();
        },
        filterMSFS: true
      })
    );
  }

  async function attachWindow(hwnd: number, title: string) {
    const manager = MSFSPopoutManager.getInstance();
    await manager.registerPopout(keyId, hwnd, title, popoutRect, overlay);
  }

  // Initial render
  renderCaptureButton();
}
