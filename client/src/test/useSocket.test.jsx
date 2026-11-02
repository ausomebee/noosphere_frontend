import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

const socket = {
  connected: false,
  on: vi.fn(),
  off: vi.fn(),
};
const connectSocket = vi.fn(() => socket);
const disconnectSocket = vi.fn();
const registerUser = vi.fn();
const ensureConnected = vi.fn();
let chatHandler = null;
let notifHandler = null;
const unsubChat = vi.fn();
const unsubNotif = vi.fn();

vi.mock("../api/socketService", () => ({
  connectSocket: (...a) => connectSocket(...a),
  disconnectSocket: (...a) => disconnectSocket(...a),
  registerUser: (...a) => registerUser(...a),
  ensureConnected: (...a) => ensureConnected(...a),
  onChatMessage: (fn) => { chatHandler = fn; return unsubChat; },
  onNotification: (fn) => { notifHandler = fn; return unsubNotif; },
}));

const auth = { userId: "u1", accessToken: "at", tenantId: "t1" };
vi.mock("./useAuth", () => ({ default: () => auth }));
vi.mock("../hooks/useAuth", () => ({ default: () => auth }));

import useSocket from "../hooks/useSocket";

/**
 * The socket lifecycle hook mounted once by the layout.
 *
 * It connects only while there is a signed-in user, registers that user's type,
 * and nudges a socket that is still waiting out its backoff when a backgrounded
 * tab comes back. Callbacks are held in a ref so a parent re-render does not
 * tear the connection down and rebuild it.
 */

const handlerFor = (event) => {
  const call = socket.on.mock.calls.find(([name]) => name === event);
  return call?.[1];
};

beforeEach(() => {
  vi.clearAllMocks();
  socket.connected = false;
  chatHandler = null;
  notifHandler = null;
  Object.assign(auth, { userId: "u1", accessToken: "at", tenantId: "t1" });
});

describe("connecting", () => {
  it("opens a socket for a signed-in user", () => {
    renderHook(() => useSocket());
    expect(connectSocket).toHaveBeenCalledWith({ accessToken: "at", userId: "u1", tenantId: "t1" });
  });

  it("reports connected and registers the user once the socket connects", () => {
    const { result } = renderHook(() => useSocket());
    expect(result.current.isConnected).toBe(false);
    act(() => handlerFor("connect")());
    expect(result.current.isConnected).toBe(true);
    expect(registerUser).toHaveBeenCalledWith({ userId: "u1", userType: "CLIENT" });
  });

  it("registers immediately when the socket was already connected", () => {
    socket.connected = true;
    const { result } = renderHook(() => useSocket());
    expect(result.current.isConnected).toBe(true);
    expect(registerUser).toHaveBeenCalled();
  });

  it("reports disconnected without a toast", () => {
    const { result } = renderHook(() => useSocket());
    act(() => handlerFor("connect")());
    act(() => handlerFor("disconnect")());
    expect(result.current.isConnected).toBe(false);
  });

  it("connects only once across re-renders", () => {
    const { rerender } = renderHook(() => useSocket());
    rerender();
    rerender();
    expect(connectSocket).toHaveBeenCalledTimes(1);
  });
});

describe("signed out", () => {
  it("does not connect without a user id", () => {
    auth.userId = null;
    renderHook(() => useSocket());
    expect(connectSocket).not.toHaveBeenCalled();
    expect(disconnectSocket).toHaveBeenCalled();
  });

  it("does not connect without a token", () => {
    auth.accessToken = null;
    renderHook(() => useSocket());
    expect(connectSocket).not.toHaveBeenCalled();
    expect(disconnectSocket).toHaveBeenCalled();
  });
});

