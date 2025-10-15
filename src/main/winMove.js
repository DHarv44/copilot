/**
 * Window positioning helper using node-window-manager
 * Moves native pop-out windows offscreen (optional)
 */

const { windowManager } = require('node-window-manager');

/**
 * Find a window by title (exact or partial match)
 * @param {string} title - Window title to search for
 * @returns {object|null} Window object or null if not found
 */
function findWindowByTitle(title) {
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
 * @param {string} title - Window title to search for
 * @param {number} x - X position (default: 10000)
 * @param {number} y - Y position (default: 0)
 * @param {number} [width] - Window width (optional)
 * @param {number} [height] - Window height (optional)
 * @returns {boolean} true if window was moved successfully
 */
function moveOffscreen(title, x = 10000, y = 0, width, height) {
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
 * @param {string} title - Window title to search for
 * @param {number} x - X position (default: 100)
 * @param {number} y - Y position (default: 100)
 * @returns {boolean} true if window was moved successfully
 */
function moveToVisible(title, x = 100, y = 100) {
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
 * @param {string} title - Window title to search for
 * @returns {{x: number, y: number, width: number, height: number}|null} Bounds object or null if not found
 */
function getWindowBounds(title) {
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
 * @returns {string[]} Array of window titles
 */
function listWindows() {
  try {
    const windows = windowManager.getWindows();
    return windows.map(w => w.getTitle()).filter(t => t.length > 0);
  } catch (err) {
    console.error('[winMove] Failed to list windows:', err);
    return [];
  }
}

module.exports = {
  findWindowByTitle,
  moveOffscreen,
  moveToVisible,
  getWindowBounds,
  listWindows
};
