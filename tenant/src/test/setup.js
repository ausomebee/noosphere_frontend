import '@testing-library/jest-dom';
import { configure } from '@testing-library/react';

// jsdom's localStorage is bound to the document origin, so tests that stub
// window.location (e.g. getSubdomain) lose access to it on newer Node/jsdom.
// Install an origin-independent in-memory localStorage so storage-backed tests
// run consistently across Node 20 (CI) and Node 26+ (local).
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
Object.defineProperty(globalThis, 'localStorage', {
  value: storageMock,
  writable: true,
  configurable: true,
});
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'localStorage', {
    value: storageMock,
    writable: true,
    configurable: true,
  });
}

// Mock ResizeObserver -- jsdom has no implementation, and @headlessui/react's
// Menu and dnd-kit both construct one on mount.
class ResizeObserverMock {
  constructor() {
    this.observe = vi.fn();
    this.unobserve = vi.fn();
    this.disconnect = vi.fn();
  }
}
window.ResizeObserver = ResizeObserverMock;
globalThis.ResizeObserver = ResizeObserverMock;

// CI runs these suites on a two-core runner where a render or an async yup
// resolver can take longer than Testing Library's 1s default, which showed up
// as findBy/waitFor timeouts that never reproduce locally. The assertions are
// unchanged -- only how long they are willing to wait -- and the 15s test
// timeout keeps a genuinely stuck test failing rather than hanging.
configure({ asyncUtilTimeout: 4000 });
