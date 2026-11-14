import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

const h = vi.hoisted(() => ({
  dispatch: vi.fn(),
  navigate: vi.fn(),
  purge: vi.fn(),
  disconnectSocket: vi.fn(),
}));

vi.mock("react-redux", () => ({ useDispatch: () => h.dispatch }));
vi.mock("react-router-dom", () => ({ useNavigate: () => h.navigate }));
vi.mock("../ReduxStore/store", () => ({ persistor: { purge: (...a) => h.purge(...a) } }));
vi.mock("../ReduxStore/features/authentication", () => ({
  logout: () => ({ type: "authentication/logout" }),
}));
vi.mock("../api/socketService", () => ({
  disconnectSocket: (...a) => h.disconnectSocket(...a),
}));
vi.mock("../Helper/storeRef", () => ({ getStore: () => null, getPersistor: () => null }));

/**
 * The idle timeout counts activity in every open tab of the app: a tab left in
 * the background must not log out the tab the user is working in, and when
 * all of them have been idle the logout reaches every tab.
 */

// Behaves like the browser's: every channel with the same name gets the
// message except the sender. Each instance plays one tab.
class FakeChannel {
  static open = [];
  constructor(name) {
    this.name = name;
    this.listeners = [];
    FakeChannel.open.push(this);
  }
  addEventListener(type, fn) {
    if (type === "message") this.listeners.push(fn);
  }
  removeEventListener(type, fn) {
    this.listeners = this.listeners.filter((l) => l !== fn);
  }
  postMessage(data) {
    FakeChannel.open
      .filter((c) => c !== this && c.name === this.name)
      .forEach((c) => c.listeners.forEach((fn) => fn({ data })));
  }
  close() {
    FakeChannel.open = FakeChannel.open.filter((c) => c !== this);
  }
}

const CHANNEL = "control-auth";
const KEY = "control-last-activity";
const TIMEOUT = 60000;

let useIdleTimeout;
let tabs;


const otherTab = () => new FakeChannel(CHANNEL);
const listen = () => {
  const received = vi.fn();
  otherTab().addEventListener("message", (e) => received(e.data));
  return received;
};

beforeEach(async () => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  FakeChannel.open = [];
  vi.stubGlobal("BroadcastChannel", FakeChannel);
  tabs = await import("../Helper/logoutBroadcast");
  tabs.__resetLogoutBroadcastForTests();
  useIdleTimeout = (await import("../hooks/useIdleTimeout")).default;
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  tabs.__resetLogoutBroadcastForTests();
});

describe("idle timeout across tabs", () => {
  it("stays signed in while the user is active in another tab", () => {
    const other = otherTab();
    renderHook(() => useIdleTimeout(TIMEOUT));
    act(() => vi.advanceTimersByTime(TIMEOUT - 1000));
    act(() => other.postMessage({ type: "activity", at: Date.now() }));
    act(() => vi.advanceTimersByTime(TIMEOUT - 1000));
    expect(h.dispatch).not.toHaveBeenCalled();
  });

  it("reads activity another tab stored, even if it missed the message", () => {
    renderHook(() => useIdleTimeout(TIMEOUT));
    act(() => vi.advanceTimersByTime(TIMEOUT - 1000));
    localStorage.setItem(KEY, String(Date.now()));
    act(() => vi.advanceTimersByTime(1000));
    expect(h.dispatch).not.toHaveBeenCalled();

    // Nothing more from any tab: the full period from that activity logs out.
    act(() => vi.advanceTimersByTime(TIMEOUT));
    expect(h.dispatch).toHaveBeenCalledWith({ type: "authentication/logout" });
  });

  it("tells the other tabs about activity here, not on every mouse move", () => {
    const received = listen();
    renderHook(() => useIdleTimeout(TIMEOUT));
    const start = Date.now();
    act(() => window.dispatchEvent(new Event("mousemove")));
    act(() => vi.advanceTimersByTime(4000));
    act(() => window.dispatchEvent(new Event("mousemove")));
    act(() => vi.advanceTimersByTime(4000));
    act(() => window.dispatchEvent(new Event("keydown")));
    expect(received).toHaveBeenCalledTimes(1);
    expect(received).toHaveBeenLastCalledWith({ type: "activity", at: start });
    expect(Number(localStorage.getItem(KEY))).toBe(start);

    // When the window closes, the latest activity goes out, so the other tabs
    // never count the idle period from an older time than the real one.
    act(() => vi.advanceTimersByTime(tabs.ACTIVITY_SHARE_INTERVAL_MS - 8000));
    expect(received).toHaveBeenCalledTimes(2);
    expect(received).toHaveBeenLastCalledWith({ type: "activity", at: start + 8000 });
    expect(Number(localStorage.getItem(KEY))).toBe(start + 8000);
  });

  it("does not log the active tab out early", () => {
    // This tab is the one left idle; the user works in another tab for 9s.
    const other = otherTab();
    renderHook(() => useIdleTimeout(TIMEOUT));
    const start = Date.now();
    localStorage.setItem(KEY, String(start + 9000));
    act(() => other.postMessage({ type: "activity", at: start + 9000 }));
    act(() => vi.advanceTimersByTime(TIMEOUT + 8000));
    expect(h.dispatch).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1000));
    expect(h.dispatch).toHaveBeenCalled();
  });

  it("logs every tab out once all of them have been idle", () => {
    const received = listen();
    renderHook(() => useIdleTimeout(TIMEOUT));
    act(() => vi.advanceTimersByTime(TIMEOUT));
    expect(h.dispatch).toHaveBeenCalledWith({ type: "authentication/logout" });
    expect(received).toHaveBeenCalledWith({ type: "logout", reason: "idle" });
  });

  it("ignores a stored activity time in the future", () => {
    localStorage.setItem(KEY, String(Date.now() + 10 * TIMEOUT));
    renderHook(() => useIdleTimeout(TIMEOUT));
    act(() => vi.advanceTimersByTime(TIMEOUT));
    expect(h.dispatch).toHaveBeenCalled();
  });

  it("stops listening to other tabs once the page is gone", () => {
    const other = otherTab();
    const { unmount } = renderHook(() => useIdleTimeout(TIMEOUT));
    unmount();
    act(() => other.postMessage({ type: "activity", at: Date.now() }));
    act(() => vi.advanceTimersByTime(TIMEOUT * 2));
    expect(h.dispatch).not.toHaveBeenCalled();
  });
});
