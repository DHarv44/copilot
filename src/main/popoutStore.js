/**
 * Popout capture registry persistence
 * Uses electron-store to save bindings to %appdata%/<app>/popouts.json
 */

let store = null;
let storeReady = false;

// Dynamically import electron-store (ES Module)
(async () => {
  try {
    const Store = (await import('electron-store')).default;
    store = new Store({
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
    storeReady = true;
    console.log('[popoutStore] electron-store loaded successfully');
  } catch (err) {
    console.error('[popoutStore] Failed to load electron-store:', err);
  }
})();

/**
 * Load all bindings from disk
 */
function loadRegistry() {
  if (!storeReady || !store) return [];
  return store.get('bindings', []);
}

/**
 * Save entire registry to disk
 */
function saveRegistry(registry) {
  if (!storeReady || !store) return;
  store.set('bindings', registry);
}

/**
 * Upsert a binding by key
 */
function upsertBinding(binding) {
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
function removeBinding(key) {
  const registry = loadRegistry();
  const filtered = registry.filter(b => b.key !== key);
  saveRegistry(filtered);
}

/**
 * Get a specific binding by key
 */
function getBinding(key) {
  const registry = loadRegistry();
  return registry.find(b => b.key === key);
}

module.exports = {
  loadRegistry,
  saveRegistry,
  upsertBinding,
  removeBinding,
  getBinding
};
