/**
 * Popout Capture System - Public API
 */

export { PopoutCapture } from './PopoutCapture';
export { PopoutManager } from './PopoutManager';
export { attachByTitle, attachBySourceId, findMatchingSource, startAutoAttach } from './autoAttach';
export type { PopoutKey, Binding, Registry, WindowSource, PopoutState } from '../types';
