/**
 * Popout overlay utility
 * Creates PopoutCapture overlays for instrument popout rectangles
 */

import { createRoot } from 'react-dom/client';
import { createElement } from 'react';
import { PopoutCapture } from '../../../popouts/PopoutCapture';

/**
 * Create a popout capture overlay for an instrument's popout rectangle
 * @param svgGroup - The SVG group element containing the instrument
 * @param keyId - Unique ID for this popout (e.g., "G1000_PFD")
 * @param titlePattern - Regex pattern to match MSFS window titles
 */
export function createPopoutOverlay(
  svgGroup: SVGGElement,
  keyId: string,
  titlePattern: RegExp
): void {
  // Delay to ensure SVG is fully rendered with transforms applied
  setTimeout(() => {
    // Find the popout rectangle within this group
    const popoutRect = svgGroup.querySelector('rect#popout') as SVGRectElement;

    if (!popoutRect) {
      console.warn(`[PopoutOverlay] No rect#popout found in group for ${keyId}`);
      return;
    }

    // Get the screen position of the rect by using getBoundingClientRect
    const rectBounds = popoutRect.getBoundingClientRect();

    const screenX = rectBounds.left;
    const screenY = rectBounds.top;
    const screenWidth = rectBounds.width;
    const screenHeight = rectBounds.height;

    // Calculate center of the popout rectangle in screen space
    const rectCenterX = screenX + screenWidth / 2;
    const rectCenterY = screenY + screenHeight / 2;

    // Find the root container (svg-container's parent)
    const svgContainer = document.getElementById('svg-container');
    if (!svgContainer || !svgContainer.parentElement) {
      console.error('[PopoutOverlay] Could not find cockpit container');
      return;
    }

    // Create a div to hold the React component
    const overlayDiv = document.createElement('div');
    overlayDiv.id = `popout-overlay-${keyId}`;
    overlayDiv.style.position = 'absolute';
    overlayDiv.style.top = '0';
    overlayDiv.style.left = '0';
    overlayDiv.style.width = '100%';
    overlayDiv.style.height = '100%';
    overlayDiv.style.pointerEvents = 'none'; // Allow clicks through to SVG
    overlayDiv.style.zIndex = '1000';

    // Append to cockpit container
    svgContainer.parentElement.appendChild(overlayDiv);

    // Render PopoutCapture component with screen coordinates
    const root = createRoot(overlayDiv);
    root.render(
      createElement(PopoutCapture, {
        keyId,
        titleRxDefault: titlePattern,
        width: screenWidth,
        height: screenHeight,
        x: screenX,
        y: screenY
      })
    );

  }, 200);
}
