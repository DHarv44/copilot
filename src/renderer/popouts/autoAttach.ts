/**
 * Auto-attach watcher for popout capture
 * Polls desktopCapturer and auto-attaches known bindings when matching windows appear
 */

import type { Binding, Registry, WindowSource } from '../types';

interface AttachCallback {
  (key: string, sourceName: string, sourceId: string): Promise<boolean>;
}

interface DetachCallback {
  (key: string): void;
}

/**
 * Attach a video element to a window by title
 * @param title - Window title to search for
 * @param video - Video element to attach stream to
 * @returns true if successfully attached
 */
export async function attachByTitle(
  title: string,
  video: HTMLVideoElement
): Promise<boolean> {
  try {
    const list = await (window as any).popcap.listWindows();
    const hit =
      list.find((s: WindowSource) => s.name === title) ||
      list.find((s: WindowSource) => title.startsWith(s.name));

    if (!hit) return false;

    const constraints = await (window as any).popcap.buildConstraints(hit.id);
    const stream = await navigator.mediaDevices.getUserMedia(constraints);

    video.srcObject = stream;
    await video.play().catch(() => {});

    return true;
  } catch (err) {
    console.error('[autoAttach] Failed to attach by title:', title, err);
    return false;
  }
}

/**
 * Attach a video element to a window by source ID
 * @param sourceId - Desktop capturer source ID
 * @param video - Video element to attach stream to
 * @returns true if successfully attached
 */
export async function attachBySourceId(
  sourceId: string,
  video: HTMLVideoElement
): Promise<boolean> {
  alert('INSIDE attachBySourceId, sourceId: ' + sourceId);
  try {
    alert('Getting constraints...');
    const constraints = await (window as any).popcap.buildConstraints(sourceId);
    alert('Got constraints, calling getUserMedia...');
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    alert('Got stream!');

    video.srcObject = stream;
    await video.play().catch(() => {});

    return true;
  } catch (err) {
    alert('ERROR in attachBySourceId: ' + err.message);
    console.error('[autoAttach] Failed to attach by source ID:', sourceId, err);
    return false;
  }
}

/**
 * Start auto-attach watcher
 * @param bindings - Array of bindings to watch for
 * @param onAttach - Callback when a binding is attached
 * @param onDetach - Callback when a binding is detached
 * @returns Stop function to cancel the watcher
 */
export function startAutoAttach(
  bindings: Registry,
  onAttach: AttachCallback,
  onDetach: DetachCallback
): () => void {
  const active = new Map<string, string>(); // key -> sourceId
  let stopped = false;

  const poll = async () => {
    if (stopped) return;

    try {
      const list: WindowSource[] = await (window as any).popcap.listWindows();
      const sourceIds = new Set(list.map(s => s.id));

      // Check for new windows to attach
      for (const binding of bindings) {
        // Skip if already attached
        if (active.has(binding.key)) {
          // Check if source still exists
          const currentSourceId = active.get(binding.key);
          if (currentSourceId && !sourceIds.has(currentSourceId)) {
            // Source disappeared - detach
            console.log('[autoAttach] Source disappeared:', binding.key);
            active.delete(binding.key);
            onDetach(binding.key);
          }
          continue;
        }

        // Try to find a matching window
        const rx = new RegExp(binding.titleRx, 'i');
        const candidate = list.find(
          s =>
            (binding.preferExact && s.name === binding.preferExact) ||
            rx.test(s.name)
        );

        if (candidate) {
          console.log('[autoAttach] Found candidate:', binding.key, candidate.name);
          const success = await onAttach(binding.key, candidate.name, candidate.id);

          if (success) {
            active.set(binding.key, candidate.id);
            console.log('[autoAttach] Auto-attached:', binding.key, candidate.name);
          }
        }
      }

      // Check for detached sources (window closed)
      for (const [key, sourceId] of active.entries()) {
        if (!sourceIds.has(sourceId)) {
          console.log('[autoAttach] Source closed:', key);
          active.delete(key);
          onDetach(key);
        }
      }
    } catch (err) {
      console.error('[autoAttach] Poll error:', err);
    }

    // Continue polling
    setTimeout(poll, 250);
  };

  // Start polling
  poll();

  // Return stop function
  return () => {
    stopped = true;
  };
}

/**
 * Find a matching window source for a binding
 * @param binding - Binding to match
 * @returns Matching window source or null
 */
export async function findMatchingSource(
  binding: Binding
): Promise<WindowSource | null> {
  try {
    const list: WindowSource[] = await (window as any).popcap.listWindows();
    const rx = new RegExp(binding.titleRx, 'i');

    // Try exact match first
    if (binding.preferExact) {
      const exact = list.find(s => s.name === binding.preferExact);
      if (exact) return exact;
    }

    // Try regex match
    const match = list.find(s => rx.test(s.name));
    return match || null;
  } catch (err) {
    console.error('[autoAttach] Failed to find matching source:', err);
    return null;
  }
}
