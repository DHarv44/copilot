/**
 * Popout capture - desktopCapturer wrapper
 * Handles window enumeration for capture
 */

const { desktopCapturer } = require('electron');
const { windowManager } = require('node-window-manager');

/**
 * List all capturable windows (including screen sources for MSFS popouts)
 */
async function listWindows() {
  try {
    // Get both windows and screens from desktopCapturer
    const sources = await desktopCapturer.getSources({
      types: ['window', 'screen'],
      fetchWindowIcons: false
    });

    // Get MSFS popouts from node-window-manager
    const nativeWindows = windowManager.getWindows();
    const filtered = nativeWindows.filter(w => {
      try {
        const title = w.getTitle();
        return title && title.trim() && !title.includes('Default IME') && !title.includes('MSCTFIME');
      } catch {
        return false;
      }
    });

    const msfsPopouts = filtered.filter(w => {
      try {
        const title = w.getTitle();
        return /AS1000_(PFD|MFD)|WTG1000_(PFD|MFD)|\$AS1000_PFD/.test(title);
      } catch {
        return false;
      }
    });

    const all = sources.map(s => ({ id: s.id, name: s.name }));

    // Add MSFS popouts with screen capture + window bounds
    msfsPopouts.forEach(w => {
      try {
        const title = w.getTitle();
        const bounds = w.getBounds();

        // Find primary screen source
        const screen = sources.find(s => s.name.includes('Entire Screen') || s.name.includes('Screen 1'));

        if (screen) {
          all.push({
            id: screen.id,
            name: title,
            bounds: bounds // x, y, width, height for cropping
          });
        }
      } catch (e) {
        console.error('[popcap] Failed to add MSFS popout:', e);
      }
    });

    return all;
  } catch (err) {
    console.error('[popcap] Failed to list windows:', err);
    return [];
  }
}

/**
 * Build getUserMedia constraints for a specific window source
 */
function buildConstraints(id) {
  return {
    audio: false,
    video: {
      mandatory: {
        chromeMediaSource: 'desktop',
        chromeMediaSourceId: id
      }
    }
  };
}

module.exports = {
  listWindows,
  buildConstraints
};
