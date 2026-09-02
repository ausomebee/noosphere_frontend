import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * The client portal's redux store and its redux-persist wiring.
 *
 * Nothing here is exported for inspection: the persist config, and the
 * `migrate` closure inside it, are handed straight to `persistReducer` and then
 * forgotten. The suite recovers them by standing in for `persistReducer` and
 * keeping the config it was called with, which is also why every test reloads
 * the module through `vi.resetModules` -- the store is built once at import
 * time, so a fresh scenario needs a fresh module registry.
 *
 * `persistStore` is stubbed rather than run: the real one immediately rehydrates
 * from storage and starts writing back, which this suite has no use for.
 */

const APP_VERSION = "1.0.0";

const loadStore = async ({ removeItem } = {}) => {
  vi.resetModules();
  const captured = {};

  const storage = {
    getItem: vi.fn().mockResolvedValue(null),
    setItem: vi.fn().mockResolvedValue(undefined),
    removeItem: removeItem ?? vi.fn().mockResolvedValue(undefined),
  };
  vi.doMock("redux-persist/lib/storage", () => ({ default: storage }));

  vi.doMock("redux-persist", async () => {
    const actual = await vi.importActual("redux-persist");
    return {
      ...actual,
      persistReducer: (config, reducer) => {
        captured.config = config;
        return actual.persistReducer(config, reducer);
      },
      persistStore: () => ({ purge: vi.fn(), flush: vi.fn() }),
    };
  });

  const mod = await import("../ReduxStore/store");
  return { ...mod, config: captured.config, storage };
};

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.doUnmock("redux-persist");
  vi.doUnmock("redux-persist/lib/storage");
  vi.restoreAllMocks();
});

describe("the client store", () => {
  it("assembles every slice the app reads from", async () => {
    const { store } = await loadStore();
    expect(Object.keys(store.getState())).toEqual(
      expect.arrayContaining(["auth", "subDomain", "formBuilder", "formResponse"])
    );
  });

  it("exposes a persistor for callers that need to purge", async () => {
    const { persistor } = await loadStore();
    expect(typeof persistor.purge).toBe("function");
  });

  it("still refuses actions carrying values it cannot serialize", async () => {
    const { store } = await loadStore();
    const complain = vi.spyOn(console, "error").mockImplementation(() => {});
    store.dispatch({ type: "test/somethingElse", payload: () => {} });
    expect(complain).toHaveBeenCalled();
  });

  it("lets redux-persist's own bookkeeping actions through unchecked", async () => {
    const { store } = await loadStore();
    const complain = vi.spyOn(console, "error").mockImplementation(() => {});
    // PAUSE and its siblings carry a rehydrated blob and callbacks that the
    // serializable check would otherwise flag on every boot.
    store.dispatch({ type: "persist/PAUSE", payload: () => {} });
    expect(complain).not.toHaveBeenCalled();
  });
});

describe("the persist configuration", () => {
  it("namespaces its key so the sibling portals cannot collide", async () => {
    const { config } = await loadStore();
    expect(config.key).toBe("client-root");
  });

  it("stamps the app version and persists only the slices worth keeping", async () => {
    const { config } = await loadStore();
    expect(config.version).toBe(APP_VERSION);
    expect(config.whitelist).toEqual(["auth", "formBuilder", "formResponse"]);
  });

  it("retires the shared blob the portals used to share", async () => {
    const { storage } = await loadStore();
    expect(storage.removeItem).toHaveBeenCalledWith("persist:root");
  });

  it("boots anyway when storage refuses to delete it", async () => {
    const removeItem = vi.fn().mockRejectedValue(new Error("storage disabled"));
    const { store } = await loadStore({ removeItem });
    // A browser in private mode rejects here; the app must not fall over.
    await Promise.resolve();
    expect(removeItem).toHaveBeenCalled();
    expect(store.getState().auth).toBeDefined();
  });
});

describe("migrating persisted state", () => {
  const migrateWith = async (state) => {
    const { config } = await loadStore();
    return config.migrate(state);
  };

  it("passes through a missing blob", async () => {
    await expect(migrateWith(undefined)).resolves.toBeUndefined();
    await expect(migrateWith(null)).resolves.toBeNull();
  });

  it("leaves state written by this version alone", async () => {
    const state = { _persist: { version: APP_VERSION }, auth: { token: "old" } };
    const migrated = await migrateWith(state);
    expect(migrated.auth.accessToken).toBeUndefined();
  });

  it("promotes the old token field when the version moved on", async () => {
    const state = { _persist: { version: "0.0.9" }, auth: { token: "old" } };
    const migrated = await migrateWith(state);
    expect(migrated.auth.accessToken).toBe("old");
  });

  it("promotes the old token field for state stamped with no version at all", async () => {
    const migrated = await migrateWith({ auth: { token: "old" } });
    expect(migrated.auth.accessToken).toBe("old");
  });

  it("keeps an access token that is already there", async () => {
    const state = {
      _persist: { version: "0.0.9" },
      auth: { token: "old", accessToken: "current" },
    };
    const migrated = await migrateWith(state);
    expect(migrated.auth.accessToken).toBe("current");
  });

  it("copes with old state that has no auth slice", async () => {
    const state = { _persist: { version: "0.0.9" }, formBuilder: {} };
    await expect(migrateWith(state)).resolves.toBe(state);
  });

  it("copes with an auth slice that never held a token", async () => {
    const state = { _persist: { version: "0.0.9" }, auth: { user: null } };
    const migrated = await migrateWith(state);
    expect(migrated.auth.accessToken).toBeUndefined();
  });
});
