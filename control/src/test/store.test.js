import { describe, it, expect, vi, beforeAll } from 'vitest';

const removeItem = vi.fn(() => Promise.resolve());
const storage = {
  getItem: vi.fn(() => Promise.resolve(null)),
  setItem: vi.fn(() => Promise.resolve()),
  removeItem,
};
vi.mock('redux-persist/lib/storage', () => ({ default: storage }));

// persistReducer is intercepted purely to get hold of the config object, which
// the module builds privately; the migration below is the part worth testing
// and it is only reachable through that config.
let persistConfig;
const persistStore = vi.fn(() => ({ purge: vi.fn() }));
vi.mock('redux-persist', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    persistStore: (...a) => persistStore(...a),
    persistReducer: (config, reducer) => {
      persistConfig = config;
      return reducer;
    },
  };
});

/**
 * The persisted redux store.
 *
 * All three portals are served from one origin, so the interesting behaviour
 * here is about isolation and staleness rather than about reducers: the persist
 * key is namespaced per app, the old shared "persist:root" blob is deleted at
 * boot, and a stored slice from a previous app version is dropped rather than
 * rehydrated. The migration that does the last of those is a closure inside the
 * config, so the test reads it back off the mocked persistReducer above.
 */

const APP_VERSION = '0.1.0';

let store;
let persistor;

beforeAll(async () => {
  ({ store, persistor } = await import('../ReduxStore/store'));
});

describe('how the store is persisted', () => {
  it('namespaces its persist key so the other portals cannot overwrite it', () => {
    expect(persistConfig.key).toBe('control-root');
    expect(persistConfig.version).toBe(APP_VERSION);
  });

  it('retires the old shared blob at boot', () => {
    expect(removeItem).toHaveBeenCalledWith('persist:root');
  });

  it('builds a working store and a persistor', () => {
    expect(typeof store.getState).toBe('function');
    expect(store.getState().authentication).toBeDefined();
    expect(store.getState().formDrafts).toEqual({});
    expect(persistor).toBeDefined();
    expect(persistStore).toHaveBeenCalledWith(store);
  });

  it('lets redux-persist\'s own actions through the serialisability check', () => {
    // A rehydrate carries non-serialisable internals; if the check were not
    // relaxed this dispatch would throw in development.
    expect(() => store.dispatch({ type: 'persist/REHYDRATE', payload: undefined })).not.toThrow();
  });
});

describe('migrating stored state', () => {
  it('treats a cold cache as no migration at all', async () => {
    removeItem.mockClear();
    await expect(persistConfig.migrate(undefined)).resolves.toBeUndefined();
    // Nothing was stored, so nothing should be purged either -- purging here
    // would be indistinguishable from a version mismatch.
    expect(removeItem).not.toHaveBeenCalled();
  });

  it('keeps state written by this same app version', async () => {
    const state = { authentication: { user: 'u1' }, _persist: { version: APP_VERSION } };
    await expect(persistConfig.migrate(state)).resolves.toBe(state);
  });

  it('drops state written by an older app version', async () => {
    removeItem.mockClear();
    const state = { authentication: { user: 'u1' }, _persist: { version: '0.0.9' } };
    await expect(persistConfig.migrate(state)).resolves.toBeUndefined();
    expect(removeItem).toHaveBeenCalledWith('persist:control-root');
  });

  it('drops state that carries no version stamp at all', async () => {
    removeItem.mockClear();
    await expect(persistConfig.migrate({ authentication: {} })).resolves.toBeUndefined();
    expect(removeItem).toHaveBeenCalledWith('persist:control-root');
  });
});
