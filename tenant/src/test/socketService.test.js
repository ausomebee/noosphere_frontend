import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const io = vi.fn();
vi.mock("socket.io-client", () => ({ io: (...args) => io(...args) }));

/**
 * The single socket.io connection the whole tenant app shares.
 *
 * The module holds that connection in a module-level variable, so the state
 * under test is the module itself: every test loads a fresh copy through
 * `load()` rather than trying to reset a singleton in place. Two guards run
 * through nearly every export -- "is there a socket at all" and "is it actually
 * connected" -- because the app mounts listeners before login completes and
 * keeps them mounted after logout. The listeners capture the socket in a local
 * so the unsubscribe they return detaches from the same socket even if the
 * module has since reconnected to a new one.
 */

const makeSocket = () => ({
  connected: false,
  on: vi.fn(),
  off: vi.fn(),
  emit: vi.fn(),
  connect: vi.fn(),
  disconnect: vi.fn(),
});

// A fresh module copy, so the module-level socket starts out null again.
const load = async () => {
  vi.resetModules();
  return import("../api/socketService");
};

// Load the module and drive it into the "connected" state most exports need.
const connected = async () => {
  const sock = makeSocket();
  io.mockReturnValue(sock);
  const mod = await load();
  mod.connectSocket({ accessToken: "at", userId: "u1", tenantId: "t1" });
  sock.connected = true;
  return { mod, sock };
};

const handlerFor = (sock, event) => sock.on.mock.calls.find(([n]) => n === event)?.[1];

let errorSpy;
let warnSpy;

