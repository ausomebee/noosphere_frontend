import "@testing-library/jest-dom";

// jsdom's localStorage is bound to the document origin, so tests that stub
// window.location (e.g. getSubdomain, fingerprint) lose access to it on newer
// Node/jsdom. Install an origin-independent in-memory localStorage so
// storage-backed tests run consistently across Node 20 (CI) and Node 26+.
const createStorageMock = () => {
  let store = {};
  return {
    getItem: (key) => (key in store ? store[key] : null),
    setItem: (key, value) => {
      store[key] = String(value);
    },
    removeItem: (key) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    key: (i) => Object.keys(store)[i] ?? null,
    get length() {
      return Object.keys(store).length;
    },
  };
};

const storageMock = createStorageMock();
Object.defineProperty(globalThis, "localStorage", {
  value: storageMock,
  writable: true,
  configurable: true,
});
if (typeof window !== "undefined") {
  Object.defineProperty(window, "localStorage", {
    value: storageMock,
    writable: true,
    configurable: true,
  });
}
