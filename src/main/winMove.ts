/**
 * Window positioning helper using node-window-manager
 * Moves native pop-out windows offscreen (optional)
 */

import { windowManager } from 'node-window-manager';

/**
 * Find a window by title (exact or partial match)
 * @param title - Window title to search for
 * @returns Window object or null if not found
 */
export function findWindowByTitle(title: string) {
  const windows = windowManager.getWindows();

  // Try exact match first
  let window = windows.find(w => w.getTitle() === title);
  if (window) return window;

  // Try partial match (case-insensitive)
  const lowerTitle = title.toLowerCase();
  window = windows.find(w => w.getTitle().toLowerCase().includes(lowerTitle));

  return window || null;
}

/**
 * Move a window offscreen
 * @param title - Window title to search for
 * @param x - X position (default: 10000)
 * @param y - Y position (default: 0)
 * @param width - Window width (optional)
 * @param height - Window height (optional)
 * @returns true if window was moved successfully
 */
export function moveOffscreen(
  title: string,
  x: number = 10000,
  y: number = 0,
  width?: number,
  height?: number
): boolean {
  try {
    const window = findWindowByTitle(title);
    if (!window) {
      console.warn('[winMove] Window not found:', title);
      return false;
    }

    // Get current bounds
    const bounds = window.getBounds();

    // Use provided dimensions or keep current
    const newWidth = width || bounds.width;
    const newHeight = height || bounds.height;

    // Move window
    window.setBounds({ x, y, width: newWidth, height: newHeight });

    console.log('[winMove] Moved window offscreen:', title, { x, y, width: newWidth, height: newHeight });
    return true;
  } catch (err) {
    console.error('[winMove] Failed to move window:', title, err);
    return false;
  }
}

/**
 * Move a window back to visible area
 * @param title - Window title to search for
 * @param x - X position (default: 100)
 * @param y - Y position (default: 100)
 * @returns true if window was moved successfully
 */
export function moveToVisible(
  title: string,
  x: number = 100,
  y: number = 100
): boolean {
  try {
    const window = findWindowByTitle(title);
    if (!window) {
      console.warn('[winMove] Window not found:', title);
      return false;
    }

    const bounds = window.getBounds();
    window.setBounds({ x, y, width: bounds.width, height: bounds.height });

    console.log('[winMove] Moved window to visible area:', title, { x, y });
    return true;
  } catch (err) {
    console.error('[winMove] Failed to move window:', title, err);
    return false;
  }
}

/**
 * Get window bounds by title
 * @param title - Window title to search for
 * @returns Bounds object or null if not found
 */
export function getWindowBounds(title: string): { x: number; y: number; width: number; height: number } | null {
  try {
    const window = findWindowByTitle(title);
    if (!window) return null;

    return window.getBounds();
  } catch (err) {
    console.error('[winMove] Failed to get window bounds:', title, err);
    return null;
  }
}

/**
 * List all window titles (for debugging)
 * @returns Array of window titles
 */
export function listWindows(): string[] {
  try {
    const windows = windowManager.getWindows();
    return windows.map(w => w.getTitle()).filter(t => t.length > 0);
  } catch (err) {
    console.error('[winMove] Failed to list windows:', err);
    return [];
  }
}
