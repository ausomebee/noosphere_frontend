import '@testing-library/jest-dom';
import { configure } from '@testing-library/react';

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

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

// Mock IntersectionObserver
class IntersectionObserverMock {
  constructor() {
    this.observe = vi.fn();
    this.unobserve = vi.fn();
    this.disconnect = vi.fn();
  }
}
window.IntersectionObserver = IntersectionObserverMock;

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn().mockResolvedValue(undefined),
    readText: vi.fn().mockResolvedValue(''),
  },
});

// CI runs these suites on a two-core runner where a render or an async yup
// resolver can take longer than Testing Library's 1s default, which showed up
// as findBy/waitFor timeouts that never reproduce locally. The assertions are
// unchanged -- only how long they are willing to wait -- and the 15s test
// timeout keeps a genuinely stuck test failing rather than hanging.
configure({ asyncUtilTimeout: 4000 });