describe("forwarding events", () => {
  it("passes a chat message to the caller", () => {
    const onMessage = vi.fn();
    renderHook(() => useSocket({ onMessage }));
    act(() => chatHandler({ id: "m1" }));
    expect(onMessage).toHaveBeenCalledWith({ id: "m1" });
  });

  it("passes a notification to the caller", () => {
    const onNotification = vi.fn();
    renderHook(() => useSocket({ onNotification }));
    act(() => notifHandler({ id: "n1" }));
    expect(onNotification).toHaveBeenCalledWith({ id: "n1" });
  });

  it("tolerates no callbacks at all", () => {
    renderHook(() => useSocket());
    expect(() => {
      act(() => chatHandler({ id: "m1" }));
      act(() => notifHandler({ id: "n1" }));
    }).not.toThrow();
  });

  it("uses the latest callback without reconnecting", () => {
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = renderHook(({ cb }) => useSocket({ onMessage: cb }), {
      initialProps: { cb: first },
    });
    rerender({ cb: second });
    act(() => chatHandler({ id: "m1" }));
    expect(second).toHaveBeenCalled();
    expect(first).not.toHaveBeenCalled();
    expect(connectSocket).toHaveBeenCalledTimes(1);
  });
});

describe("waking a backgrounded tab", () => {
  it("nudges the socket when the tab becomes visible", () => {
    renderHook(() => useSocket());
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
    act(() => document.dispatchEvent(new Event("visibilitychange")));
    expect(ensureConnected).toHaveBeenCalled();
  });

  it("does nothing while the tab is hidden", () => {
    renderHook(() => useSocket());
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "hidden" });
    act(() => document.dispatchEvent(new Event("visibilitychange")));
    expect(ensureConnected).not.toHaveBeenCalled();
  });
});

describe("teardown", () => {
  it("removes every listener it added", () => {
    const { unmount } = renderHook(() => useSocket());
    unmount();
    expect(socket.off).toHaveBeenCalledWith("connect", expect.any(Function));
    expect(socket.off).toHaveBeenCalledWith("disconnect", expect.any(Function));
    expect(unsubChat).toHaveBeenCalled();
    expect(unsubNotif).toHaveBeenCalled();
  });
});

describe("a tenant switch under the same session", () => {
  // Used to assert connectSocket was called only once, guarded by an
  // `initialized` ref. That guard is gone (it broke token refresh, below);
  // connectSocket itself now hands back the same socket for the same user.
  it("keeps using the same socket when only the tenant changes", () => {
    const { rerender } = renderHook(() => useSocket());
    auth.tenantId = "t2";
    rerender();
    expect(connectSocket.mock.results.every((r) => r.value === socket)).toBe(true);
    expect(disconnectSocket).not.toHaveBeenCalled();
  });
});

describe("a token refresh", () => {
  it("re-attaches every listener after the refresh re-runs the effect", () => {
    const onNotification = vi.fn();
    const { rerender } = renderHook(() => useSocket({ onNotification }));

    auth.accessToken = "at-2";
    rerender();

    // The refresh hands the new token to the (idempotent) connect...
    expect(connectSocket).toHaveBeenLastCalledWith({ accessToken: "at-2", userId: "u1", tenantId: "t1" });
    // ...and the first run's cleanup removed its listeners, so this run must
    // have added them back — otherwise live badges stop after a refresh.
    expect(unsubNotif).toHaveBeenCalledTimes(1);
    expect(socket.on.mock.calls.filter(([e]) => e === "connect")).toHaveLength(2);
    act(() => notifHandler({ id: "n1" }));
    expect(onNotification).toHaveBeenCalledWith({ id: "n1" });
    expect(disconnectSocket).not.toHaveBeenCalled();
  });

  it("still reports connect/disconnect after a refresh", () => {
    const { result, rerender } = renderHook(() => useSocket());
    auth.accessToken = "at-2";
    rerender();
    const handlers = socket.on.mock.calls.filter(([e]) => e === "connect").map(([, fn]) => fn);
    act(() => handlers.at(-1)());
    expect(result.current.isConnected).toBe(true);
  });
});
