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
  onTyping: () => () => {},
  getSocket: () => socket,
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
    expect(registerUser).toHaveBeenCalledWith({ userId: "u1", userType: "TENANT_STAFF" });
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
  // Unlike the client's hook, this one only declines to connect -- it does not
  // tear an existing socket down when the user goes away.
  it("does not connect without a user id", () => {
    auth.userId = null;
    renderHook(() => useSocket());
    expect(connectSocket).not.toHaveBeenCalled();
  });

  it("does not connect without a token", () => {
    auth.accessToken = null;
    renderHook(() => useSocket());
    expect(connectSocket).not.toHaveBeenCalled();
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
