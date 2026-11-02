import { describe, it, expect, vi, beforeEach } from "vitest";

// Each io() call gets its own socket, so a test can tell "reused" from "new".
const makeSocket = () => ({
  connected: false,
  active: false,
  auth: undefined,
  on: vi.fn(),
  off: vi.fn(),
  emit: vi.fn(),
  connect: vi.fn(),
  disconnect: vi.fn(),
  timeout: vi.fn(),
});

vi.mock("socket.io-client", () => ({
  io: vi.fn((url, opts) => Object.assign(makeSocket(), { auth: opts.auth })),
}));

import { io } from "socket.io-client";
import {
  connectSocket,
  disconnectSocket,
  getSocket,
  onNotification,
  sendChatMessage,
  CHAT_ACK_TIMEOUT_MS,
} from "../api/socketService";

/**
 * Who a socket belongs to, and how many there are.
 *
 * The server binds a socket to the user in its handshake, so one opened for a
 * previous user must never be handed to the next; and for the same user there
 * must only ever be one, whatever state it is in, or every notification
 * arrives twice.
 */

beforeEach(() => {
  disconnectSocket();
  vi.clearAllMocks();
});

describe("a different user signs in", () => {
  it("drops the previous user's socket and opens a new one", () => {
    const first = connectSocket({ accessToken: "a1", userId: "u1", tenantId: "t1" });
    first.connected = true;

    const second = connectSocket({ accessToken: "b1", userId: "u2", tenantId: "t1" });

    expect(second).not.toBe(first);
    expect(first.disconnect).toHaveBeenCalled();
    expect(io).toHaveBeenCalledTimes(2);
    expect(io.mock.calls[1][1]).toMatchObject({ auth: { token: "b1" }, query: { userId: "u2" } });
    expect(getSocket()).toBe(second);
  });
});

describe("the same user connects again", () => {
  it("reuses a socket that is still mid-reconnect instead of opening a second", () => {
    const first = connectSocket({ accessToken: "a1", userId: "u1" });
    first.active = true; // socket.io is retrying in the background

    const again = connectSocket({ accessToken: "a1", userId: "u1" });

    expect(again).toBe(first);
    expect(io).toHaveBeenCalledTimes(1);
    expect(first.connect).not.toHaveBeenCalled();
    expect(first.disconnect).not.toHaveBeenCalled();
  });

  it("restarts a fully disconnected socket rather than replacing it", () => {
    const first = connectSocket({ accessToken: "a1", userId: "u1" });

    const again = connectSocket({ accessToken: "a1", userId: "u1" });

    expect(again).toBe(first);
    expect(io).toHaveBeenCalledTimes(1);
    expect(first.connect).toHaveBeenCalledTimes(1);
  });

  it("puts a refreshed token on the existing socket without disconnecting it", () => {
    const first = connectSocket({ accessToken: "a1", userId: "u1" });
    first.connected = true;

    connectSocket({ accessToken: "a2", userId: "u1" });

    expect(first.auth).toEqual({ token: "a2" });
    expect(first.disconnect).not.toHaveBeenCalled();
    expect(first.connect).not.toHaveBeenCalled();
  });
});

describe("unsubscribing after the socket is gone", () => {
  it("removes the listener from the socket it was added to, even after logout", () => {
    const first = connectSocket({ accessToken: "a1", userId: "u1" });
    const callback = vi.fn();
    const unsubscribe = onNotification(callback);

    disconnectSocket();

    expect(() => unsubscribe()).not.toThrow();
    expect(first.off).toHaveBeenCalledWith("newNotification", callback);
  });
});

describe("sending a chat message", () => {
  it("waits for the ack with a timeout and passes it through", () => {
    const s = connectSocket({ accessToken: "a1", userId: "u1" });
    s.connected = true;
    const emit = vi.fn();
    s.timeout.mockReturnValue({ emit });
    const callback = vi.fn();

    sendChatMessage({ senderId: "u1", receiverId: "d1", content: "hi" }, callback);

    expect(s.timeout).toHaveBeenCalledWith(CHAT_ACK_TIMEOUT_MS);
    expect(CHAT_ACK_TIMEOUT_MS).toBe(10000);
    expect(emit).toHaveBeenCalledWith(
      "chatMessage",
      expect.objectContaining({ content: "hi", receiverId: "d1" }),
      expect.any(Function)
    );
    emit.mock.calls[0][2](null, { success: true, message: { id: "m1" } });
    expect(callback).toHaveBeenCalledWith({ success: true, message: { id: "m1" } });
  });

  it("reports a timed-out ack as a failure", () => {
    const s = connectSocket({ accessToken: "a1", userId: "u1" });
    s.connected = true;
    const emit = vi.fn();
    s.timeout.mockReturnValue({ emit });
    const callback = vi.fn();

    sendChatMessage({ senderId: "u1", receiverId: "d1", content: "hi" }, callback);
    emit.mock.calls[0][2](new Error("operation has timed out"));

    expect(callback).toHaveBeenCalledWith({ success: false, error: "Timed out" });
  });
});