beforeEach(() => {
  io.mockReset();
  errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("connecting", () => {
  it("dials the API origin with the auth token and identity query", async () => {
    const sock = makeSocket();
    io.mockReturnValue(sock);
    const { connectSocket } = await load();

    expect(connectSocket({ accessToken: "at", userId: "u1", tenantId: "t1" })).toBe(sock);
    const [url, opts] = io.mock.calls[0];
    // The REST base carries an /api/v1 path that socket.io must not see.
    expect(url).toBe(new URL(import.meta.env.VITE_API_URL).origin);
    expect(opts.auth).toEqual({ token: "at" });
    expect(opts.query).toEqual({ userId: "u1", tenantId: "t1" });
  });

  it("never gives up reconnecting, so a backgrounded tab recovers", async () => {
    io.mockReturnValue(makeSocket());
    const { connectSocket } = await load();
    connectSocket({ accessToken: "at" });
    expect(io.mock.calls[0][1].reconnectionAttempts).toBe(Infinity);
    expect(io.mock.calls[0][1].reconnection).toBe(true);
  });

  it("reuses a socket that is already connected", async () => {
    const { mod, sock } = await connected();
    expect(mod.connectSocket({ accessToken: "at2" })).toBe(sock);
    expect(io).toHaveBeenCalledTimes(1);
  });

  it("dials again when the previous socket has dropped", async () => {
    const sock = makeSocket();
    io.mockReturnValue(sock);
    const { connectSocket } = await load();
    connectSocket({ accessToken: "at" });
    connectSocket({ accessToken: "at" }); // still connected: false
    expect(io).toHaveBeenCalledTimes(2);
  });

  it("refuses to connect and says why when the API url is unset", async () => {
    vi.stubEnv("VITE_API_URL", "");
    const { connectSocket } = await load();
    expect(connectSocket({ accessToken: "at" })).toBeNull();
    expect(errorSpy).toHaveBeenCalledWith(
      "[Socket] VITE_API_URL environment variable is not set",
    );
    expect(io).not.toHaveBeenCalled();
  });
});

describe("the lifecycle listeners it installs", () => {
  it("subscribes to the full connect/reconnect set", async () => {
    const { sock } = await connected();
    expect(sock.on.mock.calls.map(([n]) => n)).toEqual([
      "connect",
      "disconnect",
      "connect_error",
      "reconnect_attempt",
      "reconnect",
      "reconnect_failed",
    ]);
  });

  it("logs the reason a socket dropped", async () => {
    const { sock } = await connected();
    handlerFor(sock, "disconnect")("transport close");
    // The warning is behind a DEV check, which vitest runs with enabled.
    expect(warnSpy).toHaveBeenCalledWith("[Socket] Disconnected. Reason:", "transport close");
  });

  it("stays quiet about a drop outside development", async () => {
    vi.stubEnv("DEV", false);
    const { sock } = await connected();
    handlerFor(sock, "disconnect")("transport close");
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it("reports a connection error and a run of failed reconnects", async () => {
    const { sock } = await connected();
    handlerFor(sock, "connect_error")(new Error("handshake rejected"));
    expect(errorSpy).toHaveBeenCalledWith("[Socket] Connection error:", "handshake rejected");

    handlerFor(sock, "reconnect_failed")();
    expect(errorSpy).toHaveBeenCalledWith("[Socket] Reconnection failed after max attempts");
  });

  it("keeps the silent connect and reconnect listeners harmless", async () => {
    const { sock } = await connected();
    expect(() => {
      handlerFor(sock, "connect")();
      handlerFor(sock, "reconnect_attempt")();
      handlerFor(sock, "reconnect")();
    }).not.toThrow();
    expect(errorSpy).not.toHaveBeenCalled();
  });
});

describe("registering and tearing down", () => {
  it("announces the user and their type once connected", async () => {
    const { mod, sock } = await connected();
    mod.registerUser({ userId: "u1", userType: "TENANT_STAFF" });
    expect(sock.emit).toHaveBeenCalledWith("register", {
      userId: "u1",
      userType: "TENANT_STAFF",
    });
  });

  it("does nothing when there is no socket to register on", async () => {
    const { registerUser, getSocket } = await load();
    expect(() => registerUser({ userId: "u1", userType: "CLIENT" })).not.toThrow();
    expect(getSocket()).toBeNull();
  });

  it("disconnects and forgets the socket on logout", async () => {
    const { mod, sock } = await connected();
    mod.disconnectSocket();
    expect(sock.disconnect).toHaveBeenCalled();
    expect(mod.getSocket()).toBeNull();
  });

  it("is a no-op when logout runs without a socket", async () => {
    const { disconnectSocket, getSocket } = await load();
    disconnectSocket();
    expect(getSocket()).toBeNull();
  });
});

describe("nudging a dropped socket", () => {
  it("reconnects a socket sitting out its backoff", async () => {
    const sock = makeSocket();
    io.mockReturnValue(sock);
    const mod = await load();
    mod.connectSocket({ accessToken: "at" });
    expect(mod.ensureConnected()).toBe(sock);
    expect(sock.connect).toHaveBeenCalled();
  });

  it("leaves a live socket alone", async () => {
    const { mod, sock } = await connected();
    expect(mod.ensureConnected()).toBe(sock);
    expect(sock.connect).not.toHaveBeenCalled();
  });

  it("returns null when there is nothing to nudge", async () => {
    const { ensureConnected } = await load();
    expect(ensureConnected()).toBeNull();
  });
});

describe("chat", () => {
  it("creates a conversation through the socket and passes the ack along", async () => {
    const { mod, sock } = await connected();
    const cb = vi.fn();
    mod.createConversation({ participants: ["u1", "c1"], tenantId: "t1" }, cb);
    expect(sock.emit).toHaveBeenCalledWith(
      "createConversation",
      { participants: ["u1", "c1"], tenantId: "t1" },
      cb,
    );
  });

  it("tells the caller straight away when it cannot create a conversation", async () => {
    const { createConversation } = await load();
    const cb = vi.fn();
    createConversation({ participants: [], tenantId: "t1" }, cb);
    expect(cb).toHaveBeenCalledWith({ success: false, error: "Not connected" });
    expect(errorSpy).toHaveBeenCalled();
  });

  it("survives a disconnected create with no callback to answer", async () => {
    const { createConversation } = await load();
    expect(() => createConversation({ participants: [], tenantId: "t1" })).not.toThrow();
  });

  it("sends a message as staff to a client by default", async () => {
    const { mod, sock } = await connected();
    mod.sendChatMessage({ senderId: "u1", receiverId: "c1", content: "hello" });
    expect(sock.emit).toHaveBeenCalledWith(
      "chatMessage",
      {
        senderId: "u1",
        senderType: "TENANT_STAFF",
        receiverId: "c1",
        receiverType: "CLIENT",
        content: "hello",
        isRead: false,
      },
      undefined,
    );
  });

  it("honours explicit participant types", async () => {
    const { mod, sock } = await connected();
    mod.sendChatMessage({
      senderId: "a1",
      senderType: "ADMIN",
      receiverId: "u1",
      receiverType: "TENANT_STAFF",
      content: "hi",
    });
    expect(sock.emit.mock.calls[0][1]).toMatchObject({
      senderType: "ADMIN",
      receiverType: "TENANT_STAFF",
    });
  });

  it("answers the send callback with a failure when offline", async () => {
    const { sendChatMessage } = await load();
    const cb = vi.fn();
    sendChatMessage({ senderId: "u1", receiverId: "c1", content: "hello" }, cb);
    expect(cb).toHaveBeenCalledWith({ success: false, error: "Not connected" });
  });

  it("survives an offline send with no callback", async () => {
    const { sendChatMessage } = await load();
    expect(() => sendChatMessage({ senderId: "u1", content: "hello" })).not.toThrow();
  });

  it("emits a typing indicator only while connected", async () => {
    const { mod, sock } = await connected();
    mod.emitTyping({ conversationId: "cv1", userId: "u1", isTyping: true });
    expect(sock.emit).toHaveBeenCalledWith("typing", {
      conversationId: "cv1",
      userId: "u1",
      isTyping: true,
    });

    const offline = await load();
    expect(() => offline.emitTyping({ conversationId: "cv1" })).not.toThrow();
  });
});

describe("subscriptions", () => {
  // Every listener export is the same shape: attach, and hand back a detach.
  const LISTENERS = [
    ["onChatMessage", "chatMessage"],
    ["onTyping", "typing"],
    ["onNotification", "newNotification"],
    ["onMessagesRead", "messagesRead"],
    ["onUserOnline", "userOnline"],
    ["onUserOffline", "userOffline"],
  ];

  it.each(LISTENERS)("%s attaches to the %s event", async (name, event) => {
    const { mod, sock } = await connected();
    const cb = vi.fn();
    mod[name](cb);
    expect(sock.on).toHaveBeenCalledWith(event, cb);
  });

  it.each(LISTENERS)("%s hands back a working unsubscribe", async (name, event) => {
    const { mod, sock } = await connected();
    const cb = vi.fn();
    mod[name](cb)();
    expect(sock.off).toHaveBeenCalledWith(event, cb);
  });

  it.each(LISTENERS)("%s detaches from the socket it attached to, not the current one", async (name, event) => {
    const first = makeSocket();
    io.mockReturnValue(first);
    const mod = await load();
    mod.connectSocket({ accessToken: "at" });
    const cb = vi.fn();
    const unsub = mod[name](cb);

    // The app reconnects underneath a listener the component still holds.
    const second = makeSocket();
    io.mockReturnValue(second);
    mod.connectSocket({ accessToken: "at" });

    unsub();
    expect(first.off).toHaveBeenCalledWith(event, cb);
    expect(second.off).not.toHaveBeenCalled();
  });

  it.each(LISTENERS)("%s returns a harmless unsubscribe when there is no socket", async (name) => {
    const mod = await load();
    const unsub = mod[name](vi.fn());
    expect(typeof unsub).toBe("function");
    expect(() => unsub()).not.toThrow();
  });
});

describe("read receipts and notification acks", () => {
  it("marks a notification read over the socket", async () => {
    const { mod, sock } = await connected();
    mod.emitNotificationRead("n1");
    expect(sock.emit).toHaveBeenCalledWith("notificationRead", { notificationId: "n1" });
  });

  it("drops a notification ack raised while offline", async () => {
    const { emitNotificationRead } = await load();
    expect(() => emitNotificationRead("n1")).not.toThrow();
  });

  it("tells the partner their messages were read", async () => {
    const { mod, sock } = await connected();
    mod.emitMessagesRead({ readerId: "u1", partnerId: "c1" });
    expect(sock.emit).toHaveBeenCalledWith("messagesRead", {
      readerId: "u1",
      partnerId: "c1",
    });
  });

  it("drops a read receipt raised while offline", async () => {
    const { emitMessagesRead } = await load();
    expect(() => emitMessagesRead({ readerId: "u1", partnerId: "c1" })).not.toThrow();
  });
});

describe("the default export", () => {
  it("re-exports the same functions the named exports expose", async () => {
    const mod = await load();
    expect(mod.default.connectSocket).toBe(mod.connectSocket);
    expect(mod.default.onNotification).toBe(mod.onNotification);
    expect(mod.default.disconnectSocket).toBe(mod.disconnectSocket);
  });
});
