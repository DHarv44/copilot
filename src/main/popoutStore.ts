/**
 * Popout capture registry persistence
 * Uses electron-store to save bindings to %appdata%/<app>/popouts.json
 */

import Store from 'electron-store';
import type { Registry, Binding } from '../renderer/types';

interface StoreSchema {
  bindings: Registry;
}

const store = new Store<StoreSchema>({
  name: 'popouts',
  defaults: {
    bindings: []
  },
  schema: {
    bindings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          key: { type: 'string' },
          preferExact: { type: 'string' },
          titleRx: { type: 'string' },
          lastSourceName: { type: 'string' },
          lastBounds: {
            type: 'array',
            items: { type: 'number' },
            minItems: 4,
            maxItems: 4
          }
        },
        required: ['key', 'titleRx']
      }
    }
  }
});

/**
 * Load all bindings from disk
 */
export function loadRegistry(): Registry {
  return store.get('bindings', []);
}

/**
 * Save entire registry to disk
 */
export function saveRegistry(registry: Registry): void {
  store.set('bindings', registry);
}

/**
 * Upsert a binding by key
 */
export function upsertBinding(binding: Binding): void {
  const registry = loadRegistry();
  const index = registry.findIndex(b => b.key === binding.key);

  if (index >= 0) {
    registry[index] = binding;
  } else {
    registry.push(binding);
  }

  saveRegistry(registry);
}

/**
 * Remove a binding by key
 */
export function removeBinding(key: string): void {
  const registry = loadRegistry();
  const filtered = registry.filter(b => b.key !== key);
  saveRegistry(filtered);
}

/**
 * Get a specific binding by key
 */
export function getBinding(key: string): Binding | undefined {
  const registry = loadRegistry();
  return registry.find(b => b.key === key);
}
